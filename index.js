const https = require('https');
const http = require('http');
const config = require('./config.json');
const port = config.port || 4001;


function request(method, path, headers) {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'api.mydataspace.net',
      path: path,
      port: 443,
      method: method,
      headers: headers
    }, res => {
      var json = '';
      res.on('data', chunk => json += chunk);
      res.on('end', () => {
        resolve(json); 
      });
    });
  });
}


async function getContent({clientId, accessToken, website, path}) {
  const json = await request(
    'GET',
    `/auth?authProvider=access-token&state=permission%3dadmin%26clientId%3d${clientId}%26resultFormat=json`);

  const jwt = JSON.parse(json).jwt;

  const content = await request(
    'POST',
    `/v1/entities/renderWebsite?website=${website}&path=${path}`, 
    {
      Authorization: `Beraer ${jwt}` 
    });
  return content;
};


const server = http.createServer((req, res) => {
  const pattern = /\?website=([\w-.]+)&path=(?:\/?([\/\w-]*))?$/;
  if (!pattern) {
    return;
  }
  const website = pattern[0];
  const path = pattern[1] || '';
  getContent({config.clientId, config.accessToken, website, path}).then(content => res.send(content));
});


server.listen(port, err => {
  if (err) {
    console.error(err);
    return;
  }

  console.log(`Server is listening on ${port}`);
});
