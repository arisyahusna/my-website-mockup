/* MCMC Content Publisher portal (mockup): publish fully approved content now or on a schedule, and notify the reporter.
   Case data and workflow live in ../cases.js; shared UI in staff.js. */

const me = startSession("mcmc-publisher", PUBLISHER);
const drawBell = bellInit("mcmc:publisher");

const signedAt = (c) => (c.signoff && c.signoff.at) || (c.history.filter((h) => h.to === "penerbitan").pop() || {}).at || 0;
const ready = () => store.cases.filter((c) => c.status === "penerbitan" && !c.schedule).sort((a, b) => (b.priority === "Tinggi") - (a.priority === "Tinggi") || signedAt(a) - signedAt(b));
const scheduled = () => store.cases.filter((c) => c.status === "penerbitan" && c.schedule).sort((a, b) => a.schedule.at - b.schedule.at);
const published = () => store.cases.filter((c) => c.status === "selesai" && c.published).sort((a, b) => b.published.at - a.published.at);
const searchQ = () => $("global-q").value.trim().toLowerCase();
const matches = (c, q) => !q || `${c.id} ${c.claim} ${(c.content && c.content.title) || ""}`.toLowerCase().includes(q);
const SHORT = { web: "Web", facebook: "FB", x: "X", instagram: "IG", telegram: "Telegram", whatsapp: "WhatsApp" };
const channelTags = (ids) => ids.length === CHANNELS.length
  ? `<span class="chip-tag" title="${esc(channelNames(ids))}">Semua saluran (${ids.length})</span>`
  : ids.map((id) => `<span class="chip-tag" title="${esc(CHANNEL[id].label)}">${SHORT[id]}</span>`).join("");

function commit(msg) {
  saveStore();
  drawBell();
  $("nav-ready").textContent = ready().length || "";
  $("nav-scheduled").textContent = scheduled().length || "";
  if (msg) toast(msg);
}

/* ---------- Lists ---------- */
function kpis() {
  const s = scheduled(), p = published(), week = p.filter((c) => Date.now() - c.published.at < 7 * 24 * HOUR);
  const unnotified = p.filter((c) => !c.published.notifiedAt).length;
  return `<div class="kpis kpis-4">
    <div class="kpi"><div class="kpi-label">Sedia diterbitkan</div><div class="kpi-value">${ready().length}</div><div class="kpi-delta">ditandatangani oleh Editor</div></div>
    <div class="kpi"><div class="kpi-label">Dijadualkan</div><div class="kpi-value">${s.length}</div><div class="kpi-delta">${s.length ? `seterusnya ${ago(s[0].schedule.at)}` : "tiada jadual"}</div></div>
    <div class="kpi"><div class="kpi-label">Diterbitkan (7 hari)</div><div class="kpi-value">${week.length}</div><div class="kpi-delta">semua saluran</div></div>
    <div class="kpi"><div class="kpi-label">Pelapor belum dimaklumkan</div><div class="kpi-value">${unnotified}</div><div class="kpi-delta">${unnotified ? slaBadgeLite("warning", "Perlu tindakan") : slaBadgeLite("good", "Semua dimaklumkan")}</div></div>
  </div>`;
}
const slaBadgeLite = (level, label) => `<span class="sla ${level}"><span class="ic" aria-hidden="true">${level === "good" ? "✓" : "!"}</span>${esc(label)}</span>`;

function renderReady() {
  const q = searchQ(), list = ready().filter((c) => matches(c, q));
  $("view-ready").innerHTML = `${kpis()}
    <div class="section-title"><h2>Sedia diterbitkan</h2><span>${q ? `Carian “${esc(q)}” · ${list.length} keputusan` : "Kandungan yang telah diluluskan sepenuhnya oleh agensi, MCMC Admin dan Editor"}</span></div>
    ${caseTable(list, [
      ["ID kes", (c) => `<span class="mono">${c.id}</span>`],
      ["Jenis kes", (c) => typeBadge(c.type)],
      ["Kandungan", claimCell],
      ["Keputusan", (c) => verdictBadge(c.content.verdict)],
      ["Ditandatangani", (c) => `${fmtDT(signedAt(c))}<br><small class="kpi-delta">${esc(c.signoff ? c.signoff.by : "")}</small>`],
      ["Nota editor", (c) => `<small>${esc((c.signoff && c.signoff.note) || "—")}</small>`],
      ["Keutamaan", prioTag],
    ], "Tiada kandungan menunggu untuk diterbitkan.")}`;
  bindCaseRows($("view-ready"));
}

function renderScheduled() {
  const q = searchQ(), list = scheduled().filter((c) => matches(c, q));
  $("view-scheduled").innerHTML = caseTable(list, [
    ["ID kes", (c) => `<span class="mono">${c.id}</span>`],
    ["Jenis kes", (c) => typeBadge(c.type)],
    ["Kandungan", claimCell],
    ["Jadual", (c) => `<b style="white-space:nowrap">${whenText(c.schedule.at)}</b><br><small class="kpi-delta">${ago(c.schedule.at)}</small>`],
    ["Saluran", (c) => channelTags(c.schedule.channels)],
    ["Maklumkan pelapor", (c) => (c.schedule.notify ? "Ya, automatik" : "Tidak")],
  ], "Tiada penerbitan berjadual.") + `<p class="demo-note">Kandungan berjadual diterbitkan secara automatik oleh sistem pada masa yang ditetapkan.</p>`;
  bindCaseRows($("view-scheduled"));
}

function renderPublished() {
  const q = searchQ(), list = published().filter((c) => matches(c, q));
  $("view-published").innerHTML = caseTable(list, [
    ["ID kes", (c) => `<span class="mono">${c.id}</span>`],
    ["Jenis kes", (c) => typeBadge(c.type)],
    ["Kandungan", claimCell],
    ["Keputusan", (c) => verdictBadge(c.content.verdict)],
    ["Diterbitkan", (c) => `${fmtDT(c.published.at)}<br><small class="kpi-delta">${c.published.scheduled ? "mengikut jadual" : "serta-merta"}</small>`],
    ["Saluran", (c) => channelTags(c.published.channels)],
    ["Pelapor", (c) => (c.published.notifiedAt ? slaBadgeLite("good", "Dimaklumkan") : slaBadgeLite("warning", "Belum dimaklumkan"))],
  ], "Belum ada kandungan diterbitkan.");
  bindCaseRows($("view-published"));
}

/* ---------- Share content ---------- */
const EMOJI = { false: "❌", mislead: "⚠️", true: "✅" };
function shareText(c, ch) {
  const ct = c.content, url = `https://sebenarnya.my/semakan/${c.id.toLowerCase()}`;
  const head = `${EMOJI[ct.verdict]} ${VERDICTS[ct.verdict].toUpperCase()}: ${ct.title}`;
  if (ch === "x") {
    const tail = `\n\n${url}\n#TidakPastiJanganKongsi`;
    return (head.length + tail.length > 280 ? head.slice(0, 276 - tail.length) + "…" : head) + tail;
  }
  return `${head}\n\n${ct.summary}\n\nBaca semakan penuh: ${url}\n\n#TidakPastiJanganKongsi #sebenarnyamy`;
}

let shareTab = "facebook";
function sharePreviews(c, channels) {
  const social = channels.filter((id) => id !== "web");
  if (!social.length) return `<p class="empty-row" style="padding:14px">Hanya laman web dipilih — tiada hantaran media sosial.</p>`;
  const id = social.includes(shareTab) ? shareTab : social[0];
  const lead = c.content.images[0], t = shareText(c, id);
  return `<div class="tabs">${social.map((s) => `<button data-share="${s}" class="${s === id ? "on" : ""}">${esc(CHANNEL[s].label.replace("Saluran ", ""))}</button>`).join("")}</div>
    <div class="share-item">
      <div class="share-top"><b>${esc(CHANNEL[id].label)}</b>${id === "x" ? `<small>${t.length}/280 aksara</small>` : ""}<button class="btn-g btn-sm" data-copy="${id}">Salin teks</button></div>
      <div class="share-body">
        <p class="share-text">${esc(t)}</p>
        ${id === "whatsapp" ? "" : `<div class="share-img">${lead ? imageMedia(c, lead) : cardSVG(c)}</div>`}
      </div>
    </div>`;
}

/* ---------- Case workspace ---------- */
const pubState = {}; // unsaved publish options per case
function getState(c) {
  if (!pubState[c.id]) {
    const t = new Date(Date.now() + 24 * HOUR);
    t.setHours(9, 0, 0, 0);
    pubState[c.id] = { channels: CHANNELS.map((x) => x.id), mode: "now", at: t.getTime(), notify: true };
  }
  return pubState[c.id];
}
const toLocalInput = (t) => { const d = new Date(t - new Date(t).getTimezoneOffset() * MIN); return d.toISOString().slice(0, 16); };

function approvalChain(c) {
  const qa = c.history.filter((h) => h.from === "semakan_kualiti" && h.to === "editorial").pop();
  const steps = [
    ...c.assignments.map((a) => [`${a.agency} meluluskan sanggahan`, `Penyemak agensi · ${a.doneAt ? fmtDT(a.doneAt) : "—"}`]),
    ["Semakan kualiti lulus", qa ? `${esc(qa.by)} · MCMC Admin · ${fmtDT(qa.at)}` : "MCMC Admin"],
    ["Ditandatangani oleh Editor", c.signoff ? `${esc(c.signoff.by)} · ${fmtDT(c.signoff.at)}` : "MCMC Editor"],
  ];
  return `<div class="card">
    <div class="card-head"><div><h2>Kelulusan penuh</h2><p>Kandungan ini boleh diterbitkan</p></div></div>
    <ul class="chain">${steps.map(([t, s]) => `<li><span class="ic" aria-hidden="true">✓</span><div><b>${esc(t)}</b><small>${s}</small></div></li>`).join("")}</ul>
    ${c.signoff && c.signoff.note ? `<div class="rebuttal" style="margin-top:12px"><b>Nota editor:</b> ${esc(c.signoff.note)}</div>` : ""}
  </div>`;
}

function publishPanel(c) {
  const s = getState(c);
  if (c.schedule) {
    return `<div class="card action-panel">
      <h3>Dijadualkan: ${whenText(c.schedule.at)}</h3>
      <p>Akan diterbitkan secara automatik ${ago(c.schedule.at)} di ${esc(channelNames(c.schedule.channels))}.${c.schedule.notify ? " Pelapor akan dimaklumkan sebaik sahaja diterbitkan." : ""}</p>
      <div class="form-row"><div><label class="lbl" for="f-resched">Tukar masa</label><input id="f-resched" type="datetime-local" class="ctl" value="${toLocalInput(c.schedule.at)}"></div></div>
      <div class="action-row">
        <button class="btn-p" data-act="publish-now">Terbitkan sekarang</button>
        <button class="btn-s" data-act="reschedule">Simpan masa baharu</button>
        <button class="btn-d" data-act="cancel-schedule">Batal jadual</button>
      </div>
    </div>`;
  }
  return `<div class="card action-panel">
    <h3>Terbitkan</h3>
    <p>Pilih saluran dan masa. Sambungan pelayar dan chatbot dikemas kini secara automatik apabila kandungan diterbitkan.</p>
    <label class="lbl-inline">Saluran</label>
    <div class="pick" style="margin-bottom:14px">${CHANNELS.map((ch) => `<label><input type="checkbox" name="channel" value="${ch.id}" ${s.channels.includes(ch.id) ? "checked" : ""} ${ch.fixed ? "disabled" : ""}> ${esc(ch.label)}</label>`).join("")}</div>

    <label class="lbl-inline">Masa penerbitan</label>
    <div class="mode-pick">
      <label><input type="radio" name="mode" value="now" ${s.mode === "now" ? "checked" : ""}><span><b>Terbitkan sekarang</b><small>Serta-merta di semua saluran dipilih</small></span></label>
      <label><input type="radio" name="mode" value="schedule" ${s.mode === "schedule" ? "checked" : ""}><span><b>Jadualkan</b><small>Diterbitkan secara automatik</small></span></label>
    </div>
    <div class="form-row" id="sched-row" ${s.mode === "schedule" ? "" : "hidden"} style="margin-top:12px"><div><label class="lbl" for="f-when">Tarikh & masa</label>
      <input id="f-when" type="datetime-local" class="ctl" value="${toLocalInput(s.at)}"></div></div>

    <div class="check-list" style="margin-top:14px">
      <label><input type="checkbox" checked disabled> Kemas kini pangkalan data sambungan pelayar</label>
      <label><input type="checkbox" checked disabled> Kemas kini pangkalan data chatbot</label>
      <label><input type="checkbox" id="f-notify" ${s.notify ? "checked" : ""}> Maklumkan pelapor (${esc(c.reporter)}) apabila diterbitkan</label>
    </div>
    ${s.notify ? notifyPreview(c) : ""}

    <div class="action-row">
      <button class="btn-p" data-act="publish">${s.mode === "now" ? "Terbitkan sekarang" : "Jadualkan penerbitan"}</button>
      <button class="btn-d" data-act="show-return">Pulangkan kepada Editor</button>
    </div>
    <div id="return-form" hidden style="margin-top:12px"><div class="form-row one"><div><label class="lbl" for="f-reason">Sebab dipulangkan</label>
      <textarea id="f-reason" class="ctl" rows="3" placeholder="cth. Imej utama beresolusi rendah"></textarea></div></div>
      <button class="btn-d" data-act="return">Pulangkan kepada Editor</button></div>
  </div>`;
}

const notifyPreview = (c) => `<div class="notif-preview">
  <small>Pratonton notifikasi kepada pelapor</small>
  <b>Semakan fakta diterbitkan untuk laporan anda</b>
  <p>${esc(c.id)} · ${esc(c.claim)}</p>
</div>`;

function donePanel(c) {
  const p = c.published;
  return `<div class="card action-panel">
    <h3>Telah diterbitkan</h3>
    <p>${fmtDT(p.at)}${p.scheduled ? " (mengikut jadual)" : ""} oleh ${esc(p.by)} di ${esc(channelNames(p.channels))}. Pangkalan data sambungan pelayar dan chatbot telah dikemas kini.</p>
    <div class="note-box ${p.notifiedAt ? "ok" : "warn"}"><span class="ic" aria-hidden="true">${p.notifiedAt ? "✓" : "!"}</span><div>
      <b>${p.notifiedAt ? "Pelapor telah dimaklumkan" : "Pelapor belum dimaklumkan"}</b>
      <p>${esc(c.reporter)}${p.notifiedAt ? ` · ${fmtDT(p.notifiedAt)}` : ""}</p></div></div>
    <div class="action-row">
      ${p.notifiedAt ? "" : `<button class="btn-p" data-act="notify">Maklumkan pelapor</button>`}
      ${c.article ? `<a class="btn-s" href="../index.html#article/${esc(c.article)}" target="_blank" rel="noopener">Lihat di laman awam ↗</a>` : ""}
    </div>
  </div>`;
}

function renderCase(id) {
  const c = getCase(id);
  const root = $("view-case");
  if (!c) { root.innerHTML = `<div class="card">Kes ${esc(id)} tidak dijumpai. <a href="#ready" class="btn-g">Kembali</a></div>`; return; }
  $("page-title").textContent = c.id;
  const live = c.status === "penerbitan";
  const back = c.status === "selesai" ? "published" : c.schedule ? "scheduled" : "ready";
  const channels = c.schedule ? c.schedule.channels : c.published ? c.published.channels : getState(c).channels;

  root.innerHTML = `
    <a href="#${back}" class="back-link">← ${TITLES[back]}</a>
    ${caseHead(c)}
    <div class="ws-grid">
      <div class="ws-col">
        ${live ? approvalChain(c) : ""}
        ${live ? publishPanel(c) : c.published ? donePanel(c) : `<div class="card action-panel"><h3>Bukan di peringkat penerbitan</h3><p>Kes ini kini di peringkat <b>${esc(STAGE[c.status].label)}</b> (pemilik: ${esc(STAGE[c.status].owner)}).</p></div>`}
        ${c.content ? `<div class="card"><div class="card-head"><div><h2>Kandungan boleh kongsi</h2><p>Dijana automatik untuk setiap saluran media sosial</p></div></div><div id="share">${sharePreviews(c, channels)}</div></div>` : ""}
      </div>
      <div class="ws-col">
        ${c.content ? `<div class="card"><div class="card-head"><div><h2>Pratonton</h2><p>Kandungan akhir seperti yang ditandatangani Editor</p></div></div>${articlePreview(c)}</div>` : ""}
        ${historyCard(c)}
      </div>
    </div>`;

  bindHistory(root, () => renderCase(id));
  bindPublish(c);
}

function bindPublish(c) {
  const root = $("view-case");
  const act = (name, fn) => root.querySelectorAll(`[data-act="${name}"]`).forEach((b) => b.addEventListener("click", fn));
  const redraw = (msg) => { commit(msg); renderCase(c.id); };
  const s = c.status === "penerbitan" && !c.schedule ? getState(c) : null;

  const channels = () => (s ? s.channels : c.schedule ? c.schedule.channels : c.published ? c.published.channels : []);
  const bindShare = () => {
    root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => {
      const text = shareText(c, b.dataset.copy);
      try { navigator.clipboard.writeText(text).then(() => toast("Teks disalin"), () => toast("Tidak dapat menyalin")); } catch (e) { toast("Tidak dapat menyalin"); }
    }));
    root.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", () => { shareTab = b.dataset.share; redrawShare(); }));
  };
  const redrawShare = () => { if ($("share")) { $("share").innerHTML = sharePreviews(c, channels()); bindShare(); } };
  bindShare();

  if (s) {
    root.querySelectorAll('input[name="channel"]').forEach((i) => i.addEventListener("change", () => {
      s.channels = [...root.querySelectorAll('input[name="channel"]:checked')].map((x) => x.value);
      redrawShare();
    }));
    root.querySelectorAll('input[name="mode"]').forEach((i) => i.addEventListener("change", () => { s.mode = i.value; renderCase(c.id); }));
    if ($("f-when")) $("f-when").addEventListener("change", (e) => { s.at = new Date(e.target.value).getTime(); });
    $("f-notify").addEventListener("change", (e) => { s.notify = e.target.checked; renderCase(c.id); });

    act("publish", (e) => {
      if (s.mode === "schedule") {
        if (!(s.at > Date.now() + 5 * MIN)) { $("f-when").focus(); return toast("Pilih masa sekurang-kurangnya 5 minit dari sekarang"); }
        schedulePublish(c, s.at, { channels: s.channels, notify: s.notify }, me);
        delete pubState[c.id];
        return redraw(`Dijadualkan pada ${whenText(c.schedule.at)}`);
      }
      const b = e.currentTarget;
      b.disabled = true;
      b.innerHTML = `<span class="spinner"></span> Menerbitkan…`;
      setTimeout(() => {
        publishCase(c, { channels: s.channels, notify: s.notify }, me);
        delete pubState[c.id];
        redraw(s.notify ? "Diterbitkan di laman utama — pelapor telah dimaklumkan" : "Diterbitkan di laman utama");
      }, 900);
    });
    act("show-return", () => { $("return-form").hidden = false; $("f-reason").focus(); });
    act("return", () => {
      const reason = $("f-reason").value.trim();
      if (!reason) { $("f-reason").focus(); return toast("Nyatakan sebab dipulangkan"); }
      publisherReturn(c, reason, me);
      delete pubState[c.id];
      redraw("Dipulangkan kepada Editor");
    });
  }

  // scheduled
  act("publish-now", () => { const sc = c.schedule; cancelSchedule(c, me); publishCase(c, { channels: sc.channels, notify: sc.notify }, me); redraw("Diterbitkan sekarang di laman utama"); });
  act("reschedule", () => {
    const t = new Date($("f-resched").value).getTime();
    if (!(t > Date.now() + 5 * MIN)) return toast("Pilih masa sekurang-kurangnya 5 minit dari sekarang");
    const sc = c.schedule;
    schedulePublish(c, t, { channels: sc.channels, notify: sc.notify }, me);
    redraw(`Jadual ditukar ke ${whenText(t)}`);
  });
  act("cancel-schedule", () => { cancelSchedule(c, me); redraw("Jadual dibatalkan — kandungan kembali ke senarai sedia diterbitkan"); });

  // published
  act("notify", () => { notifyReporter(c, me); redraw("Pelapor telah dimaklumkan"); });
}

/* ---------- Router ---------- */
const TITLES = { ready: "Sedia diterbitkan", scheduled: "Dijadualkan", published: "Diterbitkan", site: "Laman awam", info: "Info & Panduan", activity: "Log aktiviti", account: "Akaun saya" };

function route() {
  const [view, id] = location.hash.slice(1).split("/");
  const v = ["case", "guide", "story"].includes(view) && id ? view : TITLES[view] ? view : "ready";
  const parent = { guide: "info", story: "site" }[v] || v;
  if (v !== "guide") guideDraft = null; // leaving an editor discards unsaved changes
  if (v !== "story") storyDraft = null;
  document.querySelectorAll(".adm-view").forEach((s) => (s.hidden = s.dataset.view !== v));
  document.querySelectorAll(".adm-nav a").forEach((a) => a.classList.toggle("active", a.dataset.view === parent));
  $("crumb").textContent = v === "case" ? "Penerbitan" : parent !== v ? TITLES[parent] : "MCMC Content Publisher";
  $("page-title").textContent = TITLES[v] || "";
  if (v === "site") renderSite();
  if (v === "story") renderStoryEditor(decodeURIComponent(id));
  if (v === "info") renderInfoAdmin();
  if (v === "guide") renderGuideEditor(decodeURIComponent(id));
  if (v === "ready") renderReady();
  if (v === "scheduled") renderScheduled();
  if (v === "published") renderPublished();
  if (v === "case") renderCase(decodeURIComponent(id));
  if (v === "activity") activityView(me, $("view-activity"));
  if (v === "account") accountView(me, $("view-account"), me.roleId, me.agency);
}
window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });

$("global-q").addEventListener("input", () => {
  const v = location.hash.slice(1);
  if (["scheduled", "published", "site"].includes(v)) route();
  else if (v && v !== "ready") location.hash = "#ready";
  else renderReady();
});

bindShell(me, () => { commit(); route(); });
commit();
route();
