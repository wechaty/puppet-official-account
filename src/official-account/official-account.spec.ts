#!/usr/bin/env ts-node

import test from 'blue-tape'
import cuid from 'cuid'

import { OfficialAccount } from './official-account'

const unirest = require('unirest')

/**
 * lizhuohuan 的接口测试号
 *
 *  https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login
 *  https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Requesting_an_API_Test_Account.html
 */
const getOaOptions = () => ({
  appId           : 'wx436a8961645c4d49',
  appSecret       : '198cbdc24c3b52929cf4b7e1fe5ad571',
  token           : 'test',
})

test('OfficialAccount smoke testing', async (t) => {
  void cuid
  const WEBHOOK_PROXY_URL = [
    'https://',
    'wechaty-puppet-official-account',
    // '-',
    // cuid(),
    '.serverless.social',
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
    FromUserName : 'ooEEu1Pdb4otFUedqOx_LP1p8sSQ',
    MsgId        : '22855481560378379',
    MsgType      : 'text',
    ToUserName   : 'gh_d06c5c4a0126',
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

  await future
  t.pass('should get a message emit event from oa instane')

  // await new Promise(resolve => setTimeout(resolve, 100 * 1000))
  await oa.stop()
})

test('updateAccessToken()', async t => {
  const oa = new OfficialAccount({
    ...getOaOptions(),
    port: 0,
  })

  await oa.start()

  t.true(oa.accessToken, 'should get access token')

  await oa.stop()
})

test('sendCustomMessage()', async t => {
  const oa = new OfficialAccount({
    ...getOaOptions(),
    port: 0,
  })

  await oa.start()

  const ret = await oa.sendCustomMessage({
    content: 'hello',
    msgtype: 'text',
    touser: 'ooEEu1Pdb4otFUedqOx_LP1p8sSQ',
  })
  // console.info(ret)
  t.equal(ret.errcode, 0, 'should get errcode 0')

  await oa.stop()
})