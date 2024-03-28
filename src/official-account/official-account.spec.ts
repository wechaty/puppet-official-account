#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import 'dotenv/config.js'

import { test } from 'tstest'
import cuid     from 'cuid'
import ciInfo   from 'ci-info'
import unirest  from 'unirest'

import { getOaOptions } from '../../tests/fixtures/oa-options.js'

import { OfficialAccount } from './official-account.js'

/*
 * refer to : https://github.com/wechaty/wechaty-puppet-official-account/issues/8
 * try to fix global pr runtime test
 */
const isPR: boolean = !!(ciInfo.isPR)

void cuid // for testing

test('OfficialAccount smoke testing', async t => {
  if (isPR) {
    void t.skip('Skip for PR')
    return
  }

  const WEBHOOK_PROXY_URL = [
    'http://',
    'wechaty-puppet-official-account',
    '-',
    cuid(),
    // '.serverless.social',
    '.localtunnel.chatie.io',
    // '.test.localhost.localdomain',
  ].join('')

  const oa = new OfficialAccount({
    ...getOaOptions(),
    webhookProxyUrl : WEBHOOK_PROXY_URL,
  })
  await oa.start()

  const future = new Promise(resolve => oa.once('message', resolve))

  const PAYLOAD = {
    Content      : 'testing123',
    CreateTime   : '1596436942',
    FromUserName : 'oOiiq59SLkf1AGuuTh668cxP8_Xs',
    MsgId        : '22855481560378379',
    MsgType      : 'text',
    ToUserName   : 'gh_27056d3d5d05',
  }

  const XML = `
    <xml>
    <ToUserName><![CDATA[${PAYLOAD.ToUserName}]]></ToUserName>
    <FromUserName><![CDATA[${PAYLOAD.FromUserName}]]></FromUserName>
    <CreateTime>${PAYLOAD.CreateTime}</CreateTime>
    <MsgType><![CDATA[${PAYLOAD.MsgType}]]></MsgType>
    <Content><![CDATA[${PAYLOAD.Content}]]></Content>
    </xml>
  `

  const response = await unirest
    .post(WEBHOOK_PROXY_URL)
    // .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
    .type('xml')
    .send(XML)
  t.equal(response.body, 'success', 'should get success response')

  try {
    await Promise.race([
      future,
      new Promise<void>((resolve, reject) => { void resolve; setTimeout(reject, 15000) }),
    ])
    t.pass('should get a message emit event from oa instance')
  } catch (e) {
    t.fail('should not get timeout rejection')
  }

  // await new Promise(resolve => setTimeout(resolve, 100 * 1000))
  await oa.stop()
})

test('updateAccessToken()', async t => {
  if (isPR) {
    await t.skip('Skip for PR')
    return
  }

  const oa = new OfficialAccount({
    ...getOaOptions(),
    port: 0,
  })

  await oa.start()

  try {
    t.ok(oa.accessToken, 'should get access token')
  } catch (e) {
    t.fail('should not be rejected')
  }

  await oa.stop()
})

test('sendCustomMessage()', async t => {
  if (isPR) {
    await t.skip('Skip for PR')
    return
  }

  const oa = new OfficialAccount({
    ...getOaOptions(),
    port: 0,
  })

  try {
    await oa.start()

    const ret = await oa.sendCustomMessage({
      content: 'wechaty-puppet-official-account CI testing',
      msgtype: 'text',
      touser: 'oOiiq59SLkf1AGuuTh668cxP8_Xs',
    })
    t.not(ret, null, 'should get messageId')
  } catch (e) {
    console.error(e)
    t.fail('should not be rejected')
  } finally {
    await oa.stop()
  }
})
