const { post } = require('../lib/util');
const a = require('./args')();
(async () => { const r = await post('http://localhost:' + (process.env.PORT || 4503) + '/admin/primary/' + (a.to || 'next'), {}); console.log(JSON.stringify(r)); })();
