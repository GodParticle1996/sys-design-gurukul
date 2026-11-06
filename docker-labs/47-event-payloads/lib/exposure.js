const { needs } = require('./events');
function createExposure(name) {
  const totals = { extraFields: 0, phoneUnused: 0, callbackExtraFields: 0, callbackPhoneUnused: 0 };
  return {
    count(data, via) {
      const callback = via === 'callback';
      const extras = Object.values(needs).filter(f => f !== needs[name] && f in data).length;
      totals[callback ? 'callbackExtraFields' : 'extraFields'] += extras;
      if (name !== 'notify' && 'phone' in data) totals[callback ? 'callbackPhoneUnused' : 'phoneUnused']++;
    },
    state: () => ({ ...totals }),
  };
}
module.exports = { createExposure };
