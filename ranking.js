(function () {
  "use strict";
  function checksum(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }
  function shareCode() {
    const d = NQ.Storage.read();
    const payload = {
      name: d.player.name || "Explorer",
      xp: d.player.xp || 0,
      levels: Object.keys(d.progress).filter((k) => d.progress[k].passed)
        .length,
      stars: Object.values(d.progress).reduce((n, p) => n + (p.stars || 0), 0),
      badges: Object.keys(d.stats.badges || {}).length,
      week: getWeek(),
      checksum: "",
    };
    payload.checksum = checksum(JSON.stringify(payload));
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  function decodeCode(code) {
    const p = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    const given = p.checksum;
    p.checksum = "";
    return checksum(JSON.stringify(p)) === given ? p : null;
  }
  function getWeek() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const y = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + "-" + Math.ceil(((d - y) / 86400000 + 1) / 7);
  }
  window.NQ = NQ || {};
  NQ.Ranking = { shareCode, decodeCode, getWeek };
})();
