/**
 * Wechaty - WeChat Bot SDK for Personal Account, Powered by TypeScript, Docker, and 💖
 *  - https://github.com/chatie/wechaty
 */
import {
  Message,
  Wechaty,
  log,
  FileBox,
}               from 'wechaty'

import PuppetOA from '../src/mod'

// You can safely ignore the next line because it is using for CodeSandbox

async function onMessage (msg: Message) {
  log.info('StarterBot', msg.toString())

  if (msg.text() === 'ding') {
    await msg.say('dong')
  }
  else if (msg.text() == 'image') {
    let fileBox = FileBox.fromUrl("https://ss3.bdstatic.com/70cFv8Sh_Q1YnxGkpoWK1HF6hhy/it/u=1116676390,2305043183&fm=26&gp=0.jpg","ding-dong.jpg")
    const talker = msg.talker()
    await talker.ready()
    talker.say(fileBox)
  }
}

const bot = new Wechaty({
  name: 'ding-dong-bot',
  puppet: new PuppetOA({
    appId: "wxbd801c28fbe1bbbd",
    appSecret: "6959408a3ba1c82db1a11d941df65764",
    port: 80,
    token: "token"
  })
})

bot.on('message', onMessage)

bot.start()
  .then(() => log.info('StarterBot', 'Starter Bot Started.'))
  .catch(e => log.error('StarterBot', e))