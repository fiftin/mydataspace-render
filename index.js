const https = require('https');
const http = require('http');
const config = require('./config.json');
const port = config.port || 4001;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function request(method, path, headers, body) {
  console.log(`Sending request to "${path}"...`);

  let s;
  if (body) {
    s = JSON.stringify(body);
    headers['Content-Length'] = s.length;
  }
  return new Promise((resolve, reject) => {
    console.log('Promise...');
    const req = https.request({
      hostname: 'api.mydataspace.net',
      path: path,
      port: 443,
      method: method,
      headers: headers
    }, res => {
      console.log(`Handing response...`);
      var json = '';
      res.on('data', chunk => {
        console.log(`New chank received`);
        return json += chunk;
      });
      res.on('end', () => {
        resolve(json); 
      });
    });

    req.on('error', e => {
      console.error(e);
    });
    if (s) {
      req.write(s);
    }
    req.end();

  });
}


async function getContent({clientId, accessToken, website, path}) {
  console.log(`Authorizing...`);
  const json = await request(
    'GET',
    `/auth?authProvider=access-token&state=permission%3dadmin%26clientId%3d${clientId}%26resultFormat=json` +
    `&accessToken=${accessToken}`);

  const jwt = JSON.parse(json).jwt;

  console.log(`Authorized with JWT ${jwt}`);
  const content = await request(
    'POST',
    `/v1/entities/renderWebsite`, {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }, {
      website: website,
      path: path
    });
  return content;
};


const server = http.createServer((req, res) => {
  const url = req.url; //.replace(/&amp;/g, '&');
  const pattern = /\?website=([\w-.]+)&path=(?:\/?([\/\w-]*))?$/;
  console.log(`Request: ${url}`);
  const m = url.match(pattern);
  if (!m) {
    console.log('Illegal request. Ignored');
    return;
  }
  const website = m[1];
  const path = m[2] ? `website/${m[2]}` : 'website';
  console.log(`Getting content for ${website}:${path}...`);
  req.on('err', err => {
  });
  req.on('data', chunk => {
  });
  req.on('end', () => {
    getContent({clientId: config.clientId, accessToken: config.accessToken, website, path}).then(content => {
      res.write(content);
      res.end();
    });
  });
});


server.listen(port, err => {
  if (err) {
    console.error(err);
    return;
  }

  console.log(`Server is listening on ${port}`);
});
