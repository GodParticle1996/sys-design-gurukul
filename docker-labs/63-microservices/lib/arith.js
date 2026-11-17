'use strict';
// Arithmetic helpers for ex3 (copies) and ex4 (Conway / change cost).
const copies = ({ n, idleGB = 0.5, pool = 20 }) => ({ idleGB: n * idleGB, dbConns: n * pool });
const paths = n => n * (n - 1) / 2;                          // Brooks: POTENTIAL pairwise links if everyone must coordinate
// Pairs inside teams of `size` (the last team may be smaller), summed over all teams.
const withinTeams = (n, size = 8) => { let t = 0; for (let left = n; left > 0; left -= size) t += paths(Math.min(size, left)); return t; };
// Deploys to RENAME a field used by `services` services (1 producer + consumers), without downtime:
// monolith = 1 deploy (one codebase, one release). Services = expand/contract: producer writes both names (1),
// each consumer switches to the new name (services − 1), producer stops writing the old name (1). Order matters.
const renameDeploys = services => (services === 1 ? 1 : 1 + (services - 1) + 1);
module.exports = { copies, paths, withinTeams, renameDeploys };
