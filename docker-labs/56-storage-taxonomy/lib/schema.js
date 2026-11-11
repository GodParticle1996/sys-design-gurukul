'use strict';
// ex4 SQL, shared by the tool and the tests.
// Schema on write: a STRICT table whose rules refuse bad rows.
const CUSTOMERS = 'CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, ' +
  'pincode TEXT NOT NULL CHECK (length(pincode) = 6 ' +
  "AND pincode GLOB '[1-9][0-9][0-9][0-9][0-9][0-9]')) STRICT";
// Schema on read: three app versions wrote three shapes:
//   v1 {zip}   v2 {postal_code}   v3 {address: {pin}}
const V3 = "json_extract(doc, '$.address.pin')";
const V2 = "json_extract(doc, '$.postal_code')";
const V1 = "json_extract(doc, '$.zip')";
const READERS = [
  ['reader knows only v3', V3],
  ['reader knows v2 + v3', `coalesce(${V3}, ${V2})`],
  ['reader knows v1 + v2 + v3', `coalesce(${V3}, ${V2}, ${V1})`],
];
// Rewrite every v1/v2 document to the v3 shape.
// v3 documents are left alone, so a second run changes nothing.
const MIGRATE = 'UPDATE customer_docs SET doc = json_set(' +
  "json_remove(doc, '$.zip', '$.postal_code'), '$.address', " +
  `json_object('pin', coalesce(${V2}, ${V1}), 'city', 'x'))` +
  ` WHERE ${V3} IS NULL`;
module.exports = { CUSTOMERS, READERS, MIGRATE };
