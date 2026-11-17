'use strict';
// Executable decision model. No sockets, JWT verifier, DNS server or cloud API.
function makeRouter({ targets, limit = 2, windowMs = 10000, now = Date.now }) {
  const positions = new Map(), budgets = new Map();
  const routes = [['/orders', 'orders'], ['/images', 'images']];
  function handle({ path, principal }) {
    const trace = [];
    const reply = (status, reason, extra = {}) => ({ status, reason, trace, ...extra });
    // The caller supplies an ALREADY VERIFIED identity. Never trust a public user-id header.
    if (!principal) return reply(401, 'Verified identity missing');
    trace.push('identity verified');
    const route = routes.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'));
    if (!route) return reply(404, 'No route');
    const service = route[1];
    trace.push('route=' + service);
    const time = now();
    const bucket = budgets.get(principal);
    const current = bucket && time < bucket.until ? bucket : { count: 0, until: time + windowMs };
    if (current.count >= limit) return reply(429, 'Admission budget exhausted', { service });
    current.count++;
    budgets.set(principal, current);
    trace.push('budget=' + current.count + '/' + limit);
    const eligible = targets.filter(t => t.service === service && t.knownHealthy);
    // This model chooses to fail closed. Real products may have a fail-open policy.
    if (!eligible.length) return reply(503, 'No known healthy target', { service });
    const position = positions.get(service) || 0;
    const target = eligible[position % eligible.length];
    positions.set(service, position + 1);
    trace.push('target=' + target.id);
    // Actual state can differ from the last observed health-check result.
    if (!target.actualUp) return reply(502, 'Selected target connection failed', { service, target: target.id });
    return reply(200, 'Backend handled request', { service, target: target.id });
  }
  return { handle };
}
module.exports = { makeRouter };
