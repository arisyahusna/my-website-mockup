/* Content Publisher: manage the fact-checks on the public site (index.html / allarticles.html).
   Published cases appear there automatically (syncSite() in ../cases.js); here they can be edited, hidden or deleted.
   Data helpers live in ../storydata.js. Loaded before contentpublisher.js, which routes #site and #story/<id> here. */

const SITE_PAGE = "../index.html";
let siteTab = "all";
let storyDraft = null;

// The case behind a story (stories from the sample archive have none)
const storyCase = (s) => (s.caseId ? getCase(s.caseId) : store.cases.find((c) => c.article === s.id)) || null;

function siteChange(s, action, text, fn) {
  const site = loadSite();
  fn(site);
  if (!saveSite(site)) { toast("Tidak dapat menyimpan — storan pelayar penuh. Gunakan imej yang lebih kecil."); return false; }
  const c = storyCase(s);
  if (c) logAction(c, me, text, action);
  else audit(me, action, `Artikel: ${s.title}`, text);
  saveStore();
  return true;
}

// Deleted stories, so they can be restored
function deletedStories() {
  const site = loadSite();
  const all = [...site.fromCases, ...SEED_STORIES];
  return site.deleted.map((id) => all.find((s) => s.id === id)).filter(Boolean);
}

const storyThumb = (s) => `<img class="story-thumb" src="${storyImg(s, 120, 75)}" alt="" loading="lazy">`;
const publicLink = (s) => `${SITE_PAGE}#article/${encodeURIComponent(s.id)}`;

/* ---------- #site: everything on the public site ---------- */
function renderSite() {
  const all = siteStories({ all: true }), q = searchQ();
  const shown = all.filter((s) => !s.hidden), hiddenN = all.length - shown.length;
  const list = all.filter((s) => (siteTab === "all" || (siteTab === "shown" ? !s.hidden : s.hidden))
    && (!q || `${s.title} ${s.claim} ${s.caseId || ""}`.toLowerCase().includes(q)));
  const gone = deletedStories();

  $("view-site").innerHTML = `
    <div class="kpis kpis-4" style="margin-bottom:22px">
      <div class="kpi"><div class="kpi-label">Dipaparkan</div><div class="kpi-value">${shown.length}</div><div class="kpi-delta">di laman utama</div></div>
      <div class="kpi"><div class="kpi-label">Disembunyikan</div><div class="kpi-value">${hiddenN}</div><div class="kpi-delta">tidak dilihat orang awam</div></div>
      <div class="kpi"><div class="kpi-label">Daripada kes</div><div class="kpi-value">${all.filter((s) => storyCase(s)).length}</div><div class="kpi-delta">diterbitkan melalui portal</div></div>
      <div class="kpi"><div class="kpi-label">Disunting</div><div class="kpi-value">${all.filter((s) => s.edited).length}</div><div class="kpi-delta">selepas diterbitkan</div></div>
    </div>

    <div class="tabs" role="tablist">${[["all", "Semua", all.length], ["shown", "Dipaparkan", shown.length], ["hidden", "Disembunyikan", hiddenN]].map(([k, label, n]) =>
      `<button role="tab" data-stab="${k}" class="${k === siteTab ? "on" : ""}">${label}<span class="count">${n}</span></button>`).join("")}</div>
    ${q ? `<p class="kpi-delta" style="margin-bottom:10px">Carian: “${esc(q)}” · ${list.length} keputusan</p>` : ""}

    <div class="card" style="padding:4px 8px"><div class="table-wrap"><table class="adm-table">
      <thead><tr><th>Semakan fakta</th><th>Keputusan</th><th>Kategori</th><th>Diterbitkan</th><th>Kes</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.length ? list.map((s) => {
        const c = storyCase(s);
        return `<tr class="clickable ${s.hidden ? "row-off" : ""}" data-story="${esc(s.id)}" tabindex="0">
          <td><div class="guide-row">${storyThumb(s)}<div class="claim-cell"><b>${esc(s.title)}</b><small>${esc(s.claim)}</small></div></div></td>
          <td>${verdictBadge(s.v)}</td>
          <td>${esc(s.cat)}</td>
          <td title="${fmtDT(s.at)}">${s.ago}${s.edited ? `<small class="cell-sub">disunting</small>` : ""}</td>
          <td>${c ? `<a href="#case/${c.id}" class="mono" style="color:var(--brand)">${c.id}</a>` : `<span class="chip-tag">Arkib</span>`}</td>
          <td>${s.hidden ? `<span class="acct off"><i aria-hidden="true"></i>Disembunyikan</span>` : `<span class="acct on"><i aria-hidden="true"></i>Dipaparkan</span>`}</td>
          <td><div class="user-actions">
            <a href="#story/${encodeURIComponent(s.id)}" class="btn-g btn-sm">Edit</a>
            ${s.hidden ? "" : `<a href="${publicLink(s)}" target="_blank" rel="noopener" class="btn-g btn-sm">Lihat ↗</a>`}
            <button class="btn-sm ${s.hidden ? "btn-s" : "btn-g"}" data-svis="${esc(s.id)}">${s.hidden ? "Paparkan" : "Sembunyikan"}</button>
            <button class="btn-g btn-sm danger-link" data-sdel="${esc(s.id)}">Padam</button>
          </div></td></tr>`;
      }).join("") : `<tr><td colspan="7" class="empty-row">Tiada semakan fakta dalam senarai ini.</td></tr>`}</tbody>
    </table></div></div>

    ${gone.length ? `<div class="card" style="margin-top:18px">
      <div class="card-head"><div><h2>Dipadam</h2><p>Tidak dipaparkan di mana-mana halaman awam</p></div></div>
      <ul class="deleted-list">${gone.map((s) => `<li><span>${esc(s.title)}</span><button class="btn-g btn-sm" data-srestore="${esc(s.id)}">Pulihkan</button></li>`).join("")}</ul>
    </div>` : ""}
    <p class="demo-note">Kes yang diterbitkan dipaparkan di <a href="${SITE_PAGE}" target="_blank" rel="noopener" style="color:var(--brand);font-weight:600">laman utama ↗</a> secara automatik. Menyunting, menyembunyikan atau memadam artikel tidak mengubah rekod kes; setiap tindakan direkodkan dalam sejarah kes dan log audit.</p>`;

  const root = $("view-site");
  root.querySelectorAll("[data-stab]").forEach((b) => b.addEventListener("click", () => { siteTab = b.dataset.stab; renderSite(); }));
  root.querySelectorAll("[data-story]").forEach((tr) => {
    const open = () => (location.hash = `#story/${encodeURIComponent(tr.dataset.story)}`);
    tr.addEventListener("click", (e) => { if (!e.target.closest("a, button")) open(); });
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === tr) open(); });
  });
  root.querySelectorAll("[data-svis]").forEach((b) => b.addEventListener("click", () => {
    const s = all.find((x) => x.id === b.dataset.svis), hide = !s.hidden;
    const ok = siteChange(s, hide ? "Sembunyikan artikel" : "Paparkan artikel", hide ? `Artikel “${s.title}” disembunyikan daripada laman awam.` : `Artikel “${s.title}” dipaparkan semula di laman awam.`,
      (site) => { site.hidden = hide ? [...site.hidden, s.id] : site.hidden.filter((id) => id !== s.id); });
    if (ok) toast(hide ? "Disembunyikan daripada laman awam" : "Dipaparkan semula di laman awam");
    renderSite();
  }));
  root.querySelectorAll("[data-sdel]").forEach((b) => b.addEventListener("click", () => {
    const s = all.find((x) => x.id === b.dataset.sdel);
    if (!confirm(`Padam “${s.title}” daripada laman awam?\n\nArtikel ini tidak akan dipaparkan lagi. Anda boleh memulihkannya dari senarai “Dipadam”.`)) return;
    const ok = siteChange(s, "Padam artikel", `Artikel “${s.title}” dipadam daripada laman awam.`, (site) => {
      site.deleted = [...site.deleted.filter((id) => id !== s.id), s.id];
      site.hidden = site.hidden.filter((id) => id !== s.id);
    });
    if (ok) toast("Artikel dipadam daripada laman awam");
    renderSite();
  }));
  root.querySelectorAll("[data-srestore]").forEach((b) => b.addEventListener("click", () => {
    const s = gone.find((x) => x.id === b.dataset.srestore);
    if (siteChange(s, "Pulihkan artikel", `Artikel “${s.title}” dipulihkan ke laman awam.`, (site) => { site.deleted = site.deleted.filter((id) => id !== s.id); }))
      toast("Artikel dipulihkan");
    renderSite();
  }));
}

/* ---------- #story/<id>: edit a published fact-check ---------- */
function renderStoryEditor(id) {
  const s = siteStories({ all: true }).find((x) => x.id === id);
  if (!s) { $("view-story").innerHTML = `<div class="card">Artikel ${esc(id)} tidak dijumpai. <a href="#site" class="btn-g">Kembali</a></div>`; return; }
  if (!storyDraft || storyDraft.id !== id) storyDraft = { id, title: s.title, v: s.v, cat: s.cat, claim: s.claim, summary: s.summary, body: s.body || "", imgSrc: s.imgSrc || "", hidden: s.hidden };
  const d = storyDraft, c = storyCase(s);
  $("page-title").textContent = s.title;
  const cats = PUBLIC_CATS.includes(d.cat) ? PUBLIC_CATS : [d.cat, ...PUBLIC_CATS];

  $("view-story").innerHTML = `
    <a href="#site" class="back-link">← Laman awam</a>
    <form class="case-grid" id="story-form" novalidate>
      <div style="display:grid;gap:18px;min-width:0">
        <div class="card">
          <div class="card-head"><div><h2>Kandungan artikel</h2><p>${c ? `Daripada kes <a href="#case/${c.id}" style="color:var(--brand)">${c.id}</a>` : "Arkib semakan fakta"} · diterbitkan ${fmtDT(s.at)}</p></div></div>
          <div class="form-row one"><div><label class="lbl" for="s-title">Tajuk</label><input id="s-title" class="ctl" value="${esc(d.title)}" maxlength="160" required></div></div>
          <div class="form-row">
            <div><span class="lbl">Keputusan</span><div class="pick">${Object.entries(LABEL).map(([k, l]) =>
              `<label><input type="radio" name="s-v" value="${k}" ${d.v === k ? "checked" : ""}> ${l}</label>`).join("")}</div></div>
            <div><label class="lbl" for="s-cat">Kategori</label><select id="s-cat" class="ctl">${cats.map((x) => `<option ${x === d.cat ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
          </div>
          <div class="form-row one"><div><label class="lbl" for="s-claim">Dakwaan</label><textarea id="s-claim" class="ctl" rows="2">${esc(d.claim)}</textarea></div></div>
          <div class="form-row one"><div><label class="lbl" for="s-summary">Ringkasan keputusan</label><textarea id="s-summary" class="ctl" rows="3" required>${esc(d.summary)}</textarea></div></div>
          <div class="form-row one"><div><label class="lbl" for="s-body">Dapatan penuh <small>(pilihan; baris baharu memulakan perenggan baharu)</small></label><textarea id="s-body" class="ctl" rows="6">${esc(d.body)}</textarea></div></div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Imej utama</h2><p>Dipaparkan pada kad dan di atas artikel</p></div></div>
          <ul class="media-list"><li>
            <div class="media-thumb"><img src="${storyImg(d.imgSrc ? { imgSrc: d.imgSrc } : s, 192, 192)}" alt=""></div>
            <div class="media-fields">
              <div class="form-row one"><div><label class="lbl" for="s-img">Laluan atau pautan imej</label>
                <input id="s-img" class="ctl" value="${/^data:/.test(d.imgSrc) ? "(imej dimuat naik)" : esc(d.imgSrc)}" placeholder="Kosongkan untuk imej lalai" ${/^data:/.test(d.imgSrc) ? "readonly" : ""}></div></div>
              <div class="action-row" style="margin:0">
                <label class="btn-g btn-sm" style="cursor:pointer">Muat naik imej<input type="file" id="s-upload" accept="image/*" hidden></label>
                ${d.imgSrc ? `<button type="button" class="btn-g btn-sm danger-link" id="s-img-clear">Guna imej lalai</button>` : ""}
              </div>
            </div></li></ul>
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Status</h2><p>Artikel yang disembunyikan tidak dipaparkan kepada orang awam</p></div></div>
          <div class="mode-pick">
            <label><input type="radio" name="s-vis" value="1" ${d.hidden ? "" : "checked"}><span><b>Dipaparkan</b><small>Di laman utama dan senarai semua semakan fakta</small></span></label>
            <label><input type="radio" name="s-vis" value="0" ${d.hidden ? "checked" : ""}><span><b>Disembunyikan</b><small>Tidak dilihat orang awam</small></span></label>
          </div>
        </div>

        <p class="field-err" id="s-err" hidden></p>
        <div class="action-row">
          <button class="btn-p" type="submit">Simpan perubahan</button>
          <a href="#site" class="btn-g">Batal</a>
          <span style="flex:1"></span>
          ${s.edited ? `<button type="button" class="btn-g" id="s-revert">Kembalikan versi asal</button>` : ""}
          <button type="button" class="btn-g danger-link" id="s-delete">Padam artikel</button>
        </div>
      </div>

      <div class="guide-preview">
        <div class="card">
          <div class="card-head"><div><h2>Pratonton kad</h2><p>Seperti di laman utama</p></div></div>
          <div class="story-pv" id="s-pv"></div>
          ${s.hidden ? "" : `<a href="${publicLink(s)}" target="_blank" rel="noopener" class="btn-g btn-sm" style="margin-top:12px">Lihat di laman awam ↗</a>`}
        </div>
      </div>
    </form>`;

  const form = $("story-form");
  const collect = () => {
    d.title = $("s-title").value.trim();
    d.v = form.querySelector('[name="s-v"]:checked').value;
    d.cat = $("s-cat").value;
    d.claim = $("s-claim").value.trim();
    d.summary = $("s-summary").value.trim();
    d.body = $("s-body").value.trim();
    if (!$("s-img").readOnly) d.imgSrc = $("s-img").value.trim();
    d.hidden = form.querySelector('[name="s-vis"]:checked').value === "0";
  };
  const preview = () => {
    collect();
    $("s-pv").innerHTML = `<img src="${storyImg({ ...s, imgSrc: safeImg(d.imgSrc) }, 600, 375)}" alt="">
      <span class="verdict v-${d.v}">${LABEL[d.v]}</span><b>${esc(d.title || "Tajuk artikel")}</b>
      <small>${esc(d.cat)} · ${s.ago}</small><p>${esc(d.summary)}</p>`;
  };
  form.addEventListener("input", preview);
  form.addEventListener("change", preview);
  preview();

  $("s-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) return toast("Imej melebihi 1.5 MB — letakkan dalam folder image/ dan masukkan laluannya");
    const reader = new FileReader();
    reader.onload = () => { collect(); d.imgSrc = reader.result; renderStoryEditor(id); toast(`${file.name} dimuat naik`); };
    reader.readAsDataURL(file);
  });
  if ($("s-img-clear")) $("s-img-clear").addEventListener("click", () => { collect(); d.imgSrc = ""; renderStoryEditor(id); });

  if ($("s-revert")) $("s-revert").addEventListener("click", () => {
    if (!confirm("Buang semua suntingan dan kembalikan artikel kepada versi yang diterbitkan?")) return;
    if (siteChange(s, "Kembalikan artikel", `Suntingan artikel “${s.title}” dibuang — versi asal dipaparkan.`, (site) => { delete site.edits[id]; })) toast("Versi asal dikembalikan");
    storyDraft = null;
    renderStoryEditor(id);
  });
  $("s-delete").addEventListener("click", () => {
    if (!confirm(`Padam “${s.title}” daripada laman awam?`)) return;
    if (siteChange(s, "Padam artikel", `Artikel “${s.title}” dipadam daripada laman awam.`, (site) => { site.deleted.push(id); site.hidden = site.hidden.filter((x) => x !== id); })) toast("Artikel dipadam daripada laman awam");
    location.hash = "#site";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    collect();
    const err = !d.title ? "Tajuk diperlukan." : !d.summary ? "Ringkasan keputusan diperlukan." : d.imgSrc && !safeImg(d.imgSrc) ? "Imej mesti pautan https://, laluan image/… atau fail yang dimuat naik." : "";
    $("s-err").textContent = err;
    $("s-err").hidden = !err;
    if (err) return;
    const patch = { title: d.title, v: d.v, cat: d.cat, claim: d.claim, summary: d.summary, body: d.body, imgSrc: d.imgSrc };
    patch.split = d.v === s.v ? s.split : SPLIT[d.v]; // keep the source agreement bar in line with the verdict
    const fields = { title: "tajuk", v: "keputusan", cat: "kategori", claim: "dakwaan", summary: "ringkasan", body: "dapatan", imgSrc: "imej" };
    const changed = Object.keys(fields).filter((k) => (patch[k] || "") !== (s[k] || ""));
    const visChanged = d.hidden !== s.hidden;
    if (!changed.length && !visChanged) return toast("Tiada perubahan");
    const text = [changed.length ? `Artikel disunting (${changed.map((k) => fields[k]).join(", ")})` : "", visChanged ? (d.hidden ? "disembunyikan daripada laman awam" : "dipaparkan di laman awam") : ""].filter(Boolean).join(" dan ");
    const ok = siteChange(s, "Sunting artikel", `${text}.`, (site) => {
      if (changed.length) site.edits[id] = patch;
      site.hidden = d.hidden ? [...new Set([...site.hidden, id])] : site.hidden.filter((x) => x !== id);
    });
    if (!ok) return;
    toast("Artikel dikemas kini di laman awam");
    storyDraft = null;
    location.hash = "#site";
  });
}
