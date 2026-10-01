/* MCMC Admin portal (mockup). Case data and workflow live in ../cases.js; analytics below are sample data. */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtN = (n) => Number(n).toLocaleString("ms-MY");
const fmtK = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(".0", "") + "k" : String(n));
const fmtDT = (t) => new Date(t).toLocaleString("ms-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
function ago(t) {
  const m = Math.round((Date.now() - t) / MIN);
  if (m < 1) return "baru sahaja";
  if (m < 60) return `${m} minit lalu`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} jam lalu` : `${Math.round(h / 24)} hari lalu`;
}

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- Session ---------- */
loadStore();
const me = { name: "admin@mcmc.gov.my", role: "MCMC Admin" };
try {
  const s = JSON.parse(localStorage.getItem("sbn-admin"));
  if (s && s.email) me.name = s.email;
} catch (e) { }
me.roleId = "mcmc-admin";
// Deactivated accounts are signed out straight away (users.js)
if (!guardActive(me.name)) throw new Error("Akaun tidak aktif");
ensureUser(me, me.roleId, null);
try {
  if (!sessionStorage.getItem("sbn-admin-session")) {
    audit(me, "Log masuk", "Portal pentadbir", "Log masuk berjaya");
    saveStore();
    sessionStorage.setItem("sbn-admin-session", "1");
  }
} catch (e) { }
$("me-email").textContent = me.name;
$("me-avatar").textContent = me.name[0].toUpperCase();
const drawBell = bellInit("mcmc:admin");

/* ---------- Sample analytics (deterministic) ---------- */
const MONTHS = ["Okt 2025", "Nov 2025", "Dis 2025", "Jan 2026", "Feb 2026", "Mac 2026", "Apr 2026", "Mei 2026", "Jun 2026", "Jul 2026", "Ogo 2026", "Sep 2026"];
const MONTH_SHORT = MONTHS.map((m) => m.slice(0, 3));
const RECEIVED = [24, 26, 27, 30, 31, 34, 29, 32, 35, 38, 42, 46];
const RESOLVED = [22, 25, 26, 28, 30, 32, 30, 31, 33, 36, 39, 43];
const AVG_DAYS = [3.9, 3.8, 3.6, 3.7, 3.4, 3.3, 3.5, 3.2, 3.1, 3.0, 2.9, 2.8];
const SLA_PCT = [84, 85, 86, 85, 87, 88, 86, 89, 90, 91, 91, 93];
const EXT_MAU = [21400, 23800, 25100, 27900, 30200, 33800, 35100, 38900, 42400, 45800, 49300, 53600];
const EXT_CTR = [9.8, 10.1, 10.4, 10.2, 10.9, 11.3, 11.0, 11.6, 12.1, 12.4, 12.8, 13.3];
const SLA_TARGET = 90;
const TOPICS_HEAT = ["Penipuan", "Kesihatan", "Ekonomi", "Politik", "Bencana", "Teknologi", "Pendidikan", "Pengangkutan", "Alam Sekitar", "Agama"];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function agencyPerf(mi) {
  const base = { KKM: [11, 30, 92], PDRM: [9, 26, 94], BNM: [8, 34, 88], KPM: [5, 40, 85], MOT: [4, 28, 93], JPS: [3, 36, 87], NADMA: [4, 44, 81], JAKIM: [2, 48, 79], JAS: [2, 38, 90], KPDN: [5, 32, 89] };
  const scale = RECEIVED[mi] / RECEIVED[11];
  return AGENCIES.map((a, i) => {
    const r = rng(mi * 97 + i * 13 + 5);
    const [cases, resp, sla] = base[a.id];
    return {
      id: a.id, name: a.name,
      cases: Math.round(cases * scale * (0.85 + r() * 0.3)),
      respH: +(resp * (0.85 + r() * 0.3)).toFixed(1),
      sla: Math.min(99, Math.round(sla - (11 - mi) * 0.4 + (r() - 0.5) * 6)),
    };
  });
}
function slaLevel(p) {
  return p >= SLA_TARGET ? { level: "good", label: "Baik", ic: "✓" } : p >= 85 ? { level: "warning", label: "Amaran", ic: "!" } : { level: "critical", label: "Kritikal", ic: "!" };
}

function stageHours(mi) {
  const f = 1 + (11 - mi) * 0.025;
  return [["Pengesahan", 2.1], ["Pengesanan pendua (AI)", 0.1], ["Klasifikasi", 1.4], ["Agihan", 3.2], ["Semakan agensi", 38.5], ["Semakan kualiti", 5.6], ["Semakan editorial", 7.9], ["Penerbitan", 2.4]]
    .map(([label, h]) => ({ label, value: +(h * f).toFixed(1) }));
}

function extension(mi) {
  const mau = EXT_MAU[mi];
  const r = rng(mi * 31 + 7);
  const dau = Array.from({ length: 30 }, (_, d) => {
    const weekend = d % 7 === 5 || d % 7 === 6 ? 0.82 : 1;
    return Math.round(mau * 0.3 * weekend * (0.94 + d * 0.004 + r() * 0.08));
  });
  const installs = Math.round(mau * 1.25);
  return {
    mau, dau, ctr: EXT_CTR[mi],
    flagged: Math.round(mau * 2.9),
    reports: Math.round(RECEIVED[mi] * 0.16),
    browsers: [["Chrome", 0.66], ["Edge", 0.21], ["Firefox", 0.08], ["Safari", 0.05]].map(([label, s]) => ({ label, value: Math.round(installs * s) })),
  };
}

function heatmap(mi) {
  const base = [12, 7, 6, 5, 2, 4, 3, 3, 2, 2];
  const end = new Date(2025, 9 + mi + 1, 0);
  const weeks = Array.from({ length: 12 }, (_, w) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (11 - w) * 7 - 6);
    return d.toLocaleDateString("ms-MY", { day: "numeric", month: "short" });
  });
  const scale = RECEIVED[mi] / RECEIVED[11];
  const r = rng(mi * 53 + 11);
  const values = TOPICS_HEAT.map((t, ti) => weeks.map((_, w) => {
    let v = base[ti] * (0.85 + r() * 0.3);
    if (t === "Kesihatan") v += w * 0.4;
    if (t === "Bencana" && w >= 8 && w <= 10) v += 9 - Math.abs(9 - w) * 3;
    if (t === "Politik" && (w === 4 || w === 5)) v += 4;
    if (t === "Teknologi") v += w * 0.2;
    return Math.round(v * scale);
  }));
  return { weeks, values };
}

/* ---------- Tooltip ---------- */
const tip = $("viz-tip");
function showTip(html, x, y) {
  tip.innerHTML = html;
  tip.classList.add("show");
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y + 14;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > innerHeight - 8) top = y - r.height - 14;
  tip.style.left = left + "px";
  tip.style.top = top + "px";
}
const hideTip = () => tip.classList.remove("show");
const tipRow = (color, label, value) =>
  `<div class="row"><span>${color ? `<i style="background:${color}"></i>` : ""}${esc(label)}</span><b>${esc(value)}</b></div>`;

/* ---------- Charts (plain SVG) ---------- */
function niceScale(max, ticks = 4) {
  const raw = max / ticks || 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  return { step, max: step * Math.ceil(max / step) };
}

// Line chart: 2px lines, end markers with a surface ring, direct end labels, crosshair + tooltip
function lineChart(el, o) {
  const W = Math.max(320, el.clientWidth), H = o.height || 240;
  const m = { t: 12, r: o.series.length > 1 ? 118 : 24, b: 28, l: 44 };
  const n = o.labels.length;
  const { step, max } = niceScale(Math.max(...o.series.flatMap((s) => s.values)));
  const x = (i) => m.l + (i * (W - m.l - m.r)) / (n - 1);
  const y = (v) => m.t + (1 - v / max) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(o.aria)}">`;
  if (o.highlight != null) {
    const bw = (W - m.l - m.r) / (n - 1);
    s += `<rect x="${x(o.highlight) - bw / 2}" y="${m.t}" width="${bw}" height="${H - m.t - m.b}" fill="#f2f5fa"/>`;
  }
  for (let v = 0; v <= max; v += step)
    s += `<line class="${v === 0 ? "base-line" : "grid-line"}" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${fmtK(v)}</text>`;
  const every = o.labelEvery || 1;
  o.labels.forEach((l, i) => { if (i % every === 0 || i === n - 1) s += `<text class="tick" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; });

  o.series.forEach((sr) => {
    const pts = sr.values.map((v, i) => `${x(i)},${y(v)}`);
    if (o.area) s += `<path d="M${x(0)},${y(0)} L${pts.join(" L")} L${x(n - 1)},${y(0)} Z" fill="${sr.color}" opacity="0.08"/>`;
    s += `<path d="M${pts.join(" L")}" fill="none" stroke="${sr.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    s += `<circle cx="${x(n - 1)}" cy="${y(sr.values[n - 1])}" r="4" fill="${sr.color}" stroke="#fff" stroke-width="2"/>`;
  });
  // direct labels at the line ends, nudged apart so they never collide
  if (o.series.length > 1) {
    const ends = o.series.map((sr) => ({ sr, y: y(sr.values[n - 1]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) {
      const mid = (ends[i].y + ends[i - 1].y) / 2;
      ends[i - 1].y = mid - 8;
      ends[i].y = mid + 8;
    }
    ends.forEach((e) => (s += `<text class="dlabel" x="${x(n - 1) + 10}" y="${e.y + 4}">${esc(e.sr.name)} ${fmtN(e.sr.values[n - 1])}</text>`));
  }
  s += `<line class="crosshair" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>`;
  s += o.series.map((sr) => `<circle class="hover-dot" r="4" fill="${sr.color}" stroke="#fff" stroke-width="2" visibility="hidden"/>`).join("");
  s += `<rect class="hit" x="${m.l - 10}" y="0" width="${W - m.l - m.r + 20}" height="${H - m.b}"/></svg>`;
  el.innerHTML = s;

  const svg = el.querySelector("svg"), cross = svg.querySelector(".crosshair"), dots = svg.querySelectorAll(".hover-dot");
  const hide = () => { cross.setAttribute("visibility", "hidden"); dots.forEach((d) => d.setAttribute("visibility", "hidden")); hideTip(); };
  svg.querySelector(".hit").addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1))));
    cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
    o.series.forEach((sr, k) => { dots[k].setAttribute("cx", x(i)); dots[k].setAttribute("cy", y(sr.values[i])); dots[k].setAttribute("visibility", "visible"); });
    showTip(`<b>${esc(o.tipLabels ? o.tipLabels[i] : o.labels[i])}</b>` + o.series.map((sr) => tipRow(sr.color, sr.name, (o.fmt || fmtN)(sr.values[i]))).join(""), e.clientX, e.clientY);
  });
  svg.querySelector(".hit").addEventListener("mouseleave", hide);
}

// Horizontal bars: one colour (single series), 4px rounded data end, values outside the bar end
function barChart(el, o) {
  const W = Math.max(300, el.clientWidth), rowH = o.rowH || 30, gap = 8;
  const m = { t: o.target != null ? 22 : 4, r: 56, b: 4, l: o.labelW || 70 };
  const H = m.t + o.items.length * (rowH + gap) - gap + m.b;
  const max = o.max || niceScale(Math.max(...o.items.map((d) => d.value))).max || 1;
  const x = (v) => m.l + (v / max) * (W - m.l - m.r);
  const bh = rowH - 10;
  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(o.aria)}">`;
  s += `<line class="base-line" x1="${m.l}" x2="${m.l}" y1="${m.t - 4}" y2="${H - m.b}"/>`;
  o.items.forEach((d, i) => {
    const y0 = m.t + i * (rowH + gap), w = Math.max(0, x(d.value) - m.l), r = Math.min(4, w);
    const path = w > 0
      ? `M${m.l},${y0 + 5} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${bh - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} z`
      : "";
    s += `<g class="bar-row" tabindex="0" data-i="${i}" aria-label="${esc(d.label)}: ${esc((o.fmt || fmtN)(d.value))}">
      <rect x="0" y="${y0}" width="${W}" height="${rowH}" fill="transparent"/>
      <text class="tick" x="${m.l - 10}" y="${y0 + rowH / 2 + 4}" text-anchor="end" style="font-size:12px;fill:var(--ink-2)">${esc(d.short || d.label)}</text>
      ${path ? `<path class="bar" d="${path}" fill="${o.color || "var(--series-1)"}"/>` : ""}
      <text class="vlabel" x="${m.l + w + 6}" y="${y0 + rowH / 2 + 4}">${esc((o.fmt || fmtN)(d.value))}${d.flag ? ` ${d.flag}` : ""}</text>
    </g>`;
  });
  if (o.target != null) {
    const tx = x(o.target);
    s += `<line class="target" x1="${tx}" x2="${tx}" y1="${m.t - 6}" y2="${H - m.b}"/><text class="target-label" x="${tx}" y="${m.t - 10}" text-anchor="middle">Sasaran ${o.target}${o.unit || ""}</text>`;
  }
  s += "</svg>";
  el.innerHTML = s;
  el.querySelectorAll(".bar-row").forEach((g) => {
    const d = o.items[+g.dataset.i];
    const html = () => `<b>${esc(d.label)}</b>` + (o.tip ? o.tip(d) : tipRow(o.color || "var(--series-1)", o.name || "Nilai", (o.fmt || fmtN)(d.value)));
    g.addEventListener("mousemove", (e) => showTip(html(), e.clientX, e.clientY));
    g.addEventListener("mouseleave", hideTip);
    g.addEventListener("focus", () => { const r = g.getBoundingClientRect(); showTip(html(), r.left + r.width / 2, r.top); });
    g.addEventListener("blur", hideTip);
  });
}

// Sequential heatmap: one hue (blue ramp 100→700), 7 classes, scale legend
const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
function heatChart(el, o) {
  const max = Math.max(...o.values.flat());
  const cls = (v) => Math.min(RAMP.length - 1, Math.floor((v / (max + 1)) * RAMP.length));
  let h = `<div class="heat" style="grid-template-columns: auto repeat(${o.cols.length}, minmax(26px, 1fr))">`;
  o.rows.forEach((row, ri) => {
    h += `<div class="hrow-label">${esc(row)}</div>`;
    o.values[ri].forEach((v, ci) => {
      h += `<div class="cell" tabindex="0" data-r="${ri}" data-c="${ci}" style="background:${RAMP[cls(v)]}" aria-label="${esc(row)}, minggu ${esc(o.cols[ci])}: ${v} laporan"></div>`;
    });
  });
  h += `<div></div>` + o.cols.map((c) => `<div class="hcol-label">${esc(c)}</div>`).join("") + `</div>`;
  h += `<div class="heat-legend"><span>Rendah</span><span class="ramp">${RAMP.map((c) => `<i style="background:${c}"></i>`).join("")}</span><span>Tinggi (${fmtN(max)} laporan/minggu)</span></div>`;
  el.innerHTML = h;
  el.querySelectorAll(".cell").forEach((c) => {
    const html = () => `<b>${esc(o.rows[+c.dataset.r])}</b>` + tipRow(null, `Minggu ${o.cols[+c.dataset.c]}`, `${fmtN(o.values[+c.dataset.r][+c.dataset.c])} laporan`);
    c.addEventListener("mousemove", (e) => showTip(html(), e.clientX, e.clientY));
    c.addEventListener("mouseleave", hideTip);
    c.addEventListener("focus", () => { const r = c.getBoundingClientRect(); showTip(html(), r.right, r.top); });
    c.addEventListener("blur", hideTip);
  });
}

function tableHTML(headers, rows, numCols = []) {
  return `<div class="table-wrap table-view"><table class="adm-table"><thead><tr>${headers.map((h, i) => `<th class="${numCols.includes(i) ? "num" : ""}">${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${numCols.includes(i) ? "num" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

// A chart card with a chart ↔ table toggle (every chart has a table view)
function chartCard(id, title, sub, extraClass = "", legend = "") {
  return `<div class="card ${extraClass}">
    <div class="card-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>
      <div class="card-tools"><button class="btn-g btn-sm" data-toggle="${id}" aria-pressed="false">Jadual</button></div></div>
    ${legend}<div class="chart" id="${id}"></div><div id="${id}-table" hidden></div></div>`;
}
const legendHTML = (items, box) => `<div class="legend">${items.map(([c, l]) => `<span><i class="${box ? "box" : ""}" style="background:${c}"></i>${esc(l)}</span>`).join("")}</div>`;

/* ---------- Helpers for cases ---------- */
const ADMIN_STAGES = ["baharu", "disahkan", "klasifikasi", "agihan", "semakan_kualiti"];
function stageClass(k) {
  return { baharu: "st-new", semakan_agensi: "st-agency", editorial: "st-staff", penerbitan: "st-staff", selesai: "st-done", digabung: "st-closed" }[k] || "st-admin";
}
const stageBadge = (k) => `<span class="stage ${stageClass(k)}">${esc(STAGE[k].label)}</span>`;
function slaBadge(st) {
  return `<span class="sla ${st.level}"><span class="ic" aria-hidden="true">${st.level === "good" ? "✓" : "!"}</span>${esc(st.label)}</span>`;
}
function worstSla(c) {
  if (c.status !== "semakan_agensi") return null;
  const order = { critical: 0, warning: 1, good: 2 };
  return c.assignments.map(slaState).sort((a, b) => order[a.level] - order[b.level])[0];
}
const activeCases = () => store.cases.filter((c) => !["selesai", "digabung"].includes(c.status));
function updateNavBadge() {
  const n = store.cases.filter((c) => ADMIN_STAGES.includes(c.status)).length;
  $("nav-new").textContent = n || "";
}
function commit(msg) {
  saveStore();
  drawBell();
  updateNavBadge();
  if (msg) toast(msg);
}

/* ---------- Dashboard ---------- */
let month = 11;

function renderDashboard() {
  const mi = month, prev = Math.max(0, mi - 1);
  const pct = (a, b) => ((a - b) / b) * 100;
  const delta = (a, b, goodWhenUp, unit = "%", digits = 1) => {
    if (mi === 0) return "";
    const d = unit === "%" ? pct(a, b) : a - b;
    const up = d >= 0;
    const cls = goodWhenUp == null ? "" : up === goodWhenUp ? (up ? "up-good" : "down-good") : up ? "up-bad" : "down-bad";
    return `<b class="${cls}">${up ? "▲" : "▼"} ${Math.abs(d).toFixed(digits)}${unit}</b> berbanding ${MONTH_SHORT[prev]}`;
  };
  const active = activeCases(), overdue = active.filter(caseOverdue).length;
  const perf = agencyPerf(mi), ext = extension(mi), heat = heatmap(mi);

  $("view-dashboard").innerHTML = `
    <div class="filter-row">
      <label for="month">Tempoh</label>
      <select id="month" class="ctl">${MONTHS.map((m, i) => i >= 6 ? `<option value="${i}" ${i === mi ? "selected" : ""}>${m}</option>` : "").join("")}</select>
      <span class="kpi-delta">Analitik ialah data contoh untuk mockup · kes & log audit adalah langsung</span>
      <span class="spacer"></span>
      <button class="btn-s" id="export-summary">Eksport ringkasan (CSV)</button>
      <button class="btn-s" onclick="window.print()">Cetak / PDF</button>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Kes diterima</div><div class="kpi-value">${fmtN(RECEIVED[mi])}</div><div class="kpi-delta">${delta(RECEIVED[mi], RECEIVED[prev], null)}</div></div>
      <div class="kpi"><div class="kpi-label">Kes diselesaikan</div><div class="kpi-value">${fmtN(RESOLVED[mi])}</div><div class="kpi-delta">${delta(RESOLVED[mi], RESOLVED[prev], true)}</div></div>
      <div class="kpi"><div class="kpi-label">Purata masa penyelesaian</div><div class="kpi-value">${AVG_DAYS[mi].toFixed(1)}<small>hari</small></div><div class="kpi-delta">${delta(AVG_DAYS[mi], AVG_DAYS[prev], false, " hari")}</div></div>
      <div class="kpi"><div class="kpi-label">Pematuhan SLA</div><div class="kpi-value">${SLA_PCT[mi]}<small>%</small></div><div class="kpi-delta">${delta(SLA_PCT[mi], SLA_PCT[prev], true, " mata", 0)} · sasaran ${SLA_TARGET}%</div></div>
      <div class="kpi"><div class="kpi-label">Kes aktif sekarang</div><div class="kpi-value">${active.length}</div><div class="kpi-delta">${overdue ? slaBadge({ level: "critical", label: `${overdue} lewat SLA` }) : slaBadge({ level: "good", label: "Tiada lewat SLA" })}</div></div>
    </div>

    <div class="section-title"><h2>Analitik bulanan</h2><span>12 bulan terakhir · ${MONTHS[mi]} diserlahkan</span></div>
    <div class="dash-grid">
      ${chartCard("ch-monthly", "Kes diterima vs diselesaikan", "Jumlah kes setiap bulan", "span-2",
        legendHTML([["var(--series-1)", "Diterima"], ["var(--series-2)", "Diselesaikan"]]))}
      ${chartCard("ch-pipeline", "Kes aktif mengikut peringkat", "Langsung daripada baris gilir kes")}
    </div>

    <div class="section-title"><h2>Pemantauan prestasi</h2><span>${MONTHS[mi]}</span></div>
    <div class="dash-grid">
      ${chartCard("ch-sla", "Pematuhan SLA mengikut agensi", `% kes dijawab dalam tempoh SLA · sasaran ${SLA_TARGET}%`, "span-2")}
      ${chartCard("ch-stage", "Purata masa setiap peringkat", "Jam, dari mula hingga selesai peringkat")}
    </div>

    <div class="section-title"><h2>Penglibatan sambungan pelayar</h2><span>${MONTHS[mi]}</span></div>
    <div class="dash-grid">
      <div class="card span-3">
        <div class="mini-kpis">
          <div class="mini-kpi"><div class="kpi-label">Pengguna aktif bulanan</div><div class="kpi-value">${fmtN(ext.mau)}</div><div class="kpi-delta">${delta(ext.mau, EXT_MAU[prev], true)}</div></div>
          <div class="mini-kpi"><div class="kpi-label">Dakwaan diserlahkan</div><div class="kpi-value">${fmtN(ext.flagged)}</div><div class="kpi-delta">pada halaman yang dilawati pengguna</div></div>
          <div class="mini-kpi"><div class="kpi-label">Kadar klik ke semakan fakta</div><div class="kpi-value">${ext.ctr}<small>%</small></div><div class="kpi-delta">${delta(ext.ctr, EXT_CTR[prev], true, " mata")}</div></div>
          <div class="mini-kpi"><div class="kpi-label">Laporan melalui sambungan</div><div class="kpi-value">${fmtN(ext.reports)}</div><div class="kpi-delta">${Math.round((ext.reports / RECEIVED[mi]) * 100)}% daripada semua kes</div></div>
        </div>
        <div class="dash-grid" style="margin:0">
          <div class="span-2">
            <div class="card-head"><div><h2>Pengguna aktif harian</h2><p>30 hari dalam ${MONTHS[mi]}</p></div>
              <div class="card-tools"><button class="btn-g btn-sm" data-toggle="ch-dau" aria-pressed="false">Jadual</button></div></div>
            <div class="chart" id="ch-dau"></div><div id="ch-dau-table" hidden></div>
          </div>
          <div>
            <div class="card-head"><div><h2>Pemasangan mengikut pelayar</h2><p>Jumlah terkumpul</p></div>
              <div class="card-tools"><button class="btn-g btn-sm" data-toggle="ch-browsers" aria-pressed="false">Jadual</button></div></div>
            <div class="chart" id="ch-browsers"></div><div id="ch-browsers-table" hidden></div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-title"><h2>Peta haba trend</h2><span>Laporan mengikut topik, 12 minggu hingga hujung ${MONTHS[mi]}</span></div>
    <div class="dash-grid">${chartCard("ch-heat", "Topik yang paling banyak dilaporkan", "Warna lebih gelap = lebih banyak laporan dalam minggu tersebut", "span-3")}</div>

    <div class="dash-grid">
      <div class="card span-2">
        <div class="card-head"><div><h2>Log audit terkini</h2><p>Tindakan terbaru semua pengguna</p></div>
          <div class="card-tools"><a href="#audit" class="btn-g btn-sm">Lihat semua →</a></div></div>
        ${auditTable(store.audit.slice(0, 6), true)}
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Laporan boleh eksport</h2><p>CSV atau cetak ke PDF</p></div></div>
        <div class="report-list">${REPORTS.slice(0, 3).map(reportItem).join("")}</div>
        <a href="#reports" class="btn-g btn-sm" style="margin-top:10px">Semua laporan →</a>
      </div>
    </div>`;

  $("month").addEventListener("change", (e) => { month = +e.target.value; renderDashboard(); });
  $("export-summary").addEventListener("click", () => exportReport("summary"));
  bindReportButtons($("view-dashboard"));

  // charts + their table views
  const draws = {
    "ch-monthly": () => lineChart($("ch-monthly"), {
      labels: MONTH_SHORT, tipLabels: MONTHS, highlight: mi, aria: "Kes diterima dan diselesaikan setiap bulan",
      series: [{ name: "Diterima", color: "var(--series-1)", values: RECEIVED }, { name: "Diselesaikan", color: "var(--series-2)", values: RESOLVED }],
    }),
    "ch-pipeline": () => {
      const items = STAGES.filter((s) => s.key !== "selesai").map((s) => ({ label: s.label, short: s.label, value: store.cases.filter((c) => c.status === s.key).length }));
      barChart($("ch-pipeline"), { items, labelW: 124, name: "Kes", aria: "Kes aktif mengikut peringkat", max: Math.max(4, ...items.map((i) => i.value)) });
    },
    "ch-sla": () => barChart($("ch-sla"), {
      items: perf.map((p) => ({ label: p.name, short: p.id, value: p.sla, flag: p.sla < SLA_TARGET ? "▼" : "", p })),
      max: 100, target: SLA_TARGET, unit: "%", fmt: (v) => `${v}%`, aria: "Pematuhan SLA mengikut agensi",
      tip: (d) => tipRow("var(--series-1)", "Pematuhan SLA", `${d.value}%`) + tipRow(null, "Kes diagihkan", fmtN(d.p.cases)) + tipRow(null, "Purata masa respons", `${d.p.respH} jam`) + tipRow(null, "Status", slaLevel(d.value).label),
    }),
    "ch-stage": () => barChart($("ch-stage"), { items: stageHours(mi).map((d) => ({ ...d, short: d.label })), labelW: 150, fmt: (v) => `${v} j`, name: "Purata jam", aria: "Purata masa setiap peringkat" }),
    "ch-dau": () => lineChart($("ch-dau"), {
      labels: ext.dau.map((_, d) => String(d + 1)), tipLabels: ext.dau.map((_, d) => `${d + 1} ${MONTHS[mi]}`), labelEvery: 5, area: true, height: 200,
      aria: "Pengguna aktif harian sambungan pelayar", series: [{ name: "Pengguna aktif", color: "var(--series-1)", values: ext.dau }],
    }),
    "ch-browsers": () => barChart($("ch-browsers"), { items: ext.browsers, labelW: 64, name: "Pemasangan", aria: "Pemasangan mengikut pelayar" }),
    "ch-heat": () => heatChart($("ch-heat"), { rows: TOPICS_HEAT, cols: heat.weeks, values: heat.values }),
  };
  const tables = {
    "ch-monthly": () => tableHTML(["Bulan", "Diterima", "Diselesaikan", "Purata hari", "SLA %"], MONTHS.map((m, i) => [m, fmtN(RECEIVED[i]), fmtN(RESOLVED[i]), AVG_DAYS[i], SLA_PCT[i]]), [1, 2, 3, 4]),
    "ch-pipeline": () => tableHTML(["Peringkat", "Pemilik", "Kes"], STAGES.filter((s) => s.key !== "selesai").map((s) => [esc(s.label), esc(s.owner), store.cases.filter((c) => c.status === s.key).length]), [2]),
    "ch-sla": () => tableHTML(["Agensi", "Kes", "Purata respons (jam)", "SLA %", "Status"], perf.map((p) => { const l = slaLevel(p.sla); return [`<b>${p.id}</b> <small>${esc(p.name)}</small>`, fmtN(p.cases), p.respH, `${p.sla}%`, slaBadge({ level: l.level, label: l.label })]; }), [1, 2, 3]),
    "ch-stage": () => tableHTML(["Peringkat", "Purata jam"], stageHours(mi).map((d) => [esc(d.label), d.value]), [1]),
    "ch-dau": () => tableHTML(["Hari", "Pengguna aktif"], ext.dau.map((v, d) => [`${d + 1} ${MONTHS[mi]}`, fmtN(v)]), [1]),
    "ch-browsers": () => tableHTML(["Pelayar", "Pemasangan"], ext.browsers.map((b) => [b.label, fmtN(b.value)]), [1]),
    "ch-heat": () => tableHTML(["Topik", ...heat.weeks], TOPICS_HEAT.map((t, i) => [t, ...heat.values[i].map(fmtN)]), heat.weeks.map((_, i) => i + 1)),
  };
  Object.values(draws).forEach((f) => f());
  document.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.toggle, showTable = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", showTable);
    b.textContent = showTable ? "Carta" : "Jadual";
    $(id).hidden = showTable;
    const legend = $(id).previousElementSibling;
    if (legend && legend.classList.contains("legend")) legend.hidden = showTable;
    $(`${id}-table`).hidden = !showTable;
    if (showTable) $(`${id}-table`).innerHTML = tables[id]();
    else draws[id]();
  }));
  dashDraws = draws;
}
let dashDraws = null;

/* ---------- Case queue ---------- */
let caseTab = "mine";
let caseType = "";
const CASE_TABS = [
  ["mine", "Perlu tindakan saya", (c) => ADMIN_STAGES.includes(c.status)],
  ["agency", "Semakan agensi", (c) => c.status === "semakan_agensi"],
  ["overdue", "Lewat SLA", caseOverdue],
  ["staff", "Editorial & penerbitan", (c) => ["editorial", "penerbitan"].includes(c.status)],
  ["closed", "Selesai / ditutup", (c) => ["selesai", "digabung"].includes(c.status)],
  ["all", "Semua", () => true],
];

function renderCases() {
  const q = $("global-q").value.trim().toLowerCase();
  const tabFn = CASE_TABS.find((t) => t[0] === caseTab)[2];
  const list = store.cases.filter((c) => tabFn(c) && (!caseType || c.type === caseType) && (!q || `${c.id} ${c.claim} ${c.reporter} ${c.platform}`.toLowerCase().includes(q)));
  $("view-cases").innerHTML = `
    <div class="tabs" role="tablist">${CASE_TABS.map(([k, label, fn]) =>
      `<button role="tab" data-tab="${k}" class="${k === caseTab ? "on" : ""}">${label}<span class="count">${store.cases.filter(fn).length}</span></button>`).join("")}</div>
    <div class="filter-row type-filter" role="group" aria-label="Tapis mengikut jenis kes">
      <label>Jenis kes</label>
      ${["", ...CASE_TYPES].map((t) => `<button class="type-chip ${t ? `ct-${typeSlug(t)}` : ""} ${t === caseType ? "on" : ""}" data-ctype="${esc(t)}">${t ? esc(t) : "Semua"}<span>${store.cases.filter((c) => tabFn(c) && (!t || c.type === t)).length}</span></button>`).join("")}
    </div>
    ${q ? `<p class="kpi-delta" style="margin-bottom:10px">Carian: “${esc(q)}” · ${list.length} keputusan</p>` : ""}
    <div class="card" style="padding:4px 8px"><div class="table-wrap">
      <table class="adm-table">
        <thead><tr><th>ID kes</th><th>Dakwaan</th><th>Diterima</th><th>Jenis kes</th><th>Peringkat</th><th>Agensi</th><th>SLA</th><th>Keutamaan</th></tr></thead>
        <tbody>${list.length ? list.map((c) => {
          const sla = worstSla(c);
          return `<tr class="clickable" data-case="${c.id}" tabindex="0">
            <td class="mono">${c.id}</td>
            <td class="claim-cell"><b>${esc(c.claim)}</b><small>${esc(c.reporter)} · ${esc(c.platform)}${c.fromPublic ? " · dari laman awam" : ""}</small></td>
            <td title="${fmtDT(c.receivedAt)}">${ago(c.receivedAt)}</td>
            <td>${typeBadge(c.type)}</td>
            <td>${stageBadge(c.status)}</td>
            <td>${c.assignments.map((a) => `<span class="chip-tag">${a.agency}</span>`).join("") || "—"}</td>
            <td>${sla ? slaBadge(sla) : "—"}</td>
            <td><span class="prio ${esc(c.priority)}">${esc(c.priority)}</span></td></tr>`;
        }).join("") : `<tr><td colspan="8" class="empty-row">Tiada kes dalam senarai ini.</td></tr>`}</tbody>
      </table></div></div>`;
  $("view-cases").querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { caseTab = b.dataset.tab; renderCases(); }));
  $("view-cases").querySelectorAll("[data-ctype]").forEach((b) => b.addEventListener("click", () => { caseType = b.dataset.ctype; renderCases(); }));
  $("view-cases").querySelectorAll("[data-case]").forEach((tr) => {
    const open = () => (location.hash = `#case/${tr.dataset.case}`);
    tr.addEventListener("click", open);
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
  });
}

/* ---------- Case detail ---------- */
const SUGGEST = { Kesihatan: ["KKM"], Pendidikan: ["KPM"], Ekonomi: ["BNM", "KPDN"], Penipuan: ["PDRM", "BNM"], Bencana: ["NADMA", "JPS"], Pengangkutan: ["MOT"], "Alam Sekitar": ["JAS"], Agama: ["JAKIM"], Teknologi: ["PDRM"] };
let historyTab = "status";

function renderCase(id) {
  const c = getCase(id);
  if (!c) { $("view-case").innerHTML = `<div class="card">Kes ${esc(id)} tidak dijumpai. <a href="#cases" class="btn-g">Kembali ke senarai kes</a></div>`; return; }
  $("page-title").textContent = c.id;
  const cur = STAGE[c.status].step;
  const flow = STAGES.map((s, i) => {
    const merged = c.status === "digabung";
    const cls = merged ? (i === 0 || i === 1 ? "done" : "") : i < cur || c.status === "selesai" ? "done" : i === cur ? "now" : "";
    return `<li class="${cls}">${esc(s.label)}<small>${esc(s.owner)}</small></li>`;
  }).join("");

  const facts = [
    ["Pelapor", esc(c.reporter)], ["Saluran", esc(c.channel)], ["Dilihat di", esc(c.platform)],
    ["Diterima", `${fmtDT(c.receivedAt)} <small class="kpi-delta">(${ago(c.receivedAt)})</small>`],
    // once classified, the type can be changed at any time (e.g. to "Selesai")
    ["Jenis kes", c.type ? `<span class="retype">${typeBadge(c.type)}<select id="f-retype" class="ctl ctl-sm" aria-label="Tukar jenis kes">
      ${CASE_TYPES.map((t) => `<option ${t === c.type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></span>` : "—"], ["Domain", c.domains.map((d) => `<span class="chip-tag">${esc(d)}</span>`).join("") || "—"],
    ["Pautan", c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.link)}</a>` : "—"],
    ["Bukti", c.evidence.length ? `<div class="evidence">${c.evidence.map((f) => `<span>📎 ${esc(f)}</span>`).join("")}</div>` : "Tiada"],
    ["Pengesanan pendua AI", !c.aiResult ? "Belum dijalankan" : c.aiResult.duplicate ? `Pendua ${esc(c.aiResult.of)} (${c.aiResult.score}%)` : c.aiResult.overridden ? "Diketepikan oleh admin" : "Tiada pendua"],
  ];

  $("view-case").innerHTML = `
    <a href="#cases" class="back-link">← Semua kes</a>
    <div class="case-grid">
      <div style="display:grid;gap:18px;min-width:0">
        <div class="card">
          <div class="case-head"><span class="mono">${c.id}</span>${stageBadge(c.status)}<span class="prio ${esc(c.priority)}">Keutamaan ${esc(c.priority).toLowerCase()}</span>${c.fromPublic ? `<span class="chip-tag">Dari laman awam</span>` : ""}</div>
          <h2 class="case-title">${esc(c.claim)}</h2>
          <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Aliran kerja</h2><p>${c.status === "digabung" ? "Kes digabungkan sebagai pendua dan ditutup." : `Peringkat semasa: ${esc(STAGE[c.status].label)} · pemilik: ${esc(STAGE[c.status].owner)}`}</p></div></div>
          <ol class="flow">${flow}</ol>
        </div>

        <div class="card action-panel" id="action-panel">${actionPanel(c)}</div>

        ${c.assignments.length ? `<div class="card">
          <div class="card-head"><div><h2>Agensi & SLA</h2><p>SLA ${c.slaHours} jam bagi setiap agensi</p></div></div>
          <div class="table-wrap"><table class="adm-table">
            <thead><tr><th>Agensi</th><th>Status</th><th>Tarikh akhir</th><th>SLA</th><th></th></tr></thead>
            <tbody>${c.assignments.map((a) => assignmentRow(c, a)).join("")}</tbody>
          </table></div>
          ${c.status === "semakan_agensi" ? `<p class="demo-note">Butang bertanda <b>Simulasi</b> menggantikan tindakan Agency Officer / Agency Reviewer. Buka <a href="../agency/agencyofficer.html" target="_blank" rel="noopener" style="color:var(--brand)">papan pemuka Agency Officer ↗</a> atau <a href="../agency/agencyreviewer.html" target="_blank" rel="noopener" style="color:var(--brand)">Agency Reviewer ↗</a>.</p>` : ""}
        </div>` : ""}

        ${c.rebuttal || draftSubmitted(c) ? `<div class="card"><div class="card-head"><div><h2>Draf sanggahan</h2><p>Disediakan oleh ${leadOf(c)} (peneraju)${c.draft ? ` · versi ${c.draft.version}` : ""} · disemak oleh ${c.assignments.map((a) => a.agency).join(", ")}</p></div></div>
          <div class="rebuttal">${esc(c.rebuttal || c.draft.text)}</div>
          ${c.draft && c.draft.docs.length ? `<div class="evidence" style="margin-top:12px">${c.draft.docs.map((d) => `<span>📎 ${esc(d.name)}</span>`).join("")}</div>` : ""}</div>` : ""}
      </div>

      <div class="card">
        <div class="tabs">
          <button data-htab="status" class="${historyTab === "status" ? "on" : ""}">Sejarah status<span class="count">${c.history.length}</span></button>
          <button data-htab="actions" class="${historyTab === "actions" ? "on" : ""}">Sejarah tindakan<span class="count">${c.actions.length}</span></button>
        </div>
        <ul class="timeline-list">${historyTab === "status"
          ? c.history.slice().reverse().map((h) => `<li><b>${h.from ? `${esc(STAGE[h.from].label)} → ` : ""}${esc(STAGE[h.to].label)}</b>${h.note ? `<p>${esc(h.note)}</p>` : ""}<div class="who">${esc(h.by)} · ${esc(h.role)} · ${fmtDT(h.at)}</div></li>`).join("")
          : c.actions.slice().reverse().map((a) => `<li><p style="color:var(--ink)">${esc(a.text)}</p><div class="who">${esc(a.by)} · ${esc(a.role)} · ${fmtDT(a.at)}</div></li>`).join("")}</ul>
      </div>
    </div>`;

  $("view-case").querySelectorAll("[data-htab]").forEach((b) => b.addEventListener("click", () => { historyTab = b.dataset.htab; renderCase(id); }));
  if ($("f-retype")) $("f-retype").addEventListener("change", (e) => { changeCaseType(c, e.target.value, me); commit(`Jenis kes ditukar kepada ${e.target.value}`); renderCase(id); });
  bindActions(c);
}

function assignmentRow(c, a) {
  const lead = leadOf(c) === a.agency;
  // The lead agency's officer drafts; every tagged agency's reviewer approves (see cases.js)
  const nextLabel = a.status === "draf" ? "Luluskan"
    : lead ? { diterima: "Mula selidik", menyelidik: "Hantar draf", pindaan: "Hantar semula" }[a.status] : null;
  const statusText = !lead && ["diterima", "menyelidik"].includes(a.status) ? "Menunggu draf peneraju" : AGENCY_STATUS[a.status];
  const live = c.status === "semakan_agensi" && a.status !== "diluluskan";
  return `<tr>
    <td title="${esc(AGENCY[a.agency].name)}"><b>${a.agency}</b>${lead ? `<br><span class="chip-tag">Peneraju</span>` : ""}</td>
    <td>${esc(statusText)}</td>
    <td title="Diagihkan ${fmtDT(a.assignedAt)}">${fmtDT(a.due)}</td>
    <td>${slaBadge(slaState(a))}</td>
    <td>${live ? `<div class="row-actions"><button class="btn-s btn-sm" data-remind="${a.agency}">Peringatan</button>
      ${nextLabel ? `<button class="btn-s btn-sm btn-demo" data-sim="${a.agency}">Simulasi: ${nextLabel}</button>` : ""}</div>` : ""}</td></tr>`;
}

function agencyPicker(c, exclude = []) {
  const suggested = new Set(c.domains.flatMap((d) => SUGGEST[d] || []));
  return `<div class="pick agencies">${AGENCIES.filter((a) => !exclude.includes(a.id)).map((a) =>
    `<label><span><input type="checkbox" name="agency" value="${a.id}" ${suggested.has(a.id) ? "checked" : ""}> <b>${a.id}</b>${suggested.has(a.id) ? ` <span class="chip-tag" style="margin:0">Dicadangkan</span>` : ""}</span><small>${esc(a.name)}</small></label>`).join("")}</div>`;
}

function actionPanel(c) {
  switch (c.status) {
    case "baharu":
      return `<h3>Semak penghantaran</h3><p>Pastikan kandungan dan bukti lengkap sebelum kes diproses.</p>
        <div class="check-list">
          <label><input type="checkbox" class="vcheck"> Dakwaan jelas dan lengkap</label>
          <label><input type="checkbox" class="vcheck"> Bukti (tangkapan skrin / pautan) telah disemak</label>
          <label><input type="checkbox" class="vcheck"> Bukan spam atau kandungan tidak berkaitan</label>
        </div>
        <div class="action-row"><button class="btn-p" data-act="verify" disabled>Tandakan sebagai disahkan</button></div>`;
    case "disahkan":
      if (c.aiResult && c.aiResult.duplicate) {
        const o = getCase(c.aiResult.of);
        return `<h3>Pengesanan pendua AI</h3><p>AI menemui kes yang hampir sama. Sahkan sama ada kes ini perlu digabungkan.</p>
          <div class="ai-box dup"><span class="ai-ic">⚠️</span><div style="flex:1">
            <b>Kemungkinan pendua: <a href="#case/${c.aiResult.of}" style="color:var(--brand)">${c.aiResult.of}</a></b>
            <p>${o ? esc(o.claim) : ""}${o ? ` · ${esc(STAGE[o.status].label)}` : ""}</p>
            <div class="score-bar"><i style="width:${c.aiResult.score}%"></i></div><p>${c.aiResult.score}% keserupaan</p></div></div>
          <div class="action-row"><button class="btn-d" data-act="merge">Gabung & tutup kes</button><button class="btn-s" data-act="override">Bukan pendua, teruskan</button></div>`;
      }
      return `<h3>Pengesanan pendua AI</h3><p>Jalankan AI untuk menyemak sama ada dakwaan ini pernah dilaporkan atau disemak.</p>
        <div class="action-row"><button class="btn-p" data-act="ai">Jalankan pengesanan pendua</button></div>`;
    case "klasifikasi":
      return `<h3>Klasifikasi kes & tag domain</h3><p>${c.aiResult && c.aiResult.overridden ? "Keputusan AI diketepikan." : "✓ AI tidak menemui pendua."} Tetapkan jenis kes dan domain berkaitan.</p>
        <div class="form-row"><div><label class="lbl" for="f-type">Jenis kes</label>
          <select id="f-type" class="ctl"><option value="">Pilih jenis kes…</option>${CASE_TYPES.map((t) => `<option>${esc(t)}</option>`).join("")}</select></div></div>
        <label class="lbl" style="font-size:12.5px;font-weight:600;color:var(--ink-2);display:block;margin-bottom:5px">Domain</label>
        <div class="pick">${DOMAINS.map((d) => `<label><input type="checkbox" name="domain" value="${esc(d)}"> ${esc(d)}</label>`).join("")}</div>
        <div class="action-row"><button class="btn-p" data-act="classify" disabled>Simpan klasifikasi</button></div>`;
    case "agihan":
      return `<h3>Agihkan kepada agensi</h3><p>Pilih satu atau lebih agensi. SLA bermula sebaik sahaja kes diagihkan. Agensi dicadangkan berdasarkan domain.</p>
        ${agencyPicker(c)}
        <div class="form-row" style="margin-top:12px"><div><label class="lbl" for="f-sla">SLA</label>
          <select id="f-sla" class="ctl"><option value="24">24 jam</option><option value="48">48 jam</option><option value="72" selected>72 jam</option><option value="120">5 hari</option></select></div>
          <div><label class="lbl" for="f-note">Nota kepada agensi (pilihan)</label><input id="f-note" class="ctl" placeholder="cth. Keutamaan tinggi"></div></div>
        <div class="action-row"><button class="btn-p" data-act="assign">Agihkan</button></div>`;
    case "semakan_agensi": {
      const done = c.assignments.filter((a) => a.status === "diluluskan").length;
      const others = AGENCIES.filter((a) => !c.assignments.some((x) => x.agency === a.id));
      const esc2 = (c.escalations || []).slice(-1)[0];
      const lastReq = (c.reviews || []).filter((r) => r.decision === "pindaan").slice(-1)[0];
      return `<h3>Pantau semakan pelbagai agensi</h3><p>${leadOf(c)} (peneraju) menyediakan draf; ${done} daripada ${c.assignments.length} agensi telah meluluskan. Kes akan kembali kepada anda untuk semakan kualiti apabila semua agensi meluluskan.</p>
        ${esc2 ? `<div class="ai-box dup" style="margin:0 0 12px"><span class="ai-ic">🚨</span><div><b>${esc2.urgent ? "Eskalasi segera" : "Eskalasi"} daripada ${esc(esc2.agency)}</b><p>${esc(esc2.reason)} · ${esc(esc2.by)}, ${fmtDT(esc2.at)}</p></div></div>` : ""}
        ${lastReq && c.assignments.some((a) => a.status === "pindaan") ? `<div class="ai-box" style="margin:0 0 12px"><span class="ai-ic">✏️</span><div><b>Pindaan diminta oleh ${esc(lastReq.agency)}</b><p>${esc(lastReq.comment)}</p></div></div>` : ""}
        <details><summary class="btn-g btn-sm" style="display:inline-flex;cursor:pointer">+ Tambah agensi</summary>
          <div style="margin-top:10px">${agencyPicker({ domains: [] }, c.assignments.map((a) => a.agency))}
          <div class="action-row"><button class="btn-s" data-act="assign-more" ${others.length ? "" : "disabled"}>Agihkan agensi tambahan</button></div></div></details>`;
    }
    case "semakan_kualiti":
      return `<h3>Semakan kualiti sanggahan</h3><p>Semua agensi telah meluluskan draf. Semak sanggahan di bawah sebelum dihantar kepada MCMC Editor.</p>
        ${returnedHere(c) ? `<div class="ai-box dup" style="margin:0 0 4px"><span class="ai-ic">↩️</span><div><b>Dipulangkan oleh MCMC Editor</b><p>${esc(c.returned.reason)} · ${esc(c.returned.by)}, ${fmtDT(c.returned.at)}</p></div></div>` : ""}
        <div class="action-row"><button class="btn-p" data-act="approve">Luluskan → hantar ke Editor</button><button class="btn-d" data-act="show-return">Pulangkan untuk pindaan</button></div>
        <div id="return-form" hidden style="margin-top:12px"><div class="form-row one"><div><label class="lbl" for="f-reason">Sebab pindaan</label>
          <textarea id="f-reason" class="ctl" rows="3" placeholder="cth. Sertakan rujukan kenyataan rasmi"></textarea></div></div>
          <button class="btn-d" data-act="return">Hantar semula kepada agensi</button></div>`;
    case "editorial":
      return `<h3>Menunggu MCMC Editor</h3><p>Editor sedang menyemak format, kejelasan dan ketepatan serta menambah imej sokongan.</p>
        ${returnedHere(c) ? `<div class="ai-box dup" style="margin:0"><span class="ai-ic">↩️</span><div><b>Dipulangkan oleh Content Publisher</b><p>${esc(c.returned.reason)}</p></div></div>` : ""}
        <div class="action-row"><a class="btn-s" href="editor.html#case/${c.id}" target="_blank" rel="noopener">Buka di papan pemuka Editor ↗</a><button class="btn-s btn-demo" data-act="sim-editor">Simulasi: Editor serahkan kepada Publisher</button></div>
        <p class="demo-note">Langkah ini dibuat di papan pemuka MCMC Editor.</p>`;
    case "penerbitan":
      return `<h3>Menunggu MCMC Content Publisher</h3><p>${c.schedule ? `Penerbitan dijadualkan pada <b>${whenText(c.schedule.at)}</b>.` : "Publisher akan menerbitkan serta-merta atau menjadualkan penerbitan, menjana kandungan boleh kongsi dan mengemas kini pangkalan data sambungan pelayar serta chatbot."}</p>
        <div class="action-row"><a class="btn-s" href="contentpublisher.html#case/${c.id}" target="_blank" rel="noopener">Buka di papan pemuka Publisher ↗</a><button class="btn-s btn-demo" data-act="sim-publish">Simulasi: Terbitkan & maklumkan pelapor</button></div>
        <p class="demo-note">Langkah ini dibuat di papan pemuka MCMC Content Publisher.</p>`;
    case "selesai":
      return `<h3>Kes selesai</h3><p>Semakan fakta telah diterbitkan dan pelapor telah dimaklumkan.</p>
        ${c.article ? `<div class="action-row"><a class="btn-s" href="../index.html#article/${esc(c.article)}" target="_blank" rel="noopener">Lihat semakan fakta di laman awam ↗</a></div>` : ""}`;
    case "digabung":
      return `<h3>Kes digabungkan</h3><p>Kes ini ialah pendua dan telah digabungkan dengan <a href="#case/${c.aiResult.of}" style="color:var(--brand)">${c.aiResult.of}</a>. Pelapor telah dimaklumkan.</p>`;
  }
  return "";
}

function bindActions(c) {
  const root = $("view-case");
  const act = (name, fn) => root.querySelectorAll(`[data-act="${name}"]`).forEach((b) => b.addEventListener("click", fn));
  const redraw = (msg) => { commit(msg); renderCase(c.id); };

  // baharu
  const checks = root.querySelectorAll(".vcheck");
  checks.forEach((ch) => ch.addEventListener("change", () => { root.querySelector('[data-act="verify"]').disabled = ![...checks].every((x) => x.checked); }));
  act("verify", () => { verifyCase(c, me); redraw("Kes ditandakan sebagai disahkan"); });

  // disahkan
  act("ai", (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    b.innerHTML = `<span class="spinner"></span> Menganalisis dakwaan…`;
    setTimeout(() => {
      const r = runDuplicateCheck(c);
      redraw(r.duplicate ? "AI mengesan kemungkinan pendua" : "Tiada pendua — sedia untuk klasifikasi");
    }, 1200);
  });
  act("merge", () => { mergeCase(c, me); redraw(`Kes digabungkan dengan ${c.aiResult.of}`); });
  act("override", () => { overrideDuplicate(c, me); redraw("Keputusan AI diketepikan"); });

  // klasifikasi
  const type = $("f-type");
  if (type) {
    const btn = root.querySelector('[data-act="classify"]');
    const domains = () => [...root.querySelectorAll('input[name="domain"]:checked')].map((i) => i.value);
    const check = () => (btn.disabled = !type.value || !domains().length);
    type.addEventListener("change", check);
    root.querySelectorAll('input[name="domain"]').forEach((i) => i.addEventListener("change", check));
    act("classify", () => { classifyCase(c, type.value, domains(), me); redraw("Klasifikasi disimpan"); });
  }

  // agihan
  const picked = () => [...root.querySelectorAll('input[name="agency"]:checked')].map((i) => i.value);
  const assignBtn = root.querySelector('[data-act="assign"]');
  if (assignBtn) {
    const label = () => { const n = picked().length; assignBtn.textContent = n ? `Agihkan kepada ${n} agensi` : "Pilih sekurang-kurangnya satu agensi"; assignBtn.disabled = !n; };
    root.querySelectorAll('input[name="agency"]').forEach((i) => i.addEventListener("change", label));
    label();
    act("assign", () => { const ids = picked(); assignAgencies(c, ids, +$("f-sla").value, $("f-note").value.trim(), me); redraw(`Diagihkan kepada ${ids.join(", ")}`); });
  }
  act("assign-more", () => {
    const ids = picked();
    if (!ids.length) return toast("Pilih sekurang-kurangnya satu agensi");
    assignAgencies(c, ids, c.slaHours || 72, "Agensi tambahan", me);
    redraw(`Agensi tambahan: ${ids.join(", ")}`);
  });
  root.querySelectorAll("[data-remind]").forEach((b) => b.addEventListener("click", () => { remindAgency(c, b.dataset.remind, me); redraw(`Peringatan dihantar kepada ${b.dataset.remind}`); }));
  root.querySelectorAll("[data-sim]").forEach((b) => b.addEventListener("click", () => {
    advanceAgency(c, b.dataset.sim);
    redraw(c.status === "semakan_kualiti" ? "Semua agensi meluluskan — draf sanggahan diterima" : `${b.dataset.sim} dikemas kini`);
  }));

  // semakan_kualiti
  act("approve", () => { approveRebuttal(c, me); redraw("Sanggahan diluluskan dan dihantar kepada Editor"); });
  act("show-return", () => { $("return-form").hidden = false; $("f-reason").focus(); });
  act("return", () => {
    const reason = $("f-reason").value.trim();
    if (!reason) { $("f-reason").focus(); return toast("Nyatakan sebab pindaan"); }
    returnForRevision(c, reason, me);
    redraw("Dipulangkan kepada agensi untuk pindaan");
  });

  // later stages (demo)
  act("sim-editor", () => { editorSignOff(c); redraw("Editor telah menyerahkan kepada Publisher"); });
  act("sim-publish", () => { publishCase(c); redraw("Diterbitkan — pelapor telah dimaklumkan"); });
}

/* ---------- Audit log ---------- */
const auditFilter = { q: "", role: "", action: "", period: "all" };

function auditTable(rows, compact) {
  return `<div class="table-wrap"><table class="adm-table"><thead><tr><th>Masa</th><th>Pengguna</th>${compact ? "" : "<th>Peranan</th>"}<th>Tindakan</th><th>Sasaran</th>${compact ? "" : "<th>Butiran</th><th>Alamat IP</th>"}</tr></thead>
    <tbody>${rows.length ? rows.map((a) => `<tr>
      <td style="white-space:nowrap">${fmtDT(a.at)}</td>
      <td>${esc(a.user)}${compact ? `<br><small class="kpi-delta">${esc(a.role)}</small>` : ""}</td>
      ${compact ? "" : `<td>${esc(a.role)}</td>`}
      <td><b>${esc(a.action)}</b>${compact && a.detail ? `<br><small class="kpi-delta">${esc(a.detail)}</small>` : ""}</td>
      <td>${/^SBN-/.test(a.target) ? `<a href="#case/${esc(a.target)}" class="mono" style="color:var(--brand)">${esc(a.target)}</a>` : esc(a.target)}</td>
      ${compact ? "" : `<td>${esc(a.detail)}</td><td class="mono">${esc(a.ip)}</td>`}</tr>`).join("") : `<tr><td colspan="7" class="empty-row">Tiada rekod.</td></tr>`}</tbody></table></div>`;
}

function filteredAudit() {
  const span = { "24h": 24 * HOUR, "7d": 7 * 24 * HOUR, "30d": 30 * 24 * HOUR }[auditFilter.period];
  const q = auditFilter.q.toLowerCase();
  return store.audit.filter((a) =>
    (!auditFilter.role || a.role.startsWith(auditFilter.role)) &&
    (!auditFilter.action || a.action === auditFilter.action) &&
    (!span || Date.now() - a.at <= span) &&
    (!q || `${a.user} ${a.target} ${a.detail} ${a.action}`.toLowerCase().includes(q)));
}

function renderAudit() {
  const actions = [...new Set(store.audit.map((a) => a.action))].sort();
  const roles = ["MCMC Admin", "MCMC Editor", "MCMC Content Publisher", "Agency Officer", "Agency Reviewer", "Sistem"];
  const rows = filteredAudit();
  $("view-audit").innerHTML = `
    <div class="filter-row">
      <input id="a-q" class="ctl" type="search" placeholder="Cari pengguna, kes atau butiran…" value="${esc(auditFilter.q)}" style="min-width:240px">
      <select id="a-role" class="ctl"><option value="">Semua peranan</option>${roles.map((r) => `<option ${r === auditFilter.role ? "selected" : ""}>${r}</option>`).join("")}</select>
      <select id="a-action" class="ctl"><option value="">Semua tindakan</option>${actions.map((r) => `<option ${r === auditFilter.action ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>
      <select id="a-period" class="ctl">${[["24h", "24 jam lalu"], ["7d", "7 hari lalu"], ["30d", "30 hari lalu"], ["all", "Semua masa"]].map(([v, l]) => `<option value="${v}" ${v === auditFilter.period ? "selected" : ""}>${l}</option>`).join("")}</select>
      <span class="spacer"></span>
      <span class="kpi-delta">${rows.length} rekod</span>
      <button class="btn-s" id="a-export">Eksport CSV</button>
    </div>
    <div class="card" style="padding:4px 8px">${auditTable(rows.slice(0, 300))}</div>
    <p class="demo-note">Log audit tidak boleh diubah atau dipadam. Setiap tindakan pengguna, perubahan status dan eksport direkodkan secara automatik.</p>`;
  const bind = (id, key, ev = "change") => $(id).addEventListener(ev, (e) => { auditFilter[key] = e.target.value; renderAudit(); if (key === "q") { $("a-q").focus(); $("a-q").setSelectionRange(99, 99); } });
  bind("a-q", "q", "input");
  bind("a-role", "role");
  bind("a-action", "action");
  bind("a-period", "period");
  $("a-export").addEventListener("click", () => exportReport("audit"));
}

/* ---------- Reports ---------- */
const REPORTS = [
  { id: "summary", title: "Ringkasan bulanan", desc: "KPI kes, masa penyelesaian dan pematuhan SLA",
    build: (mi) => ({ headers: ["Metrik", MONTHS[mi]], rows: [["Kes diterima", RECEIVED[mi]], ["Kes diselesaikan", RESOLVED[mi]], ["Purata masa penyelesaian (hari)", AVG_DAYS[mi]], ["Pematuhan SLA (%)", SLA_PCT[mi]], ["Pengguna aktif sambungan", EXT_MAU[mi]], ["Kadar klik sambungan (%)", EXT_CTR[mi]]] }) },
  { id: "agency", title: "Prestasi SLA agensi", desc: "Kes diagihkan, masa respons dan SLA setiap agensi",
    build: (mi) => ({ headers: ["Agensi", "Nama", "Kes", "Purata respons (jam)", "SLA (%)", "Status"], rows: agencyPerf(mi).map((p) => [p.id, p.name, p.cases, p.respH, p.sla, slaLevel(p.sla).label]) }) },
  { id: "cases", title: "Senarai kes semasa", desc: "Semua kes dalam sistem beserta peringkat dan agensi",
    build: () => ({ headers: ["ID", "Dakwaan", "Pelapor", "Platform", "Diterima", "Peringkat", "Agensi", "Keutamaan"], rows: store.cases.map((c) => [c.id, c.claim, c.reporter, c.platform, fmtDT(c.receivedAt), STAGE[c.status].label, c.assignments.map((a) => a.agency).join(" "), c.priority]) }) },
  { id: "extension", title: "Penglibatan sambungan pelayar", desc: "Pengguna aktif harian dan pemasangan",
    build: (mi) => { const e = extension(mi); return { headers: ["Hari", "Pengguna aktif"], rows: e.dau.map((v, d) => [`${d + 1} ${MONTHS[mi]}`, v]) }; } },
  { id: "heatmap", title: "Trend topik (peta haba)", desc: "Laporan mingguan mengikut topik",
    build: (mi) => { const h = heatmap(mi); return { headers: ["Topik", ...h.weeks], rows: TOPICS_HEAT.map((t, i) => [t, ...h.values[i]]) }; } },
  { id: "audit", title: "Log audit", desc: "Semua tindakan pengguna (mengikut penapis log audit)",
    build: () => ({ headers: ["Masa", "Pengguna", "Peranan", "Tindakan", "Sasaran", "Butiran", "IP"], rows: filteredAudit().map((a) => [fmtDT(a.at), a.user, a.role, a.action, a.target, a.detail, a.ip]) }) },
];
let reportPreview = "summary";

const reportItem = (r) => `<div class="report-item"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg></span>
  <div><b>${esc(r.title)}</b><small>${esc(r.desc)}</small></div><button class="btn-s btn-sm" data-export="${r.id}">CSV</button></div>`;

function bindReportButtons(root) {
  root.querySelectorAll("[data-export]").forEach((b) => b.addEventListener("click", () => exportReport(b.dataset.export)));
}

function exportReport(id) {
  const r = REPORTS.find((x) => x.id === id);
  const { headers, rows } = r.build(month);
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = "﻿" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `sebenarnya-${id}-${MONTHS[month].replace(" ", "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  audit(me, "Eksport laporan", `${r.title} · ${MONTHS[month]}`, "Format CSV");
  commit(`${r.title} dieksport (CSV)`);
}

function renderReports() {
  const r = REPORTS.find((x) => x.id === reportPreview);
  const { headers, rows } = r.build(month);
  $("view-reports").innerHTML = `
    <div class="filter-row">
      <label for="r-month">Tempoh</label>
      <select id="r-month" class="ctl">${MONTHS.map((m, i) => i >= 6 ? `<option value="${i}" ${i === month ? "selected" : ""}>${m}</option>` : "").join("")}</select>
      <span class="spacer"></span>
      <button class="btn-s" onclick="window.print()">Cetak pratonton / PDF</button>
    </div>
    <div class="dash-grid">
      <div class="card"><div class="card-head"><div><h2>Laporan</h2><p>Pilih untuk pratonton atau eksport</p></div></div>
        <div class="report-list">${REPORTS.map((x) => reportItem(x).replace('<div class="report-item">', `<div class="report-item" style="${x.id === reportPreview ? "border-color:var(--brand);background:var(--brand-tint)" : ""}">`).replace("<div><b>", `<div style="cursor:pointer" data-preview="${x.id}"><b>`)).join("")}</div></div>
      <div class="card span-2"><div class="card-head"><div><h2>${esc(r.title)}</h2><p>${esc(r.desc)} · ${MONTHS[month]} · ${rows.length} baris</p></div>
        <div class="card-tools"><button class="btn-p btn-sm" data-export="${r.id}">Muat turun CSV</button></div></div>
        ${tableHTML(headers, rows.slice(0, 100).map((row) => row.map((v) => esc(v))), headers.map((_, i) => i).filter((i) => rows.every((row) => typeof row[i] === "number")))}</div>
    </div>`;
  $("r-month").addEventListener("change", (e) => { month = +e.target.value; renderReports(); });
  $("view-reports").querySelectorAll("[data-preview]").forEach((d) => d.addEventListener("click", () => { reportPreview = d.dataset.preview; renderReports(); }));
  bindReportButtons($("view-reports"));
}

/* ---------- User management (users.js) ---------- */
const userFilter = { q: "", role: "", agency: "", status: "" };
const isMe = (u) => u.email.toLowerCase() === me.name.toLowerCase();

function updateUsersBadge() {
  $("nav-users").textContent = users.filter((u) => u.status !== "aktif").length || "";
}

function renderUsers() {
  loadUsers();
  const f = userFilter, q = f.q.trim().toLowerCase();
  const list = users.filter((u) => (!f.role || u.role === f.role) && (!f.agency || (f.agency === "MCMC" ? !u.agency : u.agency === f.agency))
    && (!f.status || u.status === f.status) && (!q || `${u.name} ${u.email} ${u.position} ${u.agency || ""}`.toLowerCase().includes(q)))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "aktif" ? -1 : 1) || (a.agency || "").localeCompare(b.agency || "") || a.name.localeCompare(b.name));
  const active = users.filter((u) => u.status === "aktif").length;
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;

  $("view-users").innerHTML = `
    <div class="kpis kpis-4 users-kpis">
      <div class="kpi"><div class="kpi-label">Jumlah akaun</div><div class="kpi-value">${users.length}</div><div class="kpi-delta">MCMC dan ${AGENCIES.length} agensi</div></div>
      <div class="kpi"><div class="kpi-label">Aktif</div><div class="kpi-value">${active}</div><div class="kpi-delta">boleh log masuk</div></div>
      <div class="kpi"><div class="kpi-label">Tidak aktif</div><div class="kpi-value">${users.length - active}</div><div class="kpi-delta">akses disekat</div></div>
      <div class="kpi"><div class="kpi-label">Kakitangan MCMC</div><div class="kpi-value">${users.filter((u) => !u.agency).length}</div><div class="kpi-delta">${users.filter((u) => u.agency).length} pengguna agensi</div></div>
    </div>

    <div class="tabs" role="tablist">${[["", "Semua"], ["aktif", "Aktif"], ["tidak_aktif", "Tidak aktif"]].map(([k, label]) =>
      `<button role="tab" data-ustatus="${k}" class="${k === f.status ? "on" : ""}">${label}<span class="count">${users.filter((u) => !k || u.status === k).length}</span></button>`).join("")}</div>

    <div class="filter-row">
      <input id="u-q" class="ctl" type="search" placeholder="Cari nama, e-mel atau jawatan…" value="${esc(f.q)}" style="min-width:240px" aria-label="Cari pengguna">
      <select id="u-role" class="ctl" aria-label="Peranan">${opt("", "Semua peranan", f.role)}${Object.entries(ROLES).map(([k, r]) => opt(k, r.label, f.role)).join("")}</select>
      <select id="u-agency" class="ctl" aria-label="Organisasi">${opt("", "Semua organisasi", f.agency)}${opt("MCMC", "MCMC", f.agency)}${AGENCIES.map((a) => opt(a.id, a.id, f.agency)).join("")}</select>
      <span class="spacer"></span>
      <a href="#user/new" class="btn-p">+ Tambah pengguna</a>
    </div>

    <div class="card" style="padding:4px 8px"><div class="table-wrap"><table class="adm-table">
      <thead><tr><th>Pengguna</th><th>Peranan</th><th>Organisasi</th><th>Status</th><th>Log masuk terakhir</th><th></th></tr></thead>
      <tbody>${list.length ? list.map((u) => `<tr class="clickable ${u.status === "aktif" ? "" : "row-off"}" data-user="${u.id}" tabindex="0">
        <td class="claim-cell"><b>${esc(u.name)}${isMe(u) ? ` <span class="chip-tag">Anda</span>` : ""}</b><small>${esc(u.email)}</small></td>
        <td>${esc(ROLES[u.role].label)}<small class="cell-sub">${esc(u.position || "")}</small></td>
        <td>${u.agency ? `<span class="chip-tag" title="${esc(AGENCY[u.agency].name)}">${u.agency}</span>` : `<span class="chip-tag">MCMC</span>`}</td>
        <td>${userStatusBadge(u)}${u.status !== "aktif" && u.statusNote ? `<small class="cell-sub">${esc(u.statusNote)}</small>` : ""}</td>
        <td title="${u.lastLogin ? fmtDT(u.lastLogin) : ""}">${u.lastLogin ? ago(u.lastLogin) : "Belum pernah"}</td>
        <td><div class="user-actions">
          <a href="#user/${u.id}" class="btn-g btn-sm">Edit</a>
          ${isMe(u) ? "" : `<button class="btn-sm ${u.status === "aktif" ? "btn-g" : "btn-s"}" data-toggle="${u.id}">${u.status === "aktif" ? "Nyahaktifkan" : "Aktifkan"}</button>`}
        </div></td></tr>`).join("") : `<tr><td colspan="6" class="empty-row">Tiada pengguna yang sepadan.</td></tr>`}</tbody>
    </table></div></div>
    <p class="demo-note">Akaun yang tidak aktif tidak boleh log masuk, dan sesi yang sedang dibuka akan dilog keluar serta-merta. Semua perubahan akaun direkodkan dalam log audit.</p>`;

  const root = $("view-users");
  root.querySelectorAll("[data-ustatus]").forEach((b) => b.addEventListener("click", () => { f.status = b.dataset.ustatus; renderUsers(); }));
  $("u-q").addEventListener("input", (e) => {
    f.q = e.target.value;
    const pos = e.target.selectionStart;
    renderUsers();
    $("u-q").focus();
    $("u-q").setSelectionRange(pos, pos);
  });
  $("u-role").addEventListener("change", (e) => { f.role = e.target.value; renderUsers(); });
  $("u-agency").addEventListener("change", (e) => { f.agency = e.target.value; renderUsers(); });
  root.querySelectorAll("[data-user]").forEach((tr) => {
    const open = () => (location.hash = `#user/${tr.dataset.user}`);
    tr.addEventListener("click", (e) => { if (!e.target.closest("a, button")) open(); });
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === tr) open(); });
  });
  root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const u = getUser(b.dataset.toggle), off = u.status === "aktif";
    if (off && !confirm(`Nyahaktifkan akaun ${u.name} (${u.email})?\n\nPengguna ini tidak akan dapat log masuk sehingga akaun diaktifkan semula.`)) return;
    setUserStatus(u, off ? "tidak_aktif" : "aktif", me, off ? "Dinyahaktifkan oleh MCMC Admin" : "");
    saveUsers();
    commit(off ? `Akaun ${u.name} dinyahaktifkan` : `Akaun ${u.name} diaktifkan`);
    updateUsersBadge();
    renderUsers();
  }));
}

function renderUser(id) {
  loadUsers();
  const isNew = id === "new";
  const u = isNew ? { name: "", email: "", phone: "", position: "", role: "agency-officer", agency: "KKM", status: "aktif", statusNote: "" } : getUser(id);
  if (!u) { $("view-user").innerHTML = `<div class="card">Pengguna ${esc(id)} tidak dijumpai. <a href="#users" class="btn-g">Kembali ke senarai pengguna</a></div>`; return; }
  const self = !isNew && isMe(u);
  $("page-title").textContent = isNew ? "Tambah pengguna" : u.name;
  const input = (fid, label, value, opts = "") => `<div><label class="lbl" for="${fid}">${label}</label><input id="${fid}" class="ctl" value="${esc(value || "")}" ${opts}></div>`;
  const activity = isNew ? [] : store.audit.filter((a) => a.user === u.email || a.target === u.email).slice(0, 8);

  $("view-user").innerHTML = `
    <a href="#users" class="back-link">← Semua pengguna</a>
    <form class="acct-grid" id="user-form" novalidate>
      <div style="display:grid;gap:18px;min-width:0">
        <div class="card">
          <div class="card-head"><div><h2>Maklumat pengguna</h2><p>${isNew ? "Akaun baharu boleh log masuk serta-merta jika aktif" : `ID ${u.id} · dicipta ${fmtDate(u.createdAt)}`}</p></div></div>
          <div class="form-row">
            ${input("u-name", "Nama penuh", u.name, "required")}
            ${input("u-email", "E-mel", u.email, 'type="email" required')}
          </div>
          <div class="form-row">
            ${input("u-phone", "No. telefon", u.phone, 'type="tel"')}
            ${input("u-position", "Jawatan", u.position)}
          </div>
          <div class="form-row">
            <div><label class="lbl" for="u-role-sel">Peranan</label>
              <select id="u-role-sel" class="ctl" ${self ? "disabled" : ""}>${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${k === u.role ? "selected" : ""}>${esc(r.label)}</option>`).join("")}</select></div>
            <div id="u-agency-wrap"><label class="lbl" for="u-agency-sel">Agensi</label>
              <select id="u-agency-sel" class="ctl">${AGENCIES.map((a) => `<option value="${a.id}" ${a.id === u.agency ? "selected" : ""}>${a.id} · ${esc(a.name)}</option>`).join("")}</select></div>
          </div>
          ${self ? `<p class="demo-note" style="margin:0">Anda tidak boleh menukar peranan atau status akaun anda sendiri.</p>` : ""}
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Status akaun</h2><p>Hanya akaun aktif boleh log masuk ke portal</p></div></div>
          <div class="mode-pick status-pick">
            <label><input type="radio" name="u-status" value="aktif" ${u.status === "aktif" ? "checked" : ""} ${self ? "disabled" : ""}><span><b>Aktif</b><small>Boleh log masuk dan menerima tugasan kes</small></span></label>
            <label><input type="radio" name="u-status" value="tidak_aktif" ${u.status !== "aktif" ? "checked" : ""} ${self ? "disabled" : ""}><span><b>Tidak aktif</b><small>Akses disekat; sejarah dan log audit dikekalkan</small></span></label>
          </div>
          <div class="form-row one" id="u-note-wrap" style="margin-top:12px">
            <div><label class="lbl" for="u-note">Sebab dinyahaktifkan</label>
              <input id="u-note" class="ctl" value="${esc(u.statusNote)}" placeholder="cth. Bertukar jabatan, bersara, cuti panjang"></div>
          </div>
        </div>

        <p class="field-err" id="u-err" hidden></p>
        <div class="action-row">
          <button class="btn-p" type="submit">${isNew ? "Cipta akaun" : "Simpan perubahan"}</button>
          <a href="#users" class="btn-g">Batal</a>
          ${isNew ? "" : `<span class="spacer" style="flex:1"></span><button class="btn-s" type="button" id="u-reset">Hantar pautan tetapan semula kata laluan</button>`}
        </div>
      </div>

      <div style="display:grid;gap:18px;align-content:start;min-width:0">
        ${isNew ? `<div class="card"><h2 class="sub-h" style="margin-top:0">Akaun baharu</h2><p class="muted-p">Pautan untuk menetapkan kata laluan akan dihantar ke e-mel pengguna selepas akaun dicipta.</p></div>` : `
        <div class="card acct-card">
          <span class="acct-avatar">${esc(u.name[0] || "?")}</span>
          <b class="acct-name">${esc(u.name)}</b>
          <span class="acct-mail">${esc(u.email)}</span>
          <dl class="facts acct-facts">
            <div><dt>Status</dt><dd>${userStatusBadge(u)}</dd></div>
            <div><dt>Peranan</dt><dd>${esc(roleLabel(u))}</dd></div>
            <div><dt>Log masuk terakhir</dt><dd>${fmtWhen(u.lastLogin)}</dd></div>
            <div><dt>Dikemas kini</dt><dd>${fmtWhen(u.updatedAt)}</dd></div>
          </dl>
        </div>
        <div class="card">
          <div class="card-head"><div><h2>Aktiviti terkini</h2><p>Daripada log audit</p></div></div>
          <ul class="timeline-list">${activity.length ? activity.map((a) => `<li><b>${esc(a.action)}</b><p>${esc(a.target)}${a.detail ? ` · ${esc(a.detail)}` : ""}</p><div class="who">${a.user === u.email ? "" : `${esc(a.user)} · `}${fmtDT(a.at)}</div></li>`).join("") : `<li><p>Tiada aktiviti direkodkan.</p></li>`}</ul>
        </div>`}
      </div>
    </form>`;

  const sync = () => {
    $("u-agency-wrap").hidden = !ROLES[$("u-role-sel").value].agency;
    $("u-note-wrap").hidden = document.querySelector('[name="u-status"]:checked').value === "aktif";
  };
  $("u-role-sel").addEventListener("change", sync);
  document.querySelectorAll('[name="u-status"]').forEach((r) => r.addEventListener("change", sync));
  sync();

  if ($("u-reset")) $("u-reset").addEventListener("click", () => {
    audit(me, "Tetapan semula kata laluan", u.email, "Pautan tetapan semula dihantar melalui e-mel");
    commit(`Pautan tetapan semula dihantar ke ${u.email}`);
  });

  $("user-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const role = $("u-role-sel").value;
    const data = {
      name: $("u-name").value.trim(), email: $("u-email").value.trim().toLowerCase(), phone: $("u-phone").value.trim(),
      position: $("u-position").value.trim(), role, agency: ROLES[role].agency ? $("u-agency-sel").value : null,
    };
    const status = document.querySelector('[name="u-status"]:checked').value;
    const note = $("u-note").value.trim();
    const taken = users.find((x) => x !== u && x.email.toLowerCase() === data.email);
    const err = !data.name ? "Nama penuh diperlukan."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? "Masukkan alamat e-mel yang sah."
      : taken ? `E-mel ini telah digunakan oleh ${taken.name}.`
      : emailDomainError(data.email, role, data.agency);
    $("u-err").textContent = err;
    $("u-err").hidden = !err;
    if (err) return;

    if (isNew) {
      const created = addUser({ ...data, status, statusNote: status === "aktif" ? "" : note }, me);
      saveUsers();
      commit(`Akaun ${created.name} dicipta`);
      updateUsersBadge();
      location.hash = `#user/${created.id}`;
      return;
    }
    const changed = updateUser(u, self ? { ...data, role: u.role, agency: u.agency } : data, me);
    const statusChanged = !self && setUserStatus(u, status, me, note);
    if (!statusChanged && u.status !== "aktif" && note !== u.statusNote) { u.statusNote = note; audit(me, "Kemas kini akaun", u.email, `Sebab tidak aktif: ${note || "—"}`); }
    saveUsers();
    // keep the session pointing at the renamed account
    if (self && data.email !== me.name) {
      me.name = data.email;
      try { localStorage.setItem("sbn-admin", JSON.stringify({ role: "mcmc-admin", email: me.name })); } catch (err) { }
      $("me-email").textContent = me.name;
    }
    commit(changed.length || statusChanged ? "Akaun pengguna dikemas kini" : "Tiada perubahan");
    updateUsersBadge();
    renderUser(id);
  });
}

/* ---------- Router ---------- */
const TITLES = { dashboard: "Papan pemuka", cases: "Kes", audit: "Log audit", reports: "Laporan", users: "Pengurusan pengguna", account: "Akaun saya" };

function route() {
  hideTip();
  const [view, id] = location.hash.slice(1).split("/");
  const v = (view === "case" || view === "user") && id ? view : TITLES[view] ? view : "dashboard";
  const parent = { case: "cases", user: "users" }[v] || v;
  document.querySelectorAll(".adm-view").forEach((s) => (s.hidden = s.dataset.view !== v));
  document.querySelectorAll(".adm-nav a").forEach((a) => a.classList.toggle("active", a.dataset.view === parent));
  $("crumb").textContent = v === "case" ? "Kes" : v === "user" ? "Pengurusan pengguna" : "MCMC Admin";
  $("page-title").textContent = TITLES[v] || "";
  if (v === "users") renderUsers();
  if (v === "user") renderUser(decodeURIComponent(id));
  if (v === "account") accountView(me, $("view-account"), me.roleId, null, () => route());
  if (v === "dashboard") renderDashboard();
  if (v === "cases") renderCases();
  if (v === "case") renderCase(decodeURIComponent(id));
  if (v === "audit") renderAudit();
  if (v === "reports") renderReports();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

$("global-q").addEventListener("input", () => {
  if (!location.hash.startsWith("#cases")) { caseTab = "all"; location.hash = "#cases"; }
  else renderCases();
});

$("logout").addEventListener("click", () => {
  audit(me, "Log keluar", "Portal pentadbir", "");
  saveStore();
  try { localStorage.removeItem("sbn-admin"); sessionStorage.removeItem("sbn-admin-session"); } catch (e) { }
  location.href = "../admin/adminlogin.html";
});
$("reset-demo").addEventListener("click", () => {
  if (!confirm("Tetapkan semula semua kes demo, akaun pengguna dan log audit kepada keadaan asal?")) return;
  resetStore();
  resetUsers();
  updateUsersBadge();
  commit("Demo ditetapkan semula");
  route();
});

// Keep in sync with other tabs (e.g. a claim submitted on the public site)
window.addEventListener("storage", (e) => {
  if (e.key === PUBLIC_KEY) { importPublicReports(); saveStore(); }
  else if (e.key === CASES_KEY) loadStore();
  else if (e.key === USERS_KEY) { loadUsers(); updateUsersBadge(); if (/^#(users|account)$/.test(location.hash)) route(); return; }
  else return;
  updateNavBadge();
  drawBell();
  route();
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!$("view-dashboard").hidden && dashDraws) Object.entries(dashDraws).forEach(([id, f]) => { if (!$(id).hidden) f(); }); }, 150);
});

saveStore();
updateNavBadge();
updateUsersBadge();
route();
