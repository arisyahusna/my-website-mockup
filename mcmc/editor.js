/* MCMC Editor portal (mockup): review the final content, add supporting images, sign off to the Content Publisher.
   Case data and workflow live in ../cases.js; shared UI in staff.js. */

const me = startSession("mcmc-editor", EDITOR);
const drawBell = bellInit("mcmc:editor");

const enteredAt = (c) => (c.history.filter((h) => h.to === "editorial").pop() || {}).at || c.receivedAt;
const signedAt = (c) => (c.history.filter((h) => h.from === "editorial" && h.to === "penerbitan").pop() || {}).at || 0;
const queue = () => store.cases.filter((c) => c.status === "editorial").sort((a, b) => (b.priority === "Tinggi") - (a.priority === "Tinggi") || enteredAt(a) - enteredAt(b));
const sentList = () => store.cases.filter(signedAt).sort((a, b) => signedAt(b) - signedAt(a));
const searchQ = () => $("global-q").value.trim().toLowerCase();
const matches = (c, q) => !q || `${c.id} ${c.claim} ${(c.content && c.content.title) || ""}`.toLowerCase().includes(q);

function draftState(c) {
  if (returnedHere(c)) return `<span class="sla warning"><span class="ic" aria-hidden="true">!</span>Dipulangkan</span>`;
  if (c.content && c.content.savedAt > enteredAt(c)) return `<span class="chip-tag">Draf disimpan</span>`;
  return `<span class="chip-tag">Belum disunting</span>`;
}

function commit(msg) {
  const saved = saveStore(); // on failure saveStore shows its own warning, so skip the success message
  drawBell();
  $("nav-queue").textContent = queue().length || "";
  if (msg && saved) toast(msg);
}

/* ---------- Queue ---------- */
function renderQueue() {
  const q = searchQ(), all = queue(), list = all.filter((c) => matches(c, q));
  const week = sentList().filter((c) => Date.now() - signedAt(c) < 7 * 24 * HOUR);
  $("view-queue").innerHTML = `
    <div class="kpis kpis-4">
      <div class="kpi"><div class="kpi-label">Menunggu semakan anda</div><div class="kpi-value">${all.length}</div><div class="kpi-delta">${all.filter((c) => c.priority === "Tinggi").length} keutamaan tinggi</div></div>
      <div class="kpi"><div class="kpi-label">Dipulangkan oleh Publisher</div><div class="kpi-value">${all.filter(returnedHere).length}</div><div class="kpi-delta">perlu dibetulkan</div></div>
      <div class="kpi"><div class="kpi-label">Diserahkan (7 hari)</div><div class="kpi-value">${week.length}</div><div class="kpi-delta">kepada Content Publisher</div></div>
      <div class="kpi"><div class="kpi-label">Purata masa semakan</div><div class="kpi-value">${avgHours(sentList(), "editorial")}<small>jam</small></div><div class="kpi-delta">dari terima hingga tandatangan</div></div>
    </div>

    <ol class="steps">
      <li><b>Semak kandungan akhir</b><span>Sanggahan telah diluluskan oleh agensi dan MCMC Admin</span></li>
      <li><b>Tambah imej sokongan</b><span>Kad semakan fakta, bukti atau imej anda sendiri</span></li>
      <li><b>Tandatangan & serahkan</b><span>Kandungan dihantar kepada Content Publisher</span></li>
    </ol>

    <div class="section-title"><h2>Baris gilir editorial</h2><span>${q ? `Carian “${esc(q)}” · ${list.length} keputusan` : "Keutamaan tinggi dan kes paling lama di atas"}</span></div>
    ${caseTable(list, [
      ["ID kes", (c) => `<span class="mono">${c.id}</span>`],
      ["Jenis kes", (c) => typeBadge(c.type)],
      ["Kandungan", claimCell],
      ["Keputusan", (c) => verdictBadge(ensureContent(c).verdict)],
      ["Agensi", agencyTags],
      ["Diterima", (c) => `<span title="${fmtDT(enteredAt(c))}">${ago(enteredAt(c))}</span>`],
      ["Status draf", draftState],
      ["Keutamaan", prioTag],
    ], "Tiada kes menunggu semakan editorial. 🎉")}`;
  bindCaseRows($("view-queue"));
}

/* ---------- Sent ---------- */
function renderSent() {
  const q = searchQ(), list = sentList().filter((c) => matches(c, q));
  $("view-sent").innerHTML = caseTable(list, [
    ["ID kes", (c) => `<span class="mono">${c.id}</span>`],
    ["Jenis kes", (c) => typeBadge(c.type)],
    ["Kandungan", claimCell],
    ["Keputusan", (c) => verdictBadge(ensureContent(c).verdict)],
    ["Diserahkan", (c) => fmtDT(signedAt(c))],
    ["Peringkat semasa", (c) => `${stageBadge(c.status)}${c.schedule ? `<br><small class="kpi-delta">Dijadualkan ${whenText(c.schedule.at)}</small>` : ""}${c.published ? `<br><small class="kpi-delta">Diterbitkan ${fmtDT(c.published.at)}</small>` : ""}`],
  ], "Belum ada kandungan yang diserahkan.");
  bindCaseRows($("view-sent"));
}

/* ---------- Case workspace ---------- */
const drafts = {}; // unsaved text edits per case
const checks = {}; // checklist ticks per case
const CHECKS = [
  "Format mengikut templat semakan fakta sebenarnya.my",
  "Bahasa jelas; tatabahasa dan ejaan telah disemak",
  "Tajuk, keputusan dan ringkasan sepadan dengan sanggahan agensi",
  "Sumber rujukan rasmi disertakan",
  "Setiap imej ada kapsyen dan tiada maklumat peribadi terdedah",
];
const TEXT_FIELDS = ["title", "verdict", "summary", "body", "refs"];

function getDraft(c) {
  const ct = ensureContent(c);
  if (!drafts[c.id]) drafts[c.id] = { title: ct.title, verdict: ct.verdict, summary: ct.summary, body: ct.body, refs: ct.refs.slice() };
  return drafts[c.id];
}
const isDirty = (c) => drafts[c.id] && TEXT_FIELDS.some((k) => JSON.stringify(drafts[c.id][k]) !== JSON.stringify(c.content[k]));
const withDraft = (c) => ({ ...c, content: { ...c.content, ...getDraft(c) } });

function missing(c) {
  const d = getDraft(c), m = [];
  if (!d.title.trim()) m.push("tajuk");
  if (!d.summary.trim()) m.push("ringkasan");
  if (!d.body.trim()) m.push("kandungan");
  if (c.content.images.some((i) => !i.caption.trim())) m.push("kapsyen imej");
  const left = CHECKS.length - (checks[c.id] || []).filter(Boolean).length;
  if (left) m.push(`${left} item senarai semak`);
  return m;
}

function renderCase(id) {
  const c = getCase(id);
  const root = $("view-case");
  if (!c) { root.innerHTML = `<div class="card">Kes ${esc(id)} tidak dijumpai. <a href="#queue" class="btn-g">Kembali</a></div>`; return; }
  $("page-title").textContent = c.id;
  const editable = c.status === "editorial";
  const r = returnedHere(c);

  root.innerHTML = `
    <a href="#${editable ? "queue" : "sent"}" class="back-link">← ${editable ? "Baris gilir" : "Telah diserahkan"}</a>
    ${r ? returnedBanner(c, r.role === "MCMC Content Publisher" ? "Content Publisher" : r.role) : ""}
    ${caseHead(c)}
    <div class="ws-grid">
      <div class="ws-col">${editable ? editorForms(c) : readOnlyPanel(c)}</div>
      <div class="ws-col">
        <div class="card">
          <div class="card-head"><div><h2>Pratonton</h2><p>Paparan di laman awam sebenarnya.my</p></div>
            ${editable ? `<span class="dirty" id="dirty" ${isDirty(c) ? "" : "hidden"}>● Belum disimpan</span>` : ""}</div>
          <div id="preview">${articlePreview(editable ? withDraft(c) : c)}</div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2>Sanggahan agensi (asal)</h2><p>Diluluskan oleh ${c.assignments.map((a) => a.agency).join(", ")} dan MCMC Admin</p></div>
            ${editable ? `<div class="card-tools"><button class="btn-g btn-sm" data-act="use-rebuttal">Salin ke kandungan</button></div>` : ""}</div>
          <div class="rebuttal">${esc(c.rebuttal || "—")}</div>
        </div>
        ${historyCard(c)}
      </div>
    </div>`;

  bindHistory(root, () => renderCase(id));
  if (editable) bindEditor(c);
}

function editorForms(c) {
  const d = getDraft(c), ck = checks[c.id] || [];
  const unusedEvidence = c.evidence.filter((f) => !c.content.images.some((i) => i.kind === "evidence" && i.name === f));
  const hasCard = c.content.images.some((i) => i.kind === "card");
  return `
    <div class="card">
      <div class="card-head"><div><h2>Kandungan akhir</h2><p>Semak format, kejelasan dan ketepatan</p></div></div>
      <div class="form-row one"><div><label class="lbl" for="f-title">Tajuk</label>
        <input id="f-title" class="ctl" maxlength="140" value="${esc(d.title)}"><small class="counter" data-for="f-title"></small></div></div>
      <label class="lbl-inline">Keputusan</label>
      <div class="pick" style="margin-bottom:12px">${Object.entries(VERDICTS).map(([k, l]) =>
        `<label><input type="radio" name="verdict" value="${k}" ${d.verdict === k ? "checked" : ""}> ${l}</label>`).join("")}</div>
      <div class="form-row one"><div><label class="lbl" for="f-summary">Ringkasan (dipaparkan dalam kotak keputusan)</label>
        <textarea id="f-summary" class="ctl" rows="3" maxlength="280">${esc(d.summary)}</textarea><small class="counter" data-for="f-summary"></small></div></div>
      <div class="form-row one"><div><label class="lbl" for="f-body">Kandungan penuh</label>
        <textarea id="f-body" class="ctl" rows="7">${esc(d.body)}</textarea></div></div>
      <div class="form-row one" style="margin-bottom:0"><div><label class="lbl" for="f-refs">Sumber rujukan (satu setiap baris)</label>
        <textarea id="f-refs" class="ctl" rows="3">${esc(d.refs.join("\n"))}</textarea></div></div>
    </div>

    <div class="card">
      <div class="card-head"><div><h2>Imej sokongan</h2><p>Imej pertama dipaparkan di bahagian atas artikel dan dalam hantaran media sosial</p></div></div>
      <div class="img-list">${c.content.images.length ? c.content.images.map((img, i) => `
        <div class="img-item">
          <div class="img-thumb">${imageMedia(withDraft(c), img)}</div>
          <div class="img-meta">
            <b>${esc(img.name)}</b><small>${{ card: "Kad dijana automatik", evidence: "Bukti pelapor", upload: "Dimuat naik" }[img.kind]}${i === 0 ? " · imej utama" : ""}</small>
            <input class="ctl" data-caption="${img.id}" placeholder="Kapsyen imej (wajib)" value="${esc(img.caption)}">
          </div>
          <button class="btn-g btn-sm" data-remove="${img.id}" aria-label="Buang ${esc(img.name)}">Buang</button>
        </div>`).join("") : `<p class="empty-row" style="padding:14px">Belum ada imej sokongan.</p>`}</div>
      <div class="action-row">
        <label class="btn-s" style="cursor:pointer">Muat naik imej<input type="file" id="f-upload" accept="image/*" hidden></label>
        <button class="btn-s" data-act="gen-card" ${hasCard ? "disabled title='Kad sudah ditambah'" : ""}>Jana kad semakan fakta</button>
        ${unusedEvidence.length ? `<select class="ctl" id="f-evidence"><option value="">Tambah daripada bukti pelapor…</option>${unusedEvidence.map((f) => `<option>${esc(f)}</option>`).join("")}</select>` : ""}
      </div>
    </div>

    <div class="card action-panel">
      <h3>Senarai semak & tandatangan</h3>
      <p>Tandatangan hanya jika kandungan sedia untuk diterbitkan. Kandungan akan dihantar kepada MCMC Content Publisher.</p>
      <div class="check-list">${CHECKS.map((t, i) => `<label><input type="checkbox" class="echeck" data-i="${i}" ${ck[i] ? "checked" : ""}> ${esc(t)}</label>`).join("")}</div>
      <div class="form-row one" style="margin:14px 0 0"><div><label class="lbl" for="f-note">Nota kepada Publisher (pilihan)</label>
        <input id="f-note" class="ctl" placeholder="cth. Keutamaan tinggi — terbitkan segera"></div></div>
      <div class="action-row">
        <button class="btn-p" data-act="signoff">Tandatangan & serahkan kepada Publisher</button>
        <button class="btn-s" data-act="save">Simpan draf</button>
        <button class="btn-d" data-act="show-return">Pulangkan kepada MCMC Admin</button>
      </div>
      <p class="demo-note" id="missing"></p>
      <div id="return-form" hidden style="margin-top:12px"><div class="form-row one"><div><label class="lbl" for="f-reason">Sebab dipulangkan</label>
        <textarea id="f-reason" class="ctl" rows="3" placeholder="cth. Kenyataan agensi bercanggah dengan data rasmi terkini"></textarea></div></div>
        <button class="btn-d" data-act="return">Pulangkan untuk semakan kualiti</button></div>
    </div>`;
}

function readOnlyPanel(c) {
  const s = c.signoff;
  let body;
  if (c.status === "penerbitan") {
    body = `<h3>Diserahkan kepada Content Publisher</h3>
      <p>${s ? `Ditandatangani oleh ${esc(s.by)} pada ${fmtDT(s.at)}.` : ""} ${c.schedule ? `Publisher telah menjadualkan penerbitan pada <b>${whenText(c.schedule.at)}</b>.` : "Menunggu Publisher menerbitkan atau menjadualkan."}</p>
      ${s && s.note ? `<div class="rebuttal">Nota anda: ${esc(s.note)}</div>` : ""}`;
  } else if (c.status === "selesai") {
    body = `<h3>Telah diterbitkan</h3><p>Diterbitkan pada ${fmtDT(c.published ? c.published.at : Date.now())}${c.published ? ` di ${esc(channelNames(c.published.channels))}` : ""}.</p>
      ${c.article ? `<div class="action-row"><a class="btn-s" href="../index.html#article/${esc(c.article)}" target="_blank" rel="noopener">Lihat di laman awam ↗</a></div>` : ""}`;
  } else {
    body = `<h3>Bukan di peringkat editorial</h3><p>Kes ini kini di peringkat <b>${esc(STAGE[c.status].label)}</b> (pemilik: ${esc(STAGE[c.status].owner)}).</p>`;
  }
  return `<div class="card action-panel">${body}</div>`;
}

function bindEditor(c) {
  const root = $("view-case");
  const d = getDraft(c);
  const act = (name, fn) => root.querySelectorAll(`[data-act="${name}"]`).forEach((b) => b.addEventListener("click", fn));
  const redraw = (msg) => { commit(msg); renderCase(c.id); };

  const refresh = () => {
    $("preview").innerHTML = articlePreview(withDraft(c));
    $("dirty").hidden = !isDirty(c);
    root.querySelectorAll(".counter").forEach((el) => { const i = $(el.dataset.for); el.textContent = `${i.value.length}/${i.maxLength}`; });
    const m = missing(c);
    root.querySelector('[data-act="signoff"]').disabled = m.length > 0;
    $("missing").textContent = m.length ? `Lengkapkan dahulu: ${m.join(" · ")}` : "✓ Sedia untuk ditandatangani";
  };

  $("f-title").addEventListener("input", (e) => { d.title = e.target.value; refresh(); });
  $("f-summary").addEventListener("input", (e) => { d.summary = e.target.value; refresh(); });
  $("f-body").addEventListener("input", (e) => { d.body = e.target.value; refresh(); });
  $("f-refs").addEventListener("input", (e) => { d.refs = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean); refresh(); });
  root.querySelectorAll('input[name="verdict"]').forEach((i) => i.addEventListener("change", () => { d.verdict = i.value; refresh(); }));
  root.querySelectorAll(".echeck").forEach((i) => i.addEventListener("change", () => { (checks[c.id] = checks[c.id] || [])[+i.dataset.i] = i.checked; refresh(); }));

  // images
  root.querySelectorAll("[data-caption]").forEach((i) => {
    i.addEventListener("input", () => { c.content.images.find((x) => x.id === i.dataset.caption).caption = i.value; refresh(); });
    i.addEventListener("change", () => saveStore());
  });
  root.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => { removeImage(c, b.dataset.remove, me); redraw("Imej dibuang"); }));
  act("gen-card", () => { addImage(c, { kind: "card", name: "kad-semakan-fakta.png", caption: "Kad semakan fakta untuk dikongsi" }, me); redraw("Kad semakan fakta dijana"); });
  if ($("f-evidence")) $("f-evidence").addEventListener("change", (e) => {
    if (!e.target.value) return;
    addImage(c, { kind: "evidence", name: e.target.value, caption: "" }, me);
    redraw("Bukti ditambah — sila isi kapsyen");
  });
  $("f-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    shrinkImage(file, (src) => {
      if (!src) return toast("Imej tidak dapat dibaca");
      addImage(c, { kind: "upload", name: file.name, caption: "", src }, me);
      redraw("Imej dimuat naik — sila isi kapsyen");
    });
  });

  act("use-rebuttal", () => { d.body = c.rebuttal; $("f-body").value = c.rebuttal; refresh(); toast("Sanggahan agensi disalin ke kandungan"); });
  act("save", () => { saveDraft(c, getDraft(c), me); delete drafts[c.id]; redraw("Draf disimpan"); });
  act("signoff", () => {
    if (isDirty(c)) saveDraft(c, getDraft(c), me);
    editorSignOff(c, me, $("f-note").value.trim());
    delete drafts[c.id];
    delete checks[c.id];
    redraw("Ditandatangani dan diserahkan kepada Content Publisher");
  });
  act("show-return", () => { $("return-form").hidden = false; $("f-reason").focus(); });
  act("return", () => {
    const reason = $("f-reason").value.trim();
    if (!reason) { $("f-reason").focus(); return toast("Nyatakan sebab dipulangkan"); }
    editorReturn(c, reason, me);
    delete drafts[c.id];
    redraw("Dipulangkan kepada MCMC Admin");
  });
  refresh();
}

// Downscale uploads so they fit in localStorage (the mockup's "database")
function shrinkImage(file, done) {
  const reader = new FileReader();
  reader.onload = () => {
    const im = new Image();
    im.onload = () => {
      const scale = Math.min(1, 800 / im.width);
      const cv = document.createElement("canvas");
      cv.width = Math.round(im.width * scale);
      cv.height = Math.round(im.height * scale);
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      done(cv.toDataURL("image/jpeg", 0.8));
    };
    im.onerror = () => done(null);
    im.src = reader.result;
  };
  reader.onerror = () => done(null);
  reader.readAsDataURL(file);
}

/* ---------- Router ---------- */
const TITLES = { queue: "Baris gilir editorial", sent: "Telah diserahkan", activity: "Log aktiviti", account: "Akaun saya" };

function route() {
  const [view, id] = location.hash.slice(1).split("/");
  const v = view === "case" && id ? "case" : TITLES[view] ? view : "queue";
  document.querySelectorAll(".adm-view").forEach((s) => (s.hidden = s.dataset.view !== v));
  document.querySelectorAll(".adm-nav a").forEach((a) => a.classList.toggle("active", a.dataset.view === v));
  $("crumb").textContent = v === "case" ? "Semakan editorial" : "MCMC Editor";
  $("page-title").textContent = TITLES[v] || "";
  if (v === "queue") renderQueue();
  if (v === "sent") renderSent();
  if (v === "case") renderCase(decodeURIComponent(id));
  if (v === "activity") activityView(me, $("view-activity"));
  if (v === "account") accountView(me, $("view-account"), me.roleId, me.agency);
}
window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });

$("global-q").addEventListener("input", () => {
  if (location.hash === "#sent") renderSent();
  else if (location.hash !== "#queue" && location.hash !== "") location.hash = "#queue";
  else renderQueue();
});

bindShell(me, () => { commit(); route(); });
commit();
route();
