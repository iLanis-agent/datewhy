// Compares engine.js with Node's (V8) Date.parse under several TIME ZONES (run in subprocesses with TZ set).
const cp = require('child_process');
if (process.argv[2] === 'child') {
  const g = require('./engine.js'); let seed = +process.argv[3]; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; const pick = a => a[Math.floor(rnd() * a.length)];
  const two = n => String(n).padStart(2, '0'), res = { n: 0, bad: [], other: 0 };
  function gen() {
    const y = pick(['2026', '2024', '1999', '0099', '1970', '2100', '+002026', '-000001', '2023']), mo = pick([1, 2, 3, 3, 10, 11, 12, 13, 0]), d = pick([1, 9, 15, 28, 29, 30, 31, 32, 0]);
    const kind = pick(['iso', 'iso', 'iso', 'iso', 'ym', 'y', 'ymd1', 'slash', 'mdy', 'sp']);
    let date;
    if (kind === 'ym') date = `${y}-${two(mo)}`; else if (kind === 'y') date = y; else if (kind === 'ymd1') date = `${y}-${mo}-${d}`; else if (kind === 'slash') date = `${y}/${mo}/${d}`; else if (kind === 'mdy') date = `${mo}/${d}/${y}`; else date = `${y}-${two(mo)}-${two(d)}`;
    if (kind === 'ym' || kind === 'y') { if (rnd() < 0.8) return date; }
    if (rnd() < 0.3 && kind !== 'mdy' && kind !== 'slash' && kind !== 'ymd1') return date;
    const sep = kind === 'sp' || rnd() < 0.2 ? ' ' : pick(['T', 'T', 'T', 't']);
    const h = pick([0, 5, 10, 23, 24, 25]), mi = pick([0, 30, 59, 60]), sc = pick([0, 15, 59, 60]);
    const t = pick([`${two(h)}:${two(mi)}`, `${two(h)}:${two(mi)}:${two(sc)}`, `${two(h)}:${two(mi)}:${two(sc)}.${pick(['5', '12', '123', '1234'])}`, `${two(h)}`, `${h}:${two(mi)}`]);
    const z = pick(['', '', '', 'Z', 'z', '+05:30', '-08:00', '+0530', '+05', ' UTC', ' GMT', 'GMT', '+24:00', '+05:60', ' Z']);
    return date + sep + t + z;
  }
  for (let i = 0; i < +process.argv[4]; i++) {
    const s = gen(), a = g.analyze(s), real = Date.parse(s);
    if (a.kind === 'other') { res.other++; continue; }
    res.n++;
    const want = a.valid ? a.epoch : NaN;
    if (!(Object.is(want, real) || want === real)) res.bad.push({ s, tz: process.env.TZ, model: a.valid ? new Date(want).toISOString() : 'invalid', real: isNaN(real) ? 'NaN' : new Date(real).toISOString() });
  }
  console.log(JSON.stringify(res)); process.exit(0);
}
const zones = ['UTC', 'America/Los_Angeles', 'Asia/Jerusalem', 'Pacific/Auckland', 'Asia/Kolkata', 'America/St_Johns'], tot = { n: 0, bad: [], other: 0 };
zones.forEach((z, i) => {
  const r = cp.spawnSync('node', [__filename, 'child', String(11 + i * 7 + (+process.env.SEED || 0)), process.env.N || '4000'], { env: Object.assign({}, process.env, { TZ: z }), encoding: 'utf8' });
  const j = JSON.parse(r.stdout); tot.n += j.n; tot.other += j.other; tot.bad = tot.bad.concat(j.bad);
});
console.log(JSON.stringify({ zones: zones.length, checks: tot.n, nonModelled: tot.other, mismatches: tot.bad.length }));
const seen = new Set(); tot.bad.forEach(b => { if (seen.size < 25 && !seen.has(b.s)) { seen.add(b.s); console.log(JSON.stringify(b)); } });
process.exit(tot.bad.length ? 1 : 0);
