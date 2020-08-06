#!/usr/bin/env ts-node

import test  from 'blue-tape'

import { getOaOptions } from '../tests/fixtures/oa-options'

import { PuppetOA } from './puppet-oa'

class PuppetOATest extends PuppetOA {
}

test('tbw', async t => {
  const oa = new PuppetOATest({
    ...getOaOptions(),
  })
  t.ok(oa, 'should be ok')
})
