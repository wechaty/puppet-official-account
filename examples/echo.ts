import type { Message } from 'wechaty'
import { WechatyBuilder } from 'wechaty'
import * as PUPPET from 'wechaty-puppet'

import { PuppetOA } from '../src/mod.js'

// 1. Declare your Bot
const puppet = new PuppetOA({
  port: 80,
})
const bot = WechatyBuilder.build({
  puppet: puppet,
})

// 2. Register event handlers for Bot
bot
  .on('error', onError)
  .on('message', onMessage)

function onError (error: Error) {
  console.error('Bot error:', error)
}

async function onMessage (message: Message) {
  switch (message.type()) {
    case PUPPET.types.Message.Text:
      await message.talker().say(message.text())
      break
    case PUPPET.types.Message.Audio:
      await message.talker().say(await message.toFileBox())
      break
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
