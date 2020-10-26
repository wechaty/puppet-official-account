#!/usr/bin/env ts-node

import test  from 'blue-tape'

import { getOaOptions } from '../tests/fixtures/oa-options'

import { PuppetOA } from './puppet-oa'

const ciInfo = require('ci-info')

class PuppetOATest extends PuppetOA {
}

test('tbw', async t => {
  if (ciInfo.isPR) {
    t.skip('Skip for PR')
    return
  }

  const oa = new PuppetOATest({
    ...getOaOptions(),
  })
  t.ok(oa, 'should be ok')
})
