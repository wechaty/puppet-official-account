<?php
/**
 * 微信公众平台开发——微信授权登录（OAuth2.0）
 *  https://www.cnblogs.com/0201zcr/p/5131602.html
 *
 * 微信网页开发 - 网页授权
 *  https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
 */
// 简单展示了如何通过微信公众平台的网页静默授权取得用户的 openid
// 你需要有一个公众号的管理权限，以做相应的设置

define ('_showurl','https://sms.yundashi.com/mp/getopenid.php');//这个域名要在公众号的后台设置，在“公众号设置”->"功能设置"->"网页授权域名"
define ('_appid','APP_ID'); //请换成你自己的公众账号appid
define ('_appsecret','APP_SECRET');//请换成你自己的公众账号的 appsecret
define ('_mpauthurl','https://open.weixin.qq.com/connect/oauth2/authorize?appid=%s&redirect_uri=%s&response_type=code&scope=snsapi_base&state=123#wechat_redirect');
define ('_urlgetaccesstoken', 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code');

if (isset($_GET["code"])){
    $code = $_GET["code"];
    $sUrlWebToken = sprintf(_urlgetaccesstoken,_appid,_appsecret,$code);
    $aResponse = json_decode (file_get_contents($sUrlWebToken));
    while(list($key,$val)= each($aResponse)) {
      if ('openid' == $key) {
        echo "your openid is:\n";
        echo $val;
        break;
      }
    }
} else {
    $sUrlAuth = sprintf(_mpauthurl,_appid,urlencode(_showurl));
    header('Location: '.$sUrlAuth);
}

?>
