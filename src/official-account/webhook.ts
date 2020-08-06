import http         from 'http'
import express      from 'express'
import xmlParser    from 'express-xml-bodyparser'
import localtunnel  from 'localtunnel'

import TypedEventEmitter from 'typed-emitter'

import { log } from 'wechaty-puppet'
import { EventEmitter } from 'events'

import { OAMessagePayload, OAMessageType }   from './schema'

const WebhookEventEmitter = EventEmitter as new () => TypedEventEmitter<{
  message: (message: OAMessagePayload) => void,
  instantReply: (message: {
    touser: string,
    msgtype: OAMessageType,
    content: string,
  }) => void,
}>

export interface VerifyArgs {
  timestamp : string,
  nonce     : string,
  signature : string,
}

interface WebhookOptions {
  personalMode?    : boolean,
  port?            : number
  webhookProxyUrl? : string
  verify           : (args: VerifyArgs) => boolean
}

class Webhook extends WebhookEventEmitter {

  protected server? : http.Server
  protected tunnel? : localtunnel.Tunnel
  protected personalMode? : boolean
  protected messageCache? : any = {}
  protected userOpen? : any = {}

  public readonly webhookProxyHost?      : string
  public readonly webhookProxySchema?    : string
  public readonly webhookProxySubDomain? : string

  constructor (
    protected options: WebhookOptions,
  ) {
    super()
    log.verbose('Webhook', 'constructor(%s)', JSON.stringify(options))

    if (typeof options.port !== 'undefined' && options.webhookProxyUrl) {
      throw new Error('Please only provide either `port` or `webhookProxyUrl` for Webhook')
    }
    if (typeof options.port === 'undefined' && !options.webhookProxyUrl) {
      throw new Error('Please provide either `port` or `webhookProxyUrl` for Webhook')
    }

    this.personalMode = options.personalMode

    if (options.webhookProxyUrl) {
      const result = this.parseWebhookProxyUrl(options.webhookProxyUrl)
      if (!result) {
        throw new Error(`Webhook: invalid webhookProxyUrl ${options.webhookProxyUrl}`)
      }
      this.webhookProxyHost      = result.host
      this.webhookProxySchema    = result.schema
      this.webhookProxySubDomain = result.name
    }
  }

  parseWebhookProxyUrl (
    webhookProxyUrl: string,
  ): undefined | {
    host   : string,
    name   : string,
    schema : string,
  } {
    log.verbose('Webhook', 'parseSubDomain(%s)', webhookProxyUrl)

    /**
     * Huan(20208): see webhook.spec.ts unit tests.
     *  server: https://github.com/localtunnel/server
     */
    const URL_RE = /(https?):\/\/([^.]+)\.(.+)/i

    const matches = webhookProxyUrl.match(URL_RE)

    if (!matches) {
      log.warn('Webhook', 'parseSubDomain() fail to parse %s', webhookProxyUrl)
      return
    }

    const [
      , // skip matches[0]
      schema,
      name,
      host,
    ]                 = matches

    log.verbose('Webhook', 'parseSubDomain() schema: %s, name: %s, host: %s',
      schema,
      name,
      host,
    )

    return {
      host,
      name,
      schema,
    }
  }

  async start () {
    log.verbose('Webhook', 'start()')

    const app = express()
    app.use(xmlParser({
      explicitArray : false,
      normalize     : false,
      normalizeTags : false,
      trim          : true,
    }))

    app.get('/',  this.appGet.bind(this))
    app.post('/', this.appPost.bind(this))

    this.on('instantReply', (msg: {
      msgtype: OAMessageType,
      content: string,
      touser: string
    }) => {
      if (this.userOpen[msg.touser]) {
        this.messageCache[msg.touser] = msg
      } else {
        throw Error('Webhook: personal mode only allow reply once and within 4s')
      }
    })

    const server = this.server = http.createServer(app)

    await new Promise((resolve, reject) => {
      /**
       * 1. for local port
       */
      if (typeof this.options.port !== 'undefined') {
        server.listen(this.options.port, resolve)
        return
      }

      /**
       * 2. for tunnel helper
       */
      server.listen(() => {
        const listenedPort = (server.address() as { port: number }).port
        this.setupTunnel(listenedPort)
          .then(resolve)
          .catch(reject)
      })
    })
  }

  async stop () {
    log.verbose('Webhook', 'stop()')

    if (this.tunnel) {
      this.tunnel.close()
      this.tunnel = undefined
    }
    if (this.server) {
      this.server.close()
      this.server = undefined
    }
  }

  async setupTunnel (port: number) {
    log.verbose('Webhook', 'setupTunnel(%s)', port)

    const host = `${this.webhookProxySchema}://${this.webhookProxyHost}`

    const tunnel = await localtunnel({
      host,
      port,
      subdomain: this.webhookProxySubDomain,
    })

    log.verbose('Webhook', 'setupTunnel() created at %s', tunnel.url)

    if (tunnel.url !== this.options.webhookProxyUrl) {
      throw new Error(`Webhook: webhookUrlUrl is not available ${this.options.webhookProxyUrl}`)
    }

    tunnel.on('close', () => {
      log.verbose('Webhook', 'setupTunnel() tunnel.on(close)')
      // TODO: check if need to reconnect at here.
      // FIXME: try to recover by restarting, or throw error when can not recover
    })

    this.tunnel = tunnel
  }

  async appGet (
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    log.verbose('Webhook', 'appGet({url: %s})', req.url)

    const {
      signature,
      timestamp,
      nonce,
      echostr,
    }             = req.query as { [key: string]: string }

    if (this.options.verify({
      nonce,
      signature,
      timestamp,
    })) {
      log.verbose('Webhook', 'appGet() verify() succeed')
      res.end(echostr)
    } else {
      log.verbose('Webhook', 'appGet() verify() failed')
      res.end()
    }
  }

  async appPost (
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    const payload = req.body.xml as OAMessagePayload
    log.verbose('Webhook', 'appPost({url: %s} with payload: %s',
      req.url,
      JSON.stringify(payload)
    )

    const knownTypeList = [
      'text',
      'image',
    ]

    this.userOpen[payload.FromUserName] = true
    /**
     * TODO: support more MsgType
     */
    if (knownTypeList.includes(payload.MsgType)) {
      this.emit('message', payload)
    }

    /**
     * 假如服务器无法保证在五秒内处理并回复，必须做出下述回复，这样微信服务器才不会对此作任何处理，
     * 并且不会发起重试（这种情况下，可以使用客服消息接口进行异步回复），否则，将出现严重的错误提示。
     *  1、直接回复success（推荐方式）
     *  2、直接回复空串（指字节长度为0的空字符串，而不是XML结构体中content字段的内容为空）
     *
     *  https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Passive_user_reply_message.html
     */
    if (this.personalMode) {
      let reply: string|null = null
      const timeout = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
      for (let i = 0; i < (4000 / 5); i++) {
        await timeout(5)
        if (this.messageCache[payload.FromUserName]) {
          const msg: any = this.messageCache[payload.FromUserName]
          this.messageCache[payload.FromUserName] = undefined

          if (msg.msgtype === 'text') {
            reply = `<xml>
              <ToUserName><![CDATA[${payload.FromUserName}]]></ToUserName>
              <FromUserName><![CDATA[${payload.ToUserName}]]></FromUserName>
              <CreateTime>${payload.CreateTime}</CreateTime>
              <MsgType><![CDATA[text]]></MsgType>
              <Content><![CDATA[${msg.content}]]></Content>
            </xml>
            `
          }
          break
        }
      }
      if (reply) {
        this.userOpen[payload.FromUserName] = undefined
        return res.end(reply)
      }
    }
    this.userOpen[payload.FromUserName] = undefined
    res.end('success')
  }

}

export { Webhook }
