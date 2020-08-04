import {
  FileBox,
}             from 'wechaty-puppet'

import { PuppetOAOptions } from './puppet-oa'

const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'

function qrCodeForChatie (): FileBox {
  return FileBox.fromQRCode(CHATIE_OFFICIAL_ACCOUNT_QRCODE)
}

function envOptions (): Partial<PuppetOAOptions> {
  return {
    appId           : process.env.WECHATY_PUPPET_OA_APP_ID,
    appSecret       : process.env.WECHATY_PUPPET_OA_APP_SECRET,
    personalMode    : !!process.env.WECHATY_PUPPET_OA_PERSONAL_MODE,
    port            : process.env.WECHATY_PUPPET_OA_PORT ? parseInt(process.env.WECHATY_PUPPET_OA_PORT) : undefined,
    token           : process.env.WECHATY_PUPPET_OA_TOKEN,
    webhookProxyUrl : process.env.WECHATY_PUPPET_OA_WEBHOOK_PROXY_URL,
  }
}

export {
  qrCodeForChatie,
  envOptions,
}
