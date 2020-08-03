import http         from 'http'
import express      from 'express'
import xmlParser    from 'express-xml-bodyparser'
import localtunnel  from 'localtunnel'

import TypedEventEmitter from 'typed-emitter'

import { log } from 'wechaty-puppet'
import { EventEmitter } from 'events'

import { OAMessagePayload }   from './schema'

const LOCAL_TUNNEL_HOST_PARTIAL_LIST = [
  'https://',
  'serverless.social',
]

const WebhookEventEmitter = EventEmitter as new () => TypedEventEmitter<{
  message: (message: OAMessagePayload) => void,
}>

export interface VerifyArgs {
  timestamp : string,
  nonce     : string,
  signature : string,
}

interface WebhookOptions {
  port?            : number
  webhookProxyUrl? : string
  verify           : (args: VerifyArgs) => boolean
}

class Webhook extends WebhookEventEmitter {

  protected server? : http.Server
  protected tunnel? : localtunnel.Tunnel

  public readonly subdomain? : string

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

    if (options.webhookProxyUrl) {
      this.subdomain = this.parseSubDomain(options.webhookProxyUrl)
      if (!this.subdomain) {
        throw new Error(`Webhook: invalid webhookProxyUrl ${options.webhookProxyUrl}`)
      }
    }
  }

  parseSubDomain (
    webhookProxyUrl: string,
  ): undefined | string {
    log.verbose('Webhook', 'parseSubDomain(%s)', webhookProxyUrl)

    if (!webhookProxyUrl.startsWith(LOCAL_TUNNEL_HOST_PARTIAL_LIST[0]))  { return }
    if (!webhookProxyUrl.endsWith(LOCAL_TUNNEL_HOST_PARTIAL_LIST[1]))    { return }

    const subdomain = webhookProxyUrl.slice(
      LOCAL_TUNNEL_HOST_PARTIAL_LIST[0].length,
      -1 /** -1 for getting rid of the dot (.)serverless.social */
        - LOCAL_TUNNEL_HOST_PARTIAL_LIST[1].length,
    )
    log.verbose('Webhook', 'parseSubDomain() succeed: %s', subdomain)

    return subdomain
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
      server.listen(0, () => {
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

    const host = LOCAL_TUNNEL_HOST_PARTIAL_LIST.join('')

    const tunnel = await localtunnel({
      host,
      port,
      subdomain: this.subdomain,
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

    /**
     * TODO: support more MsgType
     */
    if (knownTypeList.includes(payload.MsgType)) {
      this.emit('message', payload)
    }
    // console.info(payload)

    /**
     * 假如服务器无法保证在五秒内处理并回复，必须做出下述回复，这样微信服务器才不会对此作任何处理，
     * 并且不会发起重试（这种情况下，可以使用客服消息接口进行异步回复），否则，将出现严重的错误提示。
     *  1、直接回复success（推荐方式）
     *  2、直接回复空串（指字节长度为0的空字符串，而不是XML结构体中content字段的内容为空）
     *
     *  https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Passive_user_reply_message.html
     */
    res.end('success')
  }

}

export { Webhook }
