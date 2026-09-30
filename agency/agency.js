/* Shared by agency/agencyofficer.html and agency/agencyreviewer.html (mockup).
   Loaded after ../cases.js and ../mcmc/staff.js. */

// The user's agency: the demo switcher, else their login e-mail domain (e.g. nama@kkm.gov.my), else KKM
function pickAgency() {
  let email = "", saved = "";
  try {
    email = ((JSON.parse(localStorage.getItem("sbn-admin")) || {}).email || "").toLowerCase();
    saved = localStorage.getItem("sbn-agency") || "";
  } catch (e) { }
  if (AGENCY[saved]) return saved;
  const byEmail = AGENCIES.find((a) => email.endsWith(`@${a.id.toLowerCase()}.gov.my`));
  return byEmail ? byEmail.id : "KKM";
}
const ownsEmail = (ag) => (email) => email.toLowerCase().endsWith(`@${ag.toLowerCase()}.gov.my`);

/* ---------- Shell: agency switcher + notification bell ---------- */
function agencyShell(ag, noticeKey) {
  $("brand-agency").textContent = `${ag} · ${AGENCY[ag].name}`;
  const sw = $("agency-switch");
  sw.innerHTML = AGENCIES.map((a) => `<option value="${a.id}" ${a.id === ag ? "selected" : ""}>${a.id}</option>`).join("");
  sw.addEventListener("change", () => {
    try { localStorage.setItem("sbn-agency", sw.value); } catch (e) { }
    location.reload();
  });
  return bellInit(noticeKey);
}

function bellInit(key) {
  const btn = $("bell"), panel = $("bell-panel");
  const mine = () => store.notices.filter((n) => n.to === key);
  const draw = () => {
    const list = mine(), unread = list.filter((n) => !n.read).length;
    $("bell-count").textContent = unread || "";
    btn.setAttribute("aria-label", `Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`);
    if (panel.hidden) return;
    panel.innerHTML = `<div class="bell-head"><b>Notifikasi</b>${unread ? `<button class="btn-g btn-sm" id="bell-all">Tandakan semua dibaca</button>` : ""}</div>
      <div class="bell-list">${list.length ? list.slice(0, 20).map((n) => `
        <button class="bell-item ${n.read ? "" : "unread"}" data-n="${n.id}"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><small>${ago(n.at)} · turut dihantar melalui e-mel</small></button>`).join("")
        : `<p class="empty-row">Tiada notifikasi.</p>`}</div>`;
    panel.querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => {
      const n = store.notices.find((x) => x.id === +b.dataset.n);
      n.read = true;
      saveStore();
      panel.hidden = true;
      draw();
      location.hash = `#case/${n.caseId}`;
    }));
    if ($("bell-all")) $("bell-all").addEventListener("click", () => { mine().forEach((n) => (n.read = true)); saveStore(); draw(); });
  };
  btn.addEventListener("click", () => { panel.hidden = !panel.hidden; draw(); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".bell-wrap")) panel.hidden = true; });
  draw();
  return draw;
}

/* ---------- Case pieces ---------- */
const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const agencyCases = (ag) => store.cases.filter((c) => assignmentOf(c, ag));
const pastAgencies = (c) => STAGE[c.status].step > STAGE.semakan_agensi.step && c.status !== "digabung";

// What an assignment's status means to the person looking at it
function agencyStatusText(c, a) {
  if (pastAgencies(c)) return "Disahkan";
  if (a.agency !== leadOf(c) && ["diterima", "menyelidik"].includes(a.status)) return "Menunggu draf peneraju";
  return AGENCY_STATUS[a.status];
}
function agencyStatusBadge(c, a) {
  const t = agencyStatusText(c, a);
  const level = t === "Disahkan" || a.status === "diluluskan" ? "good" : a.status === "pindaan" ? "warning" : null;
  return level ? `<span class="sla ${level}"><span class="ic" aria-hidden="true">${level === "good" ? "✓" : "!"}</span>${esc(t)}</span>` : `<span class="chip-tag">${esc(t)}</span>`;
}
const slaBadgeOf = (a) => { const s = slaState(a); return `<span class="sla ${s.level}"><span class="ic" aria-hidden="true">${s.level === "good" ? "✓" : "!"}</span>${esc(s.label)}</span>`; };

// Horizontal step tracker (reuses the admin .flow styles)
function stepFlow(labels, current, allDone) {
  return `<ol class="flow" style="grid-template-columns:repeat(${labels.length}, minmax(66px, 1fr))">${labels.map(([l, s], i) =>
    `<li class="${allDone || i < current ? "done" : i === current ? "now" : ""}">${esc(l)}<small>${esc(s)}</small></li>`).join("")}</ol>`;
}

// "All tagged agencies approved?" — one row per agency with its latest review
function approvalsCard(c) {
  const v = c.draft ? c.draft.version : 0;
  const ok = c.assignments.filter((a) => a.status === "diluluskan").length;
  const all = pastAgencies(c) || ok === c.assignments.length;
  return `<div class="card">
    <div class="card-head"><div><h2>Kelulusan agensi</h2><p>${all ? "Semua agensi yang ditandakan telah meluluskan" : `${ok} daripada ${c.assignments.length} agensi meluluskan${v ? ` versi ${v}` : ""}`}</p></div></div>
    <ul class="approvals">${c.assignments.map((a) => {
      const r = (c.reviews || []).filter((x) => x.agency === a.agency).slice(-1)[0];
      return `<li><div><b>${a.agency}</b>${a.agency === leadOf(c) ? ` <span class="chip-tag">Peneraju</span>` : ""}<small>${esc(AGENCY[a.agency].name)}</small>
        ${r && r.comment ? `<p class="review-note ${r.decision}">“${esc(r.comment)}” <span>— ${esc(r.by)}, versi ${r.version}</span></p>` : ""}</div>
        ${agencyStatusBadge(c, a)}</li>`;
    }).join("")}</ul>
    ${(c.reviews || []).some((r) => r.agency === "MCMC" && r.version === v) ? `<p class="review-note pindaan" style="margin-top:10px">MCMC: “${esc(c.reviews.filter((r) => r.agency === "MCMC").slice(-1)[0].comment)}”</p>` : ""}
  </div>`;
}

// The lead agency's submitted draft, as reviewers see it
function draftCard(c, title) {
  const d = c.draft;
  if (!draftSubmitted(c)) return `<div class="card"><div class="card-head"><div><h2>${title}</h2><p>Belum dihantar oleh ${leadOf(c)}</p></div></div><p class="empty-row">Tiada draf lagi.</p></div>`;
  return `<div class="card">
    <div class="card-head"><div><h2>${title}</h2><p>${leadOf(c)} · versi ${d.version} · dihantar ${fmtDT(d.submittedAt)}</p></div></div>
    <div class="rebuttal">${esc(d.text)}</div>
    ${d.notes ? `<h4 class="sub-h">Nota penyelidikan</h4><p class="muted-p">${esc(d.notes)}</p>` : ""}
    <h4 class="sub-h">Dokumen sokongan (${d.docs.length})</h4>
    ${docList(d.docs, false)}
  </div>`;
}
function docList(docs, removable) {
  if (!docs.length) return `<p class="muted-p">Tiada dokumen.</p>`;
  return `<ul class="doc-list">${docs.map((f) => `<li><span class="doc-ic" aria-hidden="true">${/\.pdf$/i.test(f.name) ? "PDF" : /\.(png|jpe?g|webp)$/i.test(f.name) ? "IMG" : "DOC"}</span>
    <div><b>${esc(f.name)}</b><small>${fmtSize(f.size)}</small></div>${removable ? `<button class="btn-g btn-sm" data-rmdoc="${esc(f.name)}">Buang</button>` : ""}</li>`).join("")}</ul>`;
}

function caseInfoCard(c, ag) {
  const a = assignmentOf(c, ag);
  return `<div class="card">
    <div class="card-head"><div><h2>Arahan MCMC</h2><p>Diagihkan ${fmtDT(a.assignedAt)} · SLA ${c.slaHours} jam</p></div></div>
    ${a.note ? `<div class="rebuttal">${esc(a.note)}</div>` : `<p class="muted-p">Tiada nota tambahan.</p>`}
    <h4 class="sub-h">Bukti daripada pelapor</h4>
    ${c.evidence.length ? `<div class="evidence">${c.evidence.map((f) => `<span>📎 ${esc(f)}</span>`).join("")}</div>` : `<p class="muted-p">Tiada bukti dilampirkan.</p>`}
    ${c.link ? `<h4 class="sub-h">Pautan</h4><p class="muted-p" style="overflow-wrap:anywhere">${esc(c.link)}</p>` : ""}
  </div>`;
}
