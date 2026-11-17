'use strict';
const assert = require('node:assert/strict');
const { buildSchema } = require('graphql');
const { createLab } = require('./api.cjs');
const plain = value => JSON.parse(JSON.stringify(value));

(async () => {
  const lab = createLab();
  try {
    assert.throws(() => buildSchema('type Query { title }'), /Syntax Error/);
    console.log('PASS schema: field without declared return type fails parsing');

    const titles = await lab.execute('{ posts(first: 3) { title } }');
    assert.equal(titles.result.errors, undefined);
    assert.equal(titles.statements.length, 1);
    assert.deepEqual(plain(titles.result.data.posts), lab.restTitleView());
    assert.deepEqual(Object.keys(titles.result.data.posts[0]), ['title']);
    console.log('PASS selection: title-only GraphQL and REST-style projection match; GraphQL executed 1 SQL SELECT');

    const query = '{ posts(first: 3) { title author { name } } }';
    const naive = await lab.execute(query);
    assert.equal(naive.result.errors, undefined);
    assert.equal(naive.statements.length, 4);
    assert.deepEqual(plain(naive.result.data.posts).map(x => x.author.name), ['Bilal', 'Asha', 'Bilal']);
    console.log('PASS naive: 1 GraphQL execution -> 1 posts SELECT + 3 author SELECTs = 4');

    const batched = await lab.execute(query, { batched: true });
    assert.equal(batched.result.errors, undefined);
    assert.equal(batched.statements.length, 2);
    assert.deepEqual(plain(batched.result.data), plain(naive.result.data));
    assert.deepEqual(batched.statements[1].args, ['2', '1']);
    console.log('PASS batch: same response -> 1 posts SELECT + 1 author batch = 2');

    const unknown = await lab.execute('{ posts(first: 3) { missingField } }');
    assert.match(unknown.result.errors[0].message, /Cannot query field/);
    assert.equal(unknown.statements.length, 0);
    console.log('PASS validation: unknown field rejected before any SQL SELECT');

    const tooMany = await lab.execute('{ posts(first: 100) { title } }');
    assert.match(tooMany.result.errors[0].message, /first must be/);
    assert.equal(tooMany.statements.length, 0);
    console.log('PASS bounded list: first=100 rejected by resolver before SQL');

    const privateQuery = '{ author(id: "2") { name email } }';
    const allowed = await lab.execute(privateQuery, { viewerId: '2', batched: true });
    assert.equal(allowed.result.data.author.email, 'bilal@example.test');
    const denied = await lab.execute(privateQuery, { viewerId: '1', batched: true });
    assert.deepEqual(plain(denied.result.data), { author: { name: 'Bilal', email: null } });
    assert.equal(denied.result.errors[0].message, 'Forbidden email');
    assert.deepEqual(denied.result.errors[0].path, ['author', 'email']);
    console.log('PASS permission: selecting email does not authorize it; nullable email fails while name survives');

    const aliases = await lab.execute('{ a: posts(first: 3) { title } b: posts(first: 3) { title } }');
    assert.equal(aliases.result.errors, undefined);
    assert.equal(aliases.statements.length, 2);
    assert.equal(aliases.result.data.a.length + aliases.result.data.b.length, 6);
    console.log('PASS limit counterexample: two aliases each pass first<=3, but return 6 rows total; list limit is not total-work budget');
  } finally { lab.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
