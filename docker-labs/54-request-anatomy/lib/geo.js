'use strict';
// Great-circle distance and fiber round-trip time (same model as lab 53).
const C_FIBER = 200000;                       // km/s: light in fiber, about 2/3 of light in vacuum
const PLACES = {
  Mumbai: [19.076, 72.8777], Delhi: [28.6139, 77.209], Chennai: [13.0827, 80.2707], Dubai: [25.2048, 55.2708],
  Singapore: [1.3521, 103.8198], Frankfurt: [50.1109, 8.6821], London: [51.5074, -0.1278],
  Sydney: [-33.8688, 151.2093], 'Ashburn (US-East)': [39.0438, -77.4874],
};
function km(a, b) {                           // great-circle (haversine), earth radius 6371 km
  const [la1, lo1] = PLACES[a].map(d => d * Math.PI / 180), [la2, lo2] = PLACES[b].map(d => d * Math.PI / 180);
  const h = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const rtt = d => 2 * d / C_FIBER * 1000;      // ms
module.exports = { C_FIBER, PLACES, km, rtt };
