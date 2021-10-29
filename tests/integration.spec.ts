#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import 'dotenv/config.js'

import { test }  from 'tstest'

import { WechatyBuilder } from 'wechaty'

import {
  PuppetOA,
}                         from '../src/mod.js'

import { getOaOptions } from './fixtures/oa-options.js'

import ciInfo from 'ci-info'

test('integration testing', async t => {
  if (ciInfo.isPR) {
    void t.skip('Skip for PR')
    return
  }

  const puppet = new PuppetOA({
    ...getOaOptions(),
  })
  const wechaty = WechatyBuilder.build({ puppet })

  t.ok(wechaty, 'should instantiate wechaty with puppet official account')
})

test('PuppetOA perfect restart testing', async (t) => {
  if (ciInfo.isPR) {
    void t.skip('Skip for PR')
    return
  }

  const puppet = new PuppetOA({
    ...getOaOptions(),
    port            : 0,
    webhookProxyUrl : undefined,
  })
  try {

    for (let i = 0; i < 3; i++) {

      await puppet.start()
      t.ok(puppet.state.active())

      await puppet.stop()
      t.ok(puppet.state.inactive())

      t.pass('start/stop-ed at #' + i)
    }

    t.pass('PuppetOA() perfect restart pass.')
  } catch (e) {
    t.fail(e as any)
  }
})
