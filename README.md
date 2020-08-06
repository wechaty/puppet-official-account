# PUPPET-OFFICIAL-ACCOUNT

[![NPM Version](https://badge.fury.io/js/wechaty-puppet-official-account.svg)](https://badge.fury.io/js/wechaty-puppet-official-account)
[![npm (tag)](https://img.shields.io/npm/v/wechaty-puppet-official-account/next.svg)](https://www.npmjs.com/package/wechaty-puppet-official-account?activeTab=versions)
[![NPM](https://github.com/wechaty/wechaty-puppet-official-account/workflows/NPM/badge.svg)](https://github.com/wechaty/wechaty-puppet-official-account/actions?query=workflow%3ANPM)

![WeChat Official Account Puppet for Wechaty](docs/images/wechaty-puppet-official-account.png)

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/wechaty/wechaty)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)

Wechaty Puppet for WeChat Official Accounts helps you use Wechaty to manage your Official Account from <https://mp.weixin.qq.com>.

## FEATURES

1. Provide web hook proxy out-of-the-box (powered by [localtunnel](https://github.com/localtunnel/localtunnel) and [Serverless.Social](https://serverless.social) )

## USAGE

This documentation assume that you are familiar with Wechaty already.

If you are newbie to Wechaty, please read the following two links first:

1. [Wechaty WebSite](https://wechaty.js.org)
1. [Wechaty Getting Started](https://github.com/wechaty/wechaty-getting-started)

In order to use `wechaty-puppet-official-account` with Wechaty, just like other puppets as well:

```ts
import { Wechaty } from 'wechaty'
import { PuppetOA } from 'wechaty-puppet-official-account'

const oa = new PuppetOA({
  appId           : 'wx436a8961645c4d49',
  appSecret       : '198cbdc24c3b52929cf4b7e1fe5ad571',
  token           : 'test',
  webhookProxyUrl : 'https://aeb082b9-14da-4b91-bdef-90a6b17a4a97.serverless.social',
})

const bot = new Wechaty({
  name: 'oa-bot',
  puppet: oa,
})

bot.on('message', msg => {
  if (!msg.self() && msg.type() === bot.Message.Type.Text && /ding/i.test(msg.text())) {
    await msg.say('dong')
  }
})
await bot.start()
```

That's it!

## ENVIRONMENTS VARIABLES

You can use environment variables to configure all of the WeChat Official Account Development Information.

### `WECHATY_PUPPET_OA_APP_ID`: `appId`

Developer ID(AppID) is the developer ID, Official Account identification code, which can call Official Account API with developer's password.

### `WECHATY_PUPPET_OA_APP_SECRET`: `appSecret`

Developer Password(AppSecret) is the one with high security to verify the identity of Official Account developer.

### `WECHATY_PUPPET_OA_TOKEN`: `token`

Token is set by you for your server(URL) configuration.

### `WECHATY_PUPPET_OA_PORT`

Set `WECHATY_PUPPET_OA_PORT` to your local HTTP Server port number if you have a public server that can be visit from the internet.

After set ``WECHATY_PUPPET_OA_PORT`, the puppet will expose itself to the internet with this port for providing the HTTP service.

### `WECHATY_PUPPET_OA_WEBHOOK_PROXY_URL`

Set `WECHATY_PUPPET_OA_WEBHOOK_PROXY_URL` to a `localtunnel` supported address so that you will be able to provide the Server Address(URL) for WebHook usage with this URL.

This is the most convenience way to use this puppet, because you can always provide the same URL to WeChat Official Account platform no matter where your program are running of.

Currently, you can generate this URL by yourself by:

1. Generate a UUIDv4 use a generator like [UUID Online Generator](https://uuidonline.com)
1. Insert your $UUID to `https://${UUID}.serverless.social`

For example, if your UUID is `aeb082b9-14da-4b91-bdef-90a6b17a4a97`, then you can use `https://aeb082b9-14da-4b91-bdef-90a6b17a4a97.serverless.social` as `WECHATY_PUPPET_OA_WEBHOOK_PROXY_URL`

Learn more from: [localtunnel](https://localtunnel.github.io/www/)

## DEVELOPMENT

When you start developing the WeChat Official Account, it will be very helpful with the following tools provided by Tencent:

1. Apply a test Official Account with full priviliedges for developing
1. Simulate the API calls in a online simulation tool.

### 1 Apply a Official Account for developing/testing

测试号是扫码即可获得的微信公众号，拥有所有完整高级接口权限，测试专用。

[进入微信公众帐号测试号申请系统](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Requesting_an_API_Test_Account.html)

### 2 API calls debuging tool

允许开发者在平台上提交信息和服务器进行交互，并得到验证结果的在线 API 调试工具。

Address: <https://mp.weixin.qq.com/debug/>

## RESOURCES

- [nodejs+express对微信公众号进行二次开发--接收消息，自动回复文本，图片以及代码优化](https://blog.csdn.net/weixin_44729896/article/details/102525375)

## HISTORY

### v0.4 master

1. Support localtunnel service from chatie.io

### v0.2 (Aug 2, 2018)

Initial version for Official Account.

1. receive message from user
1. reply message to user (passive mode)

## AUTHOR

[Huan LI](http://linkedin.com/in/zixia) \<zixia@zixia.net\>

<a href="https://stackexchange.com/users/265499">
  <img src="https://stackexchange.com/users/flair/265499.png" width="208" height="58" alt="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites">
</a>

## COPYRIGHT & LICENSE

- Code & Docs © 2020 Huan LI \<zixia@zixia.net\>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons
