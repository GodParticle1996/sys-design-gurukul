# 🐳 Lab 27 — Roblox: laakhon chhote, phenkne layak servers

System Gurukul → 🏢 Real Company Stories → **Roblox** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-matchmaker          # matchmaker (5031)
node tools/joins.js               # 20,000 players, 3 policies
npm start ex2-crash               # platform (5032, inventory) + fleet (5033, instance processes 5040+)
node tools/crash.js               # instance crash: kya gaya, kya bacha
docker compose --profile ex1-matchmaker up --build     # profiles: ex1-matchmaker, ex2-crash
```

## ex1-matchmaker — "Play" dabaya, kaunsa instance?

20,000 players, 6 regions. 40% dosto ke group (2–5) mein, par ek saath nahi — thode second ke faasle par, beech mein dusre log.
Instance capacity 40.

```
$ node tools/joins.js
policy       instances   avg fill   avg ping   dost ek saath (groups)
fill-first      500       100%      152 ms   568/3991 (14%)
nearest         502      99.6%       21 ms   2778/3991 (70%)
smart           502      99.6%       38 ms   3991/3991 (100%)
```

- **fill-first**: servers sabse kam (paisa bacha), par ping **152 ms** (Mumbai wala Sao Paulo mein) aur sirf 14% dost saath.
- **nearest** (sirf latency): ping **21 ms**, par 30% groups toot gaye — dost aaya tab tak instance bhar chuka tha.
- **smart** (5 cheezein): latency limit (120 ms tak), **party ke liye seats rok ke rakho**, pehle bhare hue instance bharo (naya
  server = paisa), region ka rule. Servers wahi 502, dost **100% saath**, ping 38 ms — nearest se thoda zyada, kyunki kabhi-kabhi
  paas ka khaali server kholne ki jagah thoda door ka aadha-bhara instance chuna. **Yahi trade-off matchmaker roz karta hai.**

## ex2-crash — instance mara: kya gaya, kya bacha?

120 players, 5 rounds (score +10 har round), round 3 mein har ek ko ek hat. Phir ek server `SIGKILL`.

```
$ node tools/crash.js
instances   3 server(s) × 40 players | crash → prabhavit  40 players, score gaya 40, hats bache 120/120
           p0 naye instance :5043 mein: score 0 (naya match), inventory ["hat-5040-30"]
shard       1 server(s) × 120 players | crash → prabhavit 120 players, score gaya 120, hats bache 120/120
           p0 naye instance :5041 mein: score 0 (naya match), inventory ["hat-5040-30"]
```

- **Game state** (score, position) instance ki memory mein → crash = gaya. Aur yahi **sahi** hai: 10 minute ka match bachane
  ka kharcha bekaar; player naye instance mein seconds mein.
- **Platform state** (hat, Robux) instance ke paas kabhi tha hi nahi → core DC mein → **120/120 bache**, naye instance mein bhi.
- **Blast radius**: chhote instances mein crash = **40** log. Ek bada shard = **120**. Roblox ke asli instance ~40–100 players
  ke — laakhon mein se ek gira toh bas ek chhota kamra.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Matchmaker kya tolta hai? | Latency, dost, load, dev rules, naya vs purana — fill-first 14% dost vs smart 100% |
| Server crash | Game state jaane do, platform state kabhi instance mein mat rakho |
| Chhote servers kyun? | Crash ka dard 120 → 40 players |
