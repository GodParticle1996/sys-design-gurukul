'use strict';
// A small, real subset of the Protocol Buffers wire format (varint + length-delimited), hand-written for one schema:
//   message Order { uint64 id = 1; uint64 userId = 2; uint64 amountPaise = 3; string city = 4;
//                   repeated string items = 5; bool paid = 6; }
//   message OrderList { repeated Order orders = 1; }
// Field key = (field number << 3) | wire type, itself a varint. Wire type 0 = varint, 2 = length-delimited.
// This lab supports numbers 0 … 2^53 − 1 only (JavaScript safe integers); bigger values are refused, not rounded.
const { isUtf8 } = require('node:buffer');
const MAX_VARINT_BYTES = 8;                    // 8 × 7 = 56 bits covers every safe integer

function checkNumber(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('varint: need a non-negative safe integer, got ' + n);
  return n;
}

function varintSize(n) {
  checkNumber(n);
  let size = 1;
  while (n >= 128) { n = Math.floor(n / 128); size++; }
  return size;
}

function writeVarint(buf, pos, n) {
  checkNumber(n);
  while (n >= 128) {
    buf[pos++] = (n % 128) | 128;              // low 7 bits, top bit 1 = "aur byte aayega"
    n = Math.floor(n / 128);
  }
  buf[pos++] = n;                              // last byte, top bit 0
  return pos;
}

function readVarint(buf, pos, end = buf.length) {
  let n = 0, mul = 1, b, count = 0;
  do {
    if (pos >= end) throw new Error('varint: ran past the end of its message');
    if (++count > MAX_VARINT_BYTES) throw new Error('varint: too long for this lab');
    b = buf[pos++];
    n += (b & 127) * mul;                      // 7 bits at a time, lowest first
    mul *= 128;
  } while (b & 128);
  if (n > Number.MAX_SAFE_INTEGER) throw new Error('varint: value above 2^53 − 1 is not supported');
  return [n, pos];
}

function readKey(buf, pos, end) {
  let key; [key, pos] = readVarint(buf, pos, end);
  if (key > 0xFFFFFFFF) throw new Error('key: must fit in 32 bits');
  const field = Math.floor(key / 8), wire = key % 8;
  if (field === 0) throw new Error('key: field number 0 is not allowed');
  return [field, wire, pos];
}

function readString(buf, pos, len) {
  const bytes = buf.subarray(pos, pos + len);
  if (!isUtf8(bytes)) throw new Error('string: not valid UTF-8');
  return bytes.toString('utf8');
}

function orderSize(o) {
  let size = 1 + varintSize(o.id) + 1 + varintSize(o.userId) + 1 + varintSize(o.amountPaise);
  const c = Buffer.byteLength(o.city);
  size += 1 + varintSize(c) + c;
  for (const it of o.items) { const l = Buffer.byteLength(it); size += 1 + varintSize(l) + l; }
  if (o.paid) size += 2;                       // proto3: a false bool is not written
  return size;
}

function writeOrder(buf, pos, o) {
  buf[pos++] = (1 << 3) | 0; pos = writeVarint(buf, pos, o.id);
  buf[pos++] = (2 << 3) | 0; pos = writeVarint(buf, pos, o.userId);
  buf[pos++] = (3 << 3) | 0; pos = writeVarint(buf, pos, o.amountPaise);
  buf[pos++] = (4 << 3) | 2; pos = writeVarint(buf, pos, Buffer.byteLength(o.city)); pos += buf.write(o.city, pos);
  for (const it of o.items) {
    buf[pos++] = (5 << 3) | 2; pos = writeVarint(buf, pos, Buffer.byteLength(it)); pos += buf.write(it, pos);
  }
  if (o.paid) { buf[pos++] = (6 << 3) | 0; buf[pos++] = 1; }
  return pos;
}

function encodeOrder(o) {
  const buf = Buffer.allocUnsafe(orderSize(o));  // orderSize checks every number before any byte is written
  const end = writeOrder(buf, 0, o);
  if (end !== buf.length) throw new Error('encodeOrder: size mismatch');
  return buf;
}

function decodeOrder(buf, pos = 0, end = buf.length) {
  if (end > buf.length) throw new Error('Order: message runs past the buffer');
  const o = { id: 0, userId: 0, amountPaise: 0, city: '', items: [], paid: false };
  while (pos < end) {
    let field, wire; [field, wire, pos] = readKey(buf, pos, end);
    if (wire === 0) {
      let v; [v, pos] = readVarint(buf, pos, end);
      if (field === 1) o.id = v; else if (field === 2) o.userId = v; else if (field === 3) o.amountPaise = v;
      else if (field === 6) o.paid = v !== 0;
    } else if (wire === 2) {
      let len; [len, pos] = readVarint(buf, pos, end);
      if (len > end - pos) throw new Error('length-delimited field runs past the end of its message');
      if (field === 4) o.city = readString(buf, pos, len);
      else if (field === 5) o.items.push(readString(buf, pos, len));
      pos += len;                              // unknown length-delimited fields are skipped
    } else {
      throw new Error('unsupported wire type ' + wire);
    }
  }
  return o;
}

function encodeList(orders) {
  let size = 0;
  const sizes = orders.map(o => orderSize(o));
  for (const s of sizes) size += 1 + varintSize(s) + s;
  const buf = Buffer.allocUnsafe(size);
  let pos = 0;
  orders.forEach((o, i) => {
    buf[pos++] = (1 << 3) | 2;
    pos = writeVarint(buf, pos, sizes[i]);
    pos = writeOrder(buf, pos, o);
  });
  if (pos !== size) throw new Error('encodeList: size mismatch');
  return buf;
}

function decodeList(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    let field, wire, len; [field, wire, pos] = readKey(buf, pos, buf.length);
    if (field !== 1 || wire !== 2) throw new Error('OrderList: unexpected field ' + field + ' wire ' + wire);
    [len, pos] = readVarint(buf, pos, buf.length);
    if (len > buf.length - pos) throw new Error('OrderList: Order runs past the end');
    out.push(decodeOrder(buf, pos, pos + len));  // every read inside stops at pos + len
    pos += len;
  }
  return out;
}

module.exports = { writeVarint, readVarint, varintSize, encodeOrder, decodeOrder, encodeList, decodeList };
