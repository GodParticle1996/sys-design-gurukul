'use strict';
// ex2 core: one Raft commit with a leader and two followers; one follower ack is enough for a majority (2 of 3).
// The leader's own fsync and the followers' (RTT + fsync) run at the same time; the slower of the two needed parts wins.
const commit = (leaderFsync, followerFsyncs, rtt) => Math.max(leaderFsync, Math.min(...followerFsyncs.map(f => rtt + f)));
module.exports = { commit };
