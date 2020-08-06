/* eslint-disable camelcase */
import { EventEmitter } from 'events'

import crypto   from 'crypto'
import { log }  from 'wechaty-puppet'

import {
  Webhook,
  VerifyArgs,
}                      from './webhook'
import { PayloadStore } from './payload-store'
import {
  getSimpleUnirest,
  SimpleUnirest,
}                       from './simple-unirest'
import {
  OAMessageType,
}                       from './schema'

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

  payloadStore: PayloadStore

  protected webhook       : Webhook
  protected simpleUnirest : SimpleUnirest

  protected _accessToken?         : AccessToken
  protected _accessTokenUpdating? : boolean

  get accessToken (): string {
    const outdated = () => {
      if (!this._accessToken) {
        return true
      }

      const durationSeconds = Math.floor(
        (Date.now() - this._accessToken.timestamp) / 1000
      )
      const ttl = this._accessToken.expiresIn - durationSeconds

      log.verbose('OfficialAccount', 'accessToken() outdated() token expires in %s seconds, %s minutes',
        ttl,
        Math.floor(ttl / 60),
      )
      return ttl < 0
    }

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

    this.payloadStore = new PayloadStore()
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

    this.webhook.on('message', async message => {
      await this.payloadStore.setMessagePayload(message.MsgId, message)
      this.emit('message', message)
    })

    await this.payloadStore.start()
    await this.updateAccessToken()
    await this.webhook.start()
  }

  async stop () {
    log.verbose('OfficialAccount', 'stop()')
    if (this.webhook) {
      await this.webhook.stop()
    }
    await this.payloadStore.stop()
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
        .get<Partial<ErrorPayload> & {
          access_token : string
          expires_in   : number
        }>(`token?grant_type=client_credential&appid=${this.options.appId}&secret=${this.options.appSecret}`)

      log.verbose('OfficialAccount', 'updateAccessToken() updated: %s', JSON.stringify(ret.body))

      if (ret.body.errcode && ret.body.errcode > 0) {
        // {"errcode":40164,"errmsg":"invalid ip 111.199.187.71 ipv6 ::ffff:111.199.187.71, not in whitelist hint: [H.BDtZFFE-Q7bNKA] rid: 5f283869-46321ea1-07d7260c"}
        throw new Error(`Official Account updateAccessToken() Error ${ret.body.errcode}: ${ret.body.errmsg}`)
      }

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

  /**
   * 获取授权方的帐号基本信息
   *  该 API 用于获取授权方的基本信息，包括头像、昵称、帐号类型、认证类型、微信号、原始ID和二维码图片URL。
   *  https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/api/api_get_authorizer_info.html
   */
  // async getInfo () {
  //   log.verbose('OfficialAccount', 'sendCustomMessage(%s)', JSON.stringify(args))

  //   const ret = await this.simpleUnirest
  //     .post<ErrorPayload>(`component/api_get_authorizer_info?component_access_token=${this.accessToken}`)
  //     .type('json')
  //     .send({
  //       msgtype: args.msgtype,
  //       text:
  //       {
  //         content: args.content,
  //       },
  //       touser: args.touser,
  //     })

  //   return ret.body
  //   POST https://api.weixin.qq.com/cgi-bin/

  // }

}

export { OfficialAccount }
