/* Linkju Docs — 全文朗讀 (Web Speech API, client-side, no backend).
   Adds a floating 🔊 control that reads the page's prose aloud in zh-TW,
   skipping code/tables, highlighting + scrolling to the current paragraph. */
(function () {
  "use strict";
  if (!("speechSynthesis" in window)) return; // unsupported browser → no button

  var ROOT_SEL = "main, .container"; // content root differs per page
  var READ_SEL = "h1, h2, h3, h4, h5, p, li, blockquote, dt, dd";
  var SKIP_INSIDE = "pre, code, table, figure, .tts-bar";

  var synth = window.speechSynthesis;
  var chunks = []; // [{ el, text }]
  var idx = 0;
  var state = "idle"; // idle | playing | paused
  var keepAlive = null; // Chrome long-text resume hack
  var bar, playBtn, stopBtn, label;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function collect() {
    var root = document.querySelector(ROOT_SEL) || document.body;
    var nodes = Array.prototype.slice.call(root.querySelectorAll(READ_SEL));
    // keep leaf blocks: drop any element that contains another candidate
    var leaves = nodes.filter(function (el) {
      if (el.closest(SKIP_INSIDE)) return false;
      var hasChildCandidate = nodes.some(function (other) {
        return other !== el && el.contains(other);
      });
      return !hasChildCandidate;
    });
    chunks = [];
    leaves.forEach(function (el) {
      var t = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length >= 2 && /[一-鿿A-Za-z0-9]/.test(t)) {
        chunks.push({ el: el, text: t });
      }
    });
  }

  function pickVoice() {
    var voices = synth.getVoices() || [];
    var byLang = function (re) {
      return voices.filter(function (v) { return re.test(v.lang); });
    };
    return (byLang(/^zh[-_]TW/i)[0] ||
            byLang(/^zh[-_]HK/i)[0] ||
            byLang(/^zh/i)[0] ||
            null);
  }

  function setLabel(txt) { if (label) label.textContent = txt; }

  function highlight(on) {
    var c = chunks[idx];
    if (!c) return;
    if (on) {
      c.el.classList.add("tts-active");
      c.el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      c.el.classList.remove("tts-active");
    }
  }

  function speakCurrent() {
    if (idx >= chunks.length) { finish(); return; }
    var u = new SpeechSynthesisUtterance(chunks[idx].text);
    var v = pickVoice();
    if (v) u.voice = v;
    u.lang = (v && v.lang) || "zh-TW";
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onstart = function () { highlight(true); setLabel(progress()); };
    u.onend = function () {
      highlight(false);
      if (state === "playing") { idx++; speakCurrent(); }
    };
    u.onerror = function () {
      highlight(false);
      if (state === "playing") { idx++; speakCurrent(); }
    };
    synth.speak(u);
  }

  function progress() {
    return "唸讀中 " + Math.min(idx + 1, chunks.length) + "/" + chunks.length;
  }

  function startKeepAlive() {
    // Chrome stops long synthesis after ~15s; nudge it.
    stopKeepAlive();
    keepAlive = setInterval(function () {
      if (state === "playing") { synth.pause(); synth.resume(); }
    }, 10000);
  }
  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }

  function play() {
    if (state === "paused") { synth.resume(); state = "playing"; render(); startKeepAlive(); return; }
    if (state === "playing") { synth.pause(); state = "paused"; render(); return; }
    // idle → start fresh
    synth.cancel();
    collect();
    if (!chunks.length) { setLabel("沒有可朗讀的內容"); return; }
    idx = 0;
    state = "playing";
    render();
    startKeepAlive();
    speakCurrent();
  }

  function finish() {
    highlight(false);
    state = "idle";
    idx = 0;
    stopKeepAlive();
    render();
  }

  function stop() {
    highlight(false);
    state = "idle";
    idx = 0;
    stopKeepAlive();
    synth.cancel();
    render();
  }

  function render() {
    if (state === "playing") { playBtn.textContent = "⏸ 暫停"; setLabel(progress()); stopBtn.disabled = false; }
    else if (state === "paused") { playBtn.textContent = "▶ 繼續"; setLabel("已暫停 " + (idx + 1) + "/" + chunks.length); stopBtn.disabled = false; }
    else { playBtn.textContent = "🔊 唸全文"; setLabel(""); stopBtn.disabled = true; }
  }

  function injectStyles() {
    var css = ""
      + ".tts-bar{position:fixed;right:20px;bottom:20px;z-index:9999;display:flex;align-items:center;gap:8px;"
      + "background:#111827;color:#fff;padding:8px 10px;border-radius:999px;"
      + "box-shadow:0 6px 24px rgba(0,0,0,.25);font:600 14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}"
      + ".tts-bar button{cursor:pointer;border:0;border-radius:999px;padding:8px 14px;font:inherit;color:#fff;background:#2563eb;}"
      + ".tts-bar button:hover{background:#1d4ed8;}"
      + ".tts-bar button[disabled]{opacity:.4;cursor:default;background:#374151;}"
      + ".tts-bar .tts-stop{background:#374151;}"
      + ".tts-bar .tts-label{min-width:0;font-weight:500;opacity:.85;font-variant-numeric:tabular-nums;padding-right:4px;}"
      + ".tts-active{background:#fef9c3;outline:2px solid #facc15;border-radius:6px;transition:background .2s;}"
      + "@media print{.tts-bar{display:none;}}";
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function buildUI() {
    injectStyles();
    bar = document.createElement("div");
    bar.className = "tts-bar";
    bar.setAttribute("aria-label", "全文朗讀控制");

    label = document.createElement("span");
    label.className = "tts-label";

    playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.addEventListener("click", play);

    stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "tts-stop";
    stopBtn.textContent = "⏹";
    stopBtn.title = "停止";
    stopBtn.addEventListener("click", stop);

    bar.appendChild(label);
    bar.appendChild(playBtn);
    bar.appendChild(stopBtn);
    document.body.appendChild(bar);
    render();

    // voices may load async (Chrome) — re-pick on availability
    if (synth.getVoices().length === 0 && "onvoiceschanged" in synth) {
      synth.onvoiceschanged = function () { /* voices now cached for pickVoice() */ };
    }
    // stop speech if navigating away
    window.addEventListener("beforeunload", function () { synth.cancel(); });
  }

  ready(buildUI);
})();
