const https = require('https');
const http = require('http');
const config = require('./config.json');
const port = config.port || 4001;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const MIME_TYPES = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  sht: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  xml: "text/xml; charset=utf-8",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "application/x-javascript; charset=utf-8",
  atom: "application/atom+xml",
  rss: "application/rss+xml",
  mml: "text/mathml",
  txt: "text/plain",
  jad: "text/vnd.sun.j2me.app-descriptor",
  wml: "text/vnd.wap.wml",
  htc: "text/x-component",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  wbmp: "image/vnd.wap.wbmp",
  ico: "image/x-icon",
  jng: "image/x-jng",
  bmp: "image/x-ms-bmp",
  svg: "image/svg+xml",
  webp: "image/webp",
  jar: "application/java-archive",
  war: "application/java-archive",
  ear: "application/java-archive",
  hqx: "application/mac-binhex40",
  doc: "application/msword",
  pdf: "application/pdf",
  ps: "application/postscript",
  eps: "application/postscript",
  ai: "application/postscript",
  rtf: "application/rtf",
  xls: "application/vnd.ms-excel",
  ppt: "application/vnd.ms-powerpoint",
  wmlc: "application/vnd.wap.wmlc",
  kml: "application/vnd.google-earth.kml+xml",
  kmz: "application/vnd.google-earth.kmz",
  '7z': "application/x-7z-compressed",
  cco: "application/x-cocoa",
  jardiff: "application/x-java-archive-diff",
  jnlp: "application/x-java-jnlp-file",
  run: "application/x-makeself",
  pl: "application/x-perl",
  pm: "application/x-perl",
  prc: "application/x-pilot",
  pdb: "application/x-pilot",
  rar: "application/x-rar-compressed",
  rpm: "application/x-redhat-package-manager",
  sea: "application/x-sea",
  swf: "application/x-shockwave-flash",
  sit: "application/x-stuffit",
  tcl: "application/x-tcl",
  tk: "application/x-tcl",
  der: "application/x-x509-ca-cert",
  pem: "application/x-x509-ca-cert",
  crt: "application/x-x509-ca-cert",
  xpi: "application/x-xpinstall",
  xhtml: "application/xhtml+xml; charset=utf-8",
  zip: "application/zip",
  bin: "application/octet-stream",
  exe: "application/octet-stream",
  dll: "application/octet-stream",
  deb: "application/octet-stream",
  dmg: "application/octet-stream",
  eot: "application/octet-stream",
  iso: "application/octet-stream",
  img: "application/octet-stream",
  msi: "application/octet-stream",
  msp: "application/octet-stream",
  msm: "application/octet-stream",
  mid: "audio/midi",
  midi: "audio/midi",
  kar: "audio/midi",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  ra: "audio/x-realaudio",
  '3gpp': "video/3gpp",
  '3gp': "video/3gpp",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  mov: "video/quicktime",
  flv: "video/x-flv",
  mng: "video/x-mng",
  asx: "video/x-ms-asf",
  asf: "video/x-ms-asf",
  wmv: "video/x-ms-wmv",
  avi: "video/x-msvideo",
  m4v: "video/mp4",
  mp4: "video/mp5"
};


function getContentType(filename) {
  const ext = (filename || '').match(/\.(\w+)$/);
  return MIME_TYPES[ext ? ext[1] : 'html'];
}

function isIPAddress(str) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str);
}

function isValidHost(str) {
  return !isIPAddress(str);
}

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
      console.log(`Handing response (code: ${res.statusCode})...`);
      var json = '';
      res.on('data', chunk => {
        console.log(`New chank received`);
        return json += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject({
            status: res.statusCode,
            message: json
          });
          return;
        }
        resolve(json); 
      });
    });

    req.on('error', e => {
      console.error(e);
      reject({
        message: e.message,
        status: 505
      });
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

  const patternUrl = /([\w.]+)\/?\?url=\/([\w.-]+)(?:\/?([\/\w-.]*))?$/;
  const m = url.match(patternUrl);
  if (!m) {
    console.log('Illegal request. Ignored');
    res.statusCode = 400;
    res.end();
    return;
  }

  const host = m[1];
  const website = m[2];
  const path = m[3] ? m[3] : '';
  // const path = m[3] ? `website/public_html/${m[3]}` : 'website/public_html';

  if (!isValidHost(host)) {
    console.log('Illegal request. Ignored');
    res.statusCode = 400;
    res.end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': getContentType(path)
  });

  console.log(`Getting content for ${website}:${path}...`);
  req.on('err', err => {
  });
  req.on('data', chunk => {
  });
  req.on('end', () => {
    getContent({
      clientId: config.dest[host].clientId,
      accessToken: config.dest[host].accessToken,
      host,
      website,
      path
    }).then(content => {
      res.write(content);
      res.end();
    }, err => {
      res.statusCode = err.status || 404;
      if (err.message) {
        res.write(err.message);
      }
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
