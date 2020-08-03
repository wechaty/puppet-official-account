function textMessagePayload (args: {
  fromUserName : string,
  toUserName   : string,
  content      : string,
}): string {
  const xml = [
    '<xml><ToUserName><![CDATA[' + args.toUserName + ']]></ToUserName>',
    '<FromUserName><![CDATA[' + args.fromUserName + ']]></FromUserName>',
    '<CreateTime>' + new Date().getTime() + '</CreateTime>',
    '<MsgType><![CDATA[text]]></MsgType>',
    '<Content><![CDATA[' + args.content + ']]></Content></xml>',
  ].join('')
  return xml
}

function imageMessagePayload (args: {
  toUserName   : string,
  fromUserName : string,
  mediaId      : string,
}): string {
  const xml = [
    '<xml><ToUserName><![CDATA[' + args.toUserName + ']]></ToUserName>',
    '<FromUserName><![CDATA[' + args.fromUserName + ']]></FromUserName>',
    '<CreateTime>' + new Date().getTime() + '</CreateTime>',
    '<MsgType><![CDATA[image]]></MsgType>',
    '<Image><MediaId><![CDATA[' + args.mediaId + ']]></MediaId></Image></xml>',
  ].join('')
  return xml
}

export {
  textMessagePayload,
  imageMessagePayload,
}
