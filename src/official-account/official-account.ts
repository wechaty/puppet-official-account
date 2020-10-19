/* eslint-disable camelcase */
import { EventEmitter } from 'events'

import crypto   from 'crypto'
import { FileBox, log }  from 'wechaty-puppet'

import { normalizeFileBox } from './normalize-file-box'

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
  OAMediaPayload,
  OAMediaType,
}                       from './schema'

export interface OfficialAccountOptions {
  appId            : string,
  appSecret        : string,
  port?            : number,
  token            : string,
  webhookProxyUrl? : string,
  personalMode?    : boolean,
}

interface AccessTokenPayload {
  expiresIn : number,
  timestamp : number,
  token     : string,
}

interface ErrorPayload {
  errcode : number,
  errmsg  : string,
}

type StopperFn = () => void

class OfficialAccount extends EventEmitter {

  payloadStore: PayloadStore

  protected webhook       : Webhook
  protected simpleUnirest : SimpleUnirest

  protected accessTokenPayload?  : AccessTokenPayload

  protected stopperFnList: StopperFn[]

  get accessToken (): string {
    if (!this.accessTokenPayload) {
      throw new Error('accessToken() this.accessTokenPayload uninitialized!')
    }
    return this.accessTokenPayload.token
  }

  constructor (
    public options: OfficialAccountOptions,
  ) {
    super()
    log.verbose('OfficialAccount', 'constructor(%s)', JSON.stringify(options))

    this.webhook = new Webhook({
      personalMode: !!this.options.personalMode,
      port: this.options.port,
      verify: this.verify.bind(this),
      webhookProxyUrl: this.options.webhookProxyUrl,
    })

    this.payloadStore  = new PayloadStore()
    this.simpleUnirest = getSimpleUnirest('https://api.weixin.qq.com/cgi-bin/')
    this.stopperFnList = []
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

    const succeed = await this.updateAccessToken()
    if (!succeed) {
      log.error('OfficialAccount', 'start() updateAccessToken() failed.')
    }

    const stopper = await this.startSyncingAccessToken()
    this.stopperFnList.push(stopper)

    await this.webhook.start()
  }

  async stop () {
    log.verbose('OfficialAccount', 'stop()')

    while (this.stopperFnList.length > 0) {
      const stopper = this.stopperFnList.pop()
      if (stopper) {
        await stopper()
      }
    }

    if (this.webhook) {
      await this.webhook.stop()
    }
    await this.payloadStore.stop()
  }

  protected async updateAccessToken (): Promise<boolean> {
    log.verbose('OfficialAccount', 'updateAccessToken()')

    /**
     * updated: {
     *  "access_token":"3...Q",
     *  "expires_in":7200
     * }
     */
    const ret = await this.simpleUnirest
      .get<Partial<ErrorPayload> & {
        access_token : string
        expires_in   : number
      }>(`token?grant_type=client_credential&appid=${this.options.appId}&secret=${this.options.appSecret}`)

    log.verbose('OfficialAccount', 'updateAccessToken() %s', JSON.stringify(ret.body))

    if (ret.body.errcode && ret.body.errcode > 0) {
      // {"errcode":40164,"errmsg":"invalid ip 111.199.187.71 ipv6 ::ffff:111.199.187.71, not in whitelist hint: [H.BDtZFFE-Q7bNKA] rid: 5f283869-46321ea1-07d7260c"}
      log.warn('OfficialAccount', `updateAccessToken() ${ret.body.errcode}: ${ret.body.errmsg}`)

      if (this.accessTokenPayload) {
        const expireTimestamp = this.accessTokenPayload.timestamp
          + (this.accessTokenPayload.expiresIn * 1000)

        if (expireTimestamp > Date.now()) {
          // expired.
          log.warn('OfficialAccount', 'updateAccessToken() token expired!')
          this.accessTokenPayload = undefined
        }
      }

      return false
    }

    this.accessTokenPayload = {
      expiresIn : ret.body.expires_in,
      timestamp : Date.now(),
      token     : ret.body.access_token,
    }

    log.verbose('OfficialAccount', 'updateAccessToken() synced. New token will expiredIn %s seconds',
      this.accessTokenPayload.expiresIn,
    )

    return true
  }

  /**
   *  https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html
   */
  protected async startSyncingAccessToken (): Promise<StopperFn> {
    log.verbose('OfficialAccount', 'startSyncingAccessToken()')

    const marginSeconds = 5 * 60  // 5 minutes
    const tryAgainSeconds = 60    // 1 minute

    let timer: undefined | NodeJS.Timer

    const update = () => this.updateAccessToken()
      .then(succeed => succeed
        ? this.accessTokenPayload!.expiresIn - marginSeconds
        : tryAgainSeconds
      )
      .then(seconds => setTimeout(update, seconds * 1000))
      // eslint-disable-next-line no-return-assign
      .then(newTimer => timer = newTimer)
      .catch(e => log.error('OfficialAccount', 'startSyncingAccessToken() update() rejection: %s', e))

    if (!this.accessTokenPayload) {
      await update()
    } else {
      const seconds = this.accessTokenPayload.expiresIn - marginSeconds
      timer = setTimeout(update, seconds * 1000)
    }

    return () => timer && clearTimeout(timer)
  }

  async sendCustomMessagePersonal (args: {
    touser  : string,
    msgtype : OAMessageType,
    content : string,
  }) {
    this.webhook.emit('instantReply', args)
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
    /**
     * { errcode: 0, errmsg: 'ok' }
     */

    /**
     * TODO(huan) 202008: deal with this situation
     * {
        errcode: 45015,
        errmsg: 'response out of time limit or subscription is canceled hint: [CgCD2CMre-brVPIA] rid: 5f2b8ff1-4943a9b3-70b9fe5e'
      }
     */
    return ret.body
  }

  async sendFile (args: {
    file: FileBox,
    touser: string,
    msgtype: OAMediaType
  }): Promise<void> {
    log.verbose('OfficialAccount', 'sendFile(%s)', JSON.stringify(args))

    const { buf, info } = await normalizeFileBox(args.file)
    const mediaResponse = await this.simpleUnirest.post<ErrorPayload | OAMediaPayload>(`media/upload?access_token=${this.accessToken}&type=${args.msgtype}`).attach('attachments[]', buf, info)

    const isErrorPayload = (message: ErrorPayload | OAMediaPayload): message is ErrorPayload => {
      return (message as ErrorPayload).errcode !== undefined
    }

    if (isErrorPayload(mediaResponse.body)) {
      log.error('OfficialAccount', 'SendFile() can not send file to tencent server')
      return
    }

    const data = {
      image:
      {
        media_id: mediaResponse.body.mediaId,
      },
      msgtype: args.msgtype,
      touser: args.touser,
    }
    const messageResponse = await this.simpleUnirest.post<ErrorPayload>(`message/custom/send?access_token=${this.accessToken}`).type('json').send(data)
    if (messageResponse.body) {
      log.error('OfficialAccount', 'SendFile() can not send file to wechat user .')
    }
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
