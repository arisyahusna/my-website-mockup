/* Agency Focal Officer portal (mockup): receive escalated cases, research, draft the official rebuttal,
   upload supporting documents and submit for multi-agency review. Workflow lives in ../cases.js. */

const AG = pickAgency();
const me = startSession("agency-officer", agencyOfficer(AG), ownsEmail(AG));
const drawBell = agencyShell(AG, `officer:${AG}`);

const byDue = (a, b) => assignmentOf(a, AG).due - assignmentOf(b, AG).due;
const active = () => agencyCases(AG).filter((c) => c.status === "semakan_agensi");
const LISTS = [
  ["lead", "Kes saya (peneraju)", () => active().filter((c) => leadOf(c) === AG).sort(byDue)],
  ["tagged", "Ditandakan", () => active().filter((c) => leadOf(c) !== AG).sort(byDue)],
  ["done", "Disahkan", () => agencyCases(AG).filter(pastAgencies).sort((a, b) => b.receivedAt - a.receivedAt)],
];
let listTab = "lead";

function commit(msg) {
  saveStore();
  const n = LISTS[0][2]().filter((c) => ["diterima", "pindaan"].includes(assignmentOf(c, AG).status)).length;
  $("nav-cases").textContent = n || "";
  drawBell();
  if (msg) toast(msg);
}

/* ---------- Case list ---------- */
function renderCases() {
  const lead = LISTS[0][2](), q = $("global-q").value.trim().toLowerCase();
  const count = (s) => lead.filter((c) => assignmentOf(c, AG).status === s).length;
  const atRisk = lead.filter((c) => slaState(assignmentOf(c, AG)).level !== "good").length;
  const list = LISTS.find((l) => l[0] === listTab)[2]().filter((c) => !q || `${c.id} ${c.claim}`.toLowerCase().includes(q));

  $("view-cases").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Kes baharu</div><div class="kpi-value">${count("diterima")}</div><div class="kpi-delta">belum dimulakan</div></div>
      <div class="kpi"><div class="kpi-label">Sedang disiasat</div><div class="kpi-value">${count("menyelidik")}</div><div class="kpi-delta">draf belum dihantar</div></div>
      <div class="kpi"><div class="kpi-label">Menunggu semakan</div><div class="kpi-value">${lead.filter((c) => ["draf", "diluluskan"].includes(assignmentOf(c, AG).status)).length}</div><div class="kpi-delta">oleh penyemak agensi</div></div>
      <div class="kpi"><div class="kpi-label">Perlu pindaan</div><div class="kpi-value">${count("pindaan")}</div><div class="kpi-delta">semak semula & hantar</div></div>
      <div class="kpi"><div class="kpi-label">SLA hampir / lewat</div><div class="kpi-value">${atRisk}</div><div class="kpi-delta">${atRisk ? `<span class="sla warning"><span class="ic" aria-hidden="true">!</span>Perlu perhatian</span>` : "Semua dalam tempoh"}</div></div>
    </div>
    <div class="tabs" style="margin-top:22px">${LISTS.map(([k, label, fn]) => `<button data-tab="${k}" class="${k === listTab ? "on" : ""}">${label}<span class="count">${fn().length}</span></button>`).join("")}</div>
    ${caseTable(list, [
      ["ID kes", (c) => `<span class="mono">${c.id}</span>`],
      ["Dakwaan", (c) => `<div class="claim-cell"><b>${esc(c.claim)}</b><small>${esc(c.platform)} · peneraju ${leadOf(c)} · ${c.assignments.map((a) => a.agency).join(", ")}</small></div>`],
      ["Status", (c) => agencyStatusBadge(c, assignmentOf(c, AG))],
      ["SLA", (c) => (pastAgencies(c) ? "—" : `${slaBadgeOf(assignmentOf(c, AG))}<br><small class="kpi-delta">${fmtDT(assignmentOf(c, AG).due)}</small>`)],
      ["Keutamaan", prioTag],
    ], listTab === "lead" ? "Tiada kes aktif untuk agensi anda." : "Tiada kes dalam senarai ini.")}
    <p class="demo-note">Anda log masuk sebagai pegawai ${AG}. Tukar agensi di bahagian atas untuk melihat kes agensi lain (demo).</p>`;
  $("view-cases").querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { listTab = b.dataset.tab; renderCases(); }));
  bindCaseRows($("view-cases"));
}

/* ---------- Case workspace ---------- */
const drafts = {}; // unsaved text per case
const STEPS = [["Terima kes", "notifikasi"], ["Siasat fakta", "sahkan"], ["Draf & dokumen", "sanggahan rasmi"], ["Semakan agensi", "pelbagai agensi"], ["Disahkan", "ke MCMC"]];
function stepIndex(c, a) {
  if (pastAgencies(c)) return 5;
  return { diterima: 0, menyelidik: 1, pindaan: 2, draf: 3, diluluskan: 3 }[a.status];
}
const TEMPLATE = (c) => `${AGENCY[leadOf(c)].name} ingin menjelaskan bahawa dakwaan "${c.claim}" adalah tidak benar.\n\n[Nyatakan fakta sebenar berdasarkan rekod rasmi agensi.]\n\nOrang ramai dinasihatkan supaya tidak menyebarkan maklumat yang belum disahkan dan merujuk saluran rasmi ${leadOf(c)} untuk maklumat terkini.`;

function renderCase(id) {
  const c = getCase(id), root = $("view-case");
  const a = c && assignmentOf(c, AG);
  if (!a) { root.innerHTML = `<div class="card">Kes ${esc(id)} tidak diagihkan kepada ${AG}. <a href="#cases" class="btn-g">Kembali</a></div>`; return; }
  $("page-title").textContent = c.id;
  ensureDraft(c);
  const isLead = leadOf(c) === AG;

  root.innerHTML = `
    <a href="#cases" class="back-link">← Senarai kes</a>
    ${caseHead(c)}
    <div class="card" style="margin-top:18px">${stepFlow(STEPS, stepIndex(c, a), pastAgencies(c))}</div>
    <div class="ws-grid">
      <div class="ws-col">
        ${!pastAgencies(c) ? slaCard(c, a, isLead) : ""}
        ${isLead ? leadPanel(c, a) : taggedPanel(c)}
      </div>
      <div class="ws-col">
        ${caseInfoCard(c, AG)}
        ${draftSubmitted(c) ? approvalsCard(c) : ""}
        ${!isLead || a.status === "draf" || a.status === "diluluskan" || pastAgencies(c) ? draftCard(c, "Draf dihantar") : ""}
        ${historyCard(c)}
      </div>
    </div>`;
  bindHistory(root, () => renderCase(id));
  bindCase(c, a);
}

function leadPanel(c, a) {
  if (pastAgencies(c)) {
    return `<div class="card action-panel"><h3>✓ Ditandakan sebagai disahkan</h3>
      <p>Semua agensi yang ditandakan telah meluluskan draf versi ${c.draft.version}. Kes telah dimajukan kepada MCMC Admin dan kini di peringkat <b>${esc(STAGE[c.status].label)}</b>.</p></div>`;
  }
  if (a.status === "diterima") {
    return `<div class="card action-panel"><h3>Kes baharu daripada MCMC</h3>
      <p>Agensi anda ialah <b>peneraju</b> bagi kes ini. Semak butiran kes, bukti dan arahan MCMC, kemudian mulakan siasatan. Agensi lain yang ditandakan (${c.assignments.filter((x) => x.agency !== AG).map((x) => x.agency).join(", ") || "tiada"}) akan menyemak draf anda.</p>
      <div class="check-list"><label><input type="checkbox" id="read-ok"> Saya telah membaca butiran kes, bukti dan arahan MCMC</label></div>
      <div class="action-row"><button class="btn-p" data-act="start" disabled>Terima kes & mula siasat</button></div></div>`;
  }
  if (a.status === "draf" || a.status === "diluluskan") {
    const ok = c.assignments.filter((x) => x.status === "diluluskan").length;
    return `<div class="card action-panel"><h3>Menunggu semakan pelbagai agensi</h3>
      <p>Draf versi ${c.draft.version} dihantar ${fmtDT(c.draft.submittedAt)}. ${ok} daripada ${c.assignments.length} penyemak agensi telah meluluskan. Anda akan dimaklumkan jika pindaan diminta.</p></div>`;
  }
  // menyelidik or pindaan: research + draft + documents
  const d = drafts[c.id] || (drafts[c.id] = { text: c.draft.text, notes: c.draft.notes });
  const requests = (c.reviews || []).filter((r) => r.decision === "pindaan" && r.version === c.draft.version);
  return `
    ${a.status === "pindaan" ? `<div class="note-box warn" style="margin:0"><span class="ic" aria-hidden="true">!</span><div><b>Pindaan diminta</b>
      ${requests.map((r) => `<p>${esc(r.agency)}: ${esc(r.comment)}</p>`).join("")}<small>Semak semula draf dan hantar versi ${c.draft.version + 1}.</small></div></div>` : ""}
    <div class="card">
      <div class="card-head"><div><h2>Siasat & sahkan fakta</h2><p>Catatan anda turut dilihat oleh penyemak agensi</p></div></div>
      <div class="form-row one" style="margin:0"><div><label class="lbl" for="f-notes">Nota penyelidikan & sumber semakan</label>
        <textarea id="f-notes" class="ctl" rows="3" placeholder="cth. Disemak dengan Bahagian Kawalan Penyakit; rekod rasmi bertarikh …">${esc(d.notes)}</textarea></div></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Draf kenyataan sanggahan rasmi</h2><p>Kenyataan ini akan menjadi asas semakan fakta yang diterbitkan</p></div>
        <div class="card-tools"><button class="btn-g btn-sm" data-act="template">Guna templat</button></div></div>
      <textarea id="f-text" class="ctl" rows="8" style="width:100%" placeholder="Tulis kenyataan rasmi agensi…">${esc(d.text)}</textarea>
      <small class="counter" id="text-count"></small>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Dokumen sokongan</h2><p>Kenyataan rasmi, laporan, data atau gambar yang menyokong sanggahan</p></div></div>
      ${docList(c.draft.docs, true)}
      <div class="action-row"><label class="btn-s" style="cursor:pointer">Muat naik dokumen<input type="file" id="f-docs" multiple hidden></label></div>
    </div>
    <div class="card action-panel">
      <h3>${a.status === "pindaan" ? "Hantar semula untuk semakan" : "Hantar untuk semakan pelbagai agensi"}</h3>
      <p>Penyemak daripada ${c.assignments.map((x) => x.agency).join(", ")} akan dimaklumkan melalui e-mel dan papan pemuka.</p>
      <div class="action-row">
        <button class="btn-p" data-act="submit">${a.status === "pindaan" ? `Hantar semula (versi ${c.draft.version + 1})` : "Hantar untuk semakan"}</button>
        <button class="btn-s" data-act="save">Simpan draf</button>
      </div>
      <p class="demo-note" id="missing"></p>
    </div>`;
}

function taggedPanel(c) {
  return `<div class="card action-panel"><h3>Agensi anda ditandakan</h3>
    <p>${leadOf(c)} ialah agensi peneraju dan menyediakan draf sanggahan. Penyemak ${AG} akan menilai draf tersebut di
    <a href="agencyreviewer.html#case/${c.id}" style="color:var(--brand)">papan pemuka Agency Reviewer</a>.
    Kongsikan maklumat berkaitan dengan pegawai ${leadOf(c)} jika perlu.</p></div>`;
}

function slaCard(c, a, isLead) {
  const s = slaState(a), near = s.level !== "good";
  const last = (c.escalations || []).slice(-1)[0];
  return `<div class="card">
    <div class="card-head"><div><h2>Tarikh akhir SLA</h2><p>${fmtDT(a.due)} · SLA ${c.slaHours} jam</p></div>${slaBadgeOf(a)}</div>
    ${near && isLead ? `<div class="note-box warn" style="margin:0 0 12px"><span class="ic" aria-hidden="true">!</span><div><b>Tarikh akhir SLA ${s.level === "critical" ? "telah terlepas" : "semakin hampir"}</b><p>Eskalasi segera kepada MCMC Admin jika maklumat tambahan atau lanjutan diperlukan.</p></div></div>` : ""}
    ${last ? `<p class="muted-p">Eskalasi terakhir: ${esc(last.reason)} · ${fmtDT(last.at)}</p>` : ""}
    ${isLead ? `<div id="esc-form" hidden style="margin-top:10px"><div class="form-row one" style="margin-bottom:8px"><div><label class="lbl" for="f-esc">Sebab eskalasi</label>
        <input id="f-esc" class="ctl" placeholder="cth. Menunggu data daripada pejabat negeri"></div></div>
        <button class="btn-d btn-sm" data-act="escalate">Hantar eskalasi</button></div>
      <div class="action-row" style="margin-top:10px"><button class="${near ? "btn-d" : "btn-s"} btn-sm" data-act="show-esc">${near ? "Eskalasi segera" : "Eskalasi kepada MCMC"}</button></div>` : ""}
  </div>`;
}

function bindCase(c, a) {
  const root = $("view-case");
  const act = (name, fn) => root.querySelectorAll(`[data-act="${name}"]`).forEach((b) => b.addEventListener("click", fn));
  const redraw = (msg) => { commit(msg); renderCase(c.id); };

  if ($("read-ok")) $("read-ok").addEventListener("change", (e) => (root.querySelector('[data-act="start"]').disabled = !e.target.checked));
  act("start", () => { officerStart(c, me); redraw("Kes diterima — siasatan dimulakan"); });

  // escalation
  act("show-esc", () => { $("esc-form").hidden = false; $("f-esc").focus(); });
  act("escalate", () => {
    const reason = $("f-esc").value.trim();
    if (!reason) { $("f-esc").focus(); return toast("Nyatakan sebab eskalasi"); }
    escalateCase(c, slaState(a).level !== "good", reason, me);
    redraw("Eskalasi dihantar kepada MCMC Admin");
  });

  // drafting
  if (!$("f-text")) return;
  const d = drafts[c.id];
  const refresh = () => {
    $("text-count").textContent = `${d.text.trim().length} aksara`;
    const m = [];
    if (d.text.trim().length < 60) m.push("kenyataan sekurang-kurangnya 60 aksara");
    if (!c.draft.docs.length) m.push("sekurang-kurangnya satu dokumen sokongan");
    root.querySelector('[data-act="submit"]').disabled = m.length > 0;
    $("missing").textContent = m.length ? `Lengkapkan dahulu: ${m.join(" · ")}` : "✓ Sedia untuk dihantar";
  };
  $("f-text").addEventListener("input", (e) => { d.text = e.target.value; refresh(); });
  $("f-notes").addEventListener("input", (e) => { d.notes = e.target.value; });
  act("template", () => {
    if (d.text.trim() && !confirm("Gantikan draf semasa dengan templat?")) return;
    d.text = TEMPLATE(c);
    $("f-text").value = d.text;
    refresh();
  });
  $("f-docs").addEventListener("change", (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    officerSaveDraftQuiet();
    files.forEach((f) => officerAddDoc(c, { name: f.name, size: f.size }, me));
    redraw(`${files.length} dokumen dimuat naik`);
  });
  root.querySelectorAll("[data-rmdoc]").forEach((b) => b.addEventListener("click", () => { officerSaveDraftQuiet(); officerRemoveDoc(c, b.dataset.rmdoc, me); redraw("Dokumen dibuang"); }));
  act("save", () => { officerSaveDraft(c, { text: d.text, notes: d.notes }, me); redraw("Draf disimpan"); });
  act("submit", () => {
    Object.assign(c.draft, { text: d.text.trim(), notes: d.notes.trim() });
    officerSubmit(c, me);
    delete drafts[c.id];
    redraw(`Draf versi ${c.draft.version} dihantar untuk semakan`);
  });
  // keep typed text when the page re-renders after an upload
  function officerSaveDraftQuiet() { Object.assign(c.draft, { text: d.text, notes: d.notes }); }
  refresh();
}

/* ---------- Router ---------- */
const TITLES = { cases: "Kes agensi", activity: "Log aktiviti" };
function route() {
  const [view, id] = location.hash.slice(1).split("/");
  const v = view === "case" && id ? "case" : TITLES[view] ? view : "cases";
  document.querySelectorAll(".adm-view").forEach((s) => (s.hidden = s.dataset.view !== v));
  document.querySelectorAll(".adm-nav a").forEach((x) => x.classList.toggle("active", x.dataset.view === (v === "case" ? "cases" : v)));
  $("crumb").textContent = v === "case" ? `Kes · ${AG}` : `Agency Officer · ${AG}`;
  $("page-title").textContent = TITLES[v] || "";
  if (v === "cases") renderCases();
  if (v === "case") renderCase(decodeURIComponent(id));
  if (v === "activity") activityView(me, $("view-activity"));
}
window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
$("global-q").addEventListener("input", () => { if (location.hash.startsWith("#case/") || location.hash === "#activity") location.hash = "#cases"; else renderCases(); });

bindShell(me, () => { commit(); route(); });
commit();
route();
