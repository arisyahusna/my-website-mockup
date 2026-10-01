/* AIFA chatbot (demo only — no AI, no server). Load after articles.js on index.html.
   It matches what the user types against the fact-checks in articles.js and answers a few common questions.
   Buttons with data-report reuse the page's own "Hantar dakwaan" form. */

(() => {
  const ROOT = new URL(".", document.currentScript.src).href; // site root, works from sub-folders too
  const STORE = "sbn-aifa";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const time = (t) => new Date(t).toLocaleTimeString("ms-MY", { hour: "numeric", minute: "2-digit" });

  const BOT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="8" width="16" height="12" rx="4"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/><path d="M2 13v3M22 13v3"/></svg>`;
  const CHAT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-width="3"/></svg>`;

  /* ---------- Markup ---------- */
  document.body.insertAdjacentHTML("beforeend", `
    <div class="aifa" id="aifa">
      <div class="aifa-hint" id="aifa-hint" hidden>
        <button class="aifa-hint-x" aria-label="Tutup">×</button>
        <b>Hai, saya AIFA 👋</b>Terima mesej yang meragukan? Tanya saya sebelum kongsi.
      </div>
      <section class="aifa-panel" id="aifa-panel" role="dialog" aria-label="AIFA, pembantu semakan fakta" hidden>
        <header class="aifa-head">
          <span class="aifa-avatar">${BOT_ICON}</span>
          <div class="aifa-title"><b>AIFA</b><small><i></i>Dalam talian · Pembantu semakan fakta</small></div>
          <button class="aifa-icon-btn" id="aifa-reset" title="Mulakan semula perbualan" aria-label="Mulakan semula perbualan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button class="aifa-icon-btn" id="aifa-close" aria-label="Tutup AIFA">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </header>
        <div class="aifa-body" id="aifa-body" aria-live="polite"></div>
        <form class="aifa-input" id="aifa-form" autocomplete="off">
          <input id="aifa-text" type="text" placeholder="Taip atau tampal dakwaan…" aria-label="Mesej kepada AIFA" maxlength="400">
          <button type="submit" aria-label="Hantar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
          </button>
        </form>
        <p class="aifa-foot">Demo sahaja · AIFA boleh tersilap. Rujuk semakan fakta rasmi.</p>
      </section>
      <button class="aifa-launch" id="aifa-launch" aria-expanded="false" aria-controls="aifa-panel" aria-label="Buka AIFA, pembantu semakan fakta">
        <span class="aifa-launch-ic aifa-open-ic">${CHAT_ICON}</span>
        <span class="aifa-launch-ic aifa-close-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span>
        <span class="aifa-badge" id="aifa-badge">1</span>
      </button>
    </div>`);

  const $ = (id) => document.getElementById(id);
  const panel = $("aifa-panel"), body = $("aifa-body"), input = $("aifa-text"), launch = $("aifa-launch");

  /* ---------- Conversation state (kept for this browser tab) ---------- */
  let log = [];
  try { log = JSON.parse(sessionStorage.getItem(STORE)) || []; } catch (e) { }
  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(log.slice(-40))); } catch (e) { } };

  /* ---------- Bot knowledge ---------- */
  const CHIPS_START = ["Semak dakwaan", "Berita tular hari ini", "Cara hantar dakwaan", "Apa itu AIFA?"];
  const CHIPS_AFTER = ["Semak dakwaan lain", "Berita tular hari ini", "Cara hantar dakwaan"];

  const storyCard = (s) => `<a class="aifa-card" href="#article/${s.id}" data-aifa-nav>
      <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
      <b>${esc(s.title)}</b>
      <span class="aifa-card-sum">${esc(s.summary)}</span>
      <span class="aifa-card-link">Baca semakan penuh →</span></a>`;
  const reportBtn = `<button class="aifa-action" data-report>Hantar dakwaan untuk disemak</button>`;

  const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const STOP = new Set(["yang", "untuk", "dengan", "akan", "telah", "dalam", "pada", "saya", "kepada", "adalah", "bahawa", "tidak", "boleh", "mesej", "betul", "benar", "palsu", "dakwaan", "tular", "ialah", "mereka", "kita", "this", "that", "with"]);
  function findStories(text) {
    const q = new Set(words(text).filter((w) => !STOP.has(w)));
    if (!q.size) return [];
    return stories
      .map((s) => {
        const pool = new Set(words(`${s.title} ${s.claim} ${s.summary} ${s.cat}`));
        let score = 0;
        q.forEach((w) => { if (pool.has(w)) score += 2; else if ([...pool].some((p) => p.startsWith(w.slice(0, 5)))) score += 1; });
        return { s, score };
      })
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => x.s);
  }

  const has = (t, list) => list.some((k) => t.includes(k));
  // Intent keywords only count in short messages, so a pasted claim like "video tular …" is still searched
  function answer(raw) {
    const t = raw.toLowerCase().trim();
    const short = t.length <= 40;
    if (has(t, ["semak dakwaan"])) {
      return { html: `Baik! Taip atau tampal dakwaan, tajuk berita atau mesej yang anda terima. Saya akan cari semakan fakta yang berkaitan.`, focus: true };
    }
    if (/^(hai|hi|helo|hello|hey|salam|assalamualaikum|selamat (pagi|petang|malam))\b/.test(t)) {
      return { html: `Hai! 😊 Saya AIFA. Hantarkan sebarang dakwaan yang anda ragui dan saya akan semak sama ada ia pernah disahkan oleh sebenarnya.my.`, chips: CHIPS_START };
    }
    if (short && has(t, ["terima kasih", "thank", "tq", "tqvm"])) {
      return { html: `Sama-sama! Ingat: <b>Tidak Pasti, Jangan Kongsi.</b> 🙏`, chips: CHIPS_AFTER };
    }
    if (short && has(t, ["apa itu aifa", "aifa", "apa itu sebenarnya", "sebenarnya.my"])) {
      return { html: `Saya <b>AIFA</b> — <i>AI Fact-checking Assistant</i> bagi sebenarnya.my, portal semakan fakta di bawah MCMC.<br><br>Saya boleh:<ul><li>Mencari semakan fakta bagi dakwaan yang anda terima</li><li>Menunjukkan berita tular yang sedang disemak</li><li>Membantu anda menghantar dakwaan baharu</li></ul>`, chips: ["Semak dakwaan", "Berita tular hari ini"] };
    }
    if (short && has(t, ["lapor", "hantar dakwaan", "cara hantar", "report", "adu", "aduan"])) {
      return { html: `Anda boleh menghantar dakwaan untuk disemak oleh MCMC dan agensi berkaitan:<ol><li>Tekan <b>Hantar dakwaan</b></li><li>Tampal dakwaan dan pautan (jika ada)</li><li>Lampirkan tangkapan skrin (pilihan)</li><li>Masukkan e-mel anda — nombor kes dan setiap kemas kini dihantar melalui e-mel</li></ol>${reportBtn}`, chips: ["Semak dakwaan", "Apa maksud label?"] };
    }
    if (short && has(t, ["tular", "trending", "terkini", "popular"])) {
      return { html: `Ini antara dakwaan yang paling banyak dicari hari ini:${hot.slice(0, 3).map((h) => storyCard(byId[h.id])).join("")}`, chips: CHIPS_AFTER };
    }
    if (short && has(t, ["label", "maksud", "mengelirukan", "kategori"])) {
      return { html: `Setiap semakan fakta diberi satu label:<div class="aifa-labels"><span class="verdict v-false">Palsu</span> Dakwaan tidak benar atau direka.<br><span class="verdict v-mislead">Mengelirukan</span> Ada unsur benar tetapi konteks penting tiada.<br><span class="verdict v-true">Benar</span> Disahkan oleh sumber rasmi.</div>`, chips: CHIPS_AFTER };
    }
    if (short && has(t, ["sambungan", "extension", "pelayar", "browser", "chrome"])) {
      return { html: `Pasang <b>sambungan pelayar sebenarnya.my</b> untuk menerima amaran apabila anda membaca dakwaan yang telah disemak.<a class="aifa-action" href="${ROOT}extension.html">Dapatkan sambungan pelayar</a>`, chips: CHIPS_AFTER };
    }
    const found = findStories(raw);
    if (found.length) {
      return {
        html: `Saya menemui ${found.length > 1 ? "semakan fakta yang berkaitan" : "satu semakan fakta yang berkaitan"}:${found.map(storyCard).join("")}<span class="aifa-note">Padanan dibuat secara automatik — sila baca semakan penuh.</span>`,
        chips: CHIPS_AFTER,
      };
    }
    return {
      html: `Saya belum menemui semakan fakta untuk dakwaan ini. 🤔<br><br>Sementara itu, <b>jangan kongsi</b> sehingga ia disahkan. Anda boleh hantar dakwaan ini kepada pasukan kami untuk disemak.${reportBtn}`,
      chips: ["Berita tular hari ini", "Apa maksud label?"],
    };
  }

  /* ---------- Rendering ---------- */
  function bubble(m) {
    if (m.from === "user") return `<div class="aifa-msg user"><div class="aifa-bubble">${esc(m.text)}</div><time>${time(m.at)}</time></div>`;
    return `<div class="aifa-msg bot"><span class="aifa-mini">${BOT_ICON}</span><div><div class="aifa-bubble">${m.html}</div><time>AIFA · ${time(m.at)}</time></div></div>`;
  }
  function render() {
    const last = log[log.length - 1];
    const chips = last && last.from === "bot" && last.chips ? `<div class="aifa-chips">${last.chips.map((c) => `<button data-chip="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : "";
    body.innerHTML = `<div class="aifa-day">Hari ini</div>${log.map(bubble).join("")}${chips}`;
    body.scrollTop = body.scrollHeight;
  }

  function botSay(reply) {
    log.push({ from: "bot", html: reply.html, chips: reply.chips || null, at: Date.now() });
    save();
    render();
    if (reply.focus) input.focus();
  }

  let busy = false;
  function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    log.push({ from: "user", text, at: Date.now() });
    save();
    render();
    body.insertAdjacentHTML("beforeend", `<div class="aifa-msg bot" id="aifa-typing"><span class="aifa-mini">${BOT_ICON}</span><div class="aifa-bubble aifa-typing"><i></i><i></i><i></i></div></div>`);
    body.scrollTop = body.scrollHeight;
    setTimeout(() => { busy = false; botSay(answer(text)); }, 650 + Math.min(900, text.length * 12));
  }

  function greet() {
    log = [];
    botSay({ html: `Hai! Saya <b>AIFA</b>, pembantu semakan fakta sebenarnya.my. 👋<br><br>Terima mesej, video atau berita yang meragukan? Tampalkan di sini dan saya akan semak untuk anda.`, chips: CHIPS_START });
  }

  /* ---------- Open / close ---------- */
  function setOpen(open) {
    panel.hidden = !open;
    $("aifa").classList.toggle("open", open);
    launch.setAttribute("aria-expanded", open);
    launch.setAttribute("aria-label", open ? "Tutup AIFA" : "Buka AIFA, pembantu semakan fakta");
    if (open) {
      $("aifa-hint").hidden = true;
      $("aifa-badge").hidden = true;
      try { sessionStorage.setItem(STORE + "-seen", "1"); } catch (e) { }
      if (!log.length) greet(); else render();
      if (window.matchMedia("(min-width: 641px)").matches) input.focus();
    }
  }

  launch.addEventListener("click", () => setOpen(panel.hidden));
  $("aifa-close").addEventListener("click", () => { setOpen(false); launch.focus(); });
  $("aifa-reset").addEventListener("click", greet);
  $("aifa-form").addEventListener("submit", (e) => { e.preventDefault(); send(input.value); input.value = ""; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden && !document.querySelector("dialog[open]")) { setOpen(false); launch.focus(); } });
  body.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-chip]");
    if (chip) return send(chip.dataset.chip);
    // on phones the panel covers the page, so close it when the user follows a link or opens the report form
    if (e.target.closest("[data-aifa-nav], [data-report]") && window.matchMedia("(max-width: 640px)").matches) setOpen(false);
  });

  // Greeting bubble next to the button, once per tab
  let seen = false;
  try { seen = !!sessionStorage.getItem(STORE + "-seen"); } catch (e) { }
  if (seen) $("aifa-badge").hidden = true;
  else setTimeout(() => { if (panel.hidden) $("aifa-hint").hidden = false; }, 1800);
  $("aifa-hint").addEventListener("click", (e) => {
    if (e.target.closest(".aifa-hint-x")) {
      $("aifa-hint").hidden = true;
      try { sessionStorage.setItem(STORE + "-seen", "1"); } catch (err) { }
      return;
    }
    setOpen(true);
  });
})();
