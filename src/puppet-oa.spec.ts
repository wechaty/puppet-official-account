#!/usr/bin/env ts-node

import test  from 'blue-tape'

import { PuppetOA } from './puppet-oa'

import { getOaOptions } from '../tests/fixtures/oa-options'

class PuppetOATest extends PuppetOA {
}

test('PuppetOA perfect restart testing', async (t) => {
  const puppet = new PuppetOATest({
    ...getOaOptions(),
    port: 0,
  })
  try {
    for (let i = 0; i < 3; i++) {
      await puppet.start()
      await puppet.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('PuppetOA() perfect restart pass.')
  } catch (e) {
    t.fail(e)
  }
})
