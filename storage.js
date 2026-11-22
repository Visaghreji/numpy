(function () {
  "use strict";
  const KEY = "numpyQuest.v1";
  const fresh = {
    version: 1,
    player: {
      name: "Explorer",
      xp: 0,
      coins: 120,
      streak: 0,
      lastDay: "",
      freeze: 0,
    },
    progress: {},
    codes: {},
    settings: { muted: true, theme: "dark", reduceMotion: false },
    stats: { attempts: {}, totalRuns: 0, badges: {}, firstTry: {} },
  };
  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }
  function safeRead() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(fresh);
      const d = JSON.parse(raw);
      return migrate(d);
    } catch (e) {
      return clone(fresh);
    }
  }
  function migrate(d) {
    const m = clone(fresh);
    if (!d || typeof d !== "object") return m;
    return Object.assign(m, d, {
      version: 1,
      player: Object.assign(m.player, d.player || {}),
      progress: Object.assign(m.progress, d.progress || {}),
      codes: Object.assign(m.codes, d.codes || {}),
      settings: Object.assign(m.settings, d.settings || {}),
      stats: Object.assign(m.stats, d.stats || {}),
    });
  }
  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }
  window.NQ = window.NQ || {};
  NQ.Storage = { KEY, fresh, read: safeRead, write: save, migrate };
})();
