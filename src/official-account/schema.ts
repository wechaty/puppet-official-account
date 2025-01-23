import type { ContactGender } from 'wechaty-puppet/types'

export type OAMessageType = 'text'
              | 'image'
              | 'voice'
              | 'video'
              | 'shortvideo'
              | 'location'
              | 'link'
              | 'miniprogrampage'
              | 'event'

export type OAMediaType = 'image'
                      | 'voice'
                      | 'video'
                      | 'thumb'

export type OAEventType = 'subscribe' | 'unsubscribe' | 'SCAN' | 'LOCATION' | 'CLICK'

export type Language = 'en'
                    | 'zh_CN'
                    | 'zh_TW'

export interface ErrorPayload {
  errcode : number,
  errmsg  : string,
}

export interface OAMessagePayload {
  ToUserName   : string
  FromUserName : string
  CreateTime   : string
  MsgType      : OAMessageType
  MsgId        : string
  Content?     : string
  PicUrl?      : string
  MediaId?     : string
  Event?       : OAEventType
  EventKey?    : string
}

/* eslint-disable camelcase */
export type OAContactPayload = Partial<ErrorPayload> & {
  subscribe       : number,
  openid          : string,
  nickname        : string,
  sex             : ContactGender,
  language        : Language,
  city            : string,
  province        : string,
  country         : string,
  headimgurl      : string,
  subscribe_time  : number,
  unionid         : string,
  remark          : string,
  groupid         : number,
  tagid_list      : Array<number>,
  subscribe_scene : string,
  qr_scene        : number,
  qr_scene_str    : string,
}

export interface OATagPayload {
  id    : number,
  name  : string,
  count : number,
}
