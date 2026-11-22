(function () {
  "use strict";
  function toast(m, type) {
    NQ.FX.toast(m, type);
  }
  function renderNav() {
    const nav = document.getElementById("worldNav"),
      data = NQ.Storage.read(),
      worlds = [
        NQ.Curriculum.worlds[2],
        NQ.Curriculum.worlds[0],
        NQ.Curriculum.worlds[1],
      ];
    nav.innerHTML =
      worlds
        .map((w, index) => {
          const levels = NQ.Curriculum.levels.filter((l) => l.world === w.id);
          const done = levels.filter((l) => data.progress[l.id]?.passed).length;
          return `<button class="nav-world ${w.id === NQ.currentWorld ? "active" : ""}" data-world="${w.id}"><span class="nav-dot">${done === levels.length ? "★" : index + 1}</span><span><strong>${w.title}</strong><small>${done}/${levels.length}</small></span></button>`;
        })
        .join("");
    nav
      .querySelectorAll("[data-world]")
      .forEach((b) => (b.onclick = () => NQ.openWorld(+b.dataset.world)));
  }
  function renderMap() {
    const w = NQ.Curriculum.worlds[NQ.currentWorld],
      levels = NQ.Curriculum.levels.filter((l) => l.world === NQ.currentWorld),
      d = NQ.Storage.read();
    document.documentElement.style.setProperty("--world-accent", w.accent);
    document.getElementById("mapTitle").textContent = w.title;
    const done = levels.filter((l) => d.progress[l.id]?.passed).length;
    document.getElementById("worldProgress").textContent =
      `${done} of ${levels.length} lessons`;
    const next = levels.find((l) => !d.progress[l.id]?.passed) || levels[levels.length - 1];
    const continueButton = document.getElementById("continueButton");
    continueButton.textContent = done === levels.length ? "Review a lesson" : done ? "Continue learning" : "Start learning";
    continueButton.dataset.level = next.id;
    const map = document.getElementById("worldMap");
    map.innerHTML = "";
    levels.forEach((l, i) => {
      const b = document.createElement("button"),
        prev = i ? d.progress[levels[i - 1].id]?.passed : false,
        passed = d.progress[l.id]?.passed,
        unlocked = i === 0 || prev || passed;
      b.className =
        "level-node " +
        (passed ? "done" : unlocked ? (i === done ? "current" : "") : "locked");
      b.innerHTML = `<span class="lesson-number">${i + 1}</span><span class="lesson-name">${l.title}</span><span class="lesson-status">${passed ? "Completed" : unlocked ? (i === done ? "Next lesson" : "Review") : "Locked"}</span>`;
      b.title = l.title;
      b.disabled = !unlocked;
      b.setAttribute("aria-label", `${l.title}, ${passed ? "completed" : unlocked ? "available" : "locked"}`);
      b.onclick = () => NQ.openLevel(l.id);
      map.appendChild(b);
    });
    renderNav();
  }
  function renderPlayer() {
    const d = NQ.Storage.read(),
      r = NQ.Rewards.rankFor(d.player.xp || 0),
      next = NQ.Rewards.ranks.find((x) => x.xp > (d.player.xp || 0));
    document.getElementById("rankTitle").textContent = r.title;
    document.getElementById("coinCount").textContent = d.player.coins || 0;
    document.getElementById("xpText").textContent = `${d.player.xp || 0} XP`;
    const pct = next
      ? Math.max(4, ((d.player.xp - r.xp) / (next.xp - r.xp)) * 100)
      : 100;
    document.getElementById("xpBar").style.width = pct + "%";
    document.getElementById("streakCount").textContent =
      (d.player.streak || 0) + " day streak";
  }
  window.NQ = NQ || {};
  NQ.UI = { toast, renderNav, renderMap, renderPlayer };
})();
