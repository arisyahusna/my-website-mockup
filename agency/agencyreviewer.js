/* Multi-Agency Reviewer portal (mockup): read the lead agency's draft rebuttal, evaluate accuracy,
   approve or request changes. When every tagged agency approves, the case advances to MCMC. Workflow lives in ../cases.js. */

const AG = pickAgency();
const me = startSession("agency-reviewer", agencyReviewer(AG), ownsEmail(AG));
const drawBell = agencyShell(AG, `reviewer:${AG}`);

const mineOf = (c) => assignmentOf(c, AG);
const inReview = () =>
  agencyCases(AG).filter((c) => c.status === "semakan_agensi");
const LISTS = [
  [
    "pending",
    "Perlu semakan",
    () => inReview().filter((c) => mineOf(c).status === "draf"),
  ],
  [
    "waiting",
    "Menunggu agensi lain",
    () => inReview().filter((c) => mineOf(c).status === "diluluskan"),
  ],
  [
    "changes",
    "Pindaan diminta",
    () => inReview().filter((c) => mineOf(c).status === "pindaan"),
  ],
  [
    "nodraft",
    "Belum ada draf",
    () =>
      inReview().filter((c) =>
        ["diterima", "menyelidik"].includes(mineOf(c).status),
      ),
  ],
  ["done", "Dimajukan ke MCMC", () => agencyCases(AG).filter(pastAgencies)],
];
let listTab = "pending";

function commit(msg) {
  saveStore();
  $("nav-reviews").textContent = LISTS[0][2]().length || "";
  drawBell();
  if (msg) toast(msg);
}

/* ---------- Review list ---------- */
function renderReviews() {
  const q = $("global-q").value.trim().toLowerCase();
  const list = LISTS.find((l) => l[0] === listTab)[2]().filter(
    (c) => !q || `${c.id} ${c.claim}`.toLowerCase().includes(q),
  );
  const week = agencyCases(AG).flatMap((c) =>
    (c.reviews || []).filter(
      (r) =>
        r.agency === AG &&
        r.decision === "lulus" &&
        Date.now() - r.at < 7 * 24 * HOUR,
    ),
  );
  $("view-reviews").innerHTML = `
    <div class="kpis kpis-4">
      <div class="kpi"><div class="kpi-label">Perlu semakan anda</div><div class="kpi-value">${LISTS[0][2]().length}</div><div class="kpi-delta">draf daripada agensi peneraju</div></div>
      <div class="kpi"><div class="kpi-label">Menunggu agensi lain</div><div class="kpi-value">${LISTS[1][2]().length}</div><div class="kpi-delta">anda telah meluluskan</div></div>
      <div class="kpi"><div class="kpi-label">Pindaan diminta</div><div class="kpi-value">${LISTS[2][2]().length}</div><div class="kpi-delta">menunggu versi baharu</div></div>
      <div class="kpi"><div class="kpi-label">Diluluskan (7 hari)</div><div class="kpi-value">${week.length}</div><div class="kpi-delta">oleh penyemak ${AG}</div></div>
    </div>
    <div class="tabs" style="margin-top:22px">${LISTS.map(([k, label, fn]) => `<button data-tab="${k}" class="${k === listTab ? "on" : ""}">${label}<span class="count">${fn().length}</span></button>`).join("")}</div>
    ${caseTable(
      list,
      [
        ["ID kes", (c) => `<span class="mono">${c.id}</span>`],
        ["Jenis kes", (c) => typeBadge(c.type)],
        [
          "Dakwaan",
          (c) =>
            `<div class="claim-cell"><b>${esc(c.claim)}</b><small>Peneraju ${leadOf(c)}${c.draft && c.draft.version ? ` · draf versi ${c.draft.version}` : ""}</small></div>`,
        ],
        [
          "Dihantar",
          (c) =>
            draftSubmitted(c)
              ? `<span title="${fmtDT(c.draft.submittedAt)}">${ago(c.draft.submittedAt)}</span>`
              : "—",
        ],
        [
          "Kelulusan",
          (c) =>
            `${c.assignments.filter((a) => a.status === "diluluskan").length}/${c.assignments.length} agensi`,
        ],
        ["Status anda", (c) => agencyStatusBadge(c, mineOf(c))],
        ["SLA", (c) => (pastAgencies(c) ? "—" : slaBadgeOf(mineOf(c)))],
      ],
      listTab === "pending"
        ? "Tiada draf menunggu semakan anda."
        : "Tiada kes dalam senarai ini.",
    )}
    <p class="demo-note">Anda log masuk sebagai penyemak ${AG}. Tukar agensi di bahagian atas untuk melihat semakan agensi lain (demo).</p>`;
  $("view-reviews")
    .querySelectorAll("[data-tab]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        listTab = b.dataset.tab;
        renderReviews();
      }),
    );
  bindCaseRows($("view-reviews"));
}

/* ---------- Review workspace ---------- */
const STEPS = [
  ["Notifikasi", "draf diterima"],
  ["Baca draf", "agensi peneraju"],
  ["Nilai ketepatan", "senarai semak"],
  ["Keputusan", "lulus / pindaan"],
  ["Semua lulus?", "agensi ditandakan"],
  ["Ke MCMC", "semakan kualiti"],
];
const CHECKS = [
  "Fakta disokong oleh dokumen sokongan yang dilampirkan",
  `Selaras dengan rekod dan kenyataan rasmi ${AG}`,
  "Tiada maklumat sulit atau peribadi didedahkan",
  "Bahasa jelas, tepat dan tidak mengelirukan",
];
const ticks = {};

function stepIndex(c, a) {
  if (pastAgencies(c)) return 6;
  return { diterima: 0, menyelidik: 0, draf: 1, pindaan: 3, diluluskan: 4 }[
    a.status
  ];
}

function renderCase(id) {
  const c = getCase(id),
    root = $("view-case");
  const a = c && mineOf(c);
  if (!a) {
    root.innerHTML = `<div class="card">Kes ${esc(id)} tidak melibatkan ${AG}. <a href="#reviews" class="btn-g">Kembali</a></div>`;
    return;
  }
  $("page-title").textContent = c.id;
  ensureDraft(c);

  root.innerHTML = `
    <a href="#reviews" class="back-link">← Senarai semakan</a>
    ${caseHead(c)}
    <div class="card" style="margin-top:18px">${stepFlow(STEPS, stepIndex(c, a), pastAgencies(c))}</div>
    <div class="ws-grid">
      <div class="ws-col">
        ${draftCard(c, "Draf sanggahan daripada agensi peneraju")}
        ${decisionPanel(c, a)}
      </div>
      <div class="ws-col">
        ${approvalsCard(c)}
        ${caseInfoCard(c, AG)}
        ${historyCard(c)}
      </div>
    </div>`;
  bindHistory(root, () => renderCase(id));
  bindCase(c, a);
}

function decisionPanel(c, a) {
  if (pastAgencies(c)) {
    return `<div class="card action-panel"><h3>✓ Dimajukan kepada MCMC</h3><p>Semua agensi yang ditandakan telah meluluskan. Kes kini di peringkat <b>${esc(STAGE[c.status].label)}</b>.</p></div>`;
  }
  if (["diterima", "menyelidik"].includes(a.status)) {
    return `<div class="card action-panel"><h3>Menunggu draf</h3><p>${leadOf(c)} sedang menyiasat dan menyediakan draf sanggahan. Anda akan menerima notifikasi apabila draf dihantar.</p></div>`;
  }
  if (a.status === "pindaan") {
    return `<div class="card action-panel"><h3>Pindaan diminta</h3><p>Menunggu ${leadOf(c)} menyemak semula dan menghantar versi ${c.draft.version + 1}. Semua agensi perlu menyemak semula versi baharu.</p></div>`;
  }
  if (a.status === "diluluskan") {
    const left = c.assignments
      .filter((x) => x.status !== "diluluskan")
      .map((x) => x.agency);
    return `<div class="card action-panel"><h3>✓ Anda telah meluluskan versi ${c.draft.version}</h3>
      <p>Menunggu kelulusan daripada ${left.join(", ")}. Kes akan dimajukan kepada MCMC secara automatik apabila semua agensi meluluskan.</p></div>`;
  }
  const t = ticks[c.id] || [];
  return `<div class="card action-panel">
    <h3>Nilai ketepatan draf versi ${c.draft.version}</h3>
    <p>Semak kenyataan dan dokumen sokongan daripada ${leadOf(c)} berdasarkan rekod ${AG}.</p>
    <div class="check-list">${CHECKS.map((x, i) => `<label><input type="checkbox" class="rcheck" data-i="${i}" ${t[i] ? "checked" : ""}> ${esc(x)}</label>`).join("")}</div>
    <div class="form-row one" style="margin:14px 0 0"><div><label class="lbl" for="f-comment">Ulasan (wajib jika meminta pindaan)</label>
      <textarea id="f-comment" class="ctl" rows="3" placeholder="cth. Sertakan tarikh kenyataan rasmi dan rujukan pekeliling"></textarea></div></div>
    <div class="action-row">
      <button class="btn-p" data-act="approve" disabled>Luluskan draf</button>
      <button class="btn-d" data-act="changes">Minta pindaan</button>
    </div>
    <p class="demo-note" id="missing"></p>
  </div>`;
}

function bindCase(c, a) {
  const root = $("view-case");
  const act = (name, fn) =>
    root
      .querySelectorAll(`[data-act="${name}"]`)
      .forEach((b) => b.addEventListener("click", fn));
  const redraw = (msg) => {
    commit(msg);
    renderCase(c.id);
  };
  if (!root.querySelector('[data-act="approve"]')) return;

  const refresh = () => {
    const done = (ticks[c.id] || []).filter(Boolean).length;
    root.querySelector('[data-act="approve"]').disabled = done < CHECKS.length;
    $("missing").textContent =
      done < CHECKS.length
        ? `Lengkapkan senarai semak untuk meluluskan (${done}/${CHECKS.length})`
        : "✓ Sedia untuk diluluskan";
  };
  root.querySelectorAll(".rcheck").forEach((i) =>
    i.addEventListener("change", () => {
      (ticks[c.id] = ticks[c.id] || [])[+i.dataset.i] = i.checked;
      refresh();
    }),
  );
  act("approve", () => {
    reviewerApprove(c, AG, $("f-comment").value.trim(), me);
    delete ticks[c.id];
    redraw(
      pastAgencies(c)
        ? "Semua agensi meluluskan — kes dimajukan kepada MCMC"
        : "Kelulusan dihantar — menunggu agensi lain",
    );
  });
  act("changes", () => {
    const comment = $("f-comment").value.trim();
    if (!comment) {
      $("f-comment").focus();
      return toast("Tulis ulasan pindaan untuk agensi peneraju");
    }
    reviewerRequestChanges(c, AG, comment, me);
    delete ticks[c.id];
    redraw(`Pindaan diminta — ${leadOf(c)} telah dimaklumkan`);
  });
  refresh();
}

/* ---------- Router ---------- */
const TITLES = { reviews: "Semakan draf", activity: "Log aktiviti", account: "Akaun saya" };
function route() {
  const [view, id] = location.hash.slice(1).split("/");
  const v = view === "case" && id ? "case" : TITLES[view] ? view : "reviews";
  document
    .querySelectorAll(".adm-view")
    .forEach((s) => (s.hidden = s.dataset.view !== v));
  document
    .querySelectorAll(".adm-nav a")
    .forEach((x) =>
      x.classList.toggle(
        "active",
        x.dataset.view === (v === "case" ? "reviews" : v),
      ),
    );
  $("crumb").textContent =
    v === "case" ? `Semakan · ${AG}` : `Agency Reviewer · ${AG}`;
  $("page-title").textContent = TITLES[v] || "";
  if (v === "reviews") renderReviews();
  if (v === "case") renderCase(decodeURIComponent(id));
  if (v === "activity") activityView(me, $("view-activity"));
  if (v === "account") accountView(me, $("view-account"), me.roleId, me.agency);
}
window.addEventListener("hashchange", () => {
  route();
  window.scrollTo(0, 0);
});
$("global-q").addEventListener("input", () => {
  if (location.hash.startsWith("#case/") || location.hash === "#activity" || location.hash === "#account")
    location.hash = "#reviews";
  else renderReviews();
});

bindShell(me, () => {
  commit();
  route();
});
commit();
route();
