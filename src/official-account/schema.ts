import { ContactGender } from 'wechaty-puppet'

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

/* eslint-disable camelcase */
export type OAContactPayload = Partial<ErrorPayload> & {
  subscribe         : number,
  openid            : string,
  nickname          : string,
  sex               : ContactGender,
  language          : Language,
  city              : string,
  province          : string,
  country           : string,
  headimgurl        : string,
  subscribe_time    : number,
  unionid           : string,
  remark            : string,
  groupid           : number,
  tagid_list        : Array<number>,
  subscribe_scene   : string,
  qr_scene          : number,
  qr_scene_str      : string,
}

export type Language = 'zh_CN' | 'zh_TW' | 'en'

export interface ErrorPayload {
  errcode : number,
  errmsg  : string,
}
