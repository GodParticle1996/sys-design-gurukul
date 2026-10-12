/* Health checker ka niyam (Kubernetes ke kubelet jaisa): ek probe ka nateeja aaya — ab kya karna hai?
   services/cluster.js aur tools/slowmo.js dono yahi chalate hain.
     kind      — 'startup' | 'liveness' | 'readiness'
     ok        — is baar probe pass hua ya nahi
     threshold — lagataar kitne fail par maana jaaye ki sach mein fail hai (failureThreshold) */

function newChecks(hasStartupProbe) {
  return {
    // startup sawaal hai → uske pass hone tak "shuru nahi"
    started: !hasStartupProbe,
    ready: false,          // traffic bhejein?
    fails: { startup: 0, liveness: 0, readiness: 0 },
  };
}

/* Yeh sawaal abhi poochhna hai?
   Startup pass hone tak baaki dono band. */
function shouldRun(c, kind) {
  return kind === 'startup' ? !c.started : c.started;
}

/* Lautata hai: null (kuch nahi) | 'started' | 'ready'
                | 'not-ready' | 'restart' */
function onResult(c, kind, ok, threshold) {
  if (ok) {
    c.fails[kind] = 0;     // ek pass → ginti wapas zero
    if (kind === 'startup' && !c.started) {
      c.started = true;
      return 'started';
    }
    if (kind === 'readiness' && !c.ready) {
      c.ready = true;
      return 'ready';
    }
    return null;
  }

  c.fails[kind]++;
  // hadd tak nahi pahuncha → abhi kuch nahi
  if (c.fails[kind] < threshold) return null;
  if (kind === 'readiness') {
    if (!c.ready) return null;
    c.ready = false;
    return 'not-ready';    // traffic roko
  }
  return 'restart';        // app ko dobara chalao
}

module.exports = { newChecks, shouldRun, onResult };
