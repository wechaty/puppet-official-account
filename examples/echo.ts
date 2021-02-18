import {EventErrorPayload, EventMessagePayload, MessageType} from 'wechaty-puppet'

import {PuppetOA} from '../src/mod'

/**
 *
 * 1. Declare your Bot!
 *
 */
const puppet = new PuppetOA({
  port: 80
});

// 2. Register event handlers for Bot
puppet
  .on('error', onError)
  .on('message', onMessage)


function onError (payload: EventErrorPayload) {
  console.error('Bot error:', payload.data)
}

async function onMessage (event: EventMessagePayload) {
  const payload = await puppet.messagePayload(event.messageId);
  switch (payload.type) {
    case MessageType.Text:
      return puppet.messageSendText(payload.fromId!, payload.text!)
    case MessageType.Image:
    case MessageType.Audio:
      const fileBox = await puppet.messageFile(event.messageId)
      return puppet.messageSendFile(payload.fromId!, fileBox)
    default:
      return puppet.messageSendText(payload.fromId!, `unsupported type: ${MessageType[payload.type]}`)
  }
}

// 3. Start the bot!
puppet.start()
  .catch(async e => {
    console.error('Bot start() fail:', e)
    await puppet.stop()
    process.exit(-1)
  })

const welcome = `
Puppet Version: ${puppet.version()}

Please wait... I'm trying to login in...

`
console.info(welcome)
