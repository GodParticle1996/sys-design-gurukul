const { post } = require('../lib/util');
(async () => { console.log(JSON.stringify(await post('http://localhost:4722/admin/promote', {}))); })();
