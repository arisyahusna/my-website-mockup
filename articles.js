/* Shared by index.html and allarticles.html:
   card/article templates and the share dialog. The data comes from storydata.js (loaded first). */

// Published fact-checks, newest first (hidden and deleted ones are left out)
const stories = siteStories();
const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
// The newest fact-check leads the home page
const HERO_ID = stories.length ? stories[0].id : "";
const hot = SEED_HOT.filter((h) => byId[h.id]);

const ICON = {
  share:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
};

/* ---------- Templates ---------- */

function actionBtns(id, big) {
  return `<button class="act-btn${big ? " big" : ""}" data-share="${id}">${ICON.share}<span>Kongsi</span></button>`;
}

function consensusBar(s) {
  const [f, m, t] = s.split;
  return `<div class="consensus-bar"><i class="f" style="width:${f}%"></i><i class="m" style="width:${m}%"></i><i class="t" style="width:${t}%"></i></div>`;
}

function agreePct(s) {
  const [f, m, t] = s.split;
  return s.v === "false" ? f : s.v === "mislead" ? m : t;
}

function card(s) {
  return `
        <article class="card">
            <a href="#article/${s.id}" class="card-img"><img loading="lazy" src="${storyImg(s, 600, 375)}" alt=""></a>
            <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
            <h4><a href="#article/${s.id}">${s.title}</a></h4>
            <div class="meta"><span>${s.cat}</span><span class="dot"></span><span>${s.ago}</span></div>
            <div class="consensus">
                ${consensusBar(s)}
                <div class="consensus-label">${s.n} sumber · ${agreePct(s)}% bersetuju</div>
            </div>
            <div class="card-actions">${actionBtns(s.id)}</div>
        </article>`;
}

function heroHTML(s) {
  return `
        <article class="hero">
            <a href="#article/${s.id}" class="hero-img">
                <img src="${storyImg(s, 900, 640)}" alt="">
                <span class="tag">Berita Terkini</span>
            </a>
            <div class="hero-body">
                <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
                <h3><a href="#article/${s.id}">${s.title}</a></h3>
                <div class="claim"><b>Dakwaan</b>${s.claim}</div>
                <p>${s.summary}</p>
                <div class="consensus">
                    ${consensusBar(s)}
                    <div class="consensus-label">${s.n} sumber disemak · ${agreePct(s)}% menilai ini ${LABEL[s.v].toLowerCase()}</div>
                </div>
                <div class="hero-foot">
                    <div class="meta"><span>${s.cat}</span><span class="dot"></span><span>${s.ago}</span></div>
                    <div class="card-actions">${actionBtns(s.id)}</div>
                </div>
            </div>
        </article>`;
}

function hotList(items) {
  return items
    .map(
      (h) => `
        <li><a href="#article/${h.id}">
            <h5>${h.title}</h5>
            <div class="hot-meta">
                <span class="verdict v-${byId[h.id].v}">${LABEL[byId[h.id].v]}</span>
                ${h.searches ? `<span>${h.searches} carian</span><span class="trend">▲ ${h.up}</span>` : `<span>${byId[h.id].ago}</span>`}
            </div>
        </a></li>`,
    )
    .join("");
}

// "More fact checks" sidebar next to an article
function moreList(id) {
  return hotList(
    stories
      .filter((x) => x.id !== id)
      .slice(0, 5)
      .map((x) => ({ id: x.id, title: x.title })),
  );
}

function articleHTML(s) {
  const [f, m, t] = s.split;
  const advice =
    s.v === "true"
      ? "Dakwaan ini tepat. Jika anda mengongsikannya, sertakan konteks di atas."
      : "Jika anda menerima dakwaan ini, jangan sebarkannya. Kongsi semakan fakta ini supaya orang lain juga tahu fakta sebenar.";

  return `
        <a href="#home" class="back-link">← Kembali ke semakan fakta terkini</a>
        <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
        <h1>${s.title}</h1>
        <div class="meta"><span>${s.cat}</span><span class="dot"></span><span>${s.ago}</span><span class="dot"></span><span>3 minit bacaan</span><span class="dot"></span><span>Pasukan semakan fakta sebenarnya.my</span></div>
        <div class="article-actions">${actionBtns(s.id, true)}</div>
        <div class="article-img"><img src="${storyImg(s, 1200, 675)}" alt=""></div>

        <div class="claim"><b>Dakwaan</b>${s.claim}</div>

        <h3>Keputusan kami</h3>
        <div class="verdict-box vb-${s.v}">
            <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
            <p>${s.summary}</p>
        </div>

        <h3>Dapatan kami</h3>
        ${String(s.body || "").split(/\n+/).filter(Boolean).map((p) => `<p>${p}</p>`).join("")}
        <p>Kami membandingkan dakwaan ini dengan kenyataan rasmi, rekod awam dan laporan daripada ${s.n} sumber.
           ${agreePct(s)}% daripadanya mencapai kesimpulan yang sama: <b>${LABEL[s.v].toLowerCase()}</b>.</p>
        <div class="consensus">
            ${consensusBar(s)}
            <div class="consensus-label">Palsu ${f}% · Mengelirukan ${m}% · Benar ${t}%</div>
        </div>
        <p>${advice}</p>

        ${s.refs && s.refs.length ? `<h3>Sumber</h3><ul class="how">${s.refs.map((r) => `<li>${plainText(r)}</li>`).join("")}</ul>` : ""}

        <h3>Cara kami menyemak</h3>
        <ol class="how">
            <li>Menjejak dakwaan ke tempat ia mula-mula muncul.</li>
            <li>Menyemaknya dengan rekod dan kenyataan rasmi.</li>
            <li>Menghubungi agensi atau pihak yang terlibat untuk pengesahan.</li>
        </ol>

        <div class="article-foot">
            <p>Bermanfaat? Bantu hentikan penyebaran.</p>
            <div class="card-actions">${actionBtns(s.id, true)}</div>
        </div>`;
}

/* ---------- Topic filter (category bar on the home pages) ---------- */
// "#topic/<name>" shows the home page filtered to one topic; "#home" shows everything
let topic = "";

function applyTopic(name) {
  topic = name;
  document
    .querySelectorAll(".cats [data-topic]")
    .forEach((a) => a.classList.toggle("active", a.dataset.topic === name));
  const title = document.getElementById("home-title");
  if (title)
    title.textContent = name ? `Topik: ${name}` : "Semakan Fakta Terkini";
  // The top story only shows on the unfiltered view; inside a topic it is just another card
  const hero = document.getElementById("hero");
  if (hero) hero.hidden = !!name;
}

function inTopic(s) {
  return topic ? s.cat === topic : s.id !== HERO_ID;
}

function emptyGridText(term, escFn) {
  if (term) return `Tiada semakan fakta yang sepadan dengan “${escFn(term)}”.`;
  return topic
    ? `Belum ada semakan fakta dalam topik ${topic}.`
    : "Tiada semakan fakta untuk dipaparkan.";
}

/* ---------- Toast + share dialog (added to the page on load) ---------- */

document.body.insertAdjacentHTML(
  "beforeend",
  `
    <dialog class="modal form-modal" id="share-dialog" aria-labelledby="share-heading">
        <button class="modal-close" data-close aria-label="Tutup">&times;</button>
        <h3 id="share-heading">Kongsi semakan fakta ini</h3>
        <p class="share-title" id="share-title"></p>
        <div class="share-grid">
            <a class="share-opt" id="share-wa" target="_blank" rel="noopener"><span class="share-ic wa">W</span>WhatsApp</a>
            <a class="share-opt" id="share-fb" target="_blank" rel="noopener"><span class="share-ic fb">f</span>Facebook</a>
            <a class="share-opt" id="share-x" target="_blank" rel="noopener"><span class="share-ic x">X</span>X</a>
            <a class="share-opt" id="share-tg" target="_blank" rel="noopener"><span class="share-ic tg">T</span>Telegram</a>
        </div>
        <div class="share-link">
            <input id="share-url" readonly aria-label="Pautan ke semakan fakta ini">
            <button class="btn-primary" id="share-copy">Salin</button>
        </div>
        <button class="link-btn share-more" id="share-native" hidden>Lagi pilihan perkongsian…</button>
    </dialog>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`,
);

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

const shareDialog = document.getElementById("share-dialog");
let shareData = null;

function openShare(id) {
  const s = byId[id];
  // TODO: point this at the public article URL once articles have their own pages
  const url = location.href.split("#")[0] + "#article/" + id;
  const text = `${LABEL[s.v].toUpperCase()}: ${s.title} — sebenarnya.my`;
  shareData = { title: s.title, text, url };

  document.getElementById("share-title").textContent = s.title;
  document.getElementById("share-url").value = url;
  document.getElementById("share-wa").href =
    "https://wa.me/?text=" + encodeURIComponent(text + " " + url);
  document.getElementById("share-fb").href =
    "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
  document.getElementById("share-x").href =
    "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(text) +
    "&url=" +
    encodeURIComponent(url);
  document.getElementById("share-tg").href =
    "https://t.me/share/url?url=" +
    encodeURIComponent(url) +
    "&text=" +
    encodeURIComponent(text);
  document.getElementById("share-native").hidden = !navigator.share;
  document.getElementById("share-copy").textContent = "Salin";
  shareDialog.showModal();
}

shareDialog.addEventListener("click", (e) => {
  if (e.target === shareDialog || e.target.closest("[data-close]"))
    shareDialog.close();
});

document.getElementById("share-copy").addEventListener("click", async () => {
  const input = document.getElementById("share-url");
  try {
    await navigator.clipboard.writeText(input.value);
  } catch (err) {
    input.select();
    document.execCommand("copy");
  }
  document.getElementById("share-copy").textContent = "Disalin!";
  toast("Pautan disalin");
});

document.getElementById("share-native").addEventListener("click", () => {
  navigator
    .share(shareData)
    .then(() => shareDialog.close())
    .catch(() => {});
});
