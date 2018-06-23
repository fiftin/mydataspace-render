const https = require('https');
const http = require('http');
const config = require('./config.json');
const port = config.port || 4001;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function request(method, host, path, headers, body) {
  console.log(`Sending request to "${host}${path}"...`);

  let s;
  if (body) {
    s = JSON.stringify(body);
    headers['Content-Length'] = s.length;
  }
  return new Promise((resolve, reject) => {
    console.log('Promise...');
    const req = https.request({
      hostname: host,
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


async function getContent({clientId, accessToken, host, website, path}) {
  console.log(`Authorizing...`);
  const json = await request(
    'GET',
    host,
    `/auth?authProvider=access-token&state=permission%3dadmin%26clientId%3d${clientId}%26resultFormat=json` +
    `&accessToken=${accessToken}`);

  const jwt = JSON.parse(json).jwt;

  console.log(`Authorized with JWT ${jwt}`);
  return await request(
    'POST',
    host,
    `/v1/entities/renderWebsite`, {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }, {
      website: website,
      path: path
    });
}


const server = http.createServer((req, res) => {
  const url = req.url;
  //const pattern = /\?website=([\w-.]+)&path=(?:\/?([\/\w-.]*))?$/;
  //console.log(`Request: ${url}`);
  //let m = url.match(pattern);

  const patternUrl = /([\w.]+)\/?\?url=\/([\w.-]+)(?:\/?([\/\w-.]*))?$/;
  const m = url.match(patternUrl);
  if (!m) {
    console.log('Illegal request. Ignored');
    return;
  }

  const host = m[1];
  const website = m[2];
  const path = m[3] ? `website/${m[3]}` : 'website';
  console.log(`Getting content for ${website}:${path}...`);
  req.on('err', err => {
  });
  req.on('data', chunk => {
  });
  req.on('end', () => {
    getContent({clientId: config.dest[host].clientId, accessToken: config.dest[host].accessToken, host, website, path}).then(content => {
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
