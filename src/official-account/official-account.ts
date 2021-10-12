/* eslint-disable camelcase */
import {
  ContactGender,
  FileBox,
  log,
  MiniProgramPayload,
  UrlLinkPayload,
}                       from 'wechaty-puppet'
import pkg from 'uuid'
import crypto           from 'crypto'
import { EventEmitter } from 'events'
import { FileBoxType }  from 'file-box'

import {
  Webhook,
  VerifyArgs,
}                             from './webhook.js'
import {
  getSimpleUnirest,
  SimpleUnirest,
}                             from './simple-unirest.js'
import type {
  OAMessageType,
  // OAMediaPayload,
  OAMediaType,
  ErrorPayload,
  OAContactPayload,
  OATagPayload,
  OAMessagePayload,
}                             from './schema.js'
import { PayloadStore }       from './payload-store.js'
import { getTimeStampString } from './utils.js'
import { normalizeFileBox }   from './normalize-file-box.js'

export interface OfficialAccountOptions {
  appId                : string,
  appSecret            : string,
  port?                : number,
  token                : string,
  webhookProxyUrl?     : string,
  personalMode?        : boolean,
  accessTokenProxyUrl? : string,
}

export interface AccessTokenPayload {
  expiresIn : number,
  timestamp : number,
  token     : string,
}
const { v4 } = pkg
type StopperFn = () => void

class OfficialAccount extends EventEmitter {

  payloadStore : PayloadStore

  protected webhook       : Webhook
  protected simpleUnirest : SimpleUnirest

  protected accessTokenPayload? : AccessTokenPayload

  protected stopperFnList : StopperFn[]
  protected oaId          : string

  // proxy of the access token center
  protected accessTokenProxyUrl?: string

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

    // keep the official account id consist with puppet-oa
    this.oaId = `gh_${options.appId}`
    // this.oaId = `${options.appId}`

    this.webhook = new Webhook({
      personalMode    : !!this.options.personalMode,
      port            : this.options.port,
      verify          : this.verify.bind(this),
      webhookProxyUrl : this.options.webhookProxyUrl,
    })

    this.payloadStore  = new PayloadStore(options.appId)
    this.simpleUnirest = getSimpleUnirest('https://api.weixin.qq.com/cgi-bin/')
    this.stopperFnList = []

    this.accessTokenProxyUrl = options.accessTokenProxyUrl
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

    // emit login & ready event
    this.emit('login')
    this.emit('ready')
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

    let simpleUnirest: SimpleUnirest = this.simpleUnirest
    // NOTE: it will fetch accessToken from the specific endpoint
    if (this.accessTokenProxyUrl) {
      simpleUnirest = getSimpleUnirest(this.accessTokenProxyUrl)
    }

    const ret = await simpleUnirest
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

    /**
     * Huan(202102): Why we lost `NodeJS` ?
     *
     *  https://stackoverflow.com/a/56239226/1123955
     */
    let timer: undefined | ReturnType<typeof setTimeout>

    const update =  ():any => this.updateAccessToken()
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
    touser: string,
    msgtype: OAMessageType,
    content: string,
  }): Promise<string> {
    this.webhook.emit('instantReply', args)
    return 'default-custome-message-id'
  }

  /**
   * 客服接口-发消息
   *  https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Service_Center_messages.html#7
   */
  async sendCustomMessage (args: {
    touser: string,
    msgtype: OAMessageType,
    content: string,
  }): Promise<string> {
    log.verbose('OfficialAccount', 'sendCustomMessage(%s)', JSON.stringify(args))

    const ret = await this.simpleUnirest
      .post<ErrorPayload>(`message/custom/send?access_token=${this.accessToken}`)
      .type('json')
      .send({
        msgtype : args.msgtype,
        text    :
        {
          content : args.content,
        },
        touser : args.touser,
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

    // save the official-account payload
    if (ret.body.errcode) {
      throw new Error(`OfficialAccount sendCustomMessage() can send message <${JSON.stringify(args)}>`)
    }

    const uuid: string = v4()
    await this.payloadStore.setMessagePayload(uuid, {
      CreateTime   : getTimeStampString(),
      FromUserName : this.oaId,
      MsgId        : uuid,
      MsgType      : 'text',
      ToUserName   : args.touser,
    })
    return uuid
  }

  async sendCustomLink (args: {
    link:UrlLinkPayload
    touser: string,
  }): Promise<string> {
    log.verbose('OfficialAccount', 'sendCustomLink(%s)', JSON.stringify(args))
    const msgtype: OAMessageType = 'link'
    const ret = await this.simpleUnirest
      .post<ErrorPayload>(`message/custom/send?access_token=${this.accessToken}`)
      .type('json')
      .send({
        msgtype    : 'link',
        [msgtype]  :
        {
          description: args.link.description,
          thumb_url  : args.link.thumbnailUrl,
          title      : args.link.title,
          url        : args.link.url,
        },
        touser    : args.touser,
      })

    if (ret.body.errcode) {
      throw new Error(`OfficialAccount sendCustomLink() can send link <${JSON.stringify(args)}>`)
    }

    const uuid: string = v4()
    await this.payloadStore.setMessagePayload(uuid, {
      CreateTime   : getTimeStampString(),
      FromUserName : this.oaId,
      MsgId        : uuid,
      MsgType      : 'link',
      ToUserName   : args.touser,
    })
    return uuid
  }

  async sendCustomMiniProgram (args: {
    miniProgram:MiniProgramPayload
    touser: string,
  }): Promise<string> {
    log.verbose('OfficialAccount', 'sendCustomMiniProgram(%s)', JSON.stringify(args))
    const msgtype:OAMessageType = 'miniprogrampage'
    const ret = await this.simpleUnirest
      .post<ErrorPayload>(`message/custom/send?access_token=${this.accessToken}`)
      .type('json')
      .send({
        msgtype    : 'miniprogrampage',
        [msgtype]  :
        {
          appid         : args.miniProgram.appid,
          pagepath      : args.miniProgram.pagePath,
          thumb_media_id: args.miniProgram.thumbKey,
          title         : args.miniProgram.title,
        },
        touser     : args.touser,
      })

    if (ret.body.errcode) {
      throw new Error(`OfficialAccount sendCustomMiniProgram can send miniProgram <${JSON.stringify(args)}>`)
    }

    const uuid: string = v4()
    await this.payloadStore.setMessagePayload(uuid, {
      CreateTime   : getTimeStampString(),
      FromUserName : this.oaId,
      MsgId        : uuid,
      MsgType      : 'miniprogrampage',
      ToUserName   : args.touser,
    })
    return uuid
  }

  async sendFile (args: {
    file    : FileBox,
    touser  : string,
    msgtype : OAMediaType,
  }): Promise<string> {
    log.verbose('OfficialAccount', 'sendFile(%s)', JSON.stringify(args))
    // JSON.stringify does not support .mp3 filetype

    await args.file.ready()
    const { buf, info } = await normalizeFileBox(args.file)

    // all of the image file are compressed into image/jpeg type
    // and fetched fileBox has no name, which will cause error in upload file process.
    // this works for all of the image file
    // TODO -> should be improved later.

    if (args.file.type() === FileBoxType.Url && args.file.mimeType === 'image/jpeg') {
      info.filename = `${args.file.name}.jpeg`
    }

    if (args.file.type() === FileBoxType.Url && args.file.mimeType === 'audio/amr') {
      info.filename = `${args.file.name}`
    }
    const mediaResponse = await this.simpleUnirest.post<Partial<ErrorPayload> & {
      media_id   : string,
      created_at : string,
      type       : string,
    }>(`media/upload?access_token=${this.accessToken}&type=${args.msgtype}`).attach('attachments[]', buf, info)
    // the type of result is string
    if (typeof mediaResponse.body === 'string') {
      mediaResponse.body = JSON.parse(mediaResponse.body)
    }

    const data = {
      [args.msgtype] :
        {
          media_id : mediaResponse.body.media_id,
        },
      msgtype : args.msgtype,
      touser  : args.touser,
    }

    const messageResponse = await this.simpleUnirest.post<ErrorPayload>(`message/custom/send?access_token=${this.accessToken}`).type('json').send(data)
    if (messageResponse.body.errcode) {
      log.error('OfficialAccount', 'SendFile() can not send file to wechat user .<%s>', messageResponse.body.errmsg)
      throw new Error(`OfficialAccount', 'SendFile() can not send file to wechat user .<${messageResponse.body.errmsg}>'`)
    }

    // Now only support uploading image or audio.
    // Notes about image upload:
    // Situation One: when contact user send image file to oa, there will be PicUrl & MediaId fields
    // Situation Two: when server send file to tencent server, there is only MediaId field.
    if (!(args.msgtype === 'voice' || args.msgtype === 'image' || args.msgtype === 'video')) {
      throw new Error(`OfficialAccount, sendFile() doesn't support message type ${args.msgtype}`)
    }
    const messagePayload: OAMessagePayload = {
      CreateTime   : getTimeStampString(),
      FromUserName : this.oaId,
      MediaId      : mediaResponse.body.media_id,
      MsgId        : v4(),
      MsgType      : args.msgtype,
      ToUserName   : args.touser,
    }
    await this.payloadStore.setMessagePayload(messagePayload.MsgId, messagePayload)
    return messagePayload.MsgId
  }

  async getContactList (): Promise<string[]> {
    log.verbose('OfficialAccount', 'getContactList')

    let openIdList: string[] = []
    let nextOpenId = ''

    while (true) {
      const req = await this.simpleUnirest.get<Partial<ErrorPayload> & {
        total : number,
        count : number,
        data  : {
          openid : string[]
        },
        next_openid : string
      }>(`user/get?access_token=${this.accessToken}&next_openid=${nextOpenId}`)

      if (req.body.errcode) {
        log.error(`OfficialAccount', 'getContactList() ${req.body.errmsg}`)
        return openIdList
      }

      if (!req.body.next_openid) {
        break
      }
      openIdList = openIdList.concat(req.body.data.openid)
      nextOpenId = req.body.next_openid
    }
    return openIdList
  }

  async getContactPayload (openId: string): Promise<void | OAContactPayload> {
    log.verbose('OfficialAccount', 'getContactPayload(%s)', openId)

    if (openId && openId.startsWith('gh_')) {
    // if (openId) {

      // wechaty load the SelfContact object, so just return it.
      /* eslint-disable sort-keys */
      const selfContactPayload: OAContactPayload = {
        subscribe       : 0,
        openid          : openId,
        nickname        : 'from official-account options ?',
        sex             : ContactGender.Unknown,
        language        : 'zh_CN',
        city            : '北京',
        province        : '北京',
        country         : '中国',
        headimgurl      : '',
        subscribe_time  : 0,
        unionid         : '0',
        remark          : '微信公众号客服',
        groupid         : 0,
        tagid_list      : [],
        subscribe_scene : '',
        qr_scene        : 0,
        qr_scene_str    : '',
      }
      return selfContactPayload
    }

    const res = await this.simpleUnirest.get<OAContactPayload>(`user/info?access_token=${this.accessToken}&openid=${openId}&lang=zh_CN`)

    if (res.body.errcode) {
      log.error(`OfficialAccount', 'getContactPayload() ${res.body.errmsg}`)
      return
    }

    // const payload: ContactPayload = {
    //   alias     : res.body.remark,
    //   avatar    : res.body.headimgurl,
    //   city      : res.body.city,
    //   friend    : true,
    //   gender    : res.body.sex,
    //   id        : res.body.openid,
    //   name      : res.body.nickname,
    //   province  : res.body.province,
    //   signature : '',
    //   star      : false,
    //   type      : ContactType.Individual,
    //   weixin    : res.body.unionid,
    // }

    /*
    * wj-Mcat: What kind of the ContactType should be ?
    * TODO -> there are some data can be feed into ContactPayload
    */
    return res.body
  }

  async updateContactRemark (openId: string, remark: string): Promise<void> {
    log.verbose('OfficialAccount', 'setContactRemark(%s)', JSON.stringify({ openId, remark }))

    const res = await this.simpleUnirest.post<ErrorPayload>(`user/info/updateremark?access_token=${this.accessToken}`)

    if (res.body.errcode) {
      log.error('OfficialAccount', 'setContactRemark() can update contact remark (%s)', res.body.errmsg)
    }
  }

  async createTag (name: string): Promise<void | string> {
    log.verbose('OfficialAccount', 'createTag(%s)', name)

    const res = await this.simpleUnirest.post<Partial<ErrorPayload> & {
      tag?: {
        id : string,
      }
    }>(`tags/create?access_token=${this.accessToken}`)
    if (res.body.errcode) {
      log.error('OfficialAccount', 'createTag(%s) error code : %s', name, res.body.errcode)
    } else {
      return name
    }
  }

  async getTagList (): Promise<OATagPayload[]> {
    log.verbose('OfficialAccount', 'getTagList()')

    const res = await this.simpleUnirest.get<Partial<ErrorPayload> & {
      tags : OATagPayload[]
    }>(`tags/get?access_token=${this.accessToken}`)

    if (res.body.errcode) {
      log.error('OfficialAccount', 'getTagList() error code : %s', res.body.errcode)
      return []
    }

    if (!res.body.tags || res.body.tags.length === 0) {
      log.warn('OfficialAccount', 'getTagList() get empty tag list')
      return []
    }
    return res.body.tags
  }

  private async getTagIdByName (tagName: string): Promise<number| null> {
    log.verbose('OfficialAccount', 'deleteTag(%s)', tagName)

    /**
     * TODO: this is not a frequent interface, So I don't cache the taglist
     */
    const tagList: OATagPayload[] = await this.getTagList()
    const  tag: OATagPayload[]    = tagList.filter((item) => item.name === tagName)

    if (!tag || tag.length === 0) {
      return null
    }
    return tag[0]!.id
  }

  async deleteTag (tagName: string): Promise<void> {
    log.verbose('OfficialAccount', 'deleteTag(%s)', tagName)

    // find tagId by tagName from tagList
    const tagId = await this.getTagIdByName(tagName)

    if (!tagId) {
      throw new Error(`can not find tag(${tagName})`)
    }
    const res = await this.simpleUnirest.post<Partial<ErrorPayload>>(`tags/delete?access_token=${this.accessToken}`).send({
      tag: {
        id : tagId,
      },
    })

    if (res.body.errcode) {
      log.error('OfficialAccount', 'deleteTag() error code : %s', res.body.errcode)
    }
  }

  async addTagToMembers (tagName: string, openIdList: string[]): Promise<void> {
    log.verbose('OfficialAccount', 'addTagToMembers(%s)', JSON.stringify({ tagName, openIdList }))

    const tagId = await this.getTagIdByName(tagName)

    if (!tagId) {
      throw new Error(`can not find tag(${tagName})`)
    }
    const res = await this.simpleUnirest.post<Partial<ErrorPayload>>(`tags/members/batchtagging?access_token=${this.accessToken}`).send({
      opeid_list : openIdList,
      tag_id     : tagId,
    })

    if (res.body.errcode) {
      log.error('OfficialAccount', 'addTagToMembers() error code : %s', res.body.errcode)
    }
  }

  async removeTagFromMembers (tagName: string, openIdList: string[]): Promise<void> {
    log.verbose('OfficialAccount', 'removeTagFromMembers(%s)', JSON.stringify({ tagName, openIdList }))

    const tagId = await this.getTagIdByName(tagName)
    if (!tagId) {
      throw new Error(`can not find tag(${tagName})`)
    }

    const res = await this.simpleUnirest.post<Partial<ErrorPayload>>(`tags/members/batchuntagging?access_token=${this.accessToken}`).send({
      opeid_list : openIdList,
      tag_id     : tagId,
    })

    if (res.body.errcode) {
      log.error('OfficialAccount', 'removeTagFromMembers() error code : %s', res.body.errcode)
    }
  }

  async getMemberTags (openid: string): Promise<string[]> {
    log.verbose('OfficialAccount', 'getMemberTags(%s)', openid)

    const res = await this.simpleUnirest.post<Partial<ErrorPayload> & {
      tagid_list : number[]
    }>(`tags/getidlist?access_token=${this.accessToken}`).send({
      openid : openid,
    })

    if (res.body.errcode) {
      throw new Error(`OfficialAccount deleteTag() error code : ${res.body.errcode}`)
    }

    // 1. build the tag id-name map to improve search efficiency
    const allTagList = await this.getTagList()
    const tagIdMap   = allTagList.reduce((map: any, tag) => { map[tag.id] = tag.name; return map }, {})

    // 2. retrive the names from id
    const tagNames: string[] = []

    for (const tagId of res.body.tagid_list) {
      if (tagId in tagIdMap) {
        tagNames.push(tagIdMap[tagId])
      }
    }

    return tagNames
  }

  async getAudioUrl (mediaId: string): Promise<string> {
    // NOTE(zhangfan): As per Wechat API documentation (https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/Get_temporary_materials.html),
    // /media/get behavior is not documented if the retrieved media content is an audio.
    // From real world testing, we learned it returns the audio content directly.
    // This is subject to changes.
    //
    // Here is an excerpt of the response header seen in tests:
    // "connection": "close",
    // "cache-control": "no-cache, must-revalidate",
    // "date": "Thu, 04 Feb 2021 08:51:34 GMT",
    // "content-disposition": "attachment; filename=\"Nz30tHrSoMhGf7FcOmddXuCIud-TP7Z71Yci6nOgYtGnLTkoD9V4yisRlj75Ghs7.amr\"",
    // "content-type": "audio/amr",
    // "content-length": "8630"
    return `https://api.weixin.qq.com/cgi-bin/media/get?access_token=${this.accessToken}&media_id=${mediaId}`
  }

  async setMemberRemark (openid: string, remark: string): Promise<void> {
    log.verbose('OfficialAccount', 'setMemberRemark(%s)', openid)

    const res = await this.simpleUnirest.post<Partial<ErrorPayload>>(`user/info/updateremark?access_token=${this.accessToken}`).send({
      openid : openid,
      remark : remark,
    })

    if (res.body.errcode) {
      log.error('OfficialAccount', 'deleteTag() error code : %s', res.body.errcode)
    }
  }

  async sendBatchTextMessageByTagId (tagId: number, msg: string): Promise<void> {
    log.verbose('OfficialAccount', 'sendBatchTextMessageByTagId(%s)', JSON.stringify({ tagId, msg }))

    const res = await this.simpleUnirest.post<Partial<ErrorPayload> & {
      msg_id      : number,
      msg_data_id : number,
    }>(`message/mass/sendall?access_token=${this.accessToken}`).send({
      filter: {
        is_to_all : false,
        tag_id    : tagId,
      },
      text: {
        content : msg,
      },
      msgtype : 'text',
    })

    if (res.body.errcode) {
      log.error('OfficialAccount', 'deleteTag() error code : %s', res.body.errcode)
    }
  }

  async sendBatchTextMessageByOpenidList (openidList: string[], msg: string): Promise<void> {
    log.verbose('OfficialAccount', 'sendBatchTextMessageByOpenidList(%s)', JSON.stringify({ openidList, msg }))

    const res = await this.simpleUnirest.post<Partial<ErrorPayload> & {
      msg_id      : number,
      msg_data_id : number,
    }>(`message/mass/send?access_token=${this.accessToken}`).send({
      touser  : openidList,
      msgtype : 'text',
      text    : { content: msg },
    })

    if (res.body.errcode) {
      log.error('OfficialAccount', 'deleteTag() error code : %s', res.body.errcode)
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
