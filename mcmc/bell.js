/* Notification bell shared by every staff portal (mcmc/*.html, agency/*.html).
   Notices come from notify() in ../cases.js, addressed to a key such as "mcmc:editor" or "officer:KKM".
   Uses the page's $, esc and ago. */

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
