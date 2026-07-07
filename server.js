// Local relay server for syncing the map device with a companion video
// display device over the same Wi-Fi/LAN -- no npm install required, only
// Node's built-in http/fs modules.
//
// Usage:
//   node server.js [port]
//
// Then, on the "map" device, open:   http://<this-machine's-LAN-IP>:PORT/index.html
// and on the "video" device, open:   http://<this-machine's-LAN-IP>:PORT/video.html
//
// Clicking a location marker on the map POSTs to /trigger?marker=<id>; every
// connected video device is listening on an SSE stream at /events and reacts
// by playing videos/marker-<id>.mp4 (see video.html to change that mapping).
//
// This only works when BOTH devices load the page from this server (plain
// http://<lan-ip>) rather than the public GitHub Pages https:// copy --
// browsers block a secure page from talking to a plain-http local server.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2]) || 8080;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

// Every open video-display connection gets pushed to when a marker fires.
const sseClients = new Set();

function sendCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function serveStatic(req, res, urlPath) {
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(ROOT, filePath);

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + filePath);
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    sendCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/events') {
    sendCors(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    sseClients.add(res);
    console.log(`[video display connected] ${sseClients.size} listening`);

    const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 20000);
    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
      console.log(`[video display disconnected] ${sseClients.size} listening`);
    });
    return;
  }

  if (url.pathname === '/trigger' && req.method === 'POST') {
    const markerId = url.searchParams.get('marker');
    console.log(`[marker clicked] ${markerId} -> ${sseClients.size} display(s)`);
    for (const client of sseClients) {
      client.write(`data: ${markerId}\n\n`);
    }
    sendCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Robonexus sync server running at http://0.0.0.0:${PORT}/`);
  console.log(`  Map device:   http://<this-machine-LAN-IP>:${PORT}/index.html`);
  console.log(`  Video device: http://<this-machine-LAN-IP>:${PORT}/video.html`);
});
