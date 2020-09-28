#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { Wechaty } from 'wechaty'

import {
  PuppetOA,
}                         from '../src/mod'

import { getOaOptions } from './fixtures/oa-options'

const isPR = require('is-pr')

test('integration testing', async t => {
  if (isPR) {
    t.skip('Skip for PR')
    return
  }

  const puppet = new PuppetOA({
    ...getOaOptions(),
  })
  const wechaty = new Wechaty({ puppet })

  t.ok(wechaty, 'should instantiate wechaty with puppet official account')
})

test('PuppetOA perfect restart testing', async (t) => {
  if (isPR) {
    t.skip('Skip for PR')
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
      t.true(puppet.state.on())

      await puppet.stop()
      t.true(puppet.state.off())

      t.pass('start/stop-ed at #' + i)
    }

    t.pass('PuppetOA() perfect restart pass.')
  } catch (e) {
    t.fail(e)
  }
})
