(function () {
  "use strict";
  let worker = null,
    pyodide = null,
    ready = false,
    timeout = null,
    mainFallback = false;
  function blobCode() {
    return `let pyodide=null;self.onmessage=async(e)=>{const m=e.data;if(m.type==='init'){try{importScripts(m.url);pyodide=await loadPyodide({indexURL:m.indexURL,stdout:s=>postMessage({type:'stdout',text:s}),stderr:s=>postMessage({type:'stderr',text:s})});await pyodide.loadPackage('numpy');postMessage({type:'ready'})}catch(err){postMessage({type:'error',text:String(err)})}}if(m.type==='run'){try{const start=performance.now();pyodide.runPython('import numpy as np\\nimport json\\n_ns=globals()');const out=pyodide.runPython(m.code+'\\nimport json as _json\\narrs=[]\\nfor _k,_v in list(_ns.items()):\\n  if type(_v).__name__=="ndarray":\\n    arrs.append({"name":_k,"shape":list(_v.shape),"dtype":str(_v.dtype),"values":(_v.tolist() if _v.size<=400 else None)})\\n_json.dumps({"arrays":arrs})');const ms=performance.now()-start;postMessage({type:'result',text:out,ms})}catch(err){postMessage({type:'runError',text:String(err)})}}};`;
  }
  function restart() {
    if (worker) {
      try {
        worker.terminate();
      } catch (e) {}
    }
    worker = URL
      ? new Worker(
          URL.createObjectURL(
            new Blob([blobCode()], { type: "text/javascript" }),
          ),
        )
      : null;
    if (worker) {
      worker.onmessage = handle;
      worker.postMessage({
        type: "init",
        url: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js",
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
      });
    }
  }
  function handle(e) {
    const m = e.data;
    if (m.type === "ready") {
      ready = true;
      if (NQ.Runner) NQ.Runner.onready?.(100);
    }
    if (m.type === "stdout" || m.type === "stderr")
      NQ.Runner.onstream?.(m.text, m.type);
    if (m.type === "result") {
      clearTimeout(timeout);
      NQ.Runner.onresult?.(m);
    }
    if (m.type === "runError") {
      clearTimeout(timeout);
      NQ.Runner.onerror?.(m.text);
    }
    if (m.type === "error") {
      ready = false;
      NQ.Runner.onerror?.(m.text);
    }
  }
  async function init() {
    const bar = document.getElementById("loadingBar"),
      msg = document.getElementById("loadingMessage");
    try {
      if (typeof Worker !== "undefined") restart();
      else {
        bar.style.width = "100%";
        msg.textContent = "Workers unavailable; main-thread mode ready.";
        mainFallback = true;
      }
    } catch (e) {
      NQ.FX?.toast("Could not load the Python runner. Retry.", "error");
    }
  }
  function run(code) {
    if (!ready) {
      NQ.Runner.onerror?.(
        "The Python environment is still loading. Try again shortly.",
      );
      return;
    }
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      restart();
      NQ.Runner.ontimeout?.();
    }, 5000);
    worker.postMessage({ type: "run", code });
  }
  window.NQ = NQ || {};
  NQ.Runner = {
    init,
    run,
    restart,
    onready: null,
    onstream: null,
    onresult: null,
    onerror: null,
    ontimeout: null,
    get ready() {
      return ready;
    },
  };
})();
