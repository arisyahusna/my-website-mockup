/* Case workflow shared by the MCMC / agency dashboards (mockup — localStorage stands in for the database).
   Stages follow the MCMC user-flow diagram:
   baharu → disahkan → (AI duplicate check) → klasifikasi → agihan → semakan_agensi
   → semakan_kualiti → editorial → penerbitan → selesai      (or → digabung when merged as a duplicate)
   The Editor can send a case back to semakan_kualiti, and the Publisher back to editorial.
   Inside semakan_agensi each agency assignment goes diterima → menyelidik (lead agency only) → draf → diluluskan,
   or → pindaan when a reviewer asks for changes. */

const CASES_KEY = "sbn-mcmc-cases-v4";
const PUBLIC_KEY = "sbn-state-ms2"; // the public site's store (general-public/userhome.html)
const HOUR = 3600e3;
const MIN = 60e3;

const STAGES = [
  { key: "baharu", label: "Kes baharu", owner: "MCMC Admin" },
  { key: "disahkan", label: "Disahkan", owner: "MCMC Admin" },
  { key: "klasifikasi", label: "Klasifikasi", owner: "MCMC Admin" },
  { key: "agihan", label: "Menunggu agihan", owner: "MCMC Admin" },
  { key: "semakan_agensi", label: "Semakan agensi", owner: "Agensi" },
  { key: "semakan_kualiti", label: "Semakan kualiti", owner: "MCMC Admin" },
  { key: "editorial", label: "Semakan editorial", owner: "MCMC Editor" },
  { key: "penerbitan", label: "Penerbitan", owner: "MCMC Content Publisher" },
  { key: "selesai", label: "Selesai", owner: "—" },
];
const STAGE = Object.fromEntries(STAGES.map((s, i) => [s.key, { ...s, step: i }]));
STAGE.digabung = { key: "digabung", label: "Digabung & ditutup", owner: "—", step: 8 };

const AGENCY_STATUS = {
  diterima: "Diterima",
  menyelidik: "Menyelidik fakta",
  draf: "Menunggu semakan agensi",
  diluluskan: "Diluluskan penyemak",
  pindaan: "Perlu pindaan",
};

const AGENCIES = [
  { id: "KKM", name: "Kementerian Kesihatan Malaysia" },
  { id: "PDRM", name: "Polis Diraja Malaysia" },
  { id: "BNM", name: "Bank Negara Malaysia" },
  { id: "KPM", name: "Kementerian Pendidikan Malaysia" },
  { id: "MOT", name: "Kementerian Pengangkutan" },
  { id: "JPS", name: "Jabatan Pengairan dan Saliran" },
  { id: "NADMA", name: "Agensi Pengurusan Bencana Negara" },
  { id: "JAKIM", name: "Jabatan Kemajuan Islam Malaysia" },
  { id: "JAS", name: "Jabatan Alam Sekitar" },
  { id: "KPDN", name: "Kementerian Perdagangan Dalam Negeri dan Kos Sara Hidup" },
];
const AGENCY = Object.fromEntries(AGENCIES.map((a) => [a.id, a]));

const CASE_TYPES = ["Maklumat palsu", "Penipuan", "Mengelirukan", "Media dimanipulasi / deepfake", "Lain-lain"];
const DOMAINS = ["Penipuan", "Kesihatan", "Ekonomi", "Politik", "Bencana", "Teknologi", "Pendidikan", "Pengangkutan", "Alam Sekitar", "Agama"];

// Same keys and labels as the public site (articles.js LABEL)
const VERDICTS = { false: "Palsu", mislead: "Mengelirukan", true: "Benar" };
const CHANNELS = [
  { id: "web", label: "Laman web sebenarnya.my", fixed: true },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X (Twitter)" },
  { id: "instagram", label: "Instagram" },
  { id: "telegram", label: "Saluran Telegram" },
  { id: "whatsapp", label: "Saluran WhatsApp" },
];
const CHANNEL = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));

/* ---------- Actors ---------- */
const SYSTEM = { name: "Sistem", role: "Sistem" };
const AI_BOT = { name: "AI Pengesan Pendua", role: "Sistem" };
const SCHEDULER = { name: "Penjadual", role: "Sistem" };
const SEED_ADMIN = { name: "nurul.huda@mcmc.gov.my", role: "MCMC Admin" };
const EDITOR = { name: "aina.rahman@mcmc.gov.my", role: "MCMC Editor" };
const PUBLISHER = { name: "hafiz.zain@mcmc.gov.my", role: "MCMC Content Publisher" };
const agencyOfficer = (id) => ({ name: `pegawai@${id.toLowerCase()}.gov.my`, role: `Agency Officer · ${id}` });
const agencyReviewer = (id) => ({ name: `penyemak@${id.toLowerCase()}.gov.my`, role: `Agency Reviewer · ${id}` });

const IPS = {};
function ipFor(name) {
  if (!IPS[name]) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    IPS[name] = [SYSTEM.name, AI_BOT.name, SCHEDULER.name].includes(name) ? "—" :`10.${20 + (h % 30)}.${h % 250}.${(h >>> 8) % 250}`;
  }
  return IPS[name];
}

/* ---------- Store ---------- */
let store = null;
let _clock = null; // lets the seed replay events at past times
let _seeding = false;
const now = () => _clock ?? Date.now();
function at(t, fn) {
  _clock = t;
  try { fn(); } finally { _clock = null; }
}

function loadStore() {
  try { store = JSON.parse(localStorage.getItem(CASES_KEY)); } catch (e) { store = null; }
  if (!store || !Array.isArray(store.cases)) seedStore();
  if (!store.notices) store.notices = [];
  importPublicReports();
  runScheduled();
  return store;
}
function saveStore() {
  try { localStorage.setItem(CASES_KEY, JSON.stringify(store)); } catch (e) { }
}
function resetStore() {
  seedStore();
  importPublicReports();
}
const getCase = (id) => store.cases.find((c) => c.id === id);

/* ---------- Logging ---------- */
function audit(actor, action, target, detail) {
  store.audit.unshift({ at: now(), user: actor.name, role: actor.role, action, target, detail, ip: ipFor(actor.name) });
}
function logAction(c, actor, text, auditAction) {
  c.actions.push({ at: now(), by: actor.name, role: actor.role, text });
  audit(actor, auditAction || "Kemas kini kes", c.id, text);
}
function setStatus(c, to, actor, note) {
  const from = c.status;
  c.status = to;
  c.history.push({ at: now(), from, to, by: actor.name, role: actor.role, note: note || "" });
  audit(actor, "Tukar status", c.id, `${STAGE[from] ? STAGE[from].label : "—"} → ${STAGE[to].label}${note ? ` (${note})` : ""}`);
}

/* ---------- Workflow operations ---------- */
function receiveCase(data, actor = SYSTEM) {
  const c = {
    id: data.id, claim: data.claim, detail: data.detail || "", reporter: data.reporter, channel: data.channel || "Laman web",
    platform: data.platform, link: data.link || "", evidence: data.evidence || [], receivedAt: now(),
    priority: data.priority || "Sederhana", status: "baharu", type: "", domains: [], assignments: [], slaHours: 0,
    dupOf: data.dupOf || null, dupScore: data.dupScore || 0, aiResult: null, rebuttal: "", article: data.article || null,
    fromPublic: !!data.fromPublic, history: [{ at: now(), from: null, to: "baharu", by: actor.name, role: actor.role, note: "" }], actions: [],
  };
  store.cases.unshift(c);
  logAction(c, actor, `Kes diterima daripada ${c.reporter} melalui ${c.channel} (dilihat di ${c.platform}).`, "Kes diterima");
  return c;
}

function verifyCase(c, actor) {
  logAction(c, actor, "Kandungan dan bukti disemak — ditandakan sebagai disahkan.", "Sahkan kes");
  setStatus(c, "disahkan", actor);
  syncReporter(c, "review", "Laporan anda telah disahkan dan sedang disemak oleh MCMC.");
}

function words(s) {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3));
}
// Naive stand-in for the AI model: word overlap with earlier cases
function findDuplicate(c) {
  if (c.dupOf) return { of: c.dupOf, score: c.dupScore };
  const mine = words(c.claim);
  let best = null;
  store.cases.forEach((o) => {
    if (o.id === c.id || o.status === "digabung") return;
    const theirs = words(o.claim);
    const shared = [...mine].filter((w) => theirs.has(w)).length;
    const score = Math.round((shared / Math.max(1, Math.min(mine.size, theirs.size))) * 100);
    if (score >= 60 && (!best || score > best.score)) best = { of: o.id, score };
  });
  return best;
}

function runDuplicateCheck(c) {
  const hit = findDuplicate(c);
  c.aiResult = hit ? { duplicate: true, of: hit.of, score: hit.score, at: now() } : { duplicate: false, at: now() };
  logAction(c, AI_BOT, hit ? `Kemungkinan pendua dikesan: ${hit.of} (${hit.score}% serupa).` : "Tiada pendua dikesan.", "Pengesanan pendua AI");
  if (!hit) setStatus(c, "klasifikasi", AI_BOT, "tiada pendua");
  return c.aiResult;
}

function mergeCase(c, actor) {
  const target = getCase(c.aiResult.of);
  logAction(c, actor, `Digabungkan dengan ${c.aiResult.of} dan ditutup.`, "Gabung kes");
  setStatus(c, "digabung", actor, `pendua ${c.aiResult.of}`);
  if (target) logAction(target, actor, `Kes pendua ${c.id} digabungkan ke dalam kes ini.`, "Gabung kes");
  const article = target && target.article && target.status === "selesai" ? target.article : null;
  syncReporter(c, "closed", `Dakwaan ini sama dengan kes ${c.aiResult.of} yang telah disemak. Laporan anda digabungkan dan ditutup.`, article);
}

function overrideDuplicate(c, actor) {
  logAction(c, actor, `Keputusan AI diketepikan — bukan pendua ${c.aiResult.of}.`, "Pengesanan pendua AI");
  c.aiResult = { duplicate: false, overridden: true, at: now() };
  setStatus(c, "klasifikasi", actor, "bukan pendua");
}

function classifyCase(c, type, domains, actor) {
  c.type = type;
  c.domains = domains;
  logAction(c, actor, `Jenis kes: ${type}. Domain: ${domains.join(", ")}.`, "Klasifikasi kes");
  setStatus(c, "agihan", actor);
}

// The first agency picked is the lead: its Agency Officer drafts the rebuttal, and every tagged agency's reviewer approves it
function assignAgencies(c, ids, slaHours, note, actor) {
  const t = now();
  c.slaHours = slaHours;
  const inReview = c.assignments.some((a) => ["draf", "diluluskan"].includes(a.status));
  const added = ids.filter((id) => !assignmentOf(c, id));
  added.forEach((id) => {
    c.assignments.push({ agency: id, status: inReview ? "draf" : "diterima", assignedAt: t, due: t + slaHours * HOUR, doneAt: null, note: note || "" });
  });
  logAction(c, actor, `Diagihkan kepada ${ids.join(", ")} · peneraju ${leadOf(c)} · SLA ${slaHours} jam${note ? ` · Nota: ${note}` : ""}.`, "Agih kepada agensi");
  added.forEach((id) => {
    if (id === leadOf(c)) notify(`officer:${id}`, "Kes baharu diagihkan kepada agensi anda", `${c.id} · ${c.claim}`, c.id);
    else notify(`officer:${id}`, `Agensi anda ditandakan (peneraju: ${leadOf(c)})`, `${c.id} · ${c.claim}`, c.id);
    if (inReview) notify(`reviewer:${id}`, "Draf sanggahan menunggu semakan anda", `${c.id} · ${c.claim}`, c.id);
  });
  if (c.status !== "semakan_agensi") {
    setStatus(c, "semakan_agensi", actor, ids.join(", "));
    syncReporter(c, "review", "Laporan anda telah dihantar kepada agensi berkaitan untuk pengesahan fakta.");
  }
}

function remindAgency(c, id, actor) {
  logAction(c, actor, `Peringatan SLA dihantar kepada ${id}.`, "Peringatan SLA");
  const a = assignmentOf(c, id);
  const role = a && a.status === "draf" ? "reviewer" : "officer";
  notify(`${role}:${id}`, "Peringatan SLA daripada MCMC", `${c.id} · tarikh akhir ${a ? whenText(a.due) : ""}`, c.id);
}

/* ---------- Agencies (agency/agencyofficer.html, agency/agencyreviewer.html) ---------- */
const leadOf = (c) => (c.assignments[0] || {}).agency;
const assignmentOf = (c, id) => c.assignments.find((a) => a.agency === id);
const draftSubmitted = (c) => !!(c.draft && c.draft.version);

// Dashboard alerts; `to` is "officer:KKM", "reviewer:KPM", …
function notify(to, title, body, caseId) {
  store.notices = store.notices || [];
  store.noticeSeq = (store.noticeSeq || 0) + 1;
  store.notices.unshift({ id: store.noticeSeq, to, at: now(), title, body, caseId, read: false });
}

function ensureDraft(c) {
  if (!c.draft) c.draft = { text: "", notes: "", docs: [], version: 0, submittedAt: null, by: null };
  if (!c.reviews) c.reviews = [];
  if (!c.escalations) c.escalations = [];
  return c.draft;
}
function defaultDraft(c) {
  const names = c.assignments.map((a) => AGENCY[a.agency].name).join(" dan ");
  return `Berdasarkan semakan ${names}, dakwaan ini didapati tidak berasas. Tiada kenyataan atau rekod rasmi yang menyokong dakwaan tersebut. Orang ramai dinasihatkan supaya tidak menyebarkan maklumat yang belum disahkan.`;
}

function officerStart(c, actor) {
  ensureDraft(c);
  const a = assignmentOf(c, leadOf(c));
  a.status = "menyelidik";
  logAction(c, actor, `${a.agency}: butiran kes disemak, penyelidikan dan pengesahan fakta dimulakan.`, "Respons agensi");
}
function officerSaveDraft(c, patch, actor) {
  Object.assign(ensureDraft(c), patch);
  logAction(c, actor, `${leadOf(c)}: draf kenyataan sanggahan disimpan.`, "Simpan draf");
}
function officerAddDoc(c, doc, actor) {
  ensureDraft(c).docs.push(doc);
  logAction(c, actor, `${leadOf(c)}: dokumen sokongan dimuat naik — ${doc.name}.`, "Muat naik dokumen");
}
function officerRemoveDoc(c, name, actor) {
  c.draft.docs = c.draft.docs.filter((d) => d.name !== name);
  logAction(c, actor, `${leadOf(c)}: dokumen sokongan dibuang — ${name}.`, "Muat naik dokumen");
}
function officerSubmit(c, actor) {
  const d = ensureDraft(c);
  const again = d.version > 0;
  d.version += 1;
  d.submittedAt = now();
  d.by = actor.name;
  c.assignments.forEach((a) => { a.status = "draf"; a.doneAt = null; });
  const ids = c.assignments.map((a) => a.agency);
  logAction(c, actor, `${leadOf(c)}: draf kenyataan sanggahan rasmi versi ${d.version}${again ? " (disemak semula)" : ""} beserta ${d.docs.length} dokumen dihantar untuk semakan ${ids.join(", ")}.`, again ? "Hantar semula draf" : "Hantar draf");
  ids.forEach((id) => notify(`reviewer:${id}`, again ? "Draf disemak semula menunggu semakan anda" : "Draf sanggahan menunggu semakan anda", `${c.id} · versi ${d.version} daripada ${leadOf(c)}`, c.id));
}
function reviewerApprove(c, id, comment, actor) {
  const a = assignmentOf(c, id);
  a.status = "diluluskan";
  a.doneAt = now();
  c.reviews.push({ agency: id, by: actor.name, at: now(), decision: "lulus", comment: comment || "", version: c.draft.version });
  logAction(c, actor, `${id}: draf sanggahan versi ${c.draft.version} diluluskan oleh penyemak agensi.${comment ? ` Ulasan: ${comment}` : ""}`, "Kelulusan agensi");
  notify(`officer:${leadOf(c)}`, `${id} meluluskan draf anda`, `${c.id} · versi ${c.draft.version}`, c.id);
  if (c.assignments.every((x) => x.status === "diluluskan")) receiveRebuttal(c);
}
function reviewerRequestChanges(c, id, comment, actor) {
  c.reviews.push({ agency: id, by: actor.name, at: now(), decision: "pindaan", comment, version: c.draft.version });
  c.assignments.forEach((a) => { a.status = "pindaan"; a.doneAt = null; });
  logAction(c, actor, `${id}: pindaan diminta bagi draf versi ${c.draft.version} — ${comment}`, "Minta pindaan");
  notify(`officer:${leadOf(c)}`, `${id} meminta pindaan`, `${c.id} · ${comment}`, c.id);
}
function escalateCase(c, urgent, reason, actor) {
  ensureDraft(c);
  c.escalations.push({ at: now(), by: actor.name, agency: leadOf(c), urgent, reason });
  if (urgent) c.priority = "Tinggi";
  logAction(c, actor, `${leadOf(c)}: ${urgent ? "eskalasi segera" : "eskalasi"} kepada MCMC Admin — ${reason}`, urgent ? "Eskalasi segera" : "Eskalasi");
}

// Mockup only: lets the MCMC Admin page (and the demo seed) play the agency roles one step at a time
function advanceAgency(c, id) {
  const a = assignmentOf(c, id);
  if (a.status === "draf") return reviewerApprove(c, id, "", agencyReviewer(id));
  if (id !== leadOf(c)) return;
  if (a.status === "diterima") return officerStart(c, agencyOfficer(id));
  if (a.status === "menyelidik" || a.status === "pindaan") {
    const d = ensureDraft(c);
    if (!d.text) d.text = defaultDraft(c);
    if (!d.docs.length) d.docs.push({ name: `kenyataan_rasmi_${id.toLowerCase()}.pdf`, size: 184320 });
    officerSubmit(c, agencyOfficer(id));
  }
}

function receiveRebuttal(c) {
  const names = c.assignments.map((a) => a.agency).join(", ");
  c.rebuttal = (c.draft && c.draft.text) || c.rebuttal || defaultDraft(c);
  logAction(c, agencyOfficer(leadOf(c)), `${leadOf(c)}: semua agensi (${names}) meluluskan — kes ditandakan sebagai disahkan.`, "Disahkan agensi");
  setStatus(c, "semakan_kualiti", SYSTEM, "semua agensi meluluskan");
  logAction(c, SYSTEM, `Draf sanggahan akhir diterima daripada ${names} dan dimajukan kepada MCMC Admin.`, "Draf sanggahan diterima");
  c.assignments.forEach((a) => notify(`officer:${a.agency}`, "Disahkan — dimajukan kepada MCMC", `${c.id} · semua agensi meluluskan draf`, c.id));
}

function approveRebuttal(c, actor) {
  ensureContent(c);
  logAction(c, actor, "Semakan kualiti lulus — sanggahan dihantar kepada MCMC Editor.", "Semakan kualiti");
  setStatus(c, "editorial", actor);
}

function returnForRevision(c, reason, actor) {
  const t = now();
  c.assignments.forEach((a) => { a.status = "pindaan"; a.due = t + 24 * HOUR; a.doneAt = null; });
  ensureDraft(c);
  c.reviews.push({ agency: "MCMC", by: actor.name, at: t, decision: "pindaan", comment: reason, version: c.draft.version });
  logAction(c, actor, `Dipulangkan kepada agensi untuk pindaan: ${reason}`, "Semakan kualiti");
  setStatus(c, "semakan_agensi", actor, "pindaan");
  notify(`officer:${leadOf(c)}`, "MCMC meminta pindaan", `${c.id} · ${reason}`, c.id);
}

/* ---------- Editorial (mcmc/editor.html) ---------- */
// The fact-check article the Editor finalises and the Publisher releases
function ensureContent(c) {
  if (!c.content) {
    c.content = {
      title: c.claim, verdict: "false", summary: "", body: c.rebuttal || "",
      refs: c.assignments.map((a) => `Kenyataan rasmi ${AGENCY[a.agency].name}`), images: [], savedAt: null,
    };
  }
  return c.content;
}
const whenText = (t) => new Date(t).toLocaleString("ms-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const returnedHere = (c) => c.returned && c.returned.stage === c.status ? c.returned : null;

function saveDraft(c, patch, actor) {
  Object.assign(ensureContent(c), patch, { savedAt: now() });
  logAction(c, actor, "Draf kandungan disimpan.", "Simpan draf");
}
function addImage(c, img, actor) {
  ensureContent(c).images.push({ id: `img-${now().toString(36)}-${c.content.images.length}`, ...img });
  logAction(c, actor, `Imej sokongan ditambah: ${img.name}.`, "Tambah imej");
}
function removeImage(c, id, actor) {
  const img = c.content.images.find((i) => i.id === id);
  c.content.images = c.content.images.filter((i) => i.id !== id);
  if (img) logAction(c, actor, `Imej sokongan dibuang: ${img.name}.`, "Buang imej");
}

function editorSignOff(c, actor = EDITOR, note = "") {
  const n = ensureContent(c).images.length;
  c.signoff = { by: actor.name, at: now(), note };
  logAction(c, actor, `Kandungan akhir disemak (format, kejelasan, ketepatan)${n ? ` · ${n} imej sokongan` : ""}. Ditandatangani dan diserahkan kepada Content Publisher.${note ? ` Nota: ${note}` : ""}`, "Tandatangan editorial");
  setStatus(c, "penerbitan", actor, "ditandatangani editor");
}
function editorReturn(c, reason, actor) {
  c.returned = { stage: "semakan_kualiti", by: actor.name, role: actor.role, at: now(), reason };
  logAction(c, actor, `Dipulangkan kepada MCMC Admin: ${reason}`, "Pulangkan kes");
  setStatus(c, "semakan_kualiti", actor, "dipulangkan oleh editor");
}

/* ---------- Publishing (mcmc/contentpublisher.html) ---------- */
const channelNames = (ids) => ids.map((id) => CHANNEL[id].label).join(", ");

function schedulePublish(c, when, opts, actor) {
  c.schedule = { at: when, channels: opts.channels, notify: opts.notify, by: actor.name, setAt: now() };
  logAction(c, actor, `Penerbitan dijadualkan pada ${whenText(when)} · ${channelNames(opts.channels)}.`, "Jadual penerbitan");
}
function cancelSchedule(c, actor) {
  logAction(c, actor, `Jadual penerbitan (${whenText(c.schedule.at)}) dibatalkan.`, "Jadual penerbitan");
  c.schedule = null;
}
function publishCase(c, opts = {}, actor = PUBLISHER) {
  const channels = opts.channels || CHANNELS.map((x) => x.id);
  c.published = { at: now(), by: actor.name, channels, scheduled: !!opts.scheduled, notifiedAt: null };
  c.schedule = null;
  logAction(c, actor, `Diterbitkan${opts.scheduled ? " mengikut jadual" : ""} di ${channelNames(channels)}. Kandungan boleh kongsi dijana; pangkalan data sambungan pelayar dan chatbot dikemas kini.`, "Terbit");
  setStatus(c, "selesai", actor);
  if (opts.notify !== false) notifyReporter(c, actor);
}
function notifyReporter(c, actor) {
  c.published.notifiedAt = now();
  logAction(c, actor, `Pelapor (${c.reporter}) dimaklumkan melalui e-mel dan notifikasi aplikasi.`, "Maklumkan pelapor");
  syncReporter(c, "published", "Semakan fakta telah diterbitkan — terima kasih kerana melaporkan.", c.article);
}
function publisherReturn(c, reason, actor) {
  c.returned = { stage: "editorial", by: actor.name, role: actor.role, at: now(), reason };
  c.signoff = null;
  c.schedule = null;
  logAction(c, actor, `Dipulangkan kepada MCMC Editor: ${reason}`, "Pulangkan kes");
  setStatus(c, "editorial", actor, "dipulangkan oleh publisher");
}

// Publishes anything whose scheduled time has passed (runs on every page load and on a timer)
function runScheduled() {
  const due = store.cases.filter((c) => c.status === "penerbitan" && c.schedule && c.schedule.at <= Date.now());
  due.forEach((c) => {
    const s = c.schedule;
    at(s.at, () => publishCase(c, { channels: s.channels, notify: s.notify, scheduled: true }, SCHEDULER));
  });
  if (due.length) store.audit.sort((a, b) => b.at - a.at);
  return due.length;
}

/* ---------- Link with the public site (general-public/userhome.html) ---------- */
function readPublic() {
  try { return JSON.parse(localStorage.getItem(PUBLIC_KEY)); } catch (e) { return null; }
}

// Reports submitted on the public site show up here as new cases
function importPublicReports() {
  const pub = readPublic();
  if (!pub || !Array.isArray(pub.reports)) return;
  let reporter = "pengguna@contoh.com";
  try { reporter = localStorage.getItem("sbn-user") || reporter; } catch (e) { }
  let added = false;
  pub.reports.slice().reverse().forEach((r) => {
    if (getCase(r.id) || !["received", "review"].includes(r.status)) return;
    at(r.at, () => {
      const c = receiveCase({ id: r.id, claim: r.claim, reporter, channel: "Laman web", platform: r.platform, link: r.link, fromPublic: true });
      if (r.status === "review") setStatus(c, "disahkan", SYSTEM, "dikemas kini daripada laman awam");
    });
    added = true;
  });
  if (added) store.cases.sort((a, b) => b.receivedAt - a.receivedAt);
}

// Push a status change back to the reporter's "Kes Dilaporkan" + notifications
function syncReporter(c, status, text, article) {
  if (_seeding) return;
  const pub = readPublic();
  if (!pub || !Array.isArray(pub.reports)) return;
  const r = pub.reports.find((x) => x.id === c.id);
  if (!r) return;
  r.status = status;
  if (article) r.article = article;
  r.updates.push({ s: status, text, at: Date.now() });
  const title = { review: "Laporan anda sedang disemak", published: "Semakan fakta diterbitkan untuk laporan anda", closed: "Laporan anda telah ditutup" }[status];
  pub.notifs.unshift({
    id: Math.max(0, ...pub.notifs.map((n) => n.id)) + 1, type: "report", title, body: `${c.id} · ${c.claim}`,
    link: article ? `article/${article}` : "foryou/reported", at: Date.now(), read: false,
  });
  try { localStorage.setItem(PUBLIC_KEY, JSON.stringify(pub)); } catch (e) { }
}

/* ---------- SLA ---------- */
function slaState(a) {
  if (a.status === "diluluskan") return { label: "Selesai", level: "good" };
  const left = a.due - Date.now();
  if (left < 0) return { label: `Lewat ${fmtDuration(-left)}`, level: "critical" };
  if (left < 12 * HOUR) return { label: `${fmtDuration(left)} lagi`, level: "warning" };
  return { label: `${fmtDuration(left)} lagi`, level: "good" };
}
function caseOverdue(c) {
  return c.status === "semakan_agensi" && c.assignments.some((a) => slaState(a).level === "critical");
}
function fmtDuration(ms) {
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  if (h >= 48) return `${Math.round(h / 24)} hari`;
  return h ? `${h}j ${m}m` : `${m}m`;
}

/* ---------- Demo data ---------- */
function seedStore() {
  store = { cases: [], audit: [], notices: [], noticeSeq: 0 };
  _seeding = true;
  const T = Date.now();

  const walk = (c, steps) => steps.forEach(([hoursAgo, fn]) => at(T - hoursAgo * HOUR, () => fn(c)));
  // agency steps: lead officer starts, submits a draft; each tagged agency's reviewer approves or asks for changes
  const start = (c) => officerStart(c, agencyOfficer(leadOf(c)));
  const submit = (text, docs, notes) => (c) => {
    Object.assign(ensureDraft(c), { text, notes: notes || "", docs: docs || [{ name: `kenyataan_rasmi_${leadOf(c).toLowerCase()}.pdf`, size: 184320 }] });
    officerSubmit(c, agencyOfficer(leadOf(c)));
  };
  const approve = (id, comment) => (c) => reviewerApprove(c, id, comment, agencyReviewer(id));
  const changes = (id, comment) => (c) => reviewerRequestChanges(c, id, comment, agencyReviewer(id));
  const content = (patch) => (c) => saveDraft(c, patch, EDITOR);

  at(T - 80 * HOUR, () => audit(SEED_ADMIN, "Log masuk", "Portal pentadbir", "Log masuk berjaya"));

  // Published end-to-end (matches the RM500 article on the public site)
  let c;
  at(T - 72 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0012", claim: "Mesej WhatsApp menawarkan bantuan digital RM500 jika saya menekan pautan", reporter: "siti.a@gmail.com", platform: "WhatsApp", evidence: ["mesej_rm500.jpg"], priority: "Tinggi", article: "rm500" }); });
  walk(c, [
    [71.5, (c) => verifyCase(c, SEED_ADMIN)], [71.4, runDuplicateCheck],
    [71, (c) => classifyCase(c, "Penipuan", ["Penipuan", "Ekonomi"], SEED_ADMIN)],
    [70.8, (c) => assignAgencies(c, ["BNM", "PDRM"], 48, "Keutamaan tinggi — pautan pancingan data aktif", SEED_ADMIN)],
    [68, start], [62, submit("Bank Negara Malaysia dan PDRM mengesahkan tiada program bantuan digital RM500. Pautan yang dikongsi membawa ke laman tiruan yang meniru portal kerajaan untuk mencuri butiran perbankan. Orang ramai diminta tidak menekan pautan tersebut dan melaporkan sebarang transaksi mencurigakan kepada bank masing-masing.")], [58, approve("BNM")], [55, approve("PDRM", "Selaras dengan laporan polis yang diterima.")],
    [52, (c) => approveRebuttal(c, SEED_ADMIN)],
    [51, content({
      title: 'Mesej tular WhatsApp tawar "bantuan digital" RM500 ialah penipuan pancingan data', verdict: "false",
      summary: "Tiada agensi yang mengumumkan program sedemikian. Pautan tersebut membawa ke laman tiruan yang dibina untuk mencuri maklumat perbankan.",
      images: [{ id: "s12a", kind: "card", name: "kad-semakan-fakta.png", caption: "Kad semakan fakta untuk dikongsi" }, { id: "s12b", kind: "evidence", name: "mesej_rm500.jpg", caption: "Tangkapan skrin mesej yang tular (pautan dikaburkan)" }],
    })],
    [50, editorSignOff], [48, publishCase],
  ]);

  // Published last week (petrol price)
  at(T - 140 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0006", claim: "Hantaran mendakwa harga petrol akan naik dua kali ganda mulai bulan depan", reporter: "rizal.a@gmail.com", platform: "Facebook", evidence: ["hantaran_petrol.png"], article: "fuel" }); });
  walk(c, [
    [139, (c) => verifyCase(c, SEED_ADMIN)], [138.9, runDuplicateCheck],
    [138, (c) => classifyCase(c, "Mengelirukan", ["Ekonomi"], SEED_ADMIN)],
    [137.5, (c) => assignAgencies(c, ["KPDN"], 48, "", SEED_ADMIN)],
    [134, start], [129, submit("KPDN menjelaskan tiada keputusan untuk menaikkan harga petrol dua kali ganda. Sebarang pelarasan subsidi akan diumumkan secara rasmi dan dilaksanakan secara berperingkat.")], [126, approve("KPDN")], [124, (c) => approveRebuttal(c, SEED_ADMIN)],
    [123, content({
      title: "Dakwaan harga petrol naik dua kali ganda bulan depan tidak menyatakan konteks penting", verdict: "mislead",
      summary: "Pelarasan subsidi sedang dibincangkan, tetapi tiada pengumuman bahawa harga akan naik dua kali ganda.",
      images: [{ id: "s6a", kind: "card", name: "kad-semakan-fakta.png", caption: "Kad semakan fakta untuk dikongsi" }],
    })],
    [122, editorSignOff], [120, publishCase],
  ]);

  // Signed off by the editor, scheduled by the publisher for tomorrow morning (haze)
  at(T - 110 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0009", claim: "Mesej mendakwa bacaan jerebu di Lembah Klang mencapai tahap tidak sihat", reporter: "nadia.s@gmail.com", channel: "Sambungan pelayar", platform: "X (Twitter)", evidence: ["bacaan_ipu.png"], article: "haze" }); });
  walk(c, [
    [109, (c) => verifyCase(c, SEED_ADMIN)], [108.9, runDuplicateCheck],
    [108, (c) => classifyCase(c, "Lain-lain", ["Alam Sekitar", "Kesihatan"], SEED_ADMIN)],
    [107.5, (c) => assignAgencies(c, ["JAS"], 48, "Sahkan bacaan IPU stesen pemantauan", SEED_ADMIN)],
    [100, start], [85, submit("Jabatan Alam Sekitar mengesahkan bacaan Indeks Pencemar Udara (IPU) di tiga stesen di Lembah Klang melepasi 100 (tidak sihat) pada tarikh yang disebut. Orang ramai dinasihatkan mengurangkan aktiviti luar dan merujuk portal rasmi JAS untuk bacaan semasa.", [{ name: "bacaan_ipu_stesen_jas.pdf", size: 402432 }])], [80, approve("JAS")],
    [30, (c) => approveRebuttal(c, SEED_ADMIN)],
    [26, content({
      title: "Bacaan jerebu di beberapa kawasan semenanjung memang mencapai tahap tidak sihat", verdict: "true",
      summary: "Bacaan kualiti udara bagi tarikh yang disebut memang mencapai julat tidak sihat di beberapa stesen pemantauan.",
      images: [{ id: "s9a", kind: "card", name: "kad-semakan-fakta.png", caption: "Kad semakan fakta untuk dikongsi" }, { id: "s9b", kind: "evidence", name: "bacaan_ipu.png", caption: "Bacaan IPU yang dikongsi pelapor, disahkan oleh JAS" }],
    })],
    [24, (c) => editorSignOff(c, EDITOR, "Sesuai diterbitkan pagi esok bersama amaran kesihatan.")],
    [3, (c) => {
      const t = new Date(T + 24 * HOUR);
      t.setHours(9, 0, 0, 0);
      schedulePublish(c, t.getTime(), { channels: ["web", "facebook", "x", "telegram"], notify: true }, PUBLISHER);
    }],
  ]);

  // Signed off, waiting for the publisher (vitamin)
  at(T - 96 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0015", claim: "Hantaran mendakwa kajian baharu membuktikan vitamin biasa boleh menyembuhkan kanser", reporter: "kamal.i@yahoo.com", platform: "WhatsApp", evidence: ["hantaran_vitamin.jpg"], priority: "Tinggi", article: "vitamin" }); });
  walk(c, [
    [95, (c) => verifyCase(c, SEED_ADMIN)], [94.9, runDuplicateCheck],
    [94, (c) => classifyCase(c, "Mengelirukan", ["Kesihatan"], SEED_ADMIN)],
    [93.5, (c) => assignAgencies(c, ["KKM"], 72, "", SEED_ADMIN)],
    [80, start], [45, submit("Kementerian Kesihatan Malaysia menjelaskan kajian yang dirujuk hanya dijalankan ke atas sel di makmal dan bukan ke atas pesakit. Tiada bukti vitamin tersebut menyembuhkan kanser. Pesakit dinasihatkan meneruskan rawatan yang disyorkan doktor.", [{ name: "kenyataan_kkm_vitamin.pdf", size: 221184 }, { name: "ringkasan_kajian_makmal.pdf", size: 98304 }])], [40, approve("KKM")],
    [12, (c) => approveRebuttal(c, SEED_ADMIN)],
    [5, content({
      title: "Hantaran kaitkan vitamin biasa dengan penawar kanser salah tafsir kajian makmal", verdict: "mislead",
      summary: "Kajian itu dijalankan ke atas sel di makmal, bukan ke atas manusia. Penyelidiknya menyatakan kajian itu tidak membuktikan vitamin tersebut menyembuhkan kanser.",
      images: [{ id: "s15a", kind: "card", name: "kad-semakan-fakta.png", caption: "Kad semakan fakta untuk dikongsi" }, { id: "s15b", kind: "evidence", name: "hantaran_vitamin.jpg", caption: "Hantaran asal yang tular di WhatsApp" }],
    })],
    [3, (c) => editorSignOff(c, EDITOR, "Keutamaan tinggi — dakwaan kesihatan sedang tular.")],
  ]);

  // Sent back to the editor by the publisher (rice price chart)
  at(T - 86 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0018", claim: "Carta tular mendakwa harga beras tempatan telah naik tiga kali ganda", reporter: "suresh.p@gmail.com", platform: "Instagram", evidence: ["carta_beras.png"], article: "rice" }); });
  walk(c, [
    [85, (c) => verifyCase(c, SEED_ADMIN)], [84.9, runDuplicateCheck],
    [84, (c) => classifyCase(c, "Mengelirukan", ["Ekonomi"], SEED_ADMIN)],
    [83.5, (c) => assignAgencies(c, ["KPDN"], 48, "", SEED_ADMIN)],
    [80, start], [65, submit("Data rasmi menunjukkan harga beras tempatan meningkat secara sederhana dalam tempoh lima tahun. Carta yang tular bermula pada paras harga yang luar biasa rendah sehingga kenaikan kelihatan tiga kali ganda.")], [60, approve("KPDN")], [50, (c) => approveRebuttal(c, SEED_ADMIN)],
    [10, content({
      title: "Carta kenaikan harga beras menggunakan tempoh masa terpilih", verdict: "mislead",
      summary: "Carta itu bermula pada titik yang luar biasa rendah. Jika diukur dalam tempoh yang lebih panjang, kenaikannya jauh lebih kecil.",
      images: [{ id: "s18a", kind: "card", name: "kad-semakan-fakta.png", caption: "Kad semakan fakta untuk dikongsi" }],
    })],
    [8, editorSignOff],
    [2, (c) => publisherReturn(c, "Sila tambah sumber data harga rasmi (DOSM) dan imej carta bagi tempoh penuh sebelum diterbitkan.", PUBLISHER)],
  ]);

  // Editorial review (deepfake)
  at(T - 54 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0021", claim: "Video menteri mengumumkan cuti umum mengejut pada hari Isnin", reporter: "farhan.k@yahoo.com", channel: "Sambungan pelayar", platform: "Facebook", link: "https://facebook.com/watch/?v=000000", evidence: ["video_menteri.mp4"], priority: "Tinggi", article: "deepfake" }); });
  walk(c, [
    [53, (c) => verifyCase(c, SEED_ADMIN)], [52.9, runDuplicateCheck],
    [52, (c) => classifyCase(c, "Media dimanipulasi / deepfake", ["Teknologi", "Politik"], SEED_ADMIN)],
    [51.5, (c) => assignAgencies(c, ["PDRM"], 48, "Semak keaslian video bersama unit forensik digital", SEED_ADMIN)],
    [50, start], [44, submit("PDRM mengesahkan video tersebut dijana menggunakan teknologi AI. Analisis forensik digital mendapati suara dan gerakan bibir tidak sepadan. Tiada cuti umum diumumkan oleh kerajaan.", [{ name: "laporan_forensik_digital.pdf", size: 512000 }])], [40, approve("PDRM")], [20, (c) => approveRebuttal(c, SEED_ADMIN)],
  ]);

  // Quality review — draft rebuttal waiting for the admin
  at(T - 50 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0024", claim: "Mesej mendakwa tol di lebuh raya percuma sepanjang cuti sekolah bulan ini", reporter: "melvin.t@gmail.com", platform: "Telegram", evidence: ["poster_tol.png"], article: "toll" }); });
  walk(c, [
    [49, (c) => verifyCase(c, SEED_ADMIN)], [48.9, runDuplicateCheck],
    [48, (c) => classifyCase(c, "Maklumat palsu", ["Pengangkutan"], SEED_ADMIN)],
    [47.5, (c) => assignAgencies(c, ["MOT"], 72, "", SEED_ADMIN)],
    [45, start], [30, submit("Kementerian Pengangkutan menegaskan tiada pengecualian tol diumumkan bagi cuti sekolah bulan ini. Poster yang tersebar menggunakan reka bentuk lama daripada kempen musim perayaan 2024 dan telah disunting. Pengguna lebuh raya diminta merujuk saluran rasmi kementerian dan syarikat konsesi.", [{ name: "kenyataan_mot_tol.pdf", size: 163840 }])],
    [6, approve("MOT")],
  ]);

  // Multi-agency review with an SLA breach
  at(T - 60 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0027", claim: "Dakwaan jambatan di Kuantan runtuh akibat banjir kilat pagi tadi", reporter: "aziz.m@gmail.com", platform: "X (Twitter)", link: "https://x.com/contoh/status/000000", evidence: ["gambar_jambatan.jpg"], priority: "Tinggi" }); });
  walk(c, [
    [59, (c) => verifyCase(c, SEED_ADMIN)], [58.9, runDuplicateCheck],
    [58.5, (c) => classifyCase(c, "Maklumat palsu", ["Bencana", "Pengangkutan"], SEED_ADMIN)],
    [58, (c) => assignAgencies(c, ["JPS", "NADMA"], 48, "Sahkan status jambatan dan keadaan banjir semasa", SEED_ADMIN)],
    [55, start], [36, submit("JPS mengesahkan jambatan di Kuantan masih berfungsi dan tidak runtuh. Gambar yang tular diambil di lokasi lain pada tahun 2021. Beberapa jalan kampung ditutup sementara akibat banjir kilat.", [{ name: "laporan_pemeriksaan_jambatan.pdf", size: 286720 }])], [30, approve("JPS")],
    [20, changes("NADMA", "Sertakan status terkini laluan alternatif dan senarai jalan yang ditutup menurut Pusat Kawalan Operasi Bencana.")],
    [4, (c) => remindAgency(c, "JPS", SEED_ADMIN)],
  ]);

  // Multi-agency review, on time
  at(T - 30 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0033", claim: "Hantaran Facebook mendakwa vaksin HPV menyebabkan kemandulan dalam kalangan pelajar", reporter: "cikgu.lina@moe.edu.my", channel: "Sambungan pelayar", platform: "Facebook", evidence: ["hantaran_fb.png"], priority: "Tinggi" }); });
  walk(c, [
    [29, (c) => verifyCase(c, SEED_ADMIN)], [28.9, runDuplicateCheck],
    [28.5, (c) => classifyCase(c, "Maklumat palsu", ["Kesihatan", "Pendidikan"], SEED_ADMIN)],
    [28, (c) => assignAgencies(c, ["KKM", "KPM"], 72, "Program imunisasi sekolah — perlu kenyataan bersama", SEED_ADMIN)],
    [26, start], [18, submit("Kementerian Kesihatan Malaysia menegaskan vaksin HPV adalah selamat dan tidak menyebabkan kemandulan. Vaksin ini telah digunakan dalam Program Imunisasi Kebangsaan sejak 2010 dan dipantau secara berterusan. Ibu bapa dinasihatkan merujuk maklumat rasmi KKM.", [{ name: "kenyataan_kkm_hpv.pdf", size: 204800 }, { name: "data_keselamatan_vaksin.xlsx", size: 61440 }], "Disemak bersama Bahagian Kawalan Penyakit; tiada laporan kesan sampingan serius berkaitan kemandulan.")],
  ]);

  // Just assigned — new case for the KKM officer (KPM tagged)
  at(T - 20 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0035", claim: "Mesej tular mendakwa suntikan tambahan diwajibkan untuk semua murid sekolah rendah mulai Januari", reporter: "puan.rohana@gmail.com", platform: "WhatsApp", evidence: ["mesej_suntikan.jpg"], priority: "Tinggi" }); });
  walk(c, [
    [19.5, (c) => verifyCase(c, SEED_ADMIN)], [19.4, runDuplicateCheck],
    [19, (c) => classifyCase(c, "Maklumat palsu", ["Kesihatan", "Pendidikan"], SEED_ADMIN)],
    [3, (c) => assignAgencies(c, ["KKM", "KPM"], 72, "Tular dalam kumpulan ibu bapa — perlu kenyataan bersama", SEED_ADMIN)],
  ]);

  // Classified, waiting for assignment
  at(T - 9 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0038", claim: "SMS mendakwa akaun bank akan dibekukan jika maklumat tidak dikemas kini dalam 24 jam", reporter: "0123456789 (SMS)", channel: "Aplikasi mudah alih", platform: "SMS", evidence: ["sms_bank.jpg"], priority: "Tinggi" }); });
  walk(c, [[8.5, (c) => verifyCase(c, SEED_ADMIN)], [8.4, runDuplicateCheck], [8, (c) => classifyCase(c, "Penipuan", ["Penipuan", "Ekonomi"], SEED_ADMIN)]]);

  // Verified — the AI check will flag this as a duplicate of 0012
  at(T - 5 * HOUR, () => { c = receiveCase({ id: "SBN-2026-0041", claim: "Pautan bantuan digital RM500 tersebar semula dalam kumpulan Telegram", reporter: "danial.h@gmail.com", platform: "Telegram", evidence: ["telegram_rm500.png"], dupOf: "SBN-2026-0012", dupScore: 94 }); });
  walk(c, [[4, (c) => verifyCase(c, SEED_ADMIN)]]);

  // Brand new
  at(T - 150 * MIN, () => receiveCase({ id: "SBN-2026-0043", claim: "Video TikTok mendakwa gempa bumi besar akan melanda Sabah minggu depan", reporter: "joanne.l@gmail.com", channel: "Sambungan pelayar", platform: "TikTok", link: "https://www.tiktok.com/@contoh/video/000000", evidence: [] }));
  at(T - 40 * MIN, () => receiveCase({ id: "SBN-2026-0045", claim: "Mesej WhatsApp mendakwa air paip di Petaling Jaya tercemar bahan kimia berbahaya", reporter: "haslinda.o@gmail.com", platform: "WhatsApp", evidence: ["tangkapan_skrin_whatsapp.jpg", "rakaman_suara.m4a"], priority: "Tinggi" }));

  // A few non-case entries so the audit log shows other user actions
  at(T - 26 * HOUR, () => audit(EDITOR, "Log masuk", "Portal pentadbir", "Log masuk berjaya"));
  at(T - 25 * HOUR, () => audit(SEED_ADMIN, "Eksport laporan", "Laporan bulanan Ogos 2026", "Format CSV"));
  at(T - 22 * HOUR, () => audit(agencyOfficer("KKM"), "Log masuk", "Portal pentadbir", "Log masuk berjaya"));
  at(T - 14 * HOUR, () => audit({ name: "unknown@gmail.com", role: "—" }, "Log masuk gagal", "Portal pentadbir", "Kata laluan salah (3 cubaan)"));
  at(T - 3 * HOUR, () => audit(PUBLISHER, "Log masuk", "Portal pentadbir", "Log masuk berjaya"));

  store.cases.sort((a, b) => b.receivedAt - a.receivedAt);
  store.audit.sort((a, b) => b.at - a.at);
  store.notices.sort((a, b) => b.at - a.at).forEach((n) => (n.read = T - n.at > 12 * HOUR));
  _seeding = false;
  saveStore();
}
