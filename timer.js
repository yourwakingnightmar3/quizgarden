(() => {
"use strict";
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Settings ----------
const LIM = {
  focus: { min: 1, max: 90, label: "Focus" },
  short: { min: 1, max: 30, label: "Break" },
  long:  { min: 1, max: 60, label: "Long break" }
};
const KINDS = ["focus", "short", "long"];
const BUILTIN = [
  { name: "Just start",  focus: 5,  short: 1,  long: 10 },
  { name: "Short burst", focus: 15, short: 3,  long: 15 },
  { name: "Classic",     focus: 25, short: 5,  long: 15 },
  { name: "Deep work",   focus: 50, short: 10, long: 30 },
  { name: "Marathon",    focus: 90, short: 15, long: 45 }
];
const KEY = "qg_timer_v2", PLANTS = "qg_plants";
const cfg = { focus: 25, short: 5, long: 15, every: 4, auto: false, sound: false, presets: [] };

try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (s && typeof s === "object") {
    for (const k of KINDS) { const n = Math.round(+s[k]); if (n >= LIM[k].min && n <= LIM[k].max) cfg[k] = n; }
    const ev = Math.round(+s.every); if (ev >= 2 && ev <= 8) cfg.every = ev;
    cfg.auto = !!s.auto; cfg.sound = !!s.sound;
    if (Array.isArray(s.presets)) {
      cfg.presets = s.presets
        .filter(p => p && typeof p.name === "string" && KINDS.every(k => Number.isInteger(p[k]) && p[k] >= LIM[k].min && p[k] <= LIM[k].max))
        .slice(0, 8).map(p => ({ name: p.name.slice(0, 20), focus: p.focus, short: p.short, long: p.long }));
    }
  }
} catch (e) {}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} };

// ---------- Elements ----------
const dialcard = $("#dialcard"), dial = $("#dial"), arc = $("#arc"), handle = $("#handle"), ticks = $("#ticks");
const timeEl = $("#time"), phaseEl = $("#phaseLabel"), hintEl = $("#hint");
const tabs = [...document.querySelectorAll(".tabs button")];
const minus = $("#minus"), plus = $("#plus"), minsOut = $("#minsOut");
const startBtn = $("#start"), resetBtn = $("#reset"), skipBtn = $("#skip");
const dots = $("#dots"), cycleLabel = $("#cycleLabel");
const everyMinus = $("#everyMinus"), everyPlus = $("#everyPlus"), everyOut = $("#everyOut");
const autoBox = $("#autoStart"), soundBox = $("#sound");
const scene = $("#scene"), plantImg = $("#plant");
const stageEl = $("#stage"), pctEl = $("#pct"), pfill = $("#pfill"), msgEl = $("#msg"), countEl = $("#count");
const plist = $("#plist"), saveform = $("#saveform"), pname = $("#pname"), pmsg = $("#pmsg");

// ---------- State ----------
const S = { phase: "focus", status: "idle", remaining: 0, endAt: 0, session: 1, grown: false };
let note = "";
const total = () => cfg[S.phase] * 60000;
S.remaining = total();
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
const fmt = ms => {
  const t = Math.ceil(ms / 1000);
  return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
};

// ---------- Dial drawing ----------
const CX = 150, CY = 150, R = 112, NS = "http://www.w3.org/2000/svg";
arc.setAttribute("pathLength", "100");
let ticksFor = "";
function drawTicks() {
  if (ticksFor === S.phase) return;
  ticksFor = S.phase;
  ticks.textContent = "";
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * 2 * Math.PI, maj = i % 5 === 0, r1 = 128, r2 = maj ? 139 : 133;
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", CX + r1 * Math.sin(a)); l.setAttribute("y1", CY - r1 * Math.cos(a));
    l.setAttribute("x2", CX + r2 * Math.sin(a)); l.setAttribute("y2", CY - r2 * Math.cos(a));
    if (maj) l.setAttribute("class", "maj");
    ticks.appendChild(l);
  }
}

// ---------- Pixel plant (drawn from code, grows smoothly) ----------
const cv = document.createElement("canvas"); cv.width = 25; cv.height = 28;
const g = cv.getContext("2d");
const C = { stem: "#3f9a55", stemD: "#2d7a42", leaf: "#62c870", leafD: "#3f9a55", soil: "#4a3226", soilL: "#6b4a3a",
            pot: "#b86f45", potD: "#8f522f", rim: "#cf8156", pet: "#ff8fb8", petD: "#e7639b", ctr: "#ffd84d", seed: "#e0c98a" };
function drawPlant(p) {
  g.clearRect(0, 0, 25, 28);
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const row = (x1, x2, y, c) => { for (let x = x1; x <= x2; x++) px(x, y, c); };
  row(6, 18, 22, C.rim); row(7, 17, 23, C.pot); row(7, 17, 24, C.pot);
  row(8, 16, 25, C.pot); row(8, 16, 26, C.potD); row(9, 15, 27, C.potD);
  px(17, 23, C.potD); px(17, 24, C.potD); px(16, 25, C.pot);
  row(8, 16, 21, C.soil); px(10, 21, C.soilL); px(14, 21, C.soilL);
  const h = Math.min(15, Math.floor(p / 0.8 * 15));
  if (h === 0) { row(10, 14, 20, C.soil); px(12, 20, C.seed); }
  for (let i = 0; i < h; i++) px(12, 20 - i, i % 3 === 2 ? C.stemD : C.stem);
  [[3, 4], [6, 4], [9, 3], [12, 2]].forEach(([hk, cap]) => {
    if (h < hk) return;
    const s = Math.min(cap, 1 + Math.floor((h - hk) / 2)), ly = 20 - hk;
    for (let i = 1; i <= s; i++) {
      const y = ly - Math.floor(i / 2), c = i === s ? C.leafD : C.leaf;
      px(12 - i, y, c); px(12 + i, y, c);
      if (i >= 2) { px(12 - i, y + 1, C.leafD); px(12 + i, y + 1, C.leafD); }
    }
  });
  if (p >= 0.8 && p < 0.9) {
    px(12, 3, C.petD); row(11, 13, 4, C.pet); row(11, 13, 5, C.pet); row(11, 13, 6, C.leafD);
  } else if (p >= 0.9) {
    const r = p < 1 ? 2 : 3;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > r * r) continue;
      px(12 + dx, 5 + dy, d2 <= (r === 2 ? 1 : 2) ? C.ctr : (d2 >= r * r - 1 ? C.petD : C.pet));
    }
  }
  plantImg.src = cv.toDataURL();
}
let lastKey = -1;
function updatePlant(p) {
  const key = p >= 1 ? 150 : Math.min(149, Math.floor(p * 150));
  if (key === lastKey) return;
  lastKey = key;
  drawPlant(key / 150);
}
const stageName = p => p >= 1 ? "Bloom" : p >= 0.9 ? "Opening" : p >= 0.8 ? "Bud" : p >= 0.5 ? "Growing" : p >= 0.2 ? "Seedling" : p > 0.04 ? "Sprout" : "Seed";

// ---------- Plant collection (shared with the collection page later) ----------
const plantTotal = () => { try { const a = JSON.parse(localStorage.getItem(PLANTS)); return Array.isArray(a) ? a.length : 0; } catch (e) { return 0; } };
function addPlant() {
  try {
    let a = JSON.parse(localStorage.getItem(PLANTS)); if (!Array.isArray(a)) a = [];
    a.push({ t: Date.now(), mins: cfg.focus, src: "timer" });
    localStorage.setItem(PLANTS, JSON.stringify(a.slice(-500)));
  } catch (e) {}
}

// ---------- Sound (soft chime made in the browser) ----------
let ac = null;
function ensureAudio() {
  if (!cfg.sound) return;
  try {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) ac = new A(); }
    if (ac && ac.state === "suspended") ac.resume();
  } catch (e) {}
}
function chime() {
  if (!cfg.sound || !ac) return;
  try {
    const t0 = ac.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ac.createOscillator(), v = ac.createGain(), t = t0 + i * 0.22;
      o.type = "sine"; o.frequency.value = f;
      v.gain.setValueAtTime(0.0001, t);
      v.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      o.connect(v); v.connect(ac.destination); o.start(t); o.stop(t + 1.4);
    });
  } catch (e) {}
}

function celebrate() {
  if (reduce) return;
  const cols = ["#ff8fb8", "#f2c14e", "#5cc46a", "#ffffff"];
  for (let i = 0; i < 18; i++) {
    const s = document.createElement("i"); s.className = "fx";
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
    s.style.setProperty("--dx", Math.cos(a) * d + "px");
    s.style.setProperty("--dy", (Math.sin(a) * d - 40) + "px");
    s.style.background = cols[i % cols.length];
    scene.appendChild(s); setTimeout(() => s.remove(), 1300);
  }
}

// ---------- Timer logic ----------
// Short animation so the ring smoothly fills out to a full circle when a session starts
let sweepT = 0;
function sweep() {
  if (reduce) return;
  arc.classList.add("sweep");
  clearTimeout(sweepT);
  sweepT = setTimeout(() => arc.classList.remove("sweep"), 700);
}
function setPhase(ph) { S.phase = ph; S.status = "idle"; S.remaining = total(); }
function start() {
  ensureAudio();
  if (S.status === "idle") { S.remaining = total(); if (S.phase === "focus") S.grown = false; sweep(); }
  S.endAt = Date.now() + S.remaining; S.status = "running"; note = ""; render();
}
function pause() { S.remaining = Math.max(0, S.endAt - Date.now()); S.status = "paused"; note = ""; render(); }
function reset() { sweep(); setPhase(S.phase); if (S.phase === "focus") S.grown = false; note = ""; render(); }

function advance(completed) {
  sweep();
  if (S.phase === "focus") {
    if (completed) { S.grown = true; addPlant(); celebrate(); note = "Bloom! Your plant is in your collection. Time to rest."; }
    else { S.grown = false; note = "Skipped. No plant this time, and that's okay."; }
    setPhase(S.session >= cfg.every ? "long" : "short");
  } else if (S.phase === "short") {
    S.session++; S.grown = false; setPhase("focus"); note = "Break over. Ready for the next plant?";
  } else {
    S.session = 1; S.grown = false; setPhase("focus"); note = "Cycle complete. Ready to start a new one?";
  }
  if (completed && cfg.auto) start(); else render();
}
function tick() {
  if (S.status !== "running") return;
  S.remaining = S.endAt - Date.now();
  if (S.remaining <= 0) { S.remaining = 0; chime(); advance(true); return; }
  render();
}

// ---------- Settings changes ----------
function setValue(v) {
  const lim = LIM[S.phase];
  v = Math.round(clamp(v, lim.min, lim.max));
  if (S.status !== "idle" || v === cfg[S.phase]) return;
  cfg[S.phase] = v; S.remaining = total(); note = ""; persist(); render();
}

// dragging the ring
let dragging = false;
function pointerInfo(e) {
  const r = dial.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  let a = Math.atan2(dx, -dy); if (a < 0) a += 2 * Math.PI;
  return { frac: a / (2 * Math.PI), dist: Math.hypot(dx, dy) / r.width * 300 };
}
function applyDrag(e, first) {
  const lim = LIM[S.phase], prev = cfg[S.phase];
  let m = Math.round(pointerInfo(e).frac * lim.max);
  if (first) { if (m === 0) m = prev > lim.max / 2 ? lim.max : lim.min; }
  else {
    const d = m - prev;
    if (d > lim.max / 2) m = lim.min; else if (d < -lim.max / 2) m = lim.max;
  }
  setValue(m);
}
dial.addEventListener("pointerdown", e => {
  if (S.status !== "idle") return;
  const d = pointerInfo(e).dist; if (d < 80 || d > 146) return;
  dragging = true; try { dial.setPointerCapture(e.pointerId); } catch (x) {}
  applyDrag(e, true); e.preventDefault();
});
dial.addEventListener("pointermove", e => { if (dragging) applyDrag(e, false); });
["pointerup", "pointercancel"].forEach(t => dial.addEventListener(t, () => { dragging = false; }));
handle.addEventListener("keydown", e => {
  const lim = LIM[S.phase], v = cfg[S.phase];
  const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
  if (step) { e.preventDefault(); setValue(v + step); }
  else if (e.key === "Home") { e.preventDefault(); setValue(lim.min); }
  else if (e.key === "End") { e.preventDefault(); setValue(lim.max); }
});
minus.addEventListener("click", () => setValue(cfg[S.phase] - 1));
plus.addEventListener("click", () => setValue(cfg[S.phase] + 1));

tabs.forEach(b => b.addEventListener("click", () => {
  if (S.status !== "idle") return;
  setPhase(b.dataset.phase); note = ""; render();
}));
startBtn.addEventListener("click", () => { if (S.status === "running") pause(); else start(); });
resetBtn.addEventListener("click", reset);
skipBtn.addEventListener("click", () => advance(false));

function changeEvery(d) {
  if (S.status !== "idle") return;
  cfg.every = clamp(cfg.every + d, 2, 8);
  if (S.session > cfg.every) S.session = cfg.every;
  persist(); render();
}
everyMinus.addEventListener("click", () => changeEvery(-1));
everyPlus.addEventListener("click", () => changeEvery(1));
autoBox.addEventListener("change", () => { cfg.auto = autoBox.checked; persist(); });
soundBox.addEventListener("change", () => {
  cfg.sound = soundBox.checked; persist();
  if (cfg.sound) { ensureAudio(); chime(); }
});

// ---------- Presets ----------
const same = p => p.focus === cfg.focus && p.short === cfg.short && p.long === cfg.long;
function applyPreset(p) {
  if (S.status !== "idle") return;
  cfg.focus = p.focus; cfg.short = p.short; cfg.long = p.long;
  S.remaining = total(); note = "Loaded “" + p.name + "”."; persist(); render();
}
function renderPresets() {
  plist.textContent = "";
  const all = BUILTIN.map(p => ({ ...p, custom: false })).concat(cfg.presets.map((p, i) => ({ ...p, custom: true, i })));
  all.forEach(p => {
    const li = document.createElement("li");
    const b = document.createElement("button"); b.type = "button"; b.className = "load";
    const n = document.createElement("b"); n.textContent = p.name;
    const s = document.createElement("span"); s.textContent = p.focus + " / " + p.short + " / " + p.long + " min";
    b.append(n, s); b.addEventListener("click", () => applyPreset(p));
    li.appendChild(b);
    if (p.custom) {
      b.classList.add("hasdel");
      const d = document.createElement("button"); d.type = "button"; d.className = "del"; d.textContent = "×";
      d.setAttribute("aria-label", "Delete preset " + p.name);
      d.addEventListener("click", () => {
        cfg.presets.splice(p.i, 1); persist(); renderPresets();
        setText(pmsg, "Deleted “" + p.name + "”."); render();
      });
      li.appendChild(d);
    }
    li._p = p; plist.appendChild(li);
  });
}
function updatePresetStates() {
  const idle = S.status === "idle";
  plist.querySelectorAll("li").forEach(li => {
    const b = li.querySelector(".load"), on = String(same(li._p));
    if (b.getAttribute("aria-pressed") !== on) b.setAttribute("aria-pressed", on);
    b.disabled = !idle;
  });
}
saveform.addEventListener("submit", e => {
  e.preventDefault();
  const name = (pname.value.trim() || "My " + cfg.focus + "/" + cfg.short + "/" + cfg.long).slice(0, 20);
  const at = cfg.presets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  const entry = { name, focus: cfg.focus, short: cfg.short, long: cfg.long };
  if (at >= 0) cfg.presets[at] = entry;
  else if (cfg.presets.length >= 8) { setText(pmsg, "You can keep 8 of your own presets. Delete one to save another."); return; }
  else cfg.presets.push(entry);
  persist(); renderPresets(); pname.value = "";
  setText(pmsg, "Saved “" + name + "”."); render();
});

// ---------- Render ----------
let dotsKey = "";
function baseMsg(p) {
  if (S.status === "paused") return "Paused. Your plant waits for you.";
  if (S.phase === "focus") {
    if (S.status === "idle") return "Press Start to plant your seed.";
    if (p < 0.25) return "Your seed is sprouting. Keep going.";
    if (p < 0.6) return "Growing nicely. You're doing it.";
    if (p < 0.9) return "Almost in bud. Stay with it.";
    return "Nearly in bloom!";
  }
  const nm = S.phase === "long" ? "long break" : "break";
  return S.status === "idle" ? "Press Start when you're ready for your " + nm + "." : "Rest. Look away from the screen for a bit.";
}
function render() {
  const ph = S.phase, lim = LIM[ph], idle = S.status === "idle", running = S.status === "running";
  dialcard.dataset.phase = ph; dialcard.classList.toggle("locked", !idle);
  drawTicks();
  tabs.forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.phase === ph)); b.disabled = !idle; });

  const ms = idle ? total() : S.remaining;
  setText(timeEl, fmt(ms)); setText(phaseEl, lim.label);
  // Setting the length: the ring is the dial (a full lap = the maximum for this tab).
  // Running or paused: the ring is the chosen length, so it starts as a full circle and empties.
  const frac = idle ? clamp(cfg[ph] / lim.max, 0, 1) : clamp(S.remaining / total(), 0, 1);
  arc.setAttribute("stroke-dasharray", (frac * 100).toFixed(2) + " 100");
  const a = frac * 2 * Math.PI;
  handle.setAttribute("transform", "translate(" + (CX + R * Math.sin(a)).toFixed(2) + " " + (CY - R * Math.cos(a)).toFixed(2) + ")");
  handle.setAttribute("aria-label", lim.label + " length in minutes");
  handle.setAttribute("aria-valuemin", lim.min); handle.setAttribute("aria-valuemax", lim.max);
  handle.setAttribute("aria-valuenow", cfg[ph]); handle.setAttribute("aria-valuetext", cfg[ph] + (cfg[ph] === 1 ? " minute" : " minutes"));
  setText(hintEl, idle ? "Drag the ring to set minutes" : running ? (ph === "focus" ? "Stay with it" : "Rest your eyes") : "Paused");

  setText(minsOut, cfg[ph] + " min");
  minus.disabled = !idle || cfg[ph] <= lim.min; plus.disabled = !idle || cfg[ph] >= lim.max;
  setText(startBtn, idle ? "Start" : running ? "Pause" : "Resume");
  resetBtn.disabled = idle;

  const key = ph + "|" + S.session + "|" + cfg.every;
  if (key !== dotsKey) {
    dotsKey = key; dots.textContent = "";
    for (let i = 1; i <= cfg.every; i++) {
      const d = document.createElement("span");
      d.className = "dot" + (ph === "long" || i < S.session ? " done" : i === S.session ? " now" : "");
      dots.appendChild(d);
    }
  }
  setText(cycleLabel, ph === "long" ? "Long break: cycle complete" : "Session " + S.session + " of " + cfg.every);
  setText(everyOut, String(cfg.every));
  everyMinus.disabled = !idle || cfg.every <= 2; everyPlus.disabled = !idle || cfg.every >= 8;
  if (autoBox.checked !== cfg.auto) autoBox.checked = cfg.auto;
  if (soundBox.checked !== cfg.sound) soundBox.checked = cfg.sound;

  let p = ph === "focus" ? (idle ? 0 : 1 - S.remaining / total()) : (S.grown ? 1 : 0);
  p = clamp(p, 0, 1);
  updatePlant(p);
  scene.style.setProperty("--p", p.toFixed(3));
  const resting = ph !== "focus" && !S.grown;
  setText(stageEl, resting ? "Resting" : stageName(p));
  setText(pctEl, Math.floor(p * 100) + "%");
  pfill.style.width = Math.floor(p * 100) + "%";
  setText(msgEl, note || baseMsg(p));
  setText(countEl, String(plantTotal()));
  updatePresetStates();
  document.title = running ? fmt(S.remaining) + " · " + lim.label + " | QuizGarden" : "Pomodoro Timer | QuizGarden";
}

renderPresets();
render();
setInterval(tick, 250);
document.addEventListener("visibilitychange", tick);
})();
