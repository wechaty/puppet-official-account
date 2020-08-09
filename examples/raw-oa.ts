/* eslint-disable camelcase */
import http         from 'http'
import express      from 'express'
import xmlParser    from 'express-xml-bodyparser'
import localtunnel  from 'localtunnel'
import crypto       from 'crypto'

import { getSimpleUnirest } from '../src/official-account/simple-unirest'

async function main () {

  const app = express()

  app.use(xmlParser({
    explicitArray : false,
    normalize     : false,
    normalizeTags : false,
    trim          : true,
  }))

  const server = http.createServer(app)

  server.listen(async () => {
    const listenedPort = (server.address() as { port: number }).port
    console.info('listen on port', listenedPort)

    const tunnel = await localtunnel({
      host: 'https://serverless.social',
      port: listenedPort,
      // subdomain: 'wechaty-puppet-official-account',
      subdomain: 'c9534fb4-4d8d-4b2f-8ee5-ef1d6973364f',
    })
    // https://wechaty-puppet-official-account.serverless.social/

    console.info('tunnel url', tunnel.url)
  })

  const simpleUnirest = getSimpleUnirest('https://api.weixin.qq.com/cgi-bin/')

  const appId = process.env.APP_ID
  const appSecret = process.env.APP_SECRET

  const ret = await simpleUnirest
    .get<{
      access_token : string
      expires_in   : number
    }>(`token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`)

  console.info('accessToken', ret.body)

  const accessToken = {
    expiresIn : ret.body.expires_in,
    timestamp : Date.now(),
    token     : ret.body.access_token,
  }

  app.get('/',  (req, res) => {

    const {
      signature,
      timestamp,
      nonce,
      echostr,
    }             = req.query as { [key: string]: string }

    const data = [
      timestamp,
      nonce,
      process.env.TOKEN,
    ].sort().join('')

    const digest = crypto
      .createHash('sha1')
      .update(data)
      .digest('hex')

    if (digest === signature) {
      res.end(echostr)
    } else {
      res.end()
    }

  })

  app.post('/', async (req, res) => {
    const payload = req.body.xml

    console.info(payload)

    if (!/ding/i.test(payload.Content)) {
      res.end()
      return
    }

    const ret = await simpleUnirest
      .post<any>(`message/custom/send?access_token=${accessToken.token}`)
      .type('json')
      .send({
        msgtype: 'text',
        text:
        {
          content: 'dong',
        },
        touser: payload.FromUserName,
      })

    console.info(ret.body)
    res.end('success')
  })
}

main()
  .catch(console.error)
