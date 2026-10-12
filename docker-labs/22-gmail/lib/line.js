/* TCP par line-by-line padhna */
module.exports = function onLines(sock, fn) {
  let buf = '';
  sock.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); fn(l); } });
};
