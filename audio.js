(function () {
  "use strict";
  let ctx = null;
  function tone(freq, duration, type = "sine", volume = 0.035) {
    const s = NQ.Storage.read().settings;
    if (s.muted) return;
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration);
  }
  window.NQ = NQ || {};
  NQ.Audio = {
    correct() {
      tone(660, 0.12, "triangle");
    },
    wrong() {
      tone(150, 0.18, "sawtooth");
    },
    coin() {
      tone(880, 0.1, "sine");
      setTimeout(() => tone(1100, 0.12, "sine"), 70);
    },
    levelUp() {
      [440, 554, 659].forEach((f, i) =>
        setTimeout(() => tone(f, 0.22, "triangle"), i * 100),
      );
    },
    toggle() {
      const d = NQ.Storage.read();
      d.settings.muted = !d.settings.muted;
      NQ.Storage.write(d);
      return d.settings.muted;
    },
  };
})();
