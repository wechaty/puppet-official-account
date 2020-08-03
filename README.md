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

## ENVIRONMENTS

```sh
WECHATY_PUPPET_OA_APP_ID
WECHATY_PUPPET_OA_APP_SECRET
WECHATY_PUPPET_OA_PORT
WECHATY_PUPPET_OA_TOKEN
WECHATY_PUPPET_OA_WEBHOOK_PROXY_URL
```

### Puppet Official Account

## DEVELOPMENT

### 测试号申请

由于用户体验和安全性方面的考虑，微信公众号的注册有一定门槛，某些高级接口的权限需要微信认证后才可以获取。

所以，为了帮助开发者快速了解和上手微信公众号开发，熟悉各个接口的调用，我们推出了微信公众帐号测试号，通过手机微信扫描二维码即可获得测试号。

[进入微信公众帐号测试号申请系统](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Requesting_an_API_Test_Account.html)

### 接口调试工具

此工具旨在帮助开发者检测调用【微信公众平台开发者API】时发送的请求参数是否正确，提交相关信息后可获得服务器的验证结果

使用说明：

1. 选择合适的接口。
1. 系统会生成该接口的参数表，您可以直接在文本框内填入对应的参数值。（红色星号表示该字段必填）
1. 点击检查问题按钮，即可得到相应的调试信息。

<https://mp.weixin.qq.com/debug/>

### Webhook.site

With Webhook.site, you instantly get a unique, random URL that you can use to test and debug Webhooks and HTTP requests, as well as to create your own workflows using the Custom Actions graphical editor or WebhookScript, a simple scripting language, to transform, validate and process HTTP requests.

<https://webhook.site/>

### UUID Online Generator

<https://uuidonline.com/>

## Resources

- [nodejs+express对微信公众号进行二次开发--接收消息，自动回复文本，图片以及代码优化](https://blog.csdn.net/weixin_44729896/article/details/102525375)

## HISTORY

### master

### v0.1 (Aug 2, 2018)

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
