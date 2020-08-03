#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { Wechaty } from 'wechaty'

import {
  PuppetOA,
}                         from '../src/mod'

import { getOaOptions } from './fixtures/oa-options'

test('integration testing', async t => {
  const puppet = new PuppetOA({
    ...getOaOptions(),
  })
  const wechaty = new Wechaty({ puppet })

  t.ok(wechaty, 'should instantiate wechaty with puppet official account')
})
