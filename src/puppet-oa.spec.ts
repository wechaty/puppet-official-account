#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import 'dotenv/config.js'

import { test } from 'tstest'

import { getOaOptions } from '../tests/fixtures/oa-options.js'

import { PuppetOA } from './puppet-oa.js'

import ciInfo from 'ci-info'

class PuppetOATest extends PuppetOA {
}

test('tbw', async t => {
  if (ciInfo.isPR) {
    await t.skip('Skip for PR')
    return
  }

  const oa = new PuppetOATest({
    ...getOaOptions(),
  })
  t.ok(oa, 'should be ok')
})
