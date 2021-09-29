#!/usr/bin/env ts-node

import test from 'blue-tape'

import { Webhook } from './webhook'

test('Webhook parseWehhookProxyUrl()', async (t) => {
  const WEBHOOK_PROXY_URL_LIST = [
    'http://wechaty-puppet-official-account.serverless.social',
    'https://fsadfasdfs421.localtunnel.chatie.io',
    'http://test.localhost.localdomain',
    'https://wechaty-puppet-official-account-4231fsdaff-312rfsdl4132fsad.localtunnel.chatie.io',
  ]

  const EXPECTED_RESULT_LIST = [
    {
      host   : 'serverless.social',
      name   : 'wechaty-puppet-official-account',
      schema : 'http',
    },
    {
      host   : 'localtunnel.chatie.io',
      name   : 'fsadfasdfs421',
      schema : 'https',
    },
    {
      host   : 'localhost.localdomain',
      name   : 'test',
      schema : 'http',
    },
    {
      host   : 'localtunnel.chatie.io',
      name   : 'wechaty-puppet-official-account-4231fsdaff-312rfsdl4132fsad',
      schema : 'https',
    },
  ]

  const webhook = new Webhook({
    port: 0,
    verify: (..._: any[]) => true,
  })

  const resultList = WEBHOOK_PROXY_URL_LIST.map(url => webhook.parseWebhookProxyUrl(url))

  t.deepEqual(resultList, EXPECTED_RESULT_LIST, 'should parse the webhook proxy url right')
})
