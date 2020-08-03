#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'
import cuid from 'cuid'

import { OfficialAccount } from './official-account'

const unirest = require('unirest')

test('OfficialAccount smoke testing', async (t) => {
  const WEBHOOK_PROXY_URL = [
    'https://',
    'wechaty-puppet-official-account',
    '-',
    cuid(),
    '.serverless.social',
  ].join('')

  /**
   * lizhuohuan 的接口测试号
   *
   *  https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login
   *  https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Requesting_an_API_Test_Account.html
   */
  const oa = new OfficialAccount({
    appId           : 'wx436a8961645c4d49',
    appSecret       : '198cbdc24c3b52929cf4b7e1fe5ad571',
    token           : 'test',
    webhookProxyUrl : WEBHOOK_PROXY_URL,
  })
  await oa.start()

  const future = new Promise(resolve => oa.once('message', resolve))

  const response = await unirest
    .post(WEBHOOK_PROXY_URL)
    // .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
    .type('xml')
    .send('<xml>test</xml>')
  t.equal(response.body, 'success', 'should get success response')

  await future
  t.pass('should get a message emit event from future')

  await oa.stop()
})
