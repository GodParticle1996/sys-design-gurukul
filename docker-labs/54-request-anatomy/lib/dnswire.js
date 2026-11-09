'use strict';
// A small, real subset of the DNS wire format (RFC 1035): header, one question, A (type 1) and NS (type 2) records,
// class IN only. Names are a narrow hostname subset: labels of letters, digits, '-' and '_', 1–63 bytes, at most
// 255 bytes on the wire (lengths and the root byte included). Names are written uncompressed; compression pointers
// are followed on read (backwards only, bounded). Anything outside this subset is refused, never silently changed.
const net = require('node:net');
const TYPE = { A: 1, NS: 2 };
const CLASS_IN = 1;
const TYPE_OPT = 41;                         // EDNS0 pseudo-record that clients like c-ares may add
const FLAG = { QR: 0x8000, AA: 0x0400, RD: 0x0100, RA: 0x0080 };
const OPCODE_MASK = 0x7800;                   // opcode 0 = standard query
const RCODE = { NOERROR: 0, FORMERR: 1, SERVFAIL: 2, NXDOMAIN: 3, REFUSED: 5 };
const LABEL = /^[A-Za-z0-9_-]{1,63}$/;

function canon(name) {                        // "Shop.KhanaKart.com" → "shop.khanakart.com."; "." stays "."
  const n = name.toLowerCase();
  return n === '.' || n === '' ? '.' : n.replace(/\.$/, '') + '.';
}

function labelsOf(name) {
  const c = canon(name);
  if (c === '.') return [];
  const labels = c.slice(0, -1).split('.');
  for (const l of labels) if (!LABEL.test(l)) throw new Error('bad label: "' + l + '" (letters, digits, - or _, 1–63 bytes)');
  return labels;
}

function nameBytes(name) {
  const out = [];
  for (const l of labelsOf(name)) out.push(Buffer.from([l.length]), Buffer.from(l, 'ascii'));
  out.push(Buffer.from([0]));                  // root label ends the name
  const buf = Buffer.concat(out);
  if (buf.length > 255) throw new Error('name longer than 255 bytes');
  return buf;
}

// Returns [name, next offset after the name's own bytes].
function readName(buf, pos) {
  const labels = [];
  let jumped = false, next = pos, hops = 0, wire = 1;     // wire length counts every length byte and the root byte
  for (;;) {
    if (pos >= buf.length) throw new Error('name runs past the end');
    const len = buf[pos];
    if ((len & 0xc0) === 0xc0) {               // compression pointer: 14-bit offset to an earlier name
      if (pos + 1 >= buf.length) throw new Error('pointer runs past the end');
      if (++hops > 16) throw new Error('too many compression pointers');
      const target = ((len & 0x3f) << 8) | buf[pos + 1];
      if (target >= pos) throw new Error('pointer must point backwards');
      if (!jumped) next = pos + 2;
      jumped = true;
      pos = target;
      continue;
    }
    if (len & 0xc0) throw new Error('unsupported label type');
    pos++;
    if (len === 0) break;
    if (pos + len > buf.length) throw new Error('label runs past the end');
    const label = buf.toString('latin1', pos, pos + len);
    if (!LABEL.test(label)) throw new Error('label outside the supported hostname subset');
    wire += 1 + len;
    if (wire > 255) throw new Error('name longer than 255 bytes');
    labels.push(label.toLowerCase());
    pos += len;
  }
  return [labels.length ? labels.join('.') + '.' : '.', jumped ? next : pos];
}

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }

function encodeRecord(r) {
  let rdata;
  if (r.type === TYPE.A) {
    if (!net.isIPv4(r.data)) throw new Error('bad IPv4 ' + r.data);
    rdata = Buffer.from(r.data.split('.').map(Number));
  } else if (r.type === TYPE.NS) rdata = nameBytes(r.data);
  else throw new Error('only A and NS records are supported');
  return Buffer.concat([nameBytes(r.name), u16(r.type), u16(CLASS_IN), u32(r.ttl), u16(rdata.length), rdata]);
}

// msg = { id, flags, rcode, question: { name, type }, answers: [], authority: [], additional: [] }
function encode(msg) {
  const ans = msg.answers || [], auth = msg.authority || [], add = msg.additional || [];
  const header = Buffer.concat([u16(msg.id), u16((msg.flags || 0) | (msg.rcode || 0)),
    u16(msg.question ? 1 : 0), u16(ans.length), u16(auth.length), u16(add.length)]);
  const q = msg.question ? Buffer.concat([nameBytes(msg.question.name), u16(msg.question.type), u16(CLASS_IN)]) : Buffer.alloc(0);
  return Buffer.concat([header, q, ...ans.map(encodeRecord), ...auth.map(encodeRecord), ...add.map(encodeRecord)]);
}

function decode(buf) {
  if (buf.length < 12) throw new Error('shorter than a DNS header');
  const id = buf.readUInt16BE(0), word = buf.readUInt16BE(2);
  const counts = [4, 6, 8, 10].map(o => buf.readUInt16BE(o));
  if (counts[0] > 1) throw new Error('only one question supported');
  let pos = 12, question = null;
  if (counts[0] === 1) {
    let name; [name, pos] = readName(buf, pos);
    if (pos + 4 > buf.length) throw new Error('question runs past the end');
    if (buf.readUInt16BE(pos + 2) !== CLASS_IN) throw new Error('only class IN is supported');
    question = { name, type: buf.readUInt16BE(pos), class: CLASS_IN };
    pos += 4;
  }
  const sections = [[], [], []];
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < counts[s + 1]; i++) {
      let name; [name, pos] = readName(buf, pos);
      if (pos + 10 > buf.length) throw new Error('record runs past the end');
      const type = buf.readUInt16BE(pos), cls = buf.readUInt16BE(pos + 2), ttl = buf.readUInt32BE(pos + 4), len = buf.readUInt16BE(pos + 8);
      pos += 10;
      const end = pos + len;
      if (end > buf.length) throw new Error('record data runs past the end');
      if (cls !== CLASS_IN && type !== TYPE_OPT) throw new Error('only class IN is supported');   // OPT's class is a UDP size
      let data = null;
      if (type === TYPE.A) {
        if (len !== 4) throw new Error('A record data must be 4 bytes');
        data = [...buf.subarray(pos, end)].join('.');
      } else if (type === TYPE.NS) {
        let after; [data, after] = readName(buf, pos);
        if (after !== end) throw new Error('NS name does not fill its record data exactly');
      }
      sections[s].push({ name, type, ttl, data });            // unsupported types keep data null; callers skip them
      pos = end;
    }
  }
  if (pos !== buf.length) throw new Error('extra bytes after the last record');
  return { id, flags: word & 0xfff0, opcode: (word & OPCODE_MASK) >> 11, rcode: word & 0x000f, question,
    answers: sections[0], authority: sections[1], additional: sections[2] };
}

module.exports = { TYPE, FLAG, RCODE, CLASS_IN, canon, encode, decode, nameBytes, readName, labelsOf };
