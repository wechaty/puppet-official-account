/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

import {
  ContactPayload,

  FileBox,

  FriendshipPayload,

  ImageType,

  MessagePayload,

  Puppet,
  PuppetOptions,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,

  UrlLinkPayload,
  MiniProgramPayload,

  log,
  MessageType,
  ContactType,
  PayloadType,
  LocationPayload,
}                           from 'wechaty-puppet'

import {
  VERSION,
  qrCodeForChatie,
  envOptions,
}                   from './config.js'

import {
  OfficialAccountOptions,
  OfficialAccount,
}                   from './official-account/official-account.js'
import type {
  OAContactPayload,
  OAMessagePayload,
  OAMediaType,
}                   from './official-account/schema.js'

export type PuppetOAOptions = PuppetOptions & Partial<OfficialAccountOptions>

class PuppetOA extends Puppet {

  override messageLocation (_messageId: string): Promise<LocationPayload> {
    throw new Error('Method not implemented.')
  }

  override messageSendLocation (_conversationId: string, _locationPayload: LocationPayload): Promise<string | void> {
    throw new Error('Method not implemented.')
  }

  override contactPhone (contactId: string, phoneList: string[]): Promise<void> {
    log.info('contactPhone(%s, %s)', contactId, phoneList)
    throw new Error('Method not implemented.')
  }

  override contactCorporationRemark (contactId: string, corporationRemark: string | null): Promise<void> {
    log.info('contactCorporationRemark(%s, %s)', contactId, corporationRemark)
    throw new Error('Method not implemented.')
  }

  override contactDescription (contactId: string, description: string | null): Promise<void> {
    log.info('contactDescription(%s, %s)', contactId, description)
    throw new Error('Method not implemented.')
  }

  static override readonly VERSION = VERSION

  protected appId            : string
  protected appSecret        : string
  protected port?            : number
  protected token            : string
  protected webhookProxyUrl? : string
  protected personalMode?    : boolean

  protected accessTokenProxyUrl? : string

  protected oa? : OfficialAccount

  constructor (
    options: PuppetOAOptions = {},
  ) {
    super()
    log.verbose('PuppetOA', 'constructor()')

    options = {
      ...envOptions(),
      ...options,
    }

    if (options.appId) {
      this.appId = options.appId
    } else {
      throw new Error(`
        PuppetOA: appId not found. Please either set the WECHATY_PUPPET_OA_APP_ID environment variable, or set 'appId' optoins for PuppetOA.
      `)
    }

    if (options.appSecret) {
      this.appSecret = options.appSecret
    } else {
      throw new Error(`
        PuppetOA: appSecret not found. Please either set the WECHATY_PUPPET_OA_APP_SECRET environment variable, or set 'appSecret' options for PuppetOA.
      `)
    }

    if (options.token) {
      this.token = options.token
    } else {
      throw new Error(`
        PuppetOA: token not found. Please either set WECHATY_PUPPET_OA_TOKEN environment variabnle, or set 'token' options for PuppetOA.
      `)
    }

    if (options.personalMode) {
      this.personalMode = options.personalMode
    } else {
      this.personalMode = false
    }

    this.port            = options.port
    this.webhookProxyUrl = options.webhookProxyUrl

    /**
     * NOTE: if the ip address of server is dynamic, it can't fetch the accessToken from tencent server.
     * So, the accessTokenProxyUrl configuration is needed to fetch the accessToken from the specific endpoint.
     *
     * eg: accessTokenProxyUrl = 'http://your-endpoint/'
     * puppet-oa will fetch accessToken from: http://your-endpoint/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}
     */
    if (options.accessTokenProxyUrl) {
      if (options.accessTokenProxyUrl.endsWith('/')) {
        options.accessTokenProxyUrl = options.accessTokenProxyUrl.substring(0, options.accessTokenProxyUrl.length - 1)
      }
      this.accessTokenProxyUrl = options.accessTokenProxyUrl
    }
  }

  override version (): string {
    return VERSION
  }

  override async onStart (): Promise<void> {
    log.verbose('PuppetOA', 'onStart()')

    this.oa = new OfficialAccount({
      appId           : this.appId,
      appSecret       : this.appSecret,
      personalMode    : this.personalMode,
      port            : this.port,
      token           : this.token,
      webhookProxyUrl : this.webhookProxyUrl,
    })
    // FIXME: Huan(202008) find a way to get the bot user information
    // Official Account Info can be customized by user, so It should be
    // configured by environment variable.
    // set gh_ prefix to identify the official-account
    await this.oa.payloadStore.setContactPayload(this.currentUserId, { openid: this.currentUserId } as any)
    this.login(`gh_${this.appId}`)

    this.bridgeEvents(this.oa)
    await this.oa.start()
  }

  protected bridgeEvents (oa: OfficialAccount) {
    oa.on('message', msg => this.emit('message', { messageId: msg.MsgId }))
    oa.on('login', _ => this.login(this.currentUserId))
    oa.on('ready', _ => this.emit('ready', { data: 'ready' }))
    oa.on('logout', _ => this.logout('oa.on(logout)'))
  }

  override async onStop (): Promise<void> {
    log.verbose('PuppetOA', 'onStop()')

    if (this.oa) {
      this.oa.removeAllListeners()
      await this.oa.stop()
      this.oa = undefined
    }
  }

  override ding (data?: string): void {
    log.silly('PuppetOA', 'ding(%s)', data || '')
    // FIXME: do the real job
    setTimeout(() => this.emit('dong', { data: data || '' }), 1000)
  }

  /**
   *
   * ContactSelf
   *
   *
   */
  override async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetOA', 'contactSelfQRCode()')
    return 'qrcode in the future ;^)'
  }

  override async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetOA', 'contactSelfName(%s)', name)
  }

  override async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetOA', 'contactSelfSignature(%s)', signature)
  }

  /**
   *
   * Contact
   *
   */
  override contactAlias (contactId: string)                      : Promise<string>
  override contactAlias (contactId: string, alias: string | null): Promise<void>

  override async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetOA', 'contactAlias(%s, %s)', contactId, alias)

    /**
     * 1. set
     */
    if (alias) {
      await this.oa?.updateContactRemark(contactId, alias)
      return alias
    }

    /**
     * 2. get
     */
    const contactPayload = await this.contactPayload(contactId)
    if (!contactPayload.alias) {
      log.warn('Contact<%s> has no alias', contactId)
    }
    return contactPayload.alias
  }

  override async contactList (): Promise<string[]> {
    log.verbose('PuppetOA', 'contactList()')
    const contactIdList = await this.oa?.getContactList()

    if (!contactIdList) {
      throw new Error('contactIdList found from oa store')
    }
    return contactIdList
  }

  override async contactAvatar (contactId: string)                : Promise<FileBox>
  override async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  override async contactAvatar (contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetOA', 'contactAvatar(%s)', contactId)

    /**
     * 1. set
     */
    if (file) {
      return
    }

    /**
     * 2. get
     */

    const contactPayload = await this.contactPayload(contactId)
    const fileBox = FileBox.fromUrl(contactPayload.avatar)
    return fileBox
  }

  override async contactRawPayloadParser (oaPayload: OAContactPayload): Promise<ContactPayload> {
    const payload: ContactPayload = {
      alias     : oaPayload.remark,
      avatar    : oaPayload.headimgurl,
      city      : oaPayload.city,
      friend    : true,
      gender    : oaPayload.sex,
      id        : oaPayload.openid,
      name      : oaPayload.nickname,
      phone     : [],
      province  : oaPayload.province,
      signature : '',
      star      : false,
      type      : ContactType.Individual,
      weixin    : oaPayload.unionid,
    }
    return payload
  }

  override async contactRawPayload (id: string): Promise<OAContactPayload> {
    log.verbose('PuppetOA', 'contactRawPayload(%s)', id)

    const contactInfoPayload = await this.oa?.getContactPayload(id)
    if (!contactInfoPayload) {
      throw new Error(`can not get ContactPayload(${id})`)
    }
    return contactInfoPayload
  }

  /**
   *
   * Message
   *
   */
  override async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetOA', 'messageContact(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof ContactMock) {
    //   return attachment.id
    // }
    return ''
  }

  override async messageImage (
    messageId : string,
    imageType : ImageType,
  ) : Promise<FileBox> {
    log.verbose('PuppetOA', 'messageImage(%s, %s[%s])',
      messageId,
      imageType,
      ImageType[imageType],
    )
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof FileBox) {
    //   return attachment
    // }
    const payload: MessagePayload = await this.messagePayload(messageId)
    let fileBox: FileBox
    if (payload.type === MessageType.Image) {
      if (!payload.filename) {
        throw Error(`image message type must have filename file. <${payload}>`)
      }
      fileBox = FileBox.fromUrl(payload.filename)
    } else {
      throw Error('can"t get file from the message')
    }
    return fileBox
  }

  override async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetOA', 'messageRecall(%s)', messageId)
    return false
  }

  override async messageFile (id: string): Promise<FileBox> {
    log.verbose('PuppetOA', 'messageFile(%s)', id)

    const payload: MessagePayload = await this.messagePayload(id)

    switch (payload.type) {
      case MessageType.Image:
        if (!payload.filename) {
          throw Error(`Image message must have filename. <${payload}>`)
        }
        return FileBox.fromUrl(payload.filename)
      case MessageType.Audio:
        if (!payload.filename) {
          throw Error(`Audio message must have filename. <${payload}>`)
        }
        // payload.filename is an URL to the audio file. The name of the file is not in the URL.
        // Setting a filename with expected extension is necessary for inference of mime type in
        // FileBox.
        return FileBox.fromUrl(payload.filename, 'message.amr')
      default:
        throw Error('can"t get file from the message')
    }
  }

  override async messageUrl (messageId: string)  : Promise<UrlLinkPayload> {
    log.verbose('PuppetOA', 'messageUrl(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof UrlLink) {
    //   return attachment.payload
    // }
    return {
      title : 'mock title for ' + messageId,
      url   : 'https://mock.url',
    }
  }

  override async messageMiniProgram (messageId: string): Promise<MiniProgramPayload> {
    log.verbose('PuppetOA', 'messageMiniProgram(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof MiniProgram) {
    //   return attachment.payload
    // }
    return {
      title : 'mock title for ' + messageId,
    }
  }

  override async messageRawPayloadParser (rawPayload: OAMessagePayload): Promise<MessagePayload> {
    const payload: MessagePayload = {
      fromId    : rawPayload.FromUserName,
      id        : rawPayload.MsgId,
      timestamp : parseInt(rawPayload.CreateTime),
      toId      : rawPayload.ToUserName,
      type      : MessageType.Text,
    }
    if (rawPayload.MsgType === 'image') {
      payload.type = MessageType.Image
      if (!rawPayload.PicUrl) {
        throw Error(`Image Payload must has PicUrl field :<${JSON.stringify(rawPayload)}>`)
      }
      payload.filename = rawPayload.PicUrl
    } else if (rawPayload.MsgType === 'video') {
      payload.type = MessageType.Video
    } else if (rawPayload.MsgType === 'location') {
      payload.type = MessageType.Location
    } else if (rawPayload.MsgType === 'text') {
      payload.text = rawPayload.Content
    } else if (rawPayload.MsgType === 'voice') {
      payload.type = MessageType.Audio
      payload.filename = await this.oa?.getAudioUrl(rawPayload.MediaId!)
    }
    return payload
  }

  override async messageRawPayload (id: string): Promise<OAMessagePayload> {
    log.verbose('PuppetOA', 'messageRawPayload(%s)', id)

    const payload = await this.oa?.payloadStore.getMessagePayload(id)

    if (!payload) {
      throw new Error('payload not found from oa store')
    }
    return payload
  }

  private async messageSend (
    conversationId: string,
    something: string | FileBox, // | Attachment
    mediatype: OAMediaType = 'image',
  ): Promise<string> {
    log.verbose('PuppetOA', 'messageSend(%s, %s)', conversationId, something)
    let msgId = null
    if (typeof something === 'string') {
      const payload = {
        content: something,
        msgtype: 'text' as const,
        touser: conversationId,
      }
      if (this.personalMode) {
        msgId = await this.oa?.sendCustomMessagePersonal(payload)
        if (!msgId) {
          throw new Error('can"t send personal CustomeMessage')
        }
      } else {
        msgId = await this.oa?.sendCustomMessage(payload)
      }
    } else if (something instanceof FileBox) {
      msgId = await this.oa?.sendFile({ file: something, msgtype: mediatype, touser: conversationId })
    }
    if (!msgId) {
      throw new Error('PuppetOA messageSend() can"t get msgId response')
    }
    return msgId
  }

  override async messageSendText (
    conversationId: string,
    text     : string,
  ): Promise<string> {
    return this.messageSend(conversationId, text)
  }

  override async messageSendFile (
    conversationId: string,
    file     : FileBox,
  ): Promise<string> {
    let msgtype: OAMediaType
    switch (file.mimeType) {
      case 'image/jpeg':
        msgtype = 'image'
        break
      case 'audio/amr':
      case 'audio/mpeg':
        msgtype = 'voice'
        break
      case 'video/mp4':
        msgtype = 'video'
        break
      default:
        throw new Error(`unsupported media type: ${file.mimeType}`)
    }
    return this.messageSend(conversationId, file, msgtype)
  }

  override async messageSendContact (
    conversationId: string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'messageSendUrl(%s, %s)', conversationId, contactId)

    // const contact = this.mocker.MockContact.load(contactId)
    // return this.messageSend(conversationId, contact)
  }

  override async messageSendUrl (
    conversationId: string,
    urlLinkPayload : UrlLinkPayload,
  ) : Promise<string> {
    log.verbose('PuppetOA', 'messageSendUrl(%s, %s)', conversationId, urlLinkPayload)
    let msgId = null
    msgId = await this.oa?.sendCustomLink({ touser: conversationId, urlLinkPayload: urlLinkPayload })
    if (!msgId) {
      throw new Error('PuppetOA messageSendUrl() can"t get msgId response')
    }
    return msgId
  }

  override async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: MiniProgramPayload,
  ): Promise<string> {
    log.verbose('PuppetOA', 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload))
    let msgId = null
    msgId = await this.oa?.sendCustomMiniProgram({ miniProgram:miniProgramPayload, touser: conversationId })
    if (!msgId) {
      throw new Error('PuppetOA messageSendMiniProgram() can"t get msgId response')
    }
    return msgId
  }

  override async messageForward (
    conversationId: string,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'messageForward(%s, %s)',
      conversationId,
      messageId,
    )
  }

  override async conversationReadMark (
    conversationId : string,
    hasRead?       : boolean,
  ): Promise<void | boolean> {
    log.verbose('PuppetOA', 'conversationReadMark(%s, %s)',
      conversationId,
      hasRead,
    )
  }

  /**
   *
   * Room
   *
   */
  override async roomRawPayloadParser (payload: RoomPayload) { return payload }
  override async roomRawPayload (id: string): Promise<RoomPayload> {
    log.verbose('PuppetOA', 'roomRawPayload(%s)', id)
    return {} as any
  }

  override async roomList (): Promise<string[]> {
    log.verbose('PuppetOA', 'roomList()')
    return []
  }

  override async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'roomDel(%s, %s)', roomId, contactId)
  }

  override async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetOA', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetOA', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  override async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'roomAdd(%s, %s)', roomId, contactId)
  }

  override async roomTopic (roomId: string)                : Promise<string>
  override async roomTopic (roomId: string, topic: string) : Promise<void>

  override async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetOA', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
    await this.dirtyPayload(PayloadType.Room, roomId)
  }

  override async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetOA', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  override async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetOA', 'roomQuit(%s)', roomId)
  }

  override async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetOA', 'roomQRCode(%s)', roomId)
    return roomId + ' mock qrcode'
  }

  override async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetOA', 'roomMemberList(%s)', roomId)
    return []
  }

  override async roomMemberRawPayload (roomId: string, contactId: string): Promise<RoomMemberPayload>  {
    log.verbose('PuppetOA', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    return {
      avatar    : 'mock-avatar-data',
      id        : 'xx',
      name      : 'mock-name',
      roomAlias : 'yy',
    }
  }

  override async roomMemberRawPayloadParser (rawPayload: RoomMemberPayload): Promise<RoomMemberPayload>  {
    log.verbose('PuppetOA', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return rawPayload
  }

  override async roomAnnounce (roomId: string)                : Promise<string>
  override async roomAnnounce (roomId: string, text: string)  : Promise<void>

  override async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    if (text) {
      return
    }
    return 'mock announcement for ' + roomId
  }

  /**
   *
   * Room Invitation
   *
   */
  override async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetOA', 'roomInvitationAccept(%s)', roomInvitationId)
  }

  override async roomInvitationRawPayload (roomInvitationId: string): Promise<any> {
    log.verbose('PuppetOA', 'roomInvitationRawPayload(%s)', roomInvitationId)
  }

  override async roomInvitationRawPayloadParser (rawPayload: any): Promise<RoomInvitationPayload> {
    log.verbose('PuppetOA', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  /**
   *
   * Friendship
   *
   */
  override async friendshipRawPayload (id: string): Promise<any> {
    return { id } as any
  }

  override async friendshipRawPayloadParser (rawPayload: any): Promise<FriendshipPayload> {
    return rawPayload
  }

  override async friendshipSearchPhone (
    phone: string,
  ): Promise<null | string> {
    log.verbose('PuppetOA', 'friendshipSearchPhone(%s)', phone)
    return null
  }

  override async friendshipSearchWeixin (
    weixin: string,
  ): Promise<null | string> {
    log.verbose('PuppetOA', 'friendshipSearchWeixin(%s)', weixin)
    return null
  }

  override async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'friendshipAdd(%s, %s)', contactId, hello)
  }

  override async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'friendshipAccept(%s)', friendshipId)
  }

  /**
   *
   * Tag
   *
   */
  override async tagContactAdd (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'tagContactAdd(%s)', tagId, contactId)
    await this.oa?.addTagToMembers(tagId, [contactId])
  }

  override async tagContactRemove (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'tagContactRemove(%s)', tagId, contactId)
    await this.oa?.removeTagFromMembers(tagId, [contactId])
  }

  override async tagContactDelete (
    tagId: string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'tagContactDelete(%s)', tagId)
    await this.oa?.deleteTag(tagId)
  }

  override async tagContactList (
    contactId?: string,
  ): Promise<string[]> {
    log.verbose('PuppetOA', 'tagContactList(%s)', contactId)
    if (!this.oa) {
      throw new Error('can not find oa object')
    }

    // 1. get all of the tags
    if (!contactId) {
      const tagList = await this.oa.getContactList()
      return tagList
    }

    // 2. get the member tags
    const tagList = await this.oa.getMemberTags(contactId)
    return tagList
  }

}

export { PuppetOA }
export default PuppetOA
