const { post } = require('../lib/util');
(async () => { await post('http://localhost:' + (process.env.PORT || 4402) + '/reset', {}); await post('http://localhost:' + (process.env.PORT || 4402) + '/resize/4/eager', {}); console.log('reset: 4 nodes, cache khaali'); })();
