'use strict';
// TCP delay proxy: every chunk waits rttMs / 2 in each direction (distance model).
// MODEL: the loopback TCP handshake itself is instant, so the proxy stands in for SYN / SYN-ACK: the handshake clock
// starts when the proxy accepts the connection, and no upstream byte leaves before accept + 1 RTT + rtt/2. A first
// byte sent at once pays the full extra RTT; after a long idle the handshake may already be over. TLS is not modelled.
// End-of-stream (FIN) travels behind the data in its direction, with the same delay; nothing queued is dropped.
const net = require('node:net');

function delayProxy({ listenPort, targetPort, rttMs, hooks = {} }) {   // hooks.queued / hooks.sent(dir, chunk): for tests
  const half = rttMs / 2;
  let connections = 0;
  const server = net.createServer({ allowHalfOpen: true }, client => {
    connections++;
    const upstream = net.connect({ port: targetPort, host: '127.0.0.1', allowHalfOpen: true });
    const openAt = Date.now() + rttMs;            // modelled handshake, counted from accept
    // Each direction is an ordered queue: a chunk leaves at max(arrival + rtt/2, earliest allowed), never before
    // an earlier chunk of the same direction. A null chunk is the end of the stream.
    const relay = (from, to, earliest, dir) => {
      const queue = [];
      let timer = null;
      const pump = () => {
        timer = null;
        const now = Date.now();
        while (queue.length && queue[0].at <= now) {
          const { chunk } = queue.shift();
          if (to.destroyed) continue;
          if (hooks.sent) hooks.sent(dir, chunk);
          if (chunk === null) to.end(); else to.write(chunk);
        }
        if (queue.length) timer = setTimeout(pump, queue[0].at - now);
      };
      const push = chunk => {
        const last = queue.length ? queue[queue.length - 1].at : 0;
        queue.push({ at: Math.max(Date.now() + half, earliest() + half, last), chunk });
        if (hooks.queued) hooks.queued(dir, chunk);
        if (!timer) timer = setTimeout(pump, Math.max(0, queue[0].at - Date.now()));
      };
      from.on('data', push);
      from.on('end', () => push(null));
    };
    relay(client, upstream, () => openAt, 'up');
    relay(upstream, client, () => 0, 'down');
    const fail = () => { client.destroy(); upstream.destroy(); };
    client.on('error', fail); upstream.on('error', fail);
  });
  return new Promise(resolve => server.listen(listenPort, '127.0.0.1', () =>
    resolve({ server, connections: () => connections, close: () => new Promise(r => server.close(r)) })));
}
module.exports = { delayProxy };
