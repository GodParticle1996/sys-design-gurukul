const { post } = require('../lib/util');
(async () => { const r = await post('http://localhost:' + (process.env.PORT || 4310) + '/admin/reconcile/on', {}); console.log('reconcile:', r.reconcile ? 'on' : 'off'); })();
