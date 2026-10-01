/* Info & Panduan content (mockup — localStorage stands in for the CMS database).
   The MCMC Content Publisher edits it in mcmc/contentpublisher.html#info; info/info.html and the guide pages
   in info/ render whatever is saved here, falling back to DEFAULT_INFO. */

const INFO_KEY = "sbn-info-v1";

const INFO_COLORS = { blue: "Biru", amber: "Kuning", green: "Hijau", red: "Merah", purple: "Ungu" };
const INFO_ICONS = {
  news: '<path d="M4 5h12v14H6a2 2 0 01-2-2z" /><path d="M16 9h3a1 1 0 011 1v7a2 2 0 01-2 2h-2" /><path d="M7 9h6M7 12.5h6M7 16h3" />',
  chat: '<path d="M20 12a8 8 0 01-11.6 7.1L4 20l1-4A8 8 0 1120 12z" /><path d="M9 10l2 1.5M15 10l-2 1.5M9.5 15.5c1.5-1 3.5-1 5 0" />',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /><path d="M8.5 11.5h2l1-2 1.5 4 1-2h1.5" />',
  shield: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" />',
  video: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" />',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />',
  alert: '<path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17h.01" />',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" />',
};

const DEFAULT_INFO = {
  page: {
    title: "Lindungi diri anda daripada penipuan dan berita palsu",
    lede: "Panduan ringkas untuk mengenal pasti penipuan, menyemak berita sebelum berkongsi dan apa yang perlu dilakukan jika anda menjadi mangsa.",
  },
  // builtin guides keep their own page (info/<id>.html); new ones use info/panduan.html?id=<id>
  guides: [
    {
      id: "berita-palsu", builtin: true, visible: true, color: "blue", icon: "news", readTime: 4,
      title: "Cara menangani berita palsu",
      summary: "Apa yang perlu dibuat apabila anda menerima, terkongsi atau melihat orang lain menyebarkan berita palsu.",
      lede: "Berita palsu tersebar lebih pantas daripada pembetulannya. Ini yang perlu anda lakukan apabila menerimanya, terkongsi tanpa sengaja, atau melihat orang lain menyebarkannya.",
      intro: "Kebanyakan berita palsu tidak dikongsi oleh orang yang berniat jahat. Ia dikongsi oleh orang biasa yang mahu membantu — memberi amaran kepada keluarga, rakan atau kumpulan WhatsApp. Sebab itu cara terbaik untuk menghentikannya ialah dengan berhenti sejenak sebelum menekan butang kongsi.",
      media: [{ type: "video", src: "image/fakenews.mp4", caption: "Sumber: The Star Online, 21 Ogos 2017." }],
      note: { title: "Adakah berkongsi berita palsu satu kesalahan?", text: "Menyebarkan kandungan palsu dengan niat untuk mengganggu, menakutkan atau mengelirukan orang lain boleh dikenakan tindakan di bawah Seksyen 233 Akta Komunikasi dan Multimedia 1998. Jika ragu, cara paling selamat ialah tidak berkongsi." },
      cta: { title: "Terima sesuatu yang meragukan?", text: "Hantarkan kepada kami. Pasukan kami akan menyemaknya bersama agensi berkaitan." },
    },
    {
      id: "troll", builtin: true, visible: true, color: "amber", icon: "chat", readTime: 4,
      title: "Cara menangani troll",
      summary: "Kenali akaun yang sengaja memprovokasi, dan cara melindungi diri tanpa terperangkap dalam pertengkaran.",
      lede: "Troll mahukan satu perkara — reaksi anda. Kenali taktik mereka dan lindungi diri tanpa terperangkap dalam pertengkaran yang tidak berkesudahan.",
      intro: "",
      media: [{ type: "image", src: "image/troll.png", caption: "" }],
      note: { title: "", text: "" },
      cta: { title: "Troll menyebarkan maklumat palsu?", text: "Hantarkan dakwaan tersebut kepada kami untuk disemak." },
    },
    {
      id: "kawal-emosi", builtin: true, visible: true, color: "green", icon: "heart", readTime: 3,
      title: "Kawal emosi, elak komen jelik",
      summary: "Berfikir sebelum menaip. Cara berbeza pendapat dengan sopan dan kesan komen kasar kepada orang lain.",
      lede: "Di sebalik setiap skrin ada manusia. Berfikir sebelum menaip, dan berbeza pendapat tanpa menyakiti orang lain.",
      intro: "",
      media: [{ type: "image", src: "image/kawalemosi.png", caption: "" }],
      note: { title: "", text: "" },
      cta: { title: "Lihat komen yang menyebarkan maklumat palsu?", text: "Hantarkan dakwaan tersebut kepada kami untuk disemak." },
    },
  ],
};

/* ---------- Store ---------- */
let info = null;
function loadInfo() {
  try { info = JSON.parse(localStorage.getItem(INFO_KEY)); } catch (e) { info = null; }
  if (!info || !Array.isArray(info.guides)) info = JSON.parse(JSON.stringify(DEFAULT_INFO));
  const fallback = Date.parse("2026-10-01T09:00:00");
  info.guides.forEach((g) => { if (!g.updatedAt) g.updatedAt = fallback; });
  return info;
}
// false when the browser refuses to store it (e.g. an uploaded image is too large)
function saveInfo() {
  try { localStorage.setItem(INFO_KEY, JSON.stringify(info)); return true; } catch (e) { return false; }
}
function resetInfo() {
  try { localStorage.removeItem(INFO_KEY); } catch (e) { }
  return loadInfo();
}
const guideById = (id) => info.guides.find((g) => g.id === id);

/* ---------- Rendering helpers (shared by the public pages and the publisher's preview) ---------- */
const infoEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// base is the path from the current page to the site root ("../" from info/ and mcmc/)
const mediaSrc = (src, base) => (/^(data:|https?:|blob:)/.test(src) ? src : base + src);
const guideHref = (g, dir = "") => dir + (g.builtin ? `${g.id}.html` : `panduan.html?id=${encodeURIComponent(g.id)}`);
const infoIcon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${INFO_ICONS[name] || INFO_ICONS.news}</svg>`;
const fmtInfoDate = (t) => new Date(t).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });

function guideCardHTML(g, href, compact) {
  return `<a class="guide-card ${infoEsc(g.color)}" href="${infoEsc(href)}">
    <div class="guide-cover">${infoIcon(g.icon)}</div>
    <div class="guide-body">
      <span class="guide-tag">Panduan${!compact && g.readTime ? ` · ${+g.readTime} min bacaan` : ""}</span>
      <h3>${infoEsc(g.title || "Tajuk panduan")}</h3>
      ${compact ? "" : `<p>${infoEsc(g.summary)}</p>`}
      <span class="guide-more">Baca panduan →</span>
    </div>
  </a>`;
}

function guideMediaHTML(m, base) {
  if (!m.src) return "";
  const src = infoEsc(mediaSrc(m.src, base));
  const body = m.type === "video"
    ? `<video controls preload="metadata"><source src="${src}">Pelayar anda tidak menyokong video.</video>`
    : `<img src="${src}" alt="${infoEsc(m.caption || "")}">`;
  return `<figure class="guide-media ${m.type === "video" ? "is-video" : ""}">${body}${m.caption ? `<figcaption>${infoEsc(m.caption)}</figcaption>` : ""}</figure>`;
}

// Everything below the hero of a guide page
function guideArticleHTML(g, base, others) {
  const paras = String(g.intro || "").split(/\n+/).filter(Boolean);
  return `${paras.map((p) => `<p class="guide-intro">${infoEsc(p)}</p>`).join("")}
    ${g.media.map((m) => guideMediaHTML(m, base)).join("")}
    ${g.note && g.note.text ? `<section class="info-section"><div class="info-card">${g.note.title ? `<h3>${infoEsc(g.note.title)}</h3>` : ""}<p class="fine-print">${infoEsc(g.note.text)}</p></div></section>` : ""}
    ${others.length ? `<h2 class="guide-more-head">Panduan lain</h2>
      <div class="guide-grid two guide-pager">${others.map((o) => guideCardHTML(o, guideHref(o), true)).join("")}</div>` : ""}
    ${g.cta && g.cta.title ? `<div class="info-cta"><div><h2>${infoEsc(g.cta.title)}</h2><p>${infoEsc(g.cta.text)}</p></div><a href="${base}index.html#hantar">Hantar dakwaan</a></div>` : ""}`;
}

/* ---------- Public pages ---------- */
// info/info.html
function renderInfoPage() {
  loadInfo();
  document.getElementById("info-title").textContent = info.page.title;
  document.getElementById("info-lede").textContent = info.page.lede;
  const visible = info.guides.filter((g) => g.visible);
  document.getElementById("guide-grid").innerHTML = visible.length
    ? visible.map((g) => guideCardHTML(g, guideHref(g))).join("")
    : `<p class="muted-p">Tiada panduan buat masa ini.</p>`;
}

// info/<id>.html and info/panduan.html?id=…  (?pratonton=1 lets the publisher preview a hidden guide)
function renderGuidePage(id) {
  loadInfo();
  const params = new URLSearchParams(location.search);
  const g = guideById(id || params.get("id"));
  const $g = (x) => document.getElementById(x);
  if (!g || (!g.visible && !params.has("pratonton"))) {
    document.title = "Panduan tidak dijumpai | SEBENARNYA.MY";
    $g("g-title").textContent = "Panduan tidak dijumpai";
    $g("g-lede").textContent = "Panduan ini mungkin telah dikemas kini atau dikeluarkan.";
    $g("g-meta").innerHTML = "";
    $g("g-body").innerHTML = `<p class="guide-intro"><a href="info.html" style="color:var(--brand);font-weight:600">Lihat semua panduan →</a></p>`;
    return;
  }
  document.title = `${g.title} | SEBENARNYA.MY`;
  $g("g-title").textContent = g.title;
  $g("g-lede").textContent = g.lede;
  $g("g-meta").innerHTML = `${g.readTime ? `<span>${+g.readTime} min bacaan</span>` : ""}<span>Dikemas kini ${fmtInfoDate(g.updatedAt)}</span>${g.visible ? "" : `<span class="chip-tag">Pratonton — belum diterbitkan</span>`}`;
  $g("g-body").innerHTML = guideArticleHTML(g, "../", info.guides.filter((o) => o.visible && o.id !== g.id));
}

// Re-render when the publisher saves in another tab
function liveInfo(render) {
  render();
  window.addEventListener("storage", (e) => { if (e.key === INFO_KEY) render(); });
}
