import path from 'path'
import os from 'os'
import fs from 'fs'

import { log } from 'wechaty-puppet'

import { FlashStore } from 'flash-store'
import LRU from 'lru-cache'

import {
  OAMessagePayload,
  OAContactPayload,
}                         from './schema'

class PayloadStore {

  protected cacheOAContactPayload? : FlashStore<OAContactPayload>
  protected cacheOAMessagePayload? : LRU<string, OAMessagePayload>

  constructor () {
    log.verbose('PayloadStore', 'constructor()')
  }

  async start () {
    log.verbose('PayloadStore', 'start()')

    if (this.cacheOAMessagePayload) {
      throw new Error('PayloadStore should be stop() before start() again.')
    }

    /**
     * FlashStore
     */
    const baseDir = path.join(
      os.homedir(),
      '.wechaty',
      'wechaty-puppet-official-account',
      'flash-store-v0.20',
    )
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true })
    }

    this.cacheOAContactPayload = new FlashStore(path.join(baseDir, 'oa-contact-raw-payload'))

    /**
     * LRU
     */
    const lruOptions: LRU.Options<string, OAMessagePayload> = {
      dispose (key: string, val: any) {
        log.silly('PayloadStore', `constructor() lruOptions.dispose(${key}, ${JSON.stringify(val)})`)
      },
      max:    1000,
      maxAge: 1000 * 60 * 60,
    }

    this.cacheOAMessagePayload = new LRU<string, OAMessagePayload>(lruOptions)
  }

  async stop () {
    log.verbose('PayloadStore', 'stop()')

    if (this.cacheOAMessagePayload) {
      this.cacheOAMessagePayload = undefined
    }
    if (this.cacheOAContactPayload) {
      await this.cacheOAContactPayload.close()
      this.cacheOAContactPayload = undefined
    }
  }

  async getMessagePayload (id: string): Promise<undefined | OAMessagePayload> {
    log.verbose('PayloadStore', 'getMessagePayload(%s)', id)
    return this.cacheOAMessagePayload?.get(id)
  }

  async setMessagePayload (id: string, payload: OAMessagePayload): Promise<void> {
    log.verbose('PayloadStore', 'setMessagePayload(%s, %s)', id, JSON.stringify(payload))
    await this.cacheOAMessagePayload?.set(id, payload)
  }

  async getContactPayload (id: string): Promise<undefined | OAContactPayload> {
    log.verbose('PayloadStore', 'getContactPayload(%s)', id)
    return this.cacheOAContactPayload?.get(id)
  }

  async setContactPayload (id: string, payload: OAContactPayload): Promise<void> {
    log.verbose('PayloadStore', 'setContactPayload(%s, %s)', id, JSON.stringify(payload))
    await this.cacheOAContactPayload?.set(id, payload)
  }

}

export { PayloadStore }
