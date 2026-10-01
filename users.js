/* Staff accounts for the MCMC and agency portals (mockup — localStorage stands in for the database).
   Loaded after ../cases.js on every portal page, and by admin/adminlogin.html.
   Every account is "aktif" (active) or "tidak_aktif" (inactive); an inactive account cannot log in,
   and an open session is signed out as soon as its account is deactivated. Only the MCMC Admin
   manages accounts and their status; everyone can update their own profile under "Akaun saya". */

const USERS_KEY = "sbn-users-v1";

const ROLES = {
  "mcmc-admin": { label: "MCMC Admin", agency: false },
  "mcmc-editor": { label: "MCMC Editor", agency: false },
  "mcmc-publisher": { label: "MCMC Content Publisher", agency: false },
  "agency-officer": { label: "Agency Officer", agency: true },
  "agency-reviewer": { label: "Agency Reviewer", agency: true },
};
const USER_STATUS = { aktif: "Aktif", tidak_aktif: "Tidak aktif" };

let users = null;

function loadUsers() {
  try { users = JSON.parse(localStorage.getItem(USERS_KEY)); } catch (e) { users = null; }
  if (!Array.isArray(users)) seedUsers();
  return users;
}
function saveUsers() {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) { }
}
function resetUsers() {
  seedUsers();
}

const findUser = (email) => (users || loadUsers()).find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());
const getUser = (id) => users.find((u) => u.id === id);
const roleLabel = (u) => ROLES[u.role].label + (u.agency ? ` · ${u.agency}` : "");
const isActive = (u) => !u || u.status === "aktif";
const userStatusBadge = (u) => u.status === "aktif"
  ? `<span class="acct on"><i aria-hidden="true"></i>Aktif</span>`
  : `<span class="acct off"><i aria-hidden="true"></i>Tidak aktif</span>`;

// The e-mail domain decides where a login lands (nama@mcmc.gov.my, nama@kkm.gov.my …)
function emailDomainError(email, role, agency) {
  const e = String(email).toLowerCase();
  if (!ROLES[role].agency) return e.endsWith("@mcmc.gov.my") ? "" : "Akaun MCMC mesti menggunakan e-mel @mcmc.gov.my.";
  if (!agency) return "Pilih agensi.";
  return e.endsWith(`@${agency.toLowerCase()}.gov.my`) ? "" : `Akaun ${agency} mesti menggunakan e-mel @${agency.toLowerCase()}.gov.my.`;
}

/* ---------- Changes (each one is written to the audit log in cases.js) ---------- */
const USER_FIELDS = { name: "Nama", email: "E-mel", phone: "Telefon", position: "Jawatan", role: "Peranan", agency: "Agensi" };

function addUser(data, actor) {
  const n = users.reduce((m, u) => Math.max(m, +u.id.slice(1)), 0) + 1;
  const u = {
    id: `U${String(n).padStart(3, "0")}`, name: data.name, email: data.email, phone: data.phone || "", position: data.position || "",
    role: data.role, agency: ROLES[data.role].agency ? data.agency : null, status: data.status || "aktif", statusNote: data.statusNote || "",
    createdAt: Date.now(), updatedAt: Date.now(), lastLogin: null,
  };
  users.push(u);
  audit(actor, "Tambah pengguna", u.email, `${roleLabel(u)} · ${USER_STATUS[u.status]}`);
  return u;
}

// Returns the list of fields that changed
function updateUser(u, patch, actor, action = "Kemas kini akaun") {
  if ("role" in patch && !ROLES[patch.role].agency) patch.agency = null;
  const changed = Object.keys(USER_FIELDS).filter((k) => k in patch && (patch[k] || "") !== (u[k] || ""));
  if (!changed.length) return changed;
  const detail = changed.map((k) => k === "role" ? `${USER_FIELDS[k]}: ${ROLES[u.role].label} → ${ROLES[patch.role].label}` : `${USER_FIELDS[k]}: ${u[k] || "—"} → ${patch[k] || "—"}`).join("; ");
  const target = u.email;
  changed.forEach((k) => (u[k] = patch[k]));
  u.updatedAt = Date.now();
  audit(actor, action, target, detail);
  return changed;
}

function setUserStatus(u, status, actor, note) {
  if (u.status === status) return false;
  u.status = status;
  u.statusNote = status === "aktif" ? "" : note || "";
  u.updatedAt = Date.now();
  audit(actor, status === "aktif" ? "Aktifkan akaun" : "Nyahaktifkan akaun", u.email, `${roleLabel(u)}${note && status !== "aktif" ? ` · ${note}` : ""}`);
  return true;
}

// The signed-in person's account; a demo login with a new e-mail gets an account on first use
function ensureUser(me, roleId, agency) {
  loadUsers();
  let u = findUser(me.name);
  if (!u) {
    const name = me.name.split("@")[0].replace(/[._]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
    u = addUser({ name, email: me.name, role: roleId, agency: ROLES[roleId].agency ? agency : null }, SYSTEM);
    saveUsers();
  }
  return u;
}

// Sign out straight away if this account has been deactivated (also re-checked when another tab changes it)
function guardActive(email) {
  const check = () => {
    loadUsers();
    if (isActive(findUser(email))) return true;
    try { localStorage.removeItem("sbn-admin"); sessionStorage.removeItem("sbn-admin-session"); } catch (e) { }
    location.replace("../admin/adminlogin.html?akaun=tidak-aktif");
    return false;
  };
  window.addEventListener("storage", (e) => { if (e.key === USERS_KEY) check(); });
  return check();
}

/* ---------- "Akaun saya" (every portal). Uses the page's $, esc and toast. ---------- */
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" }) : "—");
const fmtWhen = (t) => (t ? new Date(t).toLocaleString("ms-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Belum pernah");

function accountView(me, el, roleId, agency, onSaved) {
  const u = ensureUser(me, roleId, agency);
  const field = (id, label, value, opts = "") => `<div><label class="lbl" for="${id}">${label}</label><input id="${id}" class="ctl" value="${esc(value || "")}" ${opts}></div>`;
  el.innerHTML = `
    <div class="acct-grid">
      <div style="display:grid;gap:18px;min-width:0">
        <form class="card" id="acct-form" novalidate>
          <div class="card-head"><div><h2>Maklumat akaun</h2><p>Kemas kini nama, nombor telefon dan jawatan anda</p></div></div>
          <div class="form-row">
            ${field("a-name", "Nama penuh", u.name, 'required autocomplete="name"')}
            ${field("a-phone", "No. telefon", u.phone, 'type="tel" autocomplete="tel" placeholder="cth. 03-8688 8000"')}
          </div>
          <div class="form-row">
            ${field("a-position", "Jawatan", u.position, 'placeholder="cth. Pegawai Komunikasi"')}
            ${field("a-email", "E-mel", u.email, "readonly")}
          </div>
          <p class="field-err" id="a-err" hidden></p>
          <p class="demo-note" style="margin:0 0 14px">E-mel, peranan dan agensi hanya boleh ditukar oleh MCMC Admin.</p>
          <div class="action-row"><button class="btn-p" type="submit">Simpan perubahan</button></div>
        </form>

        <form class="card" id="pw-form" novalidate>
          <div class="card-head"><div><h2>Tukar kata laluan</h2><p>Sekurang-kurangnya 8 aksara, dengan huruf dan nombor</p></div></div>
          <div class="form-row one">${field("p-old", "Kata laluan semasa", "", 'type="password" autocomplete="current-password"')}</div>
          <div class="form-row">
            ${field("p-new", "Kata laluan baharu", "", 'type="password" autocomplete="new-password"')}
            ${field("p-again", "Sahkan kata laluan baharu", "", 'type="password" autocomplete="new-password"')}
          </div>
          <p class="field-err" id="p-err" hidden></p>
          <div class="action-row"><button class="btn-s" type="submit">Tukar kata laluan</button></div>
        </form>
      </div>

      <div style="display:grid;gap:18px;align-content:start;min-width:0">
        <div class="card acct-card">
          <span class="acct-avatar">${esc(u.name[0] || "?")}</span>
          <b class="acct-name">${esc(u.name)}</b>
          <span class="acct-mail">${esc(u.email)}</span>
          <dl class="facts acct-facts">
            <div><dt>Status akaun</dt><dd>${userStatusBadge(u)}</dd></div>
            <div><dt>Peranan</dt><dd>${esc(ROLES[u.role].label)}</dd></div>
            ${u.agency ? `<div><dt>Agensi</dt><dd>${esc(u.agency)} · ${esc(AGENCY[u.agency].name)}</dd></div>` : ""}
            <div><dt>Ahli sejak</dt><dd>${fmtDate(u.createdAt)}</dd></div>
            <div><dt>Log masuk terakhir</dt><dd>${fmtWhen(u.lastLogin)}</dd></div>
          </dl>
          <p class="demo-note" style="margin:0">${u.role === "mcmc-admin"
            ? `Urus status akaun semua pengguna di <a href="#users">Pengurusan pengguna</a>.`
            : "Status akaun diurus oleh MCMC Admin. Akaun yang tidak aktif tidak boleh log masuk."}</p>
        </div>
      </div>
    </div>`;

  const showErr = (id, msg) => { $(id).textContent = msg; $(id).hidden = !msg; return !msg; };

  $("acct-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("a-name").value.trim();
    if (!showErr("a-err", name ? "" : "Nama penuh diperlukan.")) return $("a-name").focus();
    const changed = updateUser(u, { name, phone: $("a-phone").value.trim(), position: $("a-position").value.trim() }, me, "Kemas kini profil");
    saveUsers();
    saveStore();
    toast(changed.length ? "Maklumat akaun dikemas kini" : "Tiada perubahan");
    if (onSaved) onSaved();
  });

  $("pw-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const [o, n, a] = ["p-old", "p-new", "p-again"].map((id) => $(id).value);
    const err = !o ? "Masukkan kata laluan semasa."
      : n.length < 8 || !/[a-z]/i.test(n) || !/\d/.test(n) ? "Kata laluan baharu mesti sekurang-kurangnya 8 aksara, dengan huruf dan nombor."
      : n !== a ? "Pengesahan kata laluan tidak sepadan."
      : n === o ? "Kata laluan baharu mesti berbeza daripada kata laluan semasa." : "";
    if (!showErr("p-err", err)) return;
    // TODO: send to the backend; the mockup does not store passwords
    audit(me, "Tukar kata laluan", u.email, "Kata laluan dikemas kini");
    saveStore();
    $("pw-form").reset();
    toast("Kata laluan telah ditukar");
  });
}

/* ---------- Seed ---------- */
function seedUsers() {
  const T = Date.now(), D = 24 * 3600e3;
  const P = { officer: "Pegawai Komunikasi Korporat", reviewer: "Ketua Unit Komunikasi Korporat" };
  const AGENCY_STAFF = {
    KKM: ["Dr. Lim Wei Ling", "Dr. Ahmad Faiz Kamal"], PDRM: ["Insp. Kumar Raj", "ASP Zulkifli Hassan"], BNM: ["Sarah Yusof", "Daniel Wong"],
    KPM: ["Noraini Abdullah", "Mohd Rizal Hamzah"], MOT: ["Hazwan Ismail", "Priya Nair"], JPS: ["Ir. Shahrul Nizam", "Ir. Chong Mei Fong"],
    NADMA: ["Fatimah Zahra", "Kol. Azman Said"], JAKIM: ["Hakim Zaini", "Nur Aisyah Rahim"], JAS: ["Siti Mariam Osman", "Gopal Krishnan"],
    KPDN: ["Azlan Shah Mohd", "Lee Chee Keong"],
  };
  const rows = [
    ["Nurul Huda Ismail", "nurul.huda@mcmc.gov.my", "mcmc-admin", null, "Pegawai Kanan Pemantauan", "aktif", 410, 0.2],
    ["Pentadbir Sistem", "admin@mcmc.gov.my", "mcmc-admin", null, "Pentadbir Sistem", "aktif", 600, 3],
    ["Aina Rahman", "aina.rahman@mcmc.gov.my", "mcmc-editor", null, "Editor Kandungan", "aktif", 380, 1.1],
    ["Mei Ling Tan", "meiling.tan@mcmc.gov.my", "mcmc-editor", null, "Editor Kandungan", "aktif", 150, 5],
    ["Hafiz Zain", "hafiz.zain@mcmc.gov.my", "mcmc-publisher", null, "Penerbit Kandungan Digital", "aktif", 355, 0.1],
    ["Faizal Omar", "faizal.omar@mcmc.gov.my", "mcmc-editor", null, "Editor Kandungan", "tidak_aktif", 520, 64, "Bertukar ke Bahagian Spektrum"],
    ["Rosli Hamid", "rosli.hamid@mcmc.gov.my", "mcmc-admin", null, "Pengurus Operasi", "tidak_aktif", 700, 120, "Bersara pada Jun 2026"],
  ];
  Object.entries(AGENCY_STAFF).forEach(([ag, [officer, reviewer]], i) => {
    const id = ag.toLowerCase();
    rows.push([officer, `pegawai@${id}.gov.my`, "agency-officer", ag, P.officer, "aktif", 300 - i * 9, 0.9 + i * 0.7]);
    rows.push([reviewer, `penyemak@${id}.gov.my`, "agency-reviewer", ag, P.reviewer, "aktif", 310 - i * 8, 1.4 + i * 1.3]);
  });
  rows.push(["Tan Siew Lan", "pegawai2@kkm.gov.my", "agency-officer", "KKM", P.officer, "tidak_aktif", 240, 41, "Cuti belajar sehingga Disember 2026"]);
  rows.push(["Roslan Bakar", "penyemak2@pdrm.gov.my", "agency-reviewer", "PDRM", P.reviewer, "tidak_aktif", 260, 90, "Bertukar jabatan"]);

  users = rows.map(([name, email, role, agency, position, status, joinedDays, loginDays, statusNote], i) => ({
    id: `U${String(i + 1).padStart(3, "0")}`, name, email, role, agency, position,
    phone: `03-${8000 + ((i * 137) % 1900)} ${String(1000 + ((i * 7919) % 9000)).padStart(4, "0")}`,
    status, statusNote: statusNote || "", createdAt: T - joinedDays * D, lastLogin: T - loginDays * D,
    // inactive accounts were last changed when they were deactivated, after their last login
    updatedAt: T - (status === "aktif" ? Math.min(joinedDays, loginDays + 2) : loginDays - 1) * D,
  }));
  saveUsers();
}
