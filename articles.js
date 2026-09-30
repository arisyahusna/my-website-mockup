/* Shared by index.html (public) and userhome.html (members):
   fact-check data, card/article templates, and the share dialog. */

const LABEL = { false: "Palsu", mislead: "Mengelirukan", true: "Benar" };

// Sample content — replace with real data from your CMS/API
const stories = [
  {
    id: "rm500",
    v: "false",
    title:
      'Mesej tular WhatsApp tawar "bantuan digital" RM500 ialah penipuan pancingan data',
    cat: "Penipuan",
    ago: "18 minit lalu",
    img: "hero",
    split: [92, 6, 2],
    n: 24,
    claim:
      "Penerima boleh menuntut RM500 dengan menekan pautan dan memasukkan nombor kad pengenalan serta butiran bank mereka.",
    summary:
      "Tiada agensi yang mengumumkan program sedemikian. Pautan tersebut membawa ke laman tiruan yang dibina untuk mencuri maklumat perbankan, dan telah dilaporkan kepada pihak berkuasa.",
  },
  {
    id: "flood",
    v: "false",
    title: "Foto lebuh raya dinaiki air diambil pada 2021, bukan ribut minggu ini",
    cat: "Bencana",
    ago: "42 minit lalu",
    img: "flood",
    split: [88, 10, 2],
    n: 17,
    claim: "Sekeping foto menunjukkan lebuh raya dinaiki air semasa ribut minggu ini.",
    summary:
      "Carian imej terbalik menunjukkan foto itu pertama kali disiarkan pada Disember 2021. Ia tidak menunjukkan cuaca minggu ini.",
  },
  {
    id: "fuel",
    v: "mislead",
    title:
      "Dakwaan harga petrol naik dua kali ganda bulan depan tidak menyatakan konteks penting",
    cat: "Ekonomi",
    ago: "1 jam lalu",
    img: "fuel",
    split: [20, 70, 10],
    n: 21,
    claim: "Harga petrol akan naik dua kali ganda mulai bulan depan.",
    summary:
      "Pelarasan subsidi sedang dibincangkan, tetapi tiada pengumuman yang menyatakan harga akan naik dua kali ganda. Hantaran itu tidak menyebut bahawa sebarang perubahan akan dilaksanakan secara berperingkat.",
  },
  {
    id: "school",
    v: "true",
    title: "Benar, penggal persekolahan baharu bermula seminggu lebih awal di beberapa negeri",
    cat: "Pendidikan",
    ago: "2 jam lalu",
    img: "school",
    split: [3, 7, 90],
    n: 12,
    claim: "Penggal persekolahan baharu bermula seminggu lebih awal di beberapa negeri.",
    summary:
      "Ini selaras dengan kalendar persekolahan yang diterbitkan, yang menetapkan tarikh mula berbeza bagi beberapa negeri.",
  },
  {
    id: "deepfake",
    v: "false",
    title: "Video janaan AI menteri mengumumkan cuti umum adalah palsu",
    cat: "Teknologi",
    ago: "3 jam lalu",
    img: "deepfake",
    split: [95, 5, 0],
    n: 30,
    claim: "Sebuah video menunjukkan seorang menteri mengumumkan cuti umum secara mengejut.",
    summary:
      "Video itu dijana oleh AI. Suara dan gerakan bibir tidak sepadan, dan tiada cuti sedemikian dalam mana-mana pengumuman rasmi.",
  },
  {
    id: "vitamin",
    v: "mislead",
    title: "Hantaran kaitkan vitamin biasa dengan penawar kanser salah tafsir kajian makmal",
    cat: "Kesihatan",
    ago: "4 jam lalu",
    img: "vitamin",
    split: [35, 60, 5],
    n: 14,
    claim: "Vitamin biasa boleh menyembuhkan kanser, menurut satu kajian baharu.",
    summary:
      "Kajian itu dijalankan ke atas sel di makmal, bukan ke atas manusia. Penyelidiknya menyatakan kajian itu tidak membuktikan vitamin tersebut menyembuhkan kanser.",
  },
  {
    id: "toll",
    v: "false",
    title: "Tidak, perjalanan tanpa tol musim perayaan tidak dilanjutkan",
    cat: "Pengangkutan",
    ago: "5 jam lalu",
    img: "toll",
    split: [80, 15, 5],
    n: 9,
    claim:
      "Perjalanan tanpa tol sempena musim perayaan telah dilanjutkan selama seminggu.",
    summary:
      "Tiada lanjutan diumumkan. Tarikh yang dikongsi itu diambil daripada pengumuman lama.",
  },
  {
    id: "haze",
    v: "true",
    title: "Bacaan jerebu di beberapa kawasan semenanjung memang mencapai tahap tidak sihat",
    cat: "Alam Sekitar",
    ago: "6 jam lalu",
    img: "haze",
    split: [2, 8, 90],
    n: 19,
    claim: "Bacaan jerebu di beberapa kawasan semenanjung mencapai tahap tidak sihat.",
    summary:
      "Bacaan kualiti udara bagi tarikh yang disebut memang mencapai julat tidak sihat di beberapa stesen pemantauan.",
  },
  {
    id: "bank",
    v: "false",
    title:
      "Notis tular 'caj bank baharu' yang tersebar di Telegram adalah rekaan",
    cat: "Penipuan",
    ago: "7 jam lalu",
    img: "bank",
    split: [90, 8, 2],
    n: 11,
    claim:
      "Bank akan mengenakan caj baharu bagi setiap pindahan dalam talian mulai minggu depan.",
    summary:
      "Notis itu adalah rekaan. Ia menggunakan logo lama, dan tiada bank yang mengumumkan caj sedemikian.",
  },
  {
    id: "rice",
    v: "mislead",
    title: "Carta kenaikan harga beras menggunakan tempoh masa terpilih",
    cat: "Ekonomi",
    ago: "8 jam lalu",
    img: "rice",
    split: [15, 75, 10],
    n: 8,
    claim: "Sebuah carta menunjukkan harga beras telah naik tiga kali ganda.",
    summary:
      "Carta itu bermula pada titik yang luar biasa rendah. Jika diukur dalam tempoh yang lebih panjang, kenaikannya jauh lebih kecil.",
  },
];
const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
const HERO_ID = "rm500";

const hot = [
  {
    id: "rm500",
    title: "Pautan WhatsApp bantuan digital RM500",
    searches: "48.2k",
    up: "+312%",
  },
  {
    id: "fuel",
    title: "Harga petrol naik dua kali ganda bulan depan",
    searches: "22.9k",
    up: "+118%",
  },
  {
    id: "deepfake",
    title: "Video menteri umum cuti umum",
    searches: "18.4k",
    up: "+96%",
  },
  {
    id: "school",
    title: "Penggal sekolah bermula lebih awal",
    searches: "12.1k",
    up: "+64%",
  },
  {
    id: "vitamin",
    title: "Kajian vitamin sembuhkan kanser",
    searches: "9.8k",
    up: "+41%",
  },
  {
    id: "bank",
    title: "Notis caj bank baharu di Telegram",
    searches: "7.3k",
    up: "+28%",
  },
  { id: "flood", title: "Foto lebuh raya dinaiki air", searches: "5.1k", up: "+19%" },
];

const ICON = {
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  share:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  report:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  factcheck:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/></svg>',
  saved:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  system:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
};

/* ---------- Templates ---------- */

// Pages that know the user's saved list replace this (userhome.html does)
let isSaved = () => false;

function actionBtns(id, big) {
  const on = isSaved(id);
  return `
        <button class="act-btn${big ? " big" : ""}${on ? " on" : ""}" data-save="${id}" aria-pressed="${on}">
            ${ICON.save}<span>${on ? "Disimpan" : "Simpan"}</span>
        </button>
        <button class="act-btn${big ? " big" : ""}" data-share="${id}">${ICON.share}<span>Kongsi</span></button>`;
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
            <a href="#article/${s.id}" class="card-img"><img loading="lazy" src="https://picsum.photos/seed/sbn-${s.img}/600/375" alt=""></a>
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
                <img src="https://picsum.photos/seed/sbn-${s.img}/900/640" alt="">
                <span class="tag">Sorotan Utama</span>
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
        <div class="article-img"><img src="https://picsum.photos/seed/sbn-${s.img}/1200/675" alt=""></div>

        <div class="claim"><b>Dakwaan</b>${s.claim}</div>

        <h3>Keputusan kami</h3>
        <div class="verdict-box vb-${s.v}">
            <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
            <p>${s.summary}</p>
        </div>

        <h3>Dapatan kami</h3>
        <p>Kami membandingkan dakwaan ini dengan kenyataan rasmi, rekod awam dan laporan daripada ${s.n} sumber.
           ${agreePct(s)}% daripadanya mencapai kesimpulan yang sama: <b>${LABEL[s.v].toLowerCase()}</b>.</p>
        <div class="consensus">
            ${consensusBar(s)}
            <div class="consensus-label">Palsu ${f}% · Mengelirukan ${m}% · Benar ${t}%</div>
        </div>
        <p>${advice}</p>

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
  document.querySelectorAll(".cats [data-topic]").forEach((a) =>
    a.classList.toggle("active", a.dataset.topic === name),
  );
  const title = document.getElementById("home-title");
  if (title) title.textContent = name ? `Topik: ${name}` : "Semakan Fakta Terkini";
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
