export type OAMessageType = 'text'
              | 'image'
              | 'voice'
              | 'video'
              | 'shortvideo'
              | 'location'
              | 'link'

export type OAMediaType = 'image' | 'voice' | 'video' | 'thumb'

export interface OAMessagePayload {
  ToUserName   : string
  FromUserName : string
  CreateTime   : string
  MsgType      : OAMessageType
  Content      : string
  MsgId        : string
}

export interface OAContactPayload {

}
