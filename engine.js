(function (root) {
  'use strict';
  // Models how V8 (Chrome, Node, Edge) turns a string into a Date. Other engines can differ.
  var ISO = /^([+-]\d{6}|\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:[Tt](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?(Z|z|[+-]\d{2}:?\d{2})?$/;
  var LEG = /^(?:(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{4}))(?: +(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?(?:(?: +(Z|z|GMT|UTC))|([+-]\d{2}:?\d{2}))?$/;
  function dim(y, m) { return [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  function offMin(z) {
    if (!z) return null;
    if (/^[Zz]|GMT|UTC/.test(z)) return 0;
    var m = /^([+-])(\d{2}):?(\d{2})$/.exec(z);
    return (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]);
  }
  function build(y, mo, d, h, mi, s, ms, off) {
    var t;
    if (off === null) { var dt = new Date(2000, 0, 1); dt.setFullYear(y, mo - 1, d); dt.setHours(h, mi, s, ms); t = dt.getTime(); }
    else { var u = new Date(Date.UTC(2000, 0, 1)); u.setUTCFullYear(y, mo - 1, d); u.setUTCHours(h, mi, s, ms); t = u.getTime() - off * 60000; }
    return t;
  }
  function analyze(str) {
    var s = String(str).trim(), m, r = { input: s, kind: 'other', valid: null, notes: [] };
    if ((m = ISO.exec(s))) {
      var y = +m[1], mo = m[2] ? +m[2] : 1, d = m[3] ? +m[3] : 1, hasTime = m[4] !== undefined, h = hasTime ? +m[4] : 0, mi = hasTime ? +m[5] : 0, sec = m[6] ? +m[6] : 0, ms = m[7] ? Math.floor(+('0.' + m[7]) * 1000 + 1e-9) : 0;
      var z = m[8], off = offMin(z);
      r.kind = 'iso'; r.hasTime = hasTime; r.zone = z || null;
      if (/^[+-]\d{2}:?\d{2}$/.test(z || '') && z.indexOf(':') < 0) r.notes.push('compactoffset');
      if (!hasTime && z) { r.valid = false; r.notes.push('zoneNoTime'); return r; }
      var bad = mo < 1 || mo > 12 || d < 1 || d > 31 || mi > 59 || sec > 59 || h > 24 || (h === 24 && (mi || sec || ms)) || (off !== null && (Math.abs(off) > 23 * 60 + 59 || (/^[+-]/.test(z) && +(/(\d{2}):?(\d{2})$/.exec(z)[2]) > 59)));
      if (/^-000000/.test(s)) bad = true;
      if (bad) { r.valid = false; r.notes.push('range'); return r; }
      if (d > dim(y, mo)) r.notes.push('rollover');
      if (h === 24) r.notes.push('h24');
      r.valid = true; r.mode = hasTime ? (off === null ? 'local' : 'offset') : 'utc';
      r.epoch = build(y, mo, d, h, mi, sec, ms, hasTime ? off : 0);
      return r;
    }
    if ((m = LEG.exec(s))) {
      var Y = m[1] ? +m[1] : +m[6]; if (Y < 100) Y += Y < 50 ? 2000 : 1900; var M = m[1] ? +m[2] : +m[4], D = m[1] ? +m[3] : +m[5];
      var H = m[7] !== undefined ? +m[7] : 0, I = m[8] !== undefined ? +m[8] : 0, S = m[9] ? +m[9] : 0, MS = m[10] ? Math.floor(+('0.' + m[10]) * 1000 + 1e-9) : 0, zz = m[11] || m[12] || null, o2 = offMin(zz);
      r.kind = 'legacy'; r.zone = zz;
      if (M < 1 || M > 12 || D < 1 || D > 31 || H > 24 || (H === 24 && (I || S || MS)) || I > 59 || S > 59 || (o2 !== null && ((/^[+-]/.test(zz) && +(/(\d{2}):?(\d{2})$/.exec(zz)[2]) > 59)))) { r.valid = false; r.notes.push('range'); return r; }
      r.valid = true; r.mode = o2 === null ? 'local' : 'offset'; r.epoch = build(Y, M, D, H, I, S, MS, o2);
      if (D > dim(Y, M)) r.notes.push('rollover');
      return r;
    }
    return r;
  }
  var api = { analyze: analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DateWhy = api;
})(typeof window !== 'undefined' ? window : this);
