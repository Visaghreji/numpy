(function () {
  "use strict";
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:500";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let particles = [];
  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  addEventListener("resize", resize);
  resize();
  function confetti(count = 90) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#65e6cb", "#8b7cf6", "#ffc857", "#ff6b82"];
    for (let i = 0; i < count; i++)
      particles.push({
        x: innerWidth / 2,
        y: innerHeight * 0.35,
        vx: (Math.random() - 5) * 8,
        vy: -8 - Math.random() * 8,
        g: 0.22,
        life: 70 + Math.random() * 50,
        color: colors[i % colors.length],
        r: 3 + Math.random() * 5,
      });
    requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter((p) => p.life-- > 0);
    particles.forEach((p) => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.r, p.r);
    });
    if (particles.length) requestAnimationFrame(tick);
  }
  window.NQ = NQ || {};
  NQ.FX = {
    confetti,
    toast(message, type = "") {
      const r = document.getElementById("toastRegion"),
        e = document.createElement("div");
      e.className = "toast";
      e.textContent = message;
      r.appendChild(e);
      setTimeout(() => e.remove(), 3500);
    },
  };
})();
