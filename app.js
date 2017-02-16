'use strict';

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const HOST = 'api.line.me';
const REPLY_PATH = '/v2/bot/message/reply';//リプライ用
const CH_SECRET = process.env.CH_SECRET || require('./config').CH_SECRET; //Channel Secretを指定
const CH_ACCESS_TOKEN = process.env.CH_ACCESS_TOKEN || require('./config').CH_ACCESS_TOKEN; //Channel Access Tokenを指定
const SIGNATURE = crypto.createHmac('sha256', CH_SECRET);
const PORT = process.env.PORT || 3000;

const PUSH_PATH = '/v2/bot/message/multicast';
const MY_USERID = process.env.USER_ID || require('./config').USER_ID; // ちゃんとく

const MILK_KEY = process.env.MILK_KEY || require('./config').MILK_KEY;
const MILKCOCOA = require('milkcocoa');
const milkcocoa = new MILKCOCOA(MILK_KEY+".mlkcca.com");
const ds = milkcocoa.dataStore('esp8266');

/**
 * httpリクエスト部分
 */
const replyClient = (replyToken, SendMessageObject) => {
    let postDataStr = JSON.stringify({ replyToken: replyToken, messages: SendMessageObject });
    let options = {
        host: HOST,
        port: 443,
        path: REPLY_PATH,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Line-Signature': SIGNATURE,
            'Authorization': `Bearer ${CH_ACCESS_TOKEN}`,
            'Content-Length': Buffer.byteLength(postDataStr)
        }
    };

    return new Promise((resolve, reject) => {
        let req = https.request(options, (res) => {
                    let body = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        body += chunk;
                    });
                    res.on('end', () => {
                        resolve(body);
                    });
        });

        req.on('error', (e) => {
            reject(e);
        });
        req.write(postDataStr);
        req.end();
    });
};

const pushClient = (userId, SendMessageObject) => {
    let postDataStr = JSON.stringify({ to: userId, messages: SendMessageObject });
    let options = {
        host: HOST,
        port: 443,
        path: PUSH_PATH,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Line-Signature': SIGNATURE,
            'Authorization': `Bearer ${CH_ACCESS_TOKEN}`,
            'Content-Length': Buffer.byteLength(postDataStr)
        }
    };

    return new Promise((resolve, reject) => {
        let req = https.request(options, (res) => {
                    let body = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        body += chunk;
                    });
                    res.on('end', () => {
                        resolve(body);
                    });
        });

        req.on('error', (e) => {
            reject(e);
        });
        req.write(postDataStr);
        req.end();
    });
};


let flag = 0;

ds.on('push', (pushed) => {
  if (flag === 0) {
    flag = 1;
    let CustomMessage = [{
      type: 'text',
      text: '今日の体重は'+pushed.value.weight+'キロです！'
    }];

    pushClient([MY_USERID], CustomMessage)
        .then((body) => {
          console.log(body);

          setTimeout(()=>{
            flag = 0;
          },10*1000);
        }, (e) => {console.log(e)});
  }
});


http.createServer((req, res) => {
    if(req.url !== '/' || req.method !== 'POST'){
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('こんにちは');
    }

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        if(body === ''){
          console.log('bodyが空です。');
          return;
        }

        let WebhookEventObject = JSON.parse(body).events[0];
        console.log(WebhookEventObject);
        //メッセージが送られて来た場合
        if(WebhookEventObject.type === 'message'){
            let SendMessageObject;
            if(WebhookEventObject.message.type === 'text'){
                SendMessageObject = [{
                    type: 'text',
                    text: WebhookEventObject.message.text
                }];
            }
            replyClient(WebhookEventObject.replyToken, SendMessageObject)
            .then((body)=>{
                console.log(body);
            },(e)=>{console.log(e)});
        }

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('su');
    });

}).listen(PORT);

console.log(`Server running at ${PORT}`);
