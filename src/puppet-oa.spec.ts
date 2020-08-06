#!/usr/bin/env ts-node

import test  from 'blue-tape'

import { PuppetOA } from './puppet-oa'

class PuppetOATest extends PuppetOA {
}

test('tbw', async t => {
  const oa = new PuppetOATest()
  t.ok(oa, 'should be ok')
})
