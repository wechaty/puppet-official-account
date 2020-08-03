/* eslint-disable camelcase */
import { EventEmitter } from 'events'

import crypto from 'crypto'
import { log } from 'wechaty-puppet'

import {
  Webhook,
  VerifyArgs,
}             from './webhook'
import {
  getSimpleUnirest,
  SimpleUnirest,
}                     from './simple-unirest'
import {
  OAMessageType,
}                     from './schema'

export interface OfficialAccountOptions {
  appId            : string,
  appSecret        : string,
  port?            : number,
  token            : string,
  webhookProxyUrl? : string,
}

interface AccessToken {
  token: string,
  timestamp: number,
  expiresIn: number,
}

interface ErrorPayload {
  errcode : number,
  errmsg  : string,
}

class OfficialAccount extends EventEmitter {

  webhook       : Webhook
  simpleUnirest : SimpleUnirest

  protected _accessToken?         : AccessToken
  protected _accessTokenUpdating? : boolean

  get accessToken (): string {
    const outdated = () => !this._accessToken || (Date.now() - this._accessToken.timestamp > this._accessToken.expiresIn)

    if (outdated()) {
      this.updateAccessToken()
        .catch(e => log.warn('OfficialAccount', 'accessToken() this.updateAccessToken() rejection: %s', e))
    }

    if (!this._accessToken) {
      throw new Error('accessToken() this._accessToken initialized!')
    }

    return this._accessToken.token
  }

  constructor (
    public options: OfficialAccountOptions,
  ) {
    super()
    log.verbose('OfficialAccount', 'constructor(%s)', JSON.stringify(options))

    this.webhook = new Webhook({
      port: this.options.port,
      verify: this.verify.bind(this),
      webhookProxyUrl: this.options.webhookProxyUrl,
    })

    this.simpleUnirest = getSimpleUnirest('https://api.weixin.qq.com/cgi-bin/')
  }

  verify (args: VerifyArgs): boolean {
    log.verbose('OfficialAccount', 'verify(%s)', JSON.stringify(args))

    const data = [
      args.timestamp,
      args.nonce,
      this.options.token,
    ].sort().join('')

    const digest = crypto
      .createHash('sha1')
      .update(data)
      .digest('hex')

    return digest === args.signature
  }

  async start () {
    log.verbose('OfficialAccount', 'start()')

    const future = this.updateAccessToken()

    this.webhook.on('message', message => this.emit('message', message))

    await this.webhook.start()
    await future
  }

  async stop () {
    log.verbose('OfficialAccount', 'stop()')
    if (this.webhook) {
      await this.webhook.stop()
    }
  }

  /**
   *  https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html
   */
  protected async updateAccessToken (): Promise<string> {
    log.verbose('OfficialAccount', 'updateAccessToken()')

    if (this._accessToken && this._accessTokenUpdating) {
      log.verbose('OfficialAccount', 'updateAccessToken() another update task is running.')
      return this._accessToken.token
    }

    this._accessTokenUpdating = true

    try {
      const ret = await this.simpleUnirest
        .get<{
          access_token : string
          expires_in   : number
        }>(`token?grant_type=client_credential&appid=${this.options.appId}&secret=${this.options.appSecret}`)

      log.verbose('OfficialAccount', 'updateAccessToken() %s', JSON.stringify(ret.body))

      this._accessToken = {
        expiresIn : ret.body.expires_in,
        timestamp : Date.now(),
        token     : ret.body.access_token,
      }

      return this._accessToken.token

    } catch (e) {
      log.warn('OfficialAccount', 'updateAccessToken() rejection: %s', e)
      throw e
    } finally {
      this._accessTokenUpdating = false
    }
  }

  /**
   * 客服接口-发消息
   *  https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Service_Center_messages.html#7
   */
  async sendCustomMessage (args: {
    touser: string,
    msgtype: OAMessageType,
    content: string,
  }): Promise<ErrorPayload> {
    log.verbose('OfficialAccount', 'sendCustomMessage(%s)', JSON.stringify(args))

    const ret = await this.simpleUnirest
      .post<ErrorPayload>(`message/custom/send?access_token=${this.accessToken}`)
      .type('json')
      .send({
        msgtype: args.msgtype,
        text:
        {
          content: args.content,
        },
        touser: args.touser,
      })

    return ret.body
  }

}

export { OfficialAccount }
