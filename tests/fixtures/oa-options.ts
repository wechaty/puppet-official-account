/**
 * lizhuohuan 的接口测试号
 *
 *  https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login
 *  https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Requesting_an_API_Test_Account.html
 */
import { envOptions } from '../../src/config'

const getOaOptions = () => {
  const options = envOptions()

  if (!options.appId || !options.appSecret || !options.token) {
    throw new Error('getOaOptions(): please check your environment variables!')
  }

  return {
    appId     : options.appId,
    appSecret : options.appSecret,
    token     : options.token,
  }
}

export { getOaOptions }
