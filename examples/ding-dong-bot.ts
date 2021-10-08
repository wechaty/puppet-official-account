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
  EventLogoutPayload,
  EventLoginPayload,
  EventScanPayload,
  EventErrorPayload,
  EventMessagePayload,
  FileBox,
  MessageType,
  UrlLinkPayload,
}                         from 'wechaty-puppet'

import { PuppetOA } from '../src/mod'
// const { Console } = require('console')
/**
 *
 * 1. Declare your Bot!
 *
 */

const puppet = new PuppetOA({
  appId:'',
  appSecret:'',
  // port:8000,
  token:'',
  webhookProxyUrl:'',
})

/**
 *
 * 2. Register event handlers for Bot
 *
 */
puppet
  .on('logout', onLogout)
  .on('login',  onLogin)
  .on('scan',   onScan)
  .on('error',  onError)
  .on('message', onMessage)

/**
 *
 * 3. Start the bot!
 *
 */
puppet.start()
  .catch(async e => {
    console.error('Bot start() fail:', e)
    await puppet.stop()
    process.exit(-1)
  })

/**
 *
 * 4. You are all set. ;-]
 *
 */

/**
 *
 * 5. Define Event Handler Functions for:
 *  `scan`, `login`, `logout`, `error`, and `message`
 *
 */
function onScan (payload: EventScanPayload) {
  if (payload.qrcode) {
    // Generate a QR Code online via
    // http://goqr.me/api/doc/create-qr-code/
    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(payload.qrcode),
    ].join('')
    console.info(`[${payload.status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
  } else {
    console.info(`[${payload.status}]`)
  }
}

function onLogin (payload: EventLoginPayload) {
  console.info(`${payload.contactId} login`)
  // puppet.messageSendText(payload.contactId, 'Wechaty login').catch(console.error)
}

function onLogout (payload: EventLogoutPayload) {
  console.info(`${payload.contactId} logouted`)
}

function onError (payload: EventErrorPayload) {
  console.error('Bot error:', payload.data)
  /*
  if (bot.logonoff()) {
    bot.say('Wechaty error: ' + e.message).catch(console.error)
  }
  */
}

/**
 *
 * 6. The most important handler is for:
 *    dealing with Messages.
 *
 */
async function onMessage (payload: EventMessagePayload) {
  const msgPayload = await puppet.messagePayload(payload.messageId)
  // console.info(msgPayload, payload)
  console.info('onMessage:', JSON.stringify(msgPayload))
  if (/ding/i.test(msgPayload.text || '')) {
    await puppet.messageSendText(msgPayload.fromId!, 'dong')
  } else if (/hi|hello/i.test(msgPayload.text || '')) {
    const _userinfo = await puppet.contactRawPayload(msgPayload.fromId!)
    await puppet.messageSendText(msgPayload.fromId!, 'hello,' + _userinfo.nickname + '. Thanks for your attention')
  } else if (/image/i.test(msgPayload.text || '')) {
    const fileBox = FileBox.fromUrl('https://ss3.bdstatic.com/70cFv8Sh_Q1YnxGkpoWK1HF6hhy/it/u=1116676390,2305043183&fm=26&gp=0.jpg', 'ding-dong.jpg')
    if (msgPayload.fromId) {
      await puppet.messageSendFile(msgPayload.fromId!, fileBox)
    }
  } else if (/link/i.test(msgPayload.text || '')) {
    const imagePath = 'http://mmbiz.qpic.cn/mmbiz_jpg/lOBFkCyo4n9Qhricg66uEO2Ycn9hcCibauvalenRUeMzsRia2VjLok4Gd1iaeuKiarVggr4apCEUNiamIM4FLkpxgurw/0'
    const wechatyLink: UrlLinkPayload = ({ description: 'this is wechaty', thumbnailUrl: imagePath, title: 'WECHATY', url:'https://wechaty.js.org/' })
    await puppet.messageSendUrl(msgPayload.fromId!, wechatyLink,)
  } else if (msgPayload.type === MessageType.Image) {
    const imageFile = FileBox.fromUrl(msgPayload.filename + '.jpg')
    if (msgPayload.fromId!) {
      await puppet.messageSendFile(msgPayload.fromId!, imageFile)
    }
  } else if (msgPayload.type === MessageType.Audio) {
    const audioFile = FileBox.fromUrl(msgPayload.filename + '', 'message.amr')
    console.info(audioFile)
    if (msgPayload.fromId!) {
      await puppet.messageSendFile(msgPayload.fromId!, audioFile)
    }
  }
  // } else if (/获取好友列表/i.test(msgPayload.text || '')) {
  //   const _contactList = await puppet.contactList()
  //   if (_contactList != null) {
  //     for (const i in _contactList) {
  //       console.info(i)
  //       await puppet.messageSendText(msgPayload.fromId!, _contactList[i])
  //     }
  //   }
}

/**
 *
 * 7. Output the Welcome Message
 *
 */
const welcome = `
Puppet Version: ${puppet.version()}

Please wait... I'm trying to login in...

`
console.info(welcome)
