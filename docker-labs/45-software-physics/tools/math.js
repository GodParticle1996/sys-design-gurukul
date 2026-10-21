function wire(bytes, mbps, fixedMs) {
  return fixedMs + bytes * 8 / (mbps * 1e6) * 1000;
}
const cases = [[1000,100,40],[1000,1000,40],
  [1000000,100,40],[1000000,1000,40]];
console.log('HISAAB: decimal bytes; fixed wait 40 ms; ideal link; no overhead/queue');
for (const [bytes,mbps,ms] of cases) console.log(`${bytes} B @ ${mbps} Mbps: ${wire(bytes,mbps,ms).toFixed(3)} ms`);
console.log('HISAAB: maana 3 GHz; 1 cycle ko 1 human second; 365-day year');
console.log(`1 cycle = ${(1e9/3e9).toFixed(3)} ns`);
console.log(`100 ns = ${(100e-9*3e9).toFixed(0)} human seconds`);
console.log(`150 ms = ${(0.150*3e9/(365*24*3600)).toFixed(2)} human years`);
console.log('YEH scenario inputs hain; hardware timings measure nahi kiye.');
console.log('HISAAB: kalpanik cost units/GiB: origin=1, cache=20; AWS price NAHI');
const origin=100,hot=5,originRate=1,cacheRate=20;
console.log(`origin ${origin} GiB + sabka cache: ${origin*originRate+origin*cacheRate} units`);
console.log(`origin ${origin} GiB + hot ${hot} GiB cache: ${origin*originRate+hot*cacheRate} units`);
