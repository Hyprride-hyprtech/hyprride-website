// Throttling proxy for local Lighthouse runs: adds latency and caps
// bandwidth so that, as on a real network, the app chunks finish after the
// first paint and the simulator does not count them as blocking the LCP.
//   node throttle-proxy.js <listenPort> <upstreamPort> [latencyMs] [mbps]
const http = require('http');
const [listen = 5467, upstream = 5466, latency = 120, mbps = 4] = process.argv.slice(2).map(Number);
const bytesPerMs = (mbps * 1e6) / 8 / 1000;
const slice = 8192;

http.createServer((req, res) => {
  const up = http.request({ host: '127.0.0.1', port: upstream, path: req.url, method: req.method, headers: req.headers }, (u) => {
    const chunks = [];
    u.on('data', (c) => chunks.push(c));
    u.on('end', () => {
      const body = Buffer.concat(chunks);
      const headers = { ...u.headers };
      delete headers['transfer-encoding'];
      headers['content-length'] = body.length;
      setTimeout(() => {
        res.writeHead(u.statusCode, headers);
        let off = 0;
        const pump = () => {
          if (off >= body.length) return res.end();
          const part = body.subarray(off, off + slice);
          off += slice;
          res.write(part);
          setTimeout(pump, part.length / bytesPerMs);
        };
        pump();
      }, latency);
    });
  });
  up.on('error', () => { res.statusCode = 502; res.end(); });
  req.pipe(up);
}).listen(listen, () => console.log(`throttle proxy :${listen} -> :${upstream} (${latency} ms, ${mbps} Mbps)`));
