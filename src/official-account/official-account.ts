import { EventEmitter } from 'events'

import crypto from 'crypto'
import { log } from 'wechaty-puppet'

import {
  Webhook,
  VerifyArgs,
}             from './webhook'

export interface OfficialAccountOptions {
  appId           : string,
  appSecret       : string,
  token           : string,
  webhookProxyUrl : string,
}

class OfficialAccount extends EventEmitter {

  webhook: Webhook

  constructor (
    public options: OfficialAccountOptions,
  ) {
    super()
    log.verbose('OfficialAccount', 'constructor(%s)', JSON.stringify(options))

    this.webhook = new Webhook({
      verify: this.verify.bind(this),
      webhookProxyUrl: this.options.webhookProxyUrl,
    })
  }

  verify (args: VerifyArgs): boolean {
    log.verbose('OfficialAccount', 'verify(%s)', JSON.stringify(args))

    const data = [
      args.timestamp,
      args.nonce,
      this.options.token,
    ].sort().join('')

    const digest = crypto
      .createHash('sha1')
      .update(data)
      .digest('hex')

    return digest === args.signature
  }

  async start () {
    log.verbose('OfficialAccount', 'start()')

    this.webhook.on('message', message => this.emit('message', message))

    await this.webhook.start()
  }

  async stop () {
    log.verbose('OfficialAccount', 'stop()')
    if (this.webhook) {
      await this.webhook.stop()
    }
  }

}

export { OfficialAccount }
