(function () {
  "use strict";
  const ranks = [
    { xp: 0, title: "Array Rookie" },
    { xp: 400, title: "Slice Apprentice" },
    { xp: 900, title: "Shape Shifter" },
    { xp: 1600, title: "Math Mage" },
    { xp: 2600, title: "Matrix Knight" },
    { xp: 3900, title: "Chaos Tamer" },
    { xp: 5500, title: "NumPy Legend" },
  ];
  function rankFor(xp) {
    let r = ranks[0];
    ranks.forEach((x) => {
      if (xp >= x.xp) r = x;
    });
    return r;
  }
  function award(level, meta) {
    const d = NQ.Storage.read(),
      key = level.id,
      old = d.progress[key];
    if (old?.passed) return { duplicate: true };
    const base = level.xp || 70;
    const first = meta.attempts === 1 ? base * 0.5 : 0;
    const noHint = !meta.hintsUsed ? base * 0.25 : 0;
    const vectorized = !/(\bfor\b|\bwhile\b)/.test(meta.code || "") ? 20 : 0;
    const bonus = Math.round(first + noHint + vectorized);
    const stars = meta.solutionUsed
      ? 1
      : meta.attempts === 1 && !meta.hintsUsed && vectorized
        ? 3
        : meta.hintsUsed > 2 || meta.attempts > 2
          ? 1
          : 2;
    d.progress[key] = {
      passed: true,
      stars,
      attempts: meta.attempts,
      awardedAt: Date.now(),
    };
    d.player.xp = (d.player.xp || 0) + base + bonus;
    d.player.coins =
      (d.player.coins || 0) + (stars === 3 ? 12 : stars === 2 ? 8 : 5);
    d.stats.attempts[key] = (d.stats.attempts[key] || 0) + meta.attempts;
    if (!d.stats.firstTry[key] && meta.attempts === 1)
      d.stats.firstTry[key] = true;
    NQ.Storage.write(d);
    return {
      stars,
      xp: base + bonus,
      coins: stars === 3 ? 12 : stars === 2 ? 8 : 5,
      rank: rankFor(d.player.xp),
    };
  }
  function modal(stars, title, xp) {
    NQ.FX.confetti(stars === 3 ? 140 : 70);
    NQ.Audio.levelUp();
    NQ.FX.toast(`Passed • ${xp} XP`);
    const m = document.getElementById("modalRegion");
    m.innerHTML = `<div class="modal-backdrop"><div class="modal-card"><div class="star-big">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div><h2>${title}</h2><p>Progress saved. Keep the streak going.</p><button class="button accent" data-close>Continue</button></div></div>`;
    m.querySelector("[data-close]").onclick = () => (m.innerHTML = "");
  }
  window.NQ = NQ || {};
  NQ.Rewards = { ranks, rankFor, award, modal };
})();
