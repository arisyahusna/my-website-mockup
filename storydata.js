/* Fact-checks shown on the public site (index.html, allarticles.html, chatbot.js) and managed by the
   MCMC Content Publisher (mcmc/contentpublisher.html#site). Also loaded by every staff portal before ../cases.js.

   The list is SEED_STORIES (sample archive) merged with the public-site store in localStorage (SITE_KEY):
     fromCases — cases published by the Content Publisher (written by syncSite() in cases.js)
     pending   — seed stories whose case has not been published yet (hidden until it is)
     liveAt    — publication time of seed stories published from the portal
     edits / hidden / deleted — changes made by the Content Publisher */

const SITE_KEY = "sbn-site-v1";
const LABEL = { false: "Palsu", mislead: "Mengelirukan", true: "Benar" };
// Same list as the category bar on index.html (minus "Utama", which shows everything)
const PUBLIC_CATS = [
  "Bencana",
  "Ekonomi",
  "Keselamatan",
  "Pendidikan",
  "Pengangkutan",
  "Urus Tadbir",
  "Pilihanraya",
  "Agama",
  "Jenayah",
  "Kesihatan",
  "Kepenggunaan",
];

// Sample content — replace with real data from your CMS/API
const SEED_STORIES = [
  {
    id: "rm500",
    v: "false",
    title:
      'Mesej tular WhatsApp tawar "bantuan digital" RM500 ialah penipuan pancingan data',
    cat: "Jenayah",
    hrs: 0.3,
    img: "image/whatsapp scam.png",
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
    title:
      "Foto lebuh raya dinaiki air diambil pada 2021, bukan ribut minggu ini",
    cat: "Bencana",
    hrs: 3,
    img: "image/banjir.jpg",
    split: [88, 10, 2],
    n: 17,
    claim:
      "Sekeping foto menunjukkan lebuh raya dinaiki air semasa ribut minggu ini.",
    summary:
      "Carian imej terbalik menunjukkan foto itu pertama kali disiarkan pada Disember 2021. Ia tidak menunjukkan cuaca minggu ini.",
  },
  {
    id: "fuel",
    v: "mislead",
    title:
      "Dakwaan harga petrol naik dua kali ganda bulan depan tidak menyatakan konteks penting",
    cat: "Ekonomi",
    hrs: 20,
    img: "image/petrol.jpg",
    split: [20, 70, 10],
    n: 21,
    claim: "Harga petrol akan naik dua kali ganda mulai bulan depan.",
    summary:
      "Pelarasan subsidi sedang dibincangkan, tetapi tiada pengumuman yang menyatakan harga akan naik dua kali ganda. Hantaran itu tidak menyebut bahawa sebarang perubahan akan dilaksanakan secara berperingkat.",
  },
  {
    id: "school",
    v: "true",
    title:
      "Benar, penggal persekolahan baharu bermula seminggu lebih awal di beberapa negeri",
    cat: "Pendidikan",
    hrs: 30,
    img: "image/sekolah.jpg",
    split: [3, 7, 90],
    n: 12,
    claim:
      "Penggal persekolahan baharu bermula seminggu lebih awal di beberapa negeri.",
    summary:
      "Ini selaras dengan kalendar persekolahan yang diterbitkan, yang menetapkan tarikh mula berbeza bagi beberapa negeri.",
  },
  {
    id: "deepfake",
    v: "false",
    title: "Video janaan AI menteri mengumumkan cuti umum adalah palsu",
    cat: "Urus Tadbir",
    hrs: 52,
    img: "deepfake",
    split: [95, 5, 0],
    n: 30,
    claim:
      "Sebuah video menunjukkan seorang menteri mengumumkan cuti umum secara mengejut.",
    summary:
      "Video itu dijana oleh AI. Suara dan gerakan bibir tidak sepadan, dan tiada cuti sedemikian dalam mana-mana pengumuman rasmi.",
  },
  {
    id: "vitamin",
    v: "mislead",
    title:
      "Hantaran kaitkan vitamin biasa dengan penawar kanser salah tafsir kajian makmal",
    cat: "Kesihatan",
    hrs: 98,
    img: "vitamin",
    split: [35, 60, 5],
    n: 14,
    claim:
      "Vitamin biasa boleh menyembuhkan kanser, menurut satu kajian baharu.",
    summary:
      "Kajian itu dijalankan ke atas sel di makmal, bukan ke atas manusia. Penyelidiknya menyatakan kajian itu tidak membuktikan vitamin tersebut menyembuhkan kanser.",
  },
  {
    id: "toll",
    v: "false",
    title: "Tidak, perjalanan tanpa tol musim perayaan tidak dilanjutkan",
    cat: "Pengangkutan",
    hrs: 190,
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
    title:
      "Bacaan jerebu di beberapa kawasan semenanjung memang mencapai tahap tidak sihat",
    cat: "Kesihatan",
    hrs: 290,
    img: "image/jerebu.png",
    split: [2, 8, 90],
    n: 19,
    claim:
      "Bacaan jerebu di beberapa kawasan semenanjung mencapai tahap tidak sihat.",
    summary:
      "Bacaan kualiti udara bagi tarikh yang disebut memang mencapai julat tidak sihat di beberapa stesen pemantauan.",
  },
  {
    id: "bank",
    v: "false",
    title:
      "Notis tular 'caj bank baharu' yang tersebar di Telegram adalah rekaan",
    cat: "Kepenggunaan",
    hrs: 480,
    img: "image/telegram.png",
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
    hrs: 980,
    img: "rice",
    split: [15, 75, 10],
    n: 8,
    claim: "Sebuah carta menunjukkan harga beras telah naik tiga kali ganda.",
    summary:
      "Carta itu bermula pada titik yang luar biasa rendah. Jika diukur dalam tempoh yang lebih panjang, kenaikannya jauh lebih kecil.",
  },
];
// Publication time: `hrs` is how long ago it was published, so the demo always looks current
function agoText(t) {
  const h = (Date.now() - t) / 3600e3;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} minit lalu`;
  if (h < 24) return `${Math.round(h)} jam lalu`;
  if (h < 48) return "Semalam";
  if (h < 24 * 7) return `${Math.floor(h / 24)} hari lalu`;
  return new Date(t).toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Most-searched claims (sidebar); entries whose story is not on the site are skipped
const SEED_HOT = [
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
  {
    id: "flood",
    title: "Foto lebuh raya dinaiki air",
    searches: "5.1k",
    up: "+19%",
  },
];

/* ---------- Public-site store ---------- */
function loadSite() {
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem(SITE_KEY));
  } catch (e) {}
  return Object.assign(
    {
      fromCases: [],
      pending: [],
      liveAt: {},
      edits: {},
      hidden: [],
      deleted: [],
    },
    s || {},
  );
}
function saveSite(site) {
  try {
    localStorage.setItem(SITE_KEY, JSON.stringify(site));
    return true;
  } catch (e) {
    return false;
  }
}
function resetSite() {
  const s = loadSite();
  saveSite({
    fromCases: s.fromCases,
    pending: s.pending,
    liveAt: s.liveAt,
    edits: {},
    hidden: [],
    deleted: [],
  });
}

// Text from the store goes into the page as HTML, so markup is stripped
const plainText = (v) => String(v ?? "").replace(/[<>]/g, "");
const safeImg = (v) =>
  /^(data:image\/|https?:\/\/|image\/)/.test(v || "")
    ? String(v).replace(/"/g, "%22")
    : "";

// Newest first. { all: true } also returns hidden stories (for the Content Publisher)
function siteStories(opts = {}) {
  const site = loadSite(),
    t = Date.now();
  const seed = SEED_STORIES.filter((s) => !site.pending.includes(s.id)).map(
    (s) => ({
      ...s,
      at: site.liveAt[s.id] || t - s.hrs * 3600e3,
      origin: "seed",
    }),
  );
  const fromCases = site.fromCases.map((s) => ({ ...s, origin: "case" }));
  return [...fromCases, ...seed]
    .filter((s) => !site.deleted.includes(s.id))
    .map((s) => {
      const e = site.edits[s.id] || {};
      const out = {
        ...s,
        ...e,
        hidden: site.hidden.includes(s.id),
        edited: !!site.edits[s.id],
      };
      ["title", "cat", "claim", "summary", "body"].forEach(
        (k) => (out[k] = plainText(out[k])),
      );
      out.v = LABEL[out.v] ? out.v : "false";
      out.imgSrc = safeImg(out.imgSrc);
      out.ago = agoText(out.at);
      return out;
    })
    .filter((s) => opts.all || !s.hidden)
    .sort((a, b) => b.at - a.at);
}

// image/… paths are relative to this file, so they also work on the staff portals one folder down
const SITE_ROOT = document.currentScript
  ? new URL(".", document.currentScript.src).href
  : "";

// Shown when a story has no picture yet: a plain grey tile
const NO_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#e5e7eb"/></svg>',
  );

// Main image: the publisher's upload, else the story's `img` (an image/… file or link), else the grey tile
const storyImg = (s) => {
  const src = s.imgSrc || safeImg(s.img);
  if (!src) return NO_IMG;
  return src.startsWith("image/") ? SITE_ROOT + src.replace(/ /g, "%20") : src;
};
