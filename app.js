(function () {
  "use strict";
  let editor = null,
    currentLevel = null,
    attempts = 0,
    hintsUsed = 0,
    solutionUsed = false,
    practiceComplete = false,
    pendingSubmission = null;
  const d0 = NQ.Storage.read();
  NQ.currentWorld = 2;

  function init() {
    document.body.className = d0.settings.theme;
    bindShell();
    NQ.UI.renderMap();
    NQ.UI.renderPlayer();
    editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
      mode: "python",
      theme: "material-darker",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      autoCloseBrackets: true,
      matchBrackets: true,
      lineWrapping: true,
    });
    editor.setOption("extraKeys", {
      Tab: (cm) => cm.replaceSelection("    ", "end"),
      "Ctrl-Enter": () => runCode(),
      "Cmd-Enter": () => runCode(),
      "Ctrl-Shift-Enter": () => submitCode(),
      "Cmd-Shift-Enter": () => submitCode(),
    });
    NQ.Runner.onready = () => finishLoading();
    NQ.Runner.onstream = (text, type) =>
      appendConsole(text + (type === "stderr" ? "\n" : ""));
    NQ.Runner.onresult = (m) => showRunResult(m);
    NQ.Runner.onerror = showRunError;
    NQ.Runner.ontimeout = () => {
      pendingSubmission = null;
      appendConsole(
        "That run exceeded 5 seconds and was stopped. Try a smaller input or remove the infinite loop.",
      );
      NQ.FX.toast("Friendly timeout: runner restarted");
    };
    tryLoadPyodide();
    addEventListener("beforeunload", () => {
      if (currentLevel && editor)
        NQ.Storage.read().codes[currentLevel.id] = editor.getValue();
    });
  }
  function tryLoadPyodide() {
    const bar = document.getElementById("loadingBar"),
      msg = document.getElementById("loadingMessage");
    bar.style.width = "18%";
    let n = 0;
    const msgs = [
      "Summoning NumPy…",
      "Loading the array forge…",
      "Teaching vectors to run…",
      "Almost ready…",
    ];
    const timer = setInterval(() => {
      n++;
      bar.style.width = Math.min(88, 18 + n * 15) + "%";
      msg.textContent = msgs[Math.min(n, msgs.length - 1)];
    }, 900);
    NQ.loadingTimer = timer;
    NQ.Runner.init();
  }
  function finishLoading() {
    clearInterval(NQ.loadingTimer);
    document.getElementById("loadingBar").style.width = "100%";
    document.getElementById("loadingMessage").textContent =
      "Ready for your first quest";
    setTimeout(
      () => document.getElementById("loadingScreen").classList.add("hidden"),
      400,
    );
  }
  function bindShell() {
    document.getElementById("homeButton").onclick = () => openMap();
    document.getElementById("backToMap").onclick = openMap;
    document.getElementById("continueButton").onclick = (event) =>
      openLevel(event.currentTarget.dataset.level);
    document.getElementById("menuButton").onclick = (event) => {
      const sidebar = document.querySelector(".sidebar"),
        isOpen = sidebar.classList.toggle("mobile-open");
      event.currentTarget.setAttribute("aria-expanded", String(isOpen));
      event.currentTarget.setAttribute(
        "aria-label",
        isOpen ? "Close lessons" : "Open lessons",
      );
    };
    document.getElementById("runButton").onclick = runCode;
    document.getElementById("submitButton").onclick = submitCode;
    document.getElementById("resetButton").onclick = resetCode;
    document.getElementById("hintButton").onclick = showHint;
    document.getElementById("fullscreenButton").onclick = toggleFullscreen;
    document.getElementById("soundButton").onclick = () => {
      const muted = NQ.Audio.toggle();
      document.getElementById("soundButton").textContent = muted ? "🔇" : "🔊";
    };
    document.getElementById("themeButton").onclick = () => {
      const d = NQ.Storage.read();
      d.settings.theme = d.settings.theme === "light" ? "dark" : "light";
      NQ.Storage.write(d);
      document.body.className = d.settings.theme;
    };
  }
  function openWorld(id) {
    if (![0, 1, 2].includes(id)) return;
    NQ.currentWorld = id;
    document.querySelector(".sidebar").classList.remove("mobile-open");
    const menuButton = document.getElementById("menuButton");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open lessons");
    NQ.UI.renderMap();
    openMap();
  }
  function openMap() {
    document.getElementById("mapView").classList.remove("hidden");
    document.getElementById("levelView").classList.add("hidden");
    NQ.UI.renderMap();
    NQ.UI.renderPlayer();
  }
  function openLevel(id) {
    const l = NQ.Curriculum.levels.find((x) => x.id === id);
    if (!l) return;
    if (!NQ.Runner.ready && id.startsWith("0"))
      NQ.FX.toast("NumPy is loading; you can prepare while it starts.");
    currentLevel = l;
    attempts = 0;
    hintsUsed = 0;
    solutionUsed = false;
    practiceComplete = false;
    document.getElementById("mapView").classList.add("hidden");
    document.getElementById("levelView").classList.remove("hidden");
    document.getElementById("levelTitle").textContent = l.title;
    document.getElementById("levelIndex").textContent =
      `Lesson ${NQ.Curriculum.levels.filter((x) => x.world === l.world).indexOf(l) + 1}`;
    document.documentElement.style.setProperty(
      "--world-accent",
      NQ.Curriculum.worlds[l.world].accent,
    );
    renderConcept(l);
    renderChallenge(l);
    renderPractice(l);
    const d = NQ.Storage.read();
    const savedCode = d.codes[l.id],
      legacyFunctionCode =
        l.mode === "script" && /^\s*def\s+solve\s*\(/m.test(savedCode || ""),
      oldSolution = l.solution.replace(/^import numpy as np\n\n/, "");
    editor.setValue(
      savedCode &&
        !legacyFunctionCode &&
        savedCode.trim() !== l.solution.trim() &&
        savedCode.trim() !== oldSolution.trim()
        ? savedCode
        : l.starter || l.solution || "",
    );
    editor.setOption("mode", "python");
    document.getElementById("consoleOutput").textContent = "Ready.";
    document.getElementById("arrayVisualizer").innerHTML =
      '<p class="muted">Run code to inspect NumPy arrays.</p>';
  }
  function renderConcept(l) {
    document.getElementById("conceptCard").innerHTML =
      `<p class="eyebrow">STEP 1 · UNDERSTAND</p><h2>${l.title}</h2><p>${l.concept}</p>`;
  }
  function renderChallenge(l) {
    if (l.mode === "script") {
      const expectedOutput = l.tests && l.tests[0]?.expectedOutput;
      document.getElementById("challengePrompt").innerHTML =
        `<p class="eyebrow">STEP 3 · FINAL TERMINAL TASK</p><p class="challenge-task">${escapeHtml(l.task)}</p><p class="challenge-instruction">Write Python statements directly in the editor—no <code>def solve(...)</code> wrapper. Press Run to see what your code prints.</p>${expectedOutput ? `<div class="challenge-example"><strong>Expected output</strong><code>${escapeHtml(expectedOutput)}</code></div>` : ""}<p id="hintOutput" class="challenge-hint" aria-live="polite"></p>`;
      return;
    }
    const example = l.tests && l.tests[0];
    const input = example
      ? JSON.stringify(example.args).slice(1, -1)
      : "";
    document.getElementById("challengePrompt").innerHTML =
      `<p class="eyebrow">STEP 3 · FINAL TERMINAL TASK</p><p class="challenge-task">${escapeHtml(l.task)}</p><p class="challenge-instruction">Complete <code>solve()</code> in the editor, then press Run to see the output.</p>${example ? `<div class="challenge-example"><strong>Example</strong><code>Input: solve(${escapeHtml(input)})</code><code>Output: ${escapeHtml(JSON.stringify(example.expected))}</code></div>` : ""}<p id="hintOutput" class="challenge-hint" aria-live="polite"></p>`;
  }
  function renderPractice(l) {
    const area = document.getElementById("practiceArea");
    area.innerHTML =
      `<div class="guided-instructions"><p class="eyebrow">STEP 2 · FOLLOW ALONG</p><p>Answer these quick checks to make sure the idea is clear. Your coding task comes last.</p></div>` +
      l.steps
      .map(
        (s, i) =>
          `<article class="practice-step" data-step="${i}"><h3>${i + 1}. ${s.prompt || "Practice"}</h3>${renderStep(s, i)}</article>`,
      )
      .join("");
  }
  function renderStep(s, i) {
    if (s.type === "predict")
      return `<div class="choice-row">${s.choices.map((c) => `<button data-choice="${escapeHtml(c)}" data-answer="${escapeHtml(s.answer)}" data-step="${i}">${escapeHtml(c)}</button>`).join("")}</div><p class="practice-feedback" aria-live="polite"></p>`;
    if (s.type === "fill")
      return `<input class="fill-input" data-answer="${escapeHtml(s.answer)}" data-step="${i}" aria-label="${escapeHtml(s.prompt)}" placeholder="Type answer…">`;
    if (s.type === "code")
      return `<textarea class="fill-input" data-answer="${escapeHtml(s.answer || "")}" data-step="${i}" placeholder="Write code…"></textarea>`;
    return "";
  }
  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }

  function wirePractice() {
    const area = document.getElementById("practiceArea");
    area.addEventListener("click", (event) => {
      const button = event.target.closest("[data-choice]");
      if (!button || !area.contains(button)) return;

      const ok = button.dataset.choice === button.dataset.answer,
        step = button.closest(".practice-step");
      area
        .querySelectorAll(`[data-step="${button.dataset.step}"]`)
        .forEach((option) =>
          option.classList.remove("selected", "incorrect"),
        );
      button.classList.add("selected");
      button.classList.toggle("incorrect", !ok);
      step.classList.toggle("correct", ok);
      const feedback = step.querySelector(".practice-feedback");
      feedback.textContent = ok ? "Correct!" : "Not quite—try again.";
      feedback.classList.toggle("incorrect", !ok);
      if (ok) NQ.Audio.correct();
      else NQ.Audio.wrong();
      checkPractice();
    });
    area.addEventListener("input", (event) => {
      const input = event.target;
      if (
        !(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) ||
        !input.classList.contains("fill-input")
      )
        return;

      const ok =
        input.value.trim().toLowerCase() === input.dataset.answer.toLowerCase();
      input.closest(".practice-step").classList.toggle("correct", ok);
      checkPractice();
    });
  }
  function checkPractice() {
    const steps = document.querySelectorAll("#practiceArea .practice-step");
    practiceComplete = [...steps].every((s) => s.classList.contains("correct"));
  }

  function runCode() {
    if (!editor || !currentLevel) return;
    const code = editor.getValue();
    if (!hasRequiredImports(code)) return;
    document.getElementById("consoleOutput").textContent = "Running…";
    const d = NQ.Storage.read();
    d.codes[currentLevel.id] = code;
    NQ.Storage.write(d);
    if (currentLevel.mode === "script") {
      NQ.Runner.run(code);
      return;
    }
    const example = currentLevel.tests && currentLevel.tests[0];
    const harness = example
      ? `\nimport json as _nq_json\n_nq_example = solve(*${JSON.stringify(example.args)})\ndef _nq_default(_nq_value):\n    if hasattr(_nq_value, "tolist"):\n        return _nq_value.tolist()\n    if hasattr(_nq_value, "item"):\n        return _nq_value.item()\n    raise TypeError("Unsupported result type: " + type(_nq_value).__name__)\nprint("Example output:", _nq_json.dumps(_nq_example, default=_nq_default))`
      : "";
    NQ.Runner.run(code + harness);
  }
  function hasRequiredImports(code) {
    if (
      currentLevel.world === 2 &&
      !/^\s*import\s+numpy\s+as\s+np\b/m.test(code)
    ) {
      showRunError(
        "Start this lesson with `import numpy as np` so NumPy is available as np.",
      );
      return false;
    }
    return true;
  }
  function appendConsole(text) {
    const out = document.getElementById("consoleOutput");
    if (out.textContent === "Running…" || out.textContent === "Ready.")
      out.textContent = "";
    out.textContent += text + "\n";
  }
  function showRunResult(m) {
    document.getElementById("execTime").textContent = Math.round(m.ms) + " ms";
    let data = { arrays: [] };
    try {
      data = JSON.parse(m.text);
    } catch (e) {}
    renderArrays(data.arrays || []);
    const last = document.getElementById("consoleOutput");
    if (!last.textContent || last.textContent === "Running…")
      last.textContent = "No stdout — run completed.";
    if (pendingSubmission) {
      const tests = pendingSubmission;
      pendingSubmission = null;
      runTests(tests);
    }
  }
  function showRunError(text) {
    pendingSubmission = null;
    document.getElementById("consoleOutput").textContent = plainError(text);
    NQ.Audio.wrong();
    const marker = /line (\d+)/i.exec(text);
    if (marker && editor) editor.setCursor(Math.max(0, +marker[1] - 1), 0);
  }
  function plainError(text) {
    if (/No module named numpy|NameError/i.test(text) && /numpy|np/i.test(text))
      return "NameError: NumPy is not available under that name. Add “import numpy as np” at the top.";
    if (/shape mismatch|operands could not be broadcast/i.test(text))
      return "Shape mismatch: the arrays do not have compatible shapes for this operation.";
    if (/IndexError/i.test(text))
      return "IndexError: that index is outside the array. Negative indexes count from the end.";
    if (/SyntaxError/i.test(text))
      return "SyntaxError: check brackets, quotes, and indentation. The likely line is selected.";
    return text;
  }
  function renderArrays(arrays) {
    const host = document.getElementById("arrayVisualizer");
    if (!arrays.length) {
      host.innerHTML =
        '<p class="muted">No NumPy arrays found in this namespace.</p>';
      return;
    }
    host.innerHTML = arrays
      .map((a) => {
        let html = `<article class="array-card"><div class="array-meta"><strong>${escapeHtml(a.name)}</strong><span>shape ${escapeHtml(JSON.stringify(a.shape))}</span><span>${escapeHtml(a.dtype)}</span></div>`;
        if (a.values) {
          const flat = flatten(a.values).slice(0, 400);
          const cols =
            a.shape.length === 1
              ? Math.min(20, flat.length)
              : Math.min(12, a.shape[a.shape.length - 1] || flat.length);
          const nums = flat.map((x) => (typeof x === "number" ? x : 0)),
            min = Math.min(...nums),
            max = Math.max(...nums),
            range = max - min || 1;
          html += `<div class="heatmap" style="grid-template-columns:repeat(${cols},minmax(18px,1fr))">${nums.map((n) => `<span class="heatmap-cell" style="background:hsl(${150 - ((n - min) / range) * 120} 70% 45%)">${formatVal(n)}</span>`).join("")}</div>`;
        } else html += '<p class="muted">Large array — preview truncated.</p>';
        return html + "</article>";
      })
      .join("");
  }
  function flatten(x) {
    if (!Array.isArray(x)) return [x];
    return x.reduce((a, b) => a.concat(flatten(b)), []);
  }
  function formatVal(v) {
    return typeof v === "number"
      ? Math.abs(v) < 10 && String(v).includes(".")
        ? v.toFixed(1)
        : Math.round(v)
      : String(v);
  }

  function submitCode() {
    if (!editor || !currentLevel) return;
    if (!NQ.Runner.ready) {
      showRunError(
        "The Python environment is still loading. Try again shortly.",
      );
      return;
    }
    const code = editor.getValue();
    if (!hasRequiredImports(code)) return;
    attempts++;
    const saved = NQ.Storage.read();
    saved.codes[currentLevel.id] = code;
    NQ.Storage.write(saved);
    const tests = currentLevel.tests || [];
    if (currentLevel.mode === "script") {
      pendingSubmission = tests;
      NQ.Runner.run(code);
      return;
    }
    const testArgs = tests.map((t) => t.args);
    const harness = `\nimport json as _nq_json\n_nq_cases=${JSON.stringify(testArgs)}\n_nq_results=[]\nfor _nq_args in _nq_cases:\n    try:\n        _nq_results.append(solve(*_nq_args))\n    except Exception as _nq_e:\n        _nq_results.append({"__error__":str(_nq_e)})\ndef _nq_json_default(_nq_value):\n    if hasattr(_nq_value, "tolist"):\n        return _nq_value.tolist()\n    if hasattr(_nq_value, "item"):\n        return _nq_value.item()\n    raise TypeError("Unsupported result type: " + type(_nq_value).__name__)\nprint(_nq_json.dumps(_nq_results, default=_nq_json_default))`;
    pendingSubmission = tests;
    NQ.Runner.run(code + harness);
  }
  function runTests(tests) {
    const out = document.getElementById("consoleOutput");
    if (currentLevel.mode === "script") {
      const expected = tests[0]?.expectedOutput || "";
      const actual = out.textContent.replace(/\r\n/g, "\n").trim();
      const ok = actual === expected;
      out.innerHTML = `<div class="test-summary"><strong>${ok ? "1/1 passed" : "0/1 passed"}</strong></div><div><strong>Expected output</strong><pre>${escapeHtml(expected)}</pre><strong>Your output</strong><pre>${escapeHtml(actual || "(nothing printed)")}</pre></div>`;
      if (ok) {
        const award = NQ.Rewards.award(currentLevel, {
          attempts,
          hintsUsed,
          solutionUsed,
          code: editor.getValue(),
        });
        if (!award.duplicate) {
          NQ.Rewards.modal(award.stars, currentLevel.title, award.xp);
          NQ.UI.renderMap();
          NQ.UI.renderPlayer();
        } else NQ.FX.toast("Already passed — progress stays counted once.");
      } else if (attempts === 2) offerDrill();
      else if (attempts === 3)
        NQ.FX.toast("Show Solution is now available from the Hint button.");
      return;
    }
    let vals = [];
    try {
      const lines = out.textContent.trim().split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          vals = JSON.parse(lines[i]);
          break;
        } catch (e) {}
      }
    } catch (e) {}
    if (!vals.length && tests.length) return;
    let passed = 0;
    const rows = [];
    tests.forEach((t, i) => {
      const got = vals[i],
        exp = t.expected,
        ok = compare(got, exp);
      passed += ok ? 1 : 0;
      rows.push(
        `<div><strong>Test ${i + 1}</strong> <span>${ok ? "✓" : "×"}</span><br><small>expected ${escapeHtml(JSON.stringify(exp))}</small><br><small>got ${escapeHtml(JSON.stringify(got))}</small></div>`,
      );
    });
    const pct = (passed / tests.length) * 100;
    out.innerHTML = `<div class="test-summary"><strong>${passed}/${tests.length} passed</strong> ${pct >= 80 && passed < tests.length ? " — 4/5 passed, so close!" : ""}</div>${rows.join("")}`;
    if (passed === tests.length) {
      const award = NQ.Rewards.award(currentLevel, {
        attempts,
        hintsUsed,
        solutionUsed,
        code: editor.getValue(),
      });
      if (!award.duplicate) {
        NQ.Rewards.modal(award.stars, currentLevel.title, award.xp);
        NQ.UI.renderMap();
        NQ.UI.renderPlayer();
      } else NQ.FX.toast("Already passed — progress stays counted once.");
    } else if (attempts === 2) offerDrill();
    else if (attempts === 3)
      NQ.FX.toast("Show Solution is now available from the Hint button.");
  }
  function compare(got, exp) {
    try {
      if (got && typeof got === "object" && got.__error__) return false;
      if (typeof exp === "number")
        return typeof got === "number" && Math.abs(got - exp) < 1e-9;
      if (Array.isArray(exp))
        return (
          JSON.stringify(
            Array.from(got).map((v) =>
              typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v,
            ),
          ) ===
          JSON.stringify(
            exp.map((v) =>
              typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v,
            ),
          )
        );
      if (exp && typeof exp === "object") {
        return (
          JSON.stringify(got) === JSON.stringify(exp) ||
          Object.keys(exp).every((k) => compare(got[k], exp[k]))
        );
      }
      return String(got) === String(exp);
    } catch (e) {
      return false;
    }
  }
  function offerDrill() {
    NQ.FX.toast(
      "A short drill: re-read the concept card, then try one tiny example.",
    );
  }
  function showHint() {
    if (!currentLevel) return;
    if (hintsUsed >= currentLevel.hints.length) {
      if (attempts >= 3) {
        solutionUsed = true;
        editor.setValue(currentLevel.solution || editor.getValue());
        document.getElementById("hintOutput").textContent =
          "Solution added to the editor.";
      } else
        NQ.FX.toast(
          "You have used all the hints. Try your solution, then check it with Submit.",
        );
      return;
    }
    const hint = currentLevel.hints[hintsUsed];
    hintsUsed++;
    document.getElementById("hintOutput").textContent = hint;
  }
  function resetCode() {
    if (!currentLevel) return;
    const starter = currentLevel.starter || currentLevel.solution || "",
      data = NQ.Storage.read();
    editor.setValue(starter);
    data.codes[currentLevel.id] = starter;
    NQ.Storage.write(data);
    NQ.FX.toast("Code reset");
  }
  function toggleFullscreen() {
    document.querySelector(".ide-panel").classList.toggle("ide-fullscreen");
  }

  NQ.openWorld = openWorld;
  NQ.openLevel = openLevel;
  NQ.openMap = openMap;
  document.addEventListener("DOMContentLoaded", () => {
    init();
    wirePractice();
  });
})();
