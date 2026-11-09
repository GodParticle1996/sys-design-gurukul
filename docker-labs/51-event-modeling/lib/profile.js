/* Ek profile save ko events mein badalne ke teen tareeke.
   field   : har badla field ek event (StreetChanged, CityChanged …) — "property sourcing"
   generic : ek ProfileUpdated { changes } jismein jo bhi badla
   intent  : business ka kaam ek event: ghar badla = AddressChanged (teeno field saath); email badla = EmailChangeRequested
             (verification shuru karta hai); naam = NameChanged; photo = PhotoChanged */
const ADDRESS = ['street', 'city', 'pin'];
const NAMES = { street: 'StreetChanged', city: 'CityChanged', pin: 'PinChanged', email: 'EmailChanged', name: 'NameChanged', photo: 'PhotoChanged' };
function toEvents(mode, user, changes) {
  const keys = Object.keys(changes);
  if (mode === 'field') return keys.map(k => ({ type: NAMES[k], user, data: { [k]: changes[k] } }));
  if (mode === 'generic') return [{ type: 'ProfileUpdated', user, data: { changes } }];
  const out = [];
  if (keys.some(k => ADDRESS.includes(k))) {
    if (!ADDRESS.every(k => k in changes)) throw Error('ghar badla = poora naya address chahiye (street, city, pin)');
    out.push({ type: 'AddressChanged', user, data: Object.fromEntries(ADDRESS.map(k => [k, changes[k]])) });
  }
  if ('email' in changes) out.push({ type: 'EmailChangeRequested', user, data: { email: changes.email } });
  if ('name' in changes) out.push({ type: 'NameChanged', user, data: { name: changes.name } });
  if ('photo' in changes) out.push({ type: 'PhotoChanged', user, data: { photo: changes.photo } });
  return out;
}
/* Courier label service: profile events se address ki copy rakhta hai, OrderPacked par label chhaapta hai. */
function labelPrinter(start) {
  const addr = { ...start }, labels = [];
  return {
    on(e) {
      if (e.type === 'OrderPacked') labels.push({ order: e.data.order, ...addr });
      else if (e.type === 'ProfileUpdated') ADDRESS.forEach(k => { if (k in e.data.changes) addr[k] = e.data.changes[k]; });
      else if (e.type === 'AddressChanged') Object.assign(addr, e.data);
      else ADDRESS.forEach(k => { if (k in e.data) addr[k] = e.data[k]; });   // StreetChanged / CityChanged / PinChanged
    },
    labels, addr,
  };
}
/* Email verification service: kis event par jaagna padta hai, aur kitni baar kaam ka nikla. */
function verifier(mode) {
  const listens = { field: ['EmailChanged'], generic: ['ProfileUpdated'], intent: ['EmailChangeRequested'] }[mode];
  const st = { woke: 0, useful: 0 };
  return {
    on(e) {
      if (!listens.includes(e.type)) return;
      st.woke++;
      const email = e.type === 'ProfileUpdated' ? e.data.changes.email : e.data.email;
      if (email) st.useful++;
    },
    st,
  };
}
module.exports = { toEvents, labelPrinter, verifier, ADDRESS };
