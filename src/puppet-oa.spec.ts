#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import { PuppetOA } from './puppet-oa'

class PuppetOATest extends PuppetOA {
}

test('PuppetOA perfect restart testing', async (t) => {
  const puppet = new PuppetOATest()
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
