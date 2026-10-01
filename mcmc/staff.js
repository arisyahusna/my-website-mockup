/* Shared UI for the MCMC Editor and Content Publisher portals (mockup). Loaded after ../cases.js. */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDT = (t) => new Date(t).toLocaleString("ms-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
function ago(t) {
  const d = Date.now() - t, future = d < 0;
  const m = Math.round(Math.abs(d) / MIN);
  if (m < 1) return "baru sahaja";
  const h = Math.round(m / 60);
  const txt = m < 60 ? `${m} minit` : h < 24 ? `${h} jam` : `${Math.round(h / 24)} hari`;
  return future ? `dalam ${txt}` : `${txt} lalu`;
}

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- Badges ---------- */
function stageClass(k) {
  return { baharu: "st-new", semakan_agensi: "st-agency", editorial: "st-staff", penerbitan: "st-staff", selesai: "st-done", digabung: "st-closed" }[k] || "st-admin";
}
const stageBadge = (k) => `<span class="stage ${stageClass(k)}">${esc(STAGE[k].label)}</span>`;
const verdictBadge = (v) => `<span class="verdict v-${v}">${VERDICTS[v]}</span>`;
const prioTag = (c) => `<span class="prio ${esc(c.priority)}">${esc(c.priority)}</span>`;
const agencyTags = (c) => c.assignments.map((a) => `<span class="chip-tag">${a.agency}</span>`).join("") || "—";

/* ---------- Session ---------- */
// roleId matches adminlogin.html's data-role; fallback is the demo actor from cases.js;
// accept(email) can reject a login e-mail that does not belong here (e.g. another agency)
function startSession(roleId, fallback, accept = () => true) {
  loadStore();
  const me = { ...fallback };
  try {
    const s = JSON.parse(localStorage.getItem("sbn-admin"));
    if (s && s.email && s.role === roleId && accept(s.email)) me.name = s.email;
  } catch (e) { }
  // Deactivated accounts are signed out (users.js); otherwise make sure the account exists for "Akaun saya"
  me.roleId = roleId;
  me.agency = (me.role.match(/· (\S+)$/) || [])[1] || null;
  if (!guardActive(me.name)) throw new Error("Akaun tidak aktif");
  ensureUser(me, roleId, me.agency);
  try {
    if (!sessionStorage.getItem("sbn-admin-session")) {
      audit(me, "Log masuk", "Portal pentadbir", "Log masuk berjaya");
      sessionStorage.setItem("sbn-admin-session", "1");
    }
  } catch (e) { }
  saveStore();
  $("me-email").textContent = me.name;
  $("me-avatar").textContent = me.name[0].toUpperCase();
  return me;
}

// Logout, demo reset, cross-tab sync and the scheduled-publish timer
function bindShell(me, rerender) {
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
    saveStore();
    toast("Demo ditetapkan semula");
    rerender();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === CASES_KEY) loadStore();
    else if (e.key === PUBLIC_KEY) { importPublicReports(); saveStore(); }
    else return;
    rerender();
  });
  setInterval(() => {
    if (runScheduled()) { saveStore(); toast("Kandungan berjadual telah diterbitkan"); rerender(); }
  }, 15000);
}

/* ---------- Images ---------- */
const VERDICT_INK = { false: "#e63f7a", mislead: "#c57a12", true: "#0075c9" };

function wrapLines(text, max, limit) {
  const lines = [];
  let line = "";
  String(text).split(/\s+/).forEach((w) => {
    if ((line + " " + w).trim().length > max && line) { lines.push(line); line = w; }
    else line = (line + " " + w).trim();
  });
  if (line) lines.push(line);
  if (lines.length > limit) { lines.length = limit; lines[limit - 1] = lines[limit - 1].replace(/\s*\S*$/, "") + "…"; }
  return lines;
}

// Auto-generated share card (1.91:1, the size social networks use for link previews)
function cardSVG(c) {
  const ct = ensureContent(c), ink = VERDICT_INK[ct.verdict];
  const lines = wrapLines(ct.title, 38, 4);
  return `<svg viewBox="0 0 600 314" role="img" aria-label="Kad semakan fakta: ${esc(VERDICTS[ct.verdict])} — ${esc(ct.title)}" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="314" fill="#fff"/><rect width="600" height="314" fill="${ink}" opacity="0.06"/>
    <rect width="10" height="314" fill="${ink}"/>
    <text x="40" y="52" font-family="Poppins, sans-serif" font-size="14" font-weight="700" letter-spacing="2" fill="#4a4f5c">SEMAKAN FAKTA</text>
    <rect x="40" y="70" rx="6" width="${VERDICTS[ct.verdict].length * 15 + 34}" height="36" fill="${ink}"/>
    <text x="57" y="95" font-family="Poppins, sans-serif" font-size="19" font-weight="800" letter-spacing="1.5" fill="#fff">${esc(VERDICTS[ct.verdict].toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="40" y="${148 + i * 30}" font-family="Poppins, sans-serif" font-size="23" font-weight="800" fill="#111318">${esc(l)}</text>`).join("")}
    <line x1="40" x2="560" y1="272" y2="272" stroke="#e6e8ee"/>
    <text x="40" y="296" font-family="Poppins, sans-serif" font-size="13" font-weight="700" fill="#0075c9">sebenarnya.my</text>
    <text x="560" y="296" text-anchor="end" font-family="Poppins, sans-serif" font-size="12" fill="#8a8f9c">Tidak Pasti Jangan Kongsi · ${esc(c.id)}</text>
  </svg>`;
}

// Stand-in for the reporter's evidence file (no real files in the mockup)
function evidenceSVG(name) {
  return `<svg viewBox="0 0 600 314" role="img" aria-label="Bukti: ${esc(name)}" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line y2="12" stroke="#e6e8ee" stroke-width="4"/></pattern></defs>
    <rect width="600" height="314" fill="#f7f8fa"/><rect width="600" height="314" fill="url(#hatch)"/>
    <rect x="200" y="92" width="200" height="130" rx="14" fill="#fff" stroke="#e6e8ee"/>
    <path d="M285 128l-22 22a14 14 0 0020 20l28-28a9 9 0 00-13-13l-27 27a4 4 0 006 6l22-22" fill="none" stroke="#8a8f9c" stroke-width="4" stroke-linecap="round"/>
    <text x="300" y="196" text-anchor="middle" font-family="Poppins, sans-serif" font-size="13" font-weight="600" fill="#4a4f5c">${esc(name)}</text>
    <text x="300" y="250" text-anchor="middle" font-family="Poppins, sans-serif" font-size="12" fill="#8a8f9c">Bukti daripada pelapor</text>
  </svg>`;
}

function imageMedia(c, img) {
  if (img.kind === "upload") return `<img src="${img.src}" alt="${esc(img.caption || img.name)}">`;
  if (img.kind === "card") return cardSVG(c);
  return evidenceSVG(img.name);
}
const figureHTML = (c, img) => `<figure class="pv-fig">${imageMedia(c, img)}${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ""}</figure>`;

/* ---------- Article preview (how the fact-check will look on the public site) ---------- */
function articlePreview(c) {
  const ct = ensureContent(c);
  const [lead, ...rest] = ct.images;
  const paras = String(ct.body || "").split(/\n+/).filter(Boolean);
  return `<article class="pv">
    <div class="pv-meta">${esc(c.domains[0] || "Semakan fakta")} · ${esc(c.id)}</div>
    <h2 class="pv-title">${esc(ct.title || "Tajuk belum diisi")}</h2>
    <div class="verdict-box vb-${ct.verdict}">
      ${verdictBadge(ct.verdict)}
      <p><b>Dakwaan:</b> ${esc(c.claim)}</p>
      ${ct.summary ? `<p>${esc(ct.summary)}</p>` : `<p class="pv-empty">Ringkasan belum diisi.</p>`}
    </div>
    ${lead ? figureHTML(c, lead) : ""}
    <div class="pv-body">${paras.length ? paras.map((p) => `<p>${esc(p)}</p>`).join("") : `<p class="pv-empty">Kandungan belum diisi.</p>`}</div>
    ${rest.map((img) => figureHTML(c, img)).join("")}
    ${ct.refs.length ? `<h4>Sumber</h4><ul class="pv-refs">${ct.refs.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
  </article>`;
}

/* ---------- Case facts + history ---------- */
function caseHead(c) {
  const facts = [
    ["Pelapor", esc(c.reporter)], ["Dilihat di", esc(c.platform)], ["Diterima", `${fmtDT(c.receivedAt)}`],
    ["Jenis kes", typeBadge(c.type)], ["Domain", c.domains.map((d) => `<span class="chip-tag">${esc(d)}</span>`).join("") || "—"],
    ["Agensi", agencyTags(c)],
  ];
  return `<div class="card">
    <div class="case-head"><span class="mono">${c.id}</span>${stageBadge(c.status)}<span class="prio ${esc(c.priority)}">Keutamaan ${esc(c.priority).toLowerCase()}</span></div>
    <h2 class="case-title">${esc(c.claim)}</h2>
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
  </div>`;
}

function returnedBanner(c, fromLabel) {
  const r = returnedHere(c);
  if (!r) return "";
  return `<div class="note-box warn"><span class="ic" aria-hidden="true">!</span><div>
    <b>Dipulangkan oleh ${esc(fromLabel)}</b><p>${esc(r.reason)}</p><small>${esc(r.by)} · ${fmtDT(r.at)}</small></div></div>`;
}

let historyTab = "actions";
function historyCard(c) {
  return `<div class="card">
    <div class="tabs">
      <button data-htab="actions" class="${historyTab === "actions" ? "on" : ""}">Sejarah tindakan<span class="count">${c.actions.length}</span></button>
      <button data-htab="status" class="${historyTab === "status" ? "on" : ""}">Sejarah status<span class="count">${c.history.length}</span></button>
    </div>
    <ul class="timeline-list">${historyTab === "status"
      ? c.history.slice().reverse().map((h) => `<li><b>${h.from ? `${esc(STAGE[h.from].label)} → ` : ""}${esc(STAGE[h.to].label)}</b>${h.note ? `<p>${esc(h.note)}</p>` : ""}<div class="who">${esc(h.by)} · ${esc(h.role)} · ${fmtDT(h.at)}</div></li>`).join("")
      : c.actions.slice().reverse().map((a) => `<li><p style="color:var(--ink)">${esc(a.text)}</p><div class="who">${esc(a.by)} · ${esc(a.role)} · ${fmtDT(a.at)}</div></li>`).join("")}</ul>
  </div>`;
}
function bindHistory(root, rerender) {
  root.querySelectorAll("[data-htab]").forEach((b) => b.addEventListener("click", () => { historyTab = b.dataset.htab; rerender(); }));
}

/* ---------- Tables ---------- */
function caseTable(list, cols, empty) {
  return `<div class="card" style="padding:4px 8px"><div class="table-wrap"><table class="adm-table">
    <thead><tr>${cols.map((c) => `<th>${c[0]}</th>`).join("")}</tr></thead>
    <tbody>${list.length ? list.map((c) => `<tr class="clickable" data-case="${c.id}" tabindex="0">${cols.map((col) => `<td>${col[1](c)}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${cols.length}" class="empty-row">${empty}</td></tr>`}</tbody></table></div></div>`;
}
const claimCell = (c) => `<div class="claim-cell"><b>${esc(ensureContent(c).title || c.claim)}</b><small>${esc(c.claim)}</small></div>`;
function bindCaseRows(root) {
  root.querySelectorAll("[data-case]").forEach((tr) => {
    const open = () => (location.hash = `#case/${tr.dataset.case}`);
    tr.addEventListener("click", open);
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
  });
}

// Time a case spent in a stage (last entry → exit), for the KPI tiles
function stageDuration(c, stage) {
  let start = null, total = 0;
  c.history.forEach((h) => {
    if (h.to === stage) start = h.at;
    else if (start && h.from === stage) { total += h.at - start; start = null; }
  });
  return total;
}
const avgHours = (list, stage) => {
  const d = list.map((c) => stageDuration(c, stage)).filter(Boolean);
  return d.length ? (d.reduce((a, b) => a + b, 0) / d.length / HOUR).toFixed(1) : "—";
};

function activityView(me, el) {
  const rows = store.audit.filter((a) => a.user === me.name || a.role === me.role).slice(0, 200);
  el.innerHTML = `<div class="card" style="padding:4px 8px"><div class="table-wrap"><table class="adm-table">
    <thead><tr><th>Masa</th><th>Tindakan</th><th>Sasaran</th><th>Butiran</th><th>Alamat IP</th></tr></thead>
    <tbody>${rows.length ? rows.map((a) => `<tr><td style="white-space:nowrap">${fmtDT(a.at)}</td><td><b>${esc(a.action)}</b></td>
      <td>${/^SBN-/.test(a.target) ? `<a href="#case/${esc(a.target)}" class="mono" style="color:var(--brand)">${esc(a.target)}</a>` : esc(a.target)}</td>
      <td>${esc(a.detail)}</td><td class="mono">${esc(a.ip)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty-row">Tiada aktiviti.</td></tr>`}</tbody></table></div></div>
    <p class="demo-note">Semua tindakan anda direkodkan dalam log audit sistem dan boleh dilihat oleh MCMC Admin.</p>`;
}
