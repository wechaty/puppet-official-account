import { Message, Wechaty } from 'wechaty'
import { EventErrorPayload, MessageType } from 'wechaty-puppet'

import { PuppetOA } from '../src/mod.js'

// 1. Declare your Bot
const puppet = new PuppetOA({
  port: 80,
})
const bot = new Wechaty({
  puppet: puppet,
})

// 2. Register event handlers for Bot
bot
  .on('error', onError)
  .on('message', onMessage)

function onError (payload: EventErrorPayload) {
  console.error('Bot error:', payload.data)
}

async function onMessage (message: Message) {
  switch (message.type()) {
    case MessageType.Text:
      return message.talker().say(message.text())
    case MessageType.Audio:
      return message.talker().say(await message.toFileBox())
    default:
      throw new Error(`Handler for message type ${message.type()} is not implemented the example`)
  }
}

// 3. Start the bot!
bot.start()
  .catch(async e => {
    console.error('Bot start() fail:', e)
    process.exit(-1)
  })

const welcome = `
Puppet Version: ${puppet.version()}

Please wait... I'm trying to login in...

`
console.info(welcome)
