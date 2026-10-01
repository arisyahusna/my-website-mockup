/* Content Publisher: edit the public Info & Panduan pages (info/info.html and the guides in info/).
   Content lives in ../infocontent.js; loaded before contentpublisher.js, which routes #info and #guide/<id> here. */

const INFO_PAGE = "../info/info.html";
const MAX_UPLOAD = 1.5 * 1024 * 1024; // localStorage is small; larger files should be added as a file path instead
let guideDraft = null; // working copy while the editor is open

function infoAudit(action, target, detail) {
  audit(me, action, target, detail);
  saveStore();
}
function storeInfo(msg) {
  if (!saveInfo()) { toast("Tidak dapat menyimpan — storan pelayar penuh. Gunakan imej yang lebih kecil atau laluan fail."); return false; }
  if (msg) toast(msg);
  return true;
}
const statusChip = (g) => g.visible
  ? `<span class="sla good"><span class="ic" aria-hidden="true">✓</span>Diterbitkan</span>`
  : `<span class="chip-tag">Disembunyikan</span>`;

/* ---------- #info: page heading + list of guides ---------- */
function renderInfoAdmin() {
  loadInfo();
  const n = info.guides.length, shown = info.guides.filter((g) => g.visible).length;
  $("view-info").innerHTML = `
    <p class="muted-p" style="margin:0 0 16px">Kandungan halaman awam <a href="${INFO_PAGE}" target="_blank" rel="noopener" style="color:var(--brand);font-weight:600">info/info.html ↗</a> · perubahan diterbitkan serta-merta.</p>

    <form class="card" id="page-form" novalidate>
      <div class="card-head"><div><h2>Pengepala halaman</h2><p>Tajuk dan pengenalan di bahagian atas halaman Info &amp; Panduan</p></div></div>
      <div class="form-row one"><div><label class="lbl" for="p-title">Tajuk</label><input id="p-title" class="ctl" value="${esc(info.page.title)}" required></div></div>
      <div class="form-row one"><div><label class="lbl" for="p-lede">Pengenalan</label><textarea id="p-lede" class="ctl" rows="2">${esc(info.page.lede)}</textarea></div></div>
      <div class="action-row"><button class="btn-p" type="submit">Simpan pengepala</button></div>
    </form>

    <div class="card" style="margin-top:18px">
      <div class="card-head"><div><h2>Panduan</h2><p>${shown} daripada ${n} panduan diterbitkan · susunan di bawah ialah susunan kad di laman awam</p></div>
        <div class="card-tools"><a href="#guide/new" class="btn-p btn-sm">+ Panduan baharu</a></div></div>
      <div class="table-wrap"><table class="adm-table">
        <thead><tr><th style="width:64px">Susunan</th><th>Panduan</th><th>Media</th><th>Status</th><th>Dikemas kini</th><th></th></tr></thead>
        <tbody>${info.guides.map((g, i) => `<tr class="clickable" data-guide="${esc(g.id)}" tabindex="0">
          <td><div class="order-btns">
            <button class="btn-g btn-sm" data-move="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Naikkan ${esc(g.title)}">↑</button>
            <button class="btn-g btn-sm" data-move="${i}" data-dir="1" ${i === n - 1 ? "disabled" : ""} aria-label="Turunkan ${esc(g.title)}">↓</button></div></td>
          <td><div class="guide-row"><span class="guide-swatch ${esc(g.color)}">${infoIcon(g.icon)}</span>
            <div class="claim-cell"><b>${esc(g.title)}</b><small>${esc(g.summary)}</small></div></div></td>
          <td>${g.media.length ? g.media.map((m) => `<span class="chip-tag">${m.type === "video" ? "Video" : "Imej"}</span>`).join("") : "—"}</td>
          <td>${statusChip(g)}</td>
          <td title="${fmtDT(g.updatedAt)}">${ago(g.updatedAt)}</td>
          <td><div class="user-actions">
            <a href="#guide/${esc(g.id)}" class="btn-g btn-sm">Edit</a>
            <a href="${guideHref(g, "../info/")}${g.builtin ? "?" : "&"}pratonton=1" target="_blank" rel="noopener" class="btn-g btn-sm">Lihat ↗</a>
            <button class="btn-sm ${g.visible ? "btn-g" : "btn-s"}" data-vis="${esc(g.id)}">${g.visible ? "Sembunyikan" : "Terbitkan"}</button>
            ${g.builtin ? "" : `<button class="btn-g btn-sm danger-link" data-del="${esc(g.id)}">Padam</button>`}
          </div></td></tr>`).join("")}</tbody>
      </table></div>
    </div>

    <p class="demo-note">Panduan asal (berita palsu, troll, kawal emosi) mempunyai halaman tetap dan tidak boleh dipadam, tetapi semua kandungannya boleh dikemas kini atau disembunyikan.
      <button class="link-btn" id="info-reset" style="color:var(--brand);font-weight:600">Pulihkan kandungan asal</button></p>`;

  const root = $("view-info");
  $("page-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("p-title").value.trim(), lede = $("p-lede").value.trim();
    if (!title) return toast("Tajuk halaman diperlukan");
    if (title === info.page.title && lede === info.page.lede) return toast("Tiada perubahan");
    info.page = { title, lede };
    if (storeInfo("Pengepala halaman Info & Panduan dikemas kini")) infoAudit("Kemas kini Info & Panduan", "Halaman Info & Panduan", `Tajuk: ${title}`);
  });
  root.querySelectorAll("[data-guide]").forEach((tr) => {
    const open = () => (location.hash = `#guide/${tr.dataset.guide}`);
    tr.addEventListener("click", (e) => { if (!e.target.closest("a, button")) open(); });
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === tr) open(); });
  });
  root.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.move, j = i + +b.dataset.dir;
    [info.guides[i], info.guides[j]] = [info.guides[j], info.guides[i]];
    if (storeInfo("Susunan panduan dikemas kini")) infoAudit("Susun semula panduan", "Halaman Info & Panduan", info.guides.map((g) => g.title).join(" → "));
    renderInfoAdmin();
  }));
  root.querySelectorAll("[data-vis]").forEach((b) => b.addEventListener("click", () => {
    const g = guideById(b.dataset.vis);
    g.visible = !g.visible;
    g.updatedAt = Date.now();
    if (storeInfo(g.visible ? `“${g.title}” diterbitkan` : `“${g.title}” disembunyikan daripada laman awam`))
      infoAudit(g.visible ? "Terbitkan panduan" : "Sembunyikan panduan", `Panduan: ${g.title}`, "");
    renderInfoAdmin();
  }));
  root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    const g = guideById(b.dataset.del);
    if (!confirm(`Padam panduan “${g.title}”? Tindakan ini tidak boleh dibatalkan.`)) return;
    info.guides = info.guides.filter((x) => x !== g);
    if (storeInfo("Panduan dipadam")) infoAudit("Padam panduan", `Panduan: ${g.title}`, "");
    renderInfoAdmin();
  }));
  $("info-reset").addEventListener("click", () => {
    if (!confirm("Pulihkan semua kandungan Info & Panduan kepada versi asal? Panduan baharu dan perubahan akan dibuang.")) return;
    resetInfo();
    infoAudit("Pulihkan Info & Panduan", "Halaman Info & Panduan", "Kandungan asal dipulihkan");
    toast("Kandungan asal dipulihkan");
    renderInfoAdmin();
  });
}

/* ---------- #guide/<id> and #guide/new: the editor ---------- */
const blankGuide = () => ({
  id: "", builtin: false, visible: false, color: "blue", icon: "shield", readTime: 3, title: "", summary: "", lede: "", intro: "",
  media: [], note: { title: "", text: "" }, cta: { title: "Terima sesuatu yang meragukan?", text: "Hantarkan kepada kami untuk disemak." },
});
const slugify = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "panduan";

function renderGuideEditor(id) {
  loadInfo();
  const isNew = id === "new";
  if (!guideDraft || guideDraft._for !== id) {
    const src = isNew ? blankGuide() : guideById(id);
    if (!src) { $("view-guide").innerHTML = `<div class="card">Panduan ${esc(id)} tidak dijumpai. <a href="#info" class="btn-g">Kembali</a></div>`; return; }
    guideDraft = { ...JSON.parse(JSON.stringify(src)), _for: id };
  }
  const g = guideDraft;
  $("page-title").textContent = isNew ? "Panduan baharu" : g.title || "Panduan";
  const text = (fid, label, value, opts = "") => `<div><label class="lbl" for="${fid}">${label}</label><input id="${fid}" class="ctl" value="${esc(value)}" ${opts}></div>`;
  const area = (fid, label, value, rows, opts = "") => `<div><label class="lbl" for="${fid}">${label}</label><textarea id="${fid}" class="ctl" rows="${rows}" ${opts}>${esc(value)}</textarea></div>`;

  $("view-guide").innerHTML = `
    <a href="#info" class="back-link">← Info &amp; Panduan</a>
    <form class="case-grid" id="guide-form" novalidate>
      <div style="display:grid;gap:18px;min-width:0">
        <div class="card">
          <div class="card-head"><div><h2>Kad panduan</h2><p>Dipaparkan di halaman Info &amp; Panduan</p></div></div>
          <div class="form-row one">${text("g-title-in", "Tajuk", g.title, 'required maxlength="80" data-live')}</div>
          <div class="form-row one">${area("g-summary", `Ringkasan kad <span class="counter" id="sum-count"></span>`, g.summary, 2, 'maxlength="160" data-live')}</div>
          <div class="form-row">
            ${text("g-read", "Masa bacaan (minit)", g.readTime || "", 'type="number" min="1" max="30" data-live')}
            <div><span class="lbl">Warna</span><div class="swatch-pick">${Object.entries(INFO_COLORS).map(([k, label]) =>
              `<label title="${label}"><input type="radio" name="g-color" value="${k}" ${g.color === k ? "checked" : ""} data-live><span class="guide-swatch ${k}"></span><span class="sr-only">${label}</span></label>`).join("")}</div></div>
          </div>
          <div><span class="lbl">Ikon</span><div class="swatch-pick icons">${Object.keys(INFO_ICONS).map((k) =>
            `<label title="${k}"><input type="radio" name="g-icon" value="${k}" ${g.icon === k ? "checked" : ""} data-live><span class="guide-swatch plain">${infoIcon(k)}</span></label>`).join("")}</div></div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Halaman panduan</h2><p>${g.builtin ? `Halaman tetap: info/${esc(g.id)}.html` : isNew ? "Halaman baharu akan dicipta di info/panduan.html" : `info/panduan.html?id=${esc(g.id)}`}</p></div></div>
          <div class="form-row one">${area("g-lede", "Pengenalan (di bawah tajuk)", g.lede, 2, "required data-live")}</div>
          <div class="form-row one">${area("g-intro", "Teks pembuka <small>(pilihan; baris kosong memulakan perenggan baharu)</small>", g.intro, 4)}</div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Media</h2><p>Infografik atau video yang dipaparkan dalam panduan</p></div>
            <div class="card-tools"><button type="button" class="btn-s btn-sm" data-addmedia="image">+ Imej</button><button type="button" class="btn-s btn-sm" data-addmedia="video">+ Video</button></div></div>
          ${g.media.length ? `<ul class="media-list">${g.media.map((m, i) => `<li>
            <div class="media-thumb">${m.src ? m.type === "video" ? `<span>▶</span>` : `<img src="${esc(mediaSrc(m.src, "../"))}" alt="">` : `<span>${m.type === "video" ? "▶" : "🖼"}</span>`}</div>
            <div class="media-fields">
              <div class="form-row">
                ${text(`m-src-${i}`, m.type === "video" ? "Laluan atau pautan video" : "Laluan atau pautan imej", /^data:/.test(m.src) ? "(imej dimuat naik)" : m.src, `data-msrc="${i}" placeholder="${m.type === "video" ? "cth. image/fakenews.mp4" : "cth. image/troll.png"}" ${/^data:/.test(m.src) ? "readonly" : ""}`)}
                ${text(`m-cap-${i}`, "Kapsyen / sumber", m.caption, `data-mcap="${i}" placeholder="Pilihan"`)}
              </div>
              <div class="action-row" style="margin:0">
                ${m.type === "image" ? `<label class="btn-g btn-sm" style="cursor:pointer">Muat naik imej<input type="file" accept="image/*" data-upload="${i}" hidden></label>` : ""}
                <button type="button" class="btn-g btn-sm" data-mmove="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""}>↑</button>
                <button type="button" class="btn-g btn-sm" data-mmove="${i}" data-dir="1" ${i === g.media.length - 1 ? "disabled" : ""}>↓</button>
                <button type="button" class="btn-g btn-sm danger-link" data-mdel="${i}">Buang</button>
              </div>
            </div></li>`).join("")}</ul>` : `<p class="muted-p">Tiada media. Tambah imej (infografik) atau video.</p>`}
          <p class="demo-note" style="margin-bottom:0">Imej yang dimuat naik disimpan dalam pelayar (maksimum 1.5 MB). Untuk fail besar dan video, letakkan fail dalam folder <b>image/</b> dan masukkan laluannya.</p>
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Nota &amp; seruan tindakan</h2><p>Kotak nota (pilihan) dan sepanduk “Hantar dakwaan” di hujung halaman</p></div></div>
          <div class="form-row">${text("g-note-title", "Tajuk nota", g.note.title, 'placeholder="Pilihan"')}${text("g-cta-title", "Tajuk sepanduk", g.cta.title)}</div>
          <div class="form-row">${area("g-note-text", "Teks nota", g.note.text, 3, 'placeholder="Kosongkan untuk tidak memaparkan nota"')}${area("g-cta-text", "Teks sepanduk", g.cta.text, 3)}</div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Status</h2><p>Panduan yang disembunyikan tidak dipaparkan di laman awam</p></div></div>
          <div class="mode-pick">
            <label><input type="radio" name="g-vis" value="1" ${g.visible ? "checked" : ""}><span><b>Diterbitkan</b><small>Dipaparkan di halaman Info &amp; Panduan</small></span></label>
            <label><input type="radio" name="g-vis" value="0" ${g.visible ? "" : "checked"}><span><b>Disembunyikan</b><small>Simpan sebagai draf</small></span></label>
          </div>
        </div>

        <p class="field-err" id="g-err" hidden></p>
        <div class="action-row">
          <button class="btn-p" type="submit">${isNew ? "Cipta panduan" : "Simpan perubahan"}</button>
          <a href="#info" class="btn-g">Batal</a>
          ${isNew ? "" : `<span style="flex:1"></span><a class="btn-g" href="${guideHref(g, "../info/")}${g.builtin ? "?" : "&"}pratonton=1" target="_blank" rel="noopener">Lihat versi disimpan ↗</a>`}
        </div>
      </div>

      <div class="guide-preview">
        <div class="card">
          <div class="card-head"><div><h2>Pratonton</h2><p>Dikemas kini semasa anda menaip</p></div></div>
          <div class="pv-label">Kad di halaman Info &amp; Panduan</div>
          <div id="pv-card"></div>
          <div class="pv-label">Bahagian atas halaman panduan</div>
          <div class="pv-hero" id="pv-hero"></div>
        </div>
      </div>
    </form>`;

  const form = $("guide-form");
  const preview = () => {
    collect();
    $("pv-card").innerHTML = guideCardHTML(g, "#");
    $("pv-hero").innerHTML = `<span class="eyebrow">Panduan</span><h3>${esc(g.title || "Tajuk panduan")}</h3><p>${esc(g.lede || "Pengenalan panduan")}</p>`;
    $("sum-count").textContent = `${g.summary.length}/160`;
  };
  form.addEventListener("input", preview);
  form.addEventListener("change", preview);
  $("pv-card").addEventListener("click", (e) => e.preventDefault());
  preview();

  // media list
  const redraw = () => { collect(); renderGuideEditor(id); };
  form.querySelectorAll("[data-addmedia]").forEach((b) => b.addEventListener("click", () => { collect(); g.media.push({ type: b.dataset.addmedia, src: "", caption: "" }); renderGuideEditor(id); }));
  form.querySelectorAll("[data-mdel]").forEach((b) => b.addEventListener("click", () => { collect(); g.media.splice(+b.dataset.mdel, 1); renderGuideEditor(id); }));
  form.querySelectorAll("[data-mmove]").forEach((b) => b.addEventListener("click", () => {
    collect();
    const i = +b.dataset.mmove, j = i + +b.dataset.dir;
    [g.media[i], g.media[j]] = [g.media[j], g.media[i]];
    renderGuideEditor(id);
  }));
  form.querySelectorAll("[data-msrc]").forEach((inp) => inp.addEventListener("change", redraw));
  form.querySelectorAll("[data-upload]").forEach((inp) => inp.addEventListener("change", () => {
    const file = inp.files[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD) return toast("Imej melebihi 1.5 MB — letakkan dalam folder image/ dan masukkan laluannya");
    const reader = new FileReader();
    reader.onload = () => {
      collect();
      const m = g.media[+inp.dataset.upload];
      m.src = reader.result;
      if (!m.caption) m.caption = "";
      renderGuideEditor(id);
      toast(`${file.name} dimuat naik`);
    };
    reader.readAsDataURL(file);
  }));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    collect();
    g.media = g.media.filter((m) => m.src);
    const err = !g.title ? "Tajuk diperlukan." : !g.summary ? "Ringkasan kad diperlukan." : !g.lede ? "Pengenalan diperlukan." : "";
    $("g-err").textContent = err;
    $("g-err").hidden = !err;
    if (err) return;

    const { _for, ...data } = g;
    data.updatedAt = Date.now();
    if (isNew) {
      let slug = slugify(data.title), n = 2;
      while (guideById(slug) || ["info", "panduan", "berita-palsu", "troll", "kawal-emosi"].includes(slug)) slug = `${slugify(data.title)}-${n++}`;
      data.id = slug;
      info.guides.push(data);
    } else {
      info.guides[info.guides.indexOf(guideById(id))] = data;
    }
    if (!storeInfo()) { if (isNew) info.guides.pop(); return; }
    infoAudit(isNew ? "Tambah panduan" : "Kemas kini panduan", `Panduan: ${data.title}`, `${data.visible ? "Diterbitkan" : "Disembunyikan"} · ${data.media.length} media`);
    toast(isNew ? `Panduan “${data.title}” dicipta${data.visible ? " dan diterbitkan" : ""}` : "Panduan dikemas kini");
    guideDraft = null;
    location.hash = isNew ? `#guide/${data.id}` : "#info";
  });

  // read the form back into the draft (the form is redrawn when media changes)
  function collect() {
    const val = (x) => ($(x) ? $(x).value.trim() : "");
    g.title = val("g-title-in");
    g.summary = val("g-summary");
    g.readTime = +val("g-read") || 0;
    g.color = (form.querySelector('[name="g-color"]:checked') || {}).value || g.color;
    g.icon = (form.querySelector('[name="g-icon"]:checked') || {}).value || g.icon;
    g.lede = val("g-lede");
    g.intro = $("g-intro") ? $("g-intro").value.trim() : g.intro;
    g.note = { title: val("g-note-title"), text: val("g-note-text") };
    g.cta = { title: val("g-cta-title"), text: val("g-cta-text") };
    g.visible = (form.querySelector('[name="g-vis"]:checked') || {}).value === "1";
    g.media.forEach((m, i) => {
      const s = $(`m-src-${i}`), c = $(`m-cap-${i}`);
      if (s && !s.readOnly) m.src = s.value.trim();
      if (c) m.caption = c.value.trim();
    });
  }
}
