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
import path  from 'path'

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
}                           from 'wechaty-puppet'

import { VERSION } from './version'
import {
  qrCodeForChatie,
  envOptions,
}                                   from './config'

import {
  OfficialAccountOptions,
  OfficialAccount,
}                             from './official-account/official-account'

export type PuppetOAOptions = PuppetOptions & Partial<OfficialAccountOptions>

class PuppetOA extends Puppet {

  public static readonly VERSION = VERSION

  protected appId           : string
  protected appSecret       : string
  protected token           : string
  protected webhookProxyUrl : string

  protected oa?: OfficialAccount

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
      throw new Error('PupetOA: appId not found.')
    }

    if (options.appSecret) {
      this.appSecret = options.appSecret
    } else {
      throw new Error('PuppetOA: appSecret not found.')
    }

    if (options.token) {
      this.token = options.token
    } else {
      throw new Error('PuppetOA: token not found.')
    }

    if (options.webhookProxyUrl) {
      this.webhookProxyUrl = options.webhookProxyUrl
    } else {
      throw new Error('PuppetOA: webhookProxyUrl not found.')
    }

  }

  public async start (): Promise<void> {
    log.verbose('PuppetOA', 'start()')

    if (this.state.on()) {
      log.warn('PuppetOA', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    try {
      this.state.on('pending')

      const oa = new OfficialAccount({
        appId           : this.appId,
        appSecret       : this.appSecret,
        token           : this.token,
        webhookProxyUrl : this.webhookProxyUrl,
      })
      this.bridgeEvents(oa)

      await oa.start()
      this.oa = oa

      this.state.on(true)
    } catch (e) {
      this.state.off(true)
    }

  }

  protected bridgeEvents (oa: OfficialAccount) {
    oa.on('message', msg => this.emit('message', { messageId: msg.MsgId }))
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetOA', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetOA', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    try {
      this.state.off('pending')

      if (this.oa) {
        this.oa.removeAllListeners()
        await this.oa.stop()
        this.oa = undefined
      }

    } finally {
      this.state.off(true)
    }

  }

  public login (contactId: string): Promise<void> {
    log.verbose('PuppetOA', 'login()')
    return super.login(contactId)
  }

  public async logout (): Promise<void> {
    log.verbose('PuppetOA', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    this.emit('logout', { contactId: this.id, data: 'test' }) // before we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO: do the logout job
  }

  public ding (data?: string): void {
    log.silly('PuppetOA', 'ding(%s)', data || '')
    setTimeout(() => this.emit('dong', { data: data || '' }), 1000)
  }

  public unref (): void {
    log.verbose('PuppetOA', 'unref()')
    super.unref()
  }

  /**
   *
   * ContactSelf
   *
   *
   */
  public async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetOA', 'contactSelfQRCode()')
    return 'qrcode in the future ;^)'
  }

  public async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetOA', 'contactSelfName(%s)', name)
  }

  public async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetOA', 'contactSelfSignature(%s)', signature)
  }

  /**
   *
   * Contact
   *
   */
  public contactAlias (contactId: string)                      : Promise<string>
  public contactAlias (contactId: string, alias: string | null): Promise<void>

  public async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetOA', 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      return 'mock alias'
    }
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetOA', 'contactList()')
    return []
  }

  public async contactQRCode (contactId: string): Promise<string> {
    log.verbose('PuppetOA', 'contactQRCode(%s)', contactId)
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    throw new Error('not supported')
    // return await this.bridge.WXqr
  }

  public async contactAvatar (contactId: string)                : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar (contactId: string, file?: FileBox): Promise<void | FileBox> {
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
    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return FileBox.fromFile(WECHATY_ICON_PNG)
  }

  public async contactRawPayloadParser (payload: ContactPayload) { return payload }
  public async contactRawPayload (id: string): Promise<ContactPayload> {
    log.verbose('PuppetOA', 'contactRawPayload(%s)', id)
    return {} as any
  }

  /**
   *
   * Message
   *
   */
  public async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetOA', 'messageContact(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof ContactMock) {
    //   return attachment.id
    // }
    return ''
  }

  public async messageImage (
    messageId: string,
    imageType: ImageType,
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
    return FileBox.fromQRCode('fake-qrcode')
  }

  public async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetOA', 'messageRecall(%s)', messageId)
    return false
  }

  public async messageFile (id: string): Promise<FileBox> {
    // const attachment = this.mocker.MockMessage.loadAttachment(id)
    // if (attachment instanceof FileBox) {
    //   return attachment
    // }
    return FileBox.fromBase64(
      'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ==',
      'mock-file' + id + '.txt',
    )
  }

  public async messageUrl (messageId: string)  : Promise<UrlLinkPayload> {
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

  public async messageMiniProgram (messageId: string): Promise<MiniProgramPayload> {
    log.verbose('PuppetOA', 'messageMiniProgram(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof MiniProgram) {
    //   return attachment.payload
    // }
    return {
      title : 'mock title for ' + messageId,
    }
  }

  public async messageRawPayloadParser (payload: MessagePayload) { return payload }
  public async messageRawPayload (id: string): Promise<MessagePayload> {
    log.verbose('PuppetOA', 'messageRawPayload(%s)', id)
    return {} as any
  }

  private async messageSend (
    conversationId: string,
    something: string | FileBox, // | Attachment
  ): Promise<void> {
    log.verbose('PuppetOA', 'messageSend(%s, %s)', conversationId, something)
    if (!this.id) {
      throw new Error('no this.id')
    }

    if (typeof something === 'string') {
      const payload = {
        content: something,
        msgtype: 'text' as const,
        touser: 'ooEEu1Pdb4otFUedqOx_LP1p8sSQ',
      }
      await this.oa?.sendCustomMessage(payload)
    }

  }

  public async messageSendText (
    conversationId: string,
    text     : string,
  ): Promise<void> {
    return this.messageSend(conversationId, text)
  }

  public async messageSendFile (
    conversationId: string,
    file     : FileBox,
  ): Promise<void> {
    return this.messageSend(conversationId, file)
  }

  public async messageSendContact (
    conversationId: string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'messageSendUrl(%s, %s)', conversationId, contactId)

    // const contact = this.mocker.MockContact.load(contactId)
    // return this.messageSend(conversationId, contact)
  }

  public async messageSendUrl (
    conversationId: string,
    urlLinkPayload: UrlLinkPayload,
  ) : Promise<void> {
    log.verbose('PuppetOA', 'messageSendUrl(%s, %s)', conversationId, JSON.stringify(urlLinkPayload))

    // const url = new UrlLink(urlLinkPayload)
    // return this.messageSend(conversationId, url)
  }

  public async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: MiniProgramPayload,
  ): Promise<void> {
    log.verbose('PuppetOA', 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload))
    // const miniProgram = new MiniProgram(miniProgramPayload)
    // return this.messageSend(conversationId, miniProgram)
  }

  public async messageForward (
    conversationId: string,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'messageForward(%s, %s)',
      conversationId,
      messageId,
    )
  }

  /**
   *
   * Room
   *
   */
  public async roomRawPayloadParser (payload: RoomPayload) { return payload }
  public async roomRawPayload (id: string): Promise<RoomPayload> {
    log.verbose('PuppetOA', 'roomRawPayload(%s)', id)
    return {} as any
  }

  public async roomList (): Promise<string[]> {
    log.verbose('PuppetOA', 'roomList()')
    return []
  }

  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'roomDel(%s, %s)', roomId, contactId)
  }

  public async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetOA', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetOA', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  public async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'roomAdd(%s, %s)', roomId, contactId)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetOA', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }

    await this.roomPayloadDirty(roomId)
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetOA', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  public async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetOA', 'roomQuit(%s)', roomId)
  }

  public async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetOA', 'roomQRCode(%s)', roomId)
    return roomId + ' mock qrcode'
  }

  public async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetOA', 'roomMemberList(%s)', roomId)
    return []
  }

  public async roomMemberRawPayload (roomId: string, contactId: string): Promise<RoomMemberPayload>  {
    log.verbose('PuppetOA', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    return {
      avatar    : 'mock-avatar-data',
      id        : 'xx',
      name      : 'mock-name',
      roomAlias : 'yy',
    }
  }

  public async roomMemberRawPayloadParser (rawPayload: RoomMemberPayload): Promise<RoomMemberPayload>  {
    log.verbose('PuppetOA', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return rawPayload
  }

  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>

  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
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
  public async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetOA', 'roomInvitationAccept(%s)', roomInvitationId)
  }

  public async roomInvitationRawPayload (roomInvitationId: string): Promise<any> {
    log.verbose('PuppetOA', 'roomInvitationRawPayload(%s)', roomInvitationId)
  }

  public async roomInvitationRawPayloadParser (rawPayload: any): Promise<RoomInvitationPayload> {
    log.verbose('PuppetOA', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipRawPayload (id: string): Promise<any> {
    return { id } as any
  }

  public async friendshipRawPayloadParser (rawPayload: any): Promise<FriendshipPayload> {
    return rawPayload
  }

  public async friendshipSearchPhone (
    phone: string,
  ): Promise<null | string> {
    log.verbose('PuppetOA', 'friendshipSearchPhone(%s)', phone)
    return null
  }

  public async friendshipSearchWeixin (
    weixin: string,
  ): Promise<null | string> {
    log.verbose('PuppetOA', 'friendshipSearchWeixin(%s)', weixin)
    return null
  }

  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'friendshipAdd(%s, %s)', contactId, hello)
  }

  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'friendshipAccept(%s)', friendshipId)
  }

  /**
   *
   * Tag
   *
   */
  public async tagContactAdd (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'tagContactAdd(%s)', tagId, contactId)
  }

  public async tagContactRemove (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'tagContactRemove(%s)', tagId, contactId)
  }

  public async tagContactDelete (
    tagId: string,
  ): Promise<void> {
    log.verbose('PuppetOA', 'tagContactDelete(%s)', tagId)
  }

  public async tagContactList (
    contactId?: string,
  ): Promise<string[]> {
    log.verbose('PuppetOA', 'tagContactList(%s)', contactId)
    return []
  }

}

export { PuppetOA }
export default PuppetOA
