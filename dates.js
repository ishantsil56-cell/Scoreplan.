/* ScorePlan — date helpers. Local-timezone only; never UTC for day boundaries. */
(function (root) {
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function parse(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function add(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  /* whole days from b to a (a - b), DST-safe */
  function diff(a, b) {
    var A = parse(a), B = parse(b);
    return Math.round((Date.UTC(A.getFullYear(), A.getMonth(), A.getDate()) -
      Date.UTC(B.getFullYear(), B.getMonth(), B.getDate())) / 86400000);
  }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function fmtDM(s) { var d = parse(s); return d.getDate() + ' ' + MON[d.getMonth()]; }
  function dow(s) { return DOW[parse(s).getDay()]; }
  function dayNum(s) { return parse(s).getDate(); }
  function fmtTime(iso) {
    var d = new Date(iso), h = d.getHours(), m = d.getMinutes();
    return (h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM');
  }
  function isoToYmd(iso) { return ymd(new Date(iso)); }
  var api = { pad: pad, ymd: ymd, today: today, parse: parse, add: add, diff: diff, fmtDM: fmtDM, dow: dow, dayNum: dayNum, fmtTime: fmtTime, isoToYmd: isoToYmd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SPDates = api;
})(typeof window !== 'undefined' ? window : globalThis);
