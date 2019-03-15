const Config = require("config");
var request = require('request-promise');
const { Api, JsonRpc, RpcError, JsSignatureProvider } = require('eosjs');
const fetch = require('node-fetch');                            // node only; not needed in browsers
const { TextDecoder, TextEncoder } = require('text-encoding');  // node, IE11 and IE Edge Browsers
const createHash = require('create-hash');

//the two below required to be modified.
const defaultPrivateKey = "xxx";  // for from eos account privatekey
const fromaccount = "xxx"; //for from eos account

//the below is optional.
const minedays = "30"; //days to mine
const betamount = "0.1"; //bet amount
const betitem = "banker"; // banker,player,tie,bankerPair,playerPair
const referreraccount = "bobinggame14"; //reffer account

const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
const rpc = new JsonRpc('http://eos.greymass.com', { fetch });
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

function transfer(from, to, quantity, type, gameid, item ,seed, clientSeed, expiration_timestamp, referrer, signature) {
  (async () => {
    const result = await api.transact({
      actions: [{
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
          actor: from,
          permission: 'active',
        }],
        data: {
          from: from,
          to: to,
          quantity: Number(quantity).toFixed(4) + ' ' + type,
          memo: gameid + '-' + item + '-' + seed + '-' + clientSeed + '-' + expiration_timestamp + '-' + referrer + '-' + signature
        },
      }]
    }, {
        blocksBehind: 3,
        expireSeconds: 60,
      })
      .then(res => {
        console.log("success:", res);
      })
      .catch(e => {
        console.log("error:", e);
      })
  })();

}

/**
 * create client seed
 */
function getClientSeed(from) {
  let randomNumber = Math.floor(Math.random() * Math.floor(Number.MAX_SAFE_INTEGER));
  return createHash('sha1').update(from + Date.now() + randomNumber).digest('hex');
}

function doTransfer() {
  // console.log("config.server_url:", Config.server_url);
  if(!Config.server_url){
    console.error("请运行 ./run.sh development 来设置开发环境");
    return;
  }

  var options = {
        method: 'POST',
        url: Config.server_url + '/baccarat/api/v1/getgame',
        body: {
            json: "true"
        },
        json: true
    };

  request(options).then(result => {
      //console.log("post to get current gameid, /v1/getgame, return:", result);

      var options = {
          method: 'POST',
          url: Config.sign_url + '/api/v1/bet',
          body: {
              "gameid": result.data[0][0].gameid,
              "item": betitem,
              "referrer": referreraccount,
              json: "true"
          },
          json: true
      };
      request(options).then(body => {
          console.log("post to sign, /v1/bet, return:", body);

          if(body.status == 0){
              return;
          }

          // test data
          let from = fromaccount,
              to = 'fairbaccarat',
              quantity = betamount,
              type = "EOS",
              gameid = result.data[0][0].gameid,
              item = betitem,
              clientSeed = getClientSeed(from),
              seed = body.seed,
              expiration_timestamp = body.expiration_timestamp,
              referrer = referreraccount,
              signature = body.signature;

          // console.log("=== data for transfer ===");
          // console.log("from:", from);
          // console.log("to:", to);
          // console.log("quantity:", quantity);
          // console.log("type:", type);
          // console.log("seed:", seed);
          // console.log("clientSeed:", clientSeed);
          // console.log("expiration_timestamp:", expiration_timestamp);
          // console.log("referrer:", referrer);
          // console.log("signature:", signature);
          console.log("now:", new Date());
          transfer(from, to, quantity, type, gameid, item, seed, clientSeed, expiration_timestamp, referrer, signature);
      });
  });
}

let testSpanInSeconds = minedays * 3600 * 24;
let now = new Date();
let expire_time = now.setSeconds(now.getSeconds() + testSpanInSeconds);
let concurrentNum = 1;
let count = 0;

recCall = function(){
   setTimeout(oneSecondCall, 2000);
}

function oneSecondCall(){
    console.log("one second start");
    for(let i = 0; i < concurrentNum; i++ ){
      count++;
      console.log("current count:", count);
      doTransfer()
    }
    let n = new Date();
    if(n > expire_time){
      console.log("total:", count);
      return;
    } else {
      recCall()
    }
}

 recCall();
