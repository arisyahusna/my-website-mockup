/* Shared by index.html (public) and userhome.html (members):
   fact-check data, card/article templates, and the share dialog. */

const LABEL = { false: "False", mislead: "Misleading", true: "True" };

// Sample content — replace with real data from your CMS/API
const stories = [
  {
    id: "rm500",
    v: "false",
    title:
      'Viral WhatsApp message offering RM500 "digital aid" is a phishing scam',
    cat: "Scams",
    ago: "18 min ago",
    img: "hero",
    split: [92, 6, 2],
    n: 24,
    claim:
      "Recipients can claim RM500 by clicking a link and entering their IC number and bank details.",
    summary:
      "No agency has announced such a programme. The link leads to a lookalike site built to harvest banking credentials, and has been reported to the authorities.",
  },
  {
    id: "flood",
    v: "false",
    title: "Photo of flooded highway is from 2021, not this week's storm",
    cat: "Disasters",
    ago: "42 min ago",
    img: "flood",
    split: [88, 10, 2],
    n: 17,
    claim: "A photo shows a highway flooded during this week's storm.",
    summary:
      "A reverse image search shows the photo was first published in December 2021. It does not show this week's weather.",
  },
  {
    id: "fuel",
    v: "mislead",
    title:
      "Claim that petrol prices will double next month leaves out key context",
    cat: "Economy",
    ago: "1 hr ago",
    img: "fuel",
    split: [20, 70, 10],
    n: 21,
    claim: "Petrol prices will double from next month.",
    summary:
      "A subsidy adjustment is being discussed, but no announcement says prices will double. The post leaves out that any change would be phased in.",
  },
  {
    id: "school",
    v: "true",
    title: "Yes, the new school term starts one week earlier in some states",
    cat: "Education",
    ago: "2 hr ago",
    img: "school",
    split: [3, 7, 90],
    n: 12,
    claim: "The new school term starts one week earlier in some states.",
    summary:
      "This matches the published school calendar, which sets different start dates for some states.",
  },
  {
    id: "deepfake",
    v: "false",
    title: "AI-generated video of minister announcing public holiday is fake",
    cat: "Technology",
    ago: "3 hr ago",
    img: "deepfake",
    split: [95, 5, 0],
    n: 30,
    claim: "A video shows a minister announcing a surprise public holiday.",
    summary:
      "The video is AI-generated. The voice and lip movements don't match, and no such holiday appears in any official announcement.",
  },
  {
    id: "vitamin",
    v: "mislead",
    title: "Post linking common vitamin to cancer cure misreads a lab study",
    cat: "Health",
    ago: "4 hr ago",
    img: "vitamin",
    split: [35, 60, 5],
    n: 14,
    claim: "A common vitamin cures cancer, according to a new study.",
    summary:
      "The study was done on cells in a lab, not on people. Its authors say it does not show that the vitamin cures cancer.",
  },
  {
    id: "toll",
    v: "false",
    title: "No, toll-free travel during festive season has not been extended",
    cat: "Transport",
    ago: "5 hr ago",
    img: "toll",
    split: [80, 15, 5],
    n: 9,
    claim:
      "Toll-free travel during the festive season has been extended by a week.",
    summary:
      "No extension has been announced. The dates being shared come from an older announcement.",
  },
  {
    id: "haze",
    v: "true",
    title: "Haze readings in parts of the peninsula did reach unhealthy levels",
    cat: "Environment",
    ago: "6 hr ago",
    img: "haze",
    split: [2, 8, 90],
    n: 19,
    claim: "Haze readings in parts of the peninsula reached unhealthy levels.",
    summary:
      "Air quality readings for the dates mentioned did reach the unhealthy range at several monitoring stations.",
  },
  {
    id: "bank",
    v: "false",
    title:
      "Viral 'new bank charge' notice circulating on Telegram is fabricated",
    cat: "Scams",
    ago: "7 hr ago",
    img: "bank",
    split: [90, 8, 2],
    n: 11,
    claim:
      "Banks will charge a new fee for every online transfer starting next week.",
    summary:
      "The notice is fabricated. It uses an outdated logo, and no bank has announced such a charge.",
  },
  {
    id: "rice",
    v: "mislead",
    title: "Chart on rising rice prices uses a cherry-picked time range",
    cat: "Economy",
    ago: "8 hr ago",
    img: "rice",
    split: [15, 75, 10],
    n: 8,
    claim: "A chart shows rice prices have tripled.",
    summary:
      "The chart starts at an unusually low point. Measured over a longer period, the increase is much smaller.",
  },
];
const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
const HERO_ID = "rm500";

const hot = [
  {
    id: "rm500",
    title: "RM500 digital aid WhatsApp link",
    searches: "48.2k",
    up: "+312%",
  },
  {
    id: "fuel",
    title: "Petrol price to double next month",
    searches: "22.9k",
    up: "+118%",
  },
  {
    id: "deepfake",
    title: "Minister public holiday video",
    searches: "18.4k",
    up: "+96%",
  },
  {
    id: "school",
    title: "School term starting earlier",
    searches: "12.1k",
    up: "+64%",
  },
  {
    id: "vitamin",
    title: "Vitamin cures cancer study",
    searches: "9.8k",
    up: "+41%",
  },
  {
    id: "bank",
    title: "New bank charge notice on Telegram",
    searches: "7.3k",
    up: "+28%",
  },
  { id: "flood", title: "Flooded highway photo", searches: "5.1k", up: "+19%" },
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
            ${ICON.save}<span>${on ? "Saved" : "Save"}</span>
        </button>
        <button class="act-btn${big ? " big" : ""}" data-share="${id}">${ICON.share}<span>Share</span></button>`;
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
                <div class="consensus-label">${s.n} sources · ${agreePct(s)}% agree</div>
            </div>
            <div class="card-actions">${actionBtns(s.id)}</div>
        </article>`;
}

function heroHTML(s) {
  return `
        <article class="hero">
            <a href="#article/${s.id}" class="hero-img">
                <img src="https://picsum.photos/seed/sbn-${s.img}/900/640" alt="">
                <span class="tag">Top Story</span>
            </a>
            <div class="hero-body">
                <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
                <h3><a href="#article/${s.id}">${s.title}</a></h3>
                <div class="claim"><b>The claim</b>${s.claim}</div>
                <p>${s.summary}</p>
                <div class="consensus">
                    ${consensusBar(s)}
                    <div class="consensus-label">${s.n} sources checked · ${agreePct(s)}% rate this ${LABEL[s.v].toLowerCase()}</div>
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
                ${h.searches ? `<span>${h.searches} searches</span><span class="trend">▲ ${h.up}</span>` : `<span>${byId[h.id].ago}</span>`}
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
      ? "This claim is accurate. If you share it, include the context above."
      : "If you receive this claim, please don't forward it. Share this fact check instead so others can see the facts.";

  return `
        <a href="#home" class="back-link">← Back to latest fact checks</a>
        <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
        <h1>${s.title}</h1>
        <div class="meta"><span>${s.cat}</span><span class="dot"></span><span>${s.ago}</span><span class="dot"></span><span>3 min read</span><span class="dot"></span><span>sebenarnya.my fact-check team</span></div>
        <div class="article-actions">${actionBtns(s.id, true)}</div>
        <div class="article-img"><img src="https://picsum.photos/seed/sbn-${s.img}/1200/675" alt=""></div>

        <div class="claim"><b>The claim</b>${s.claim}</div>

        <h3>Our verdict</h3>
        <div class="verdict-box vb-${s.v}">
            <span class="verdict v-${s.v}">${LABEL[s.v]}</span>
            <p>${s.summary}</p>
        </div>

        <h3>What we found</h3>
        <p>We compared this claim with official statements, public records and reporting from ${s.n} sources.
           ${agreePct(s)}% of them reached the same conclusion: <b>${LABEL[s.v].toLowerCase()}</b>.</p>
        <div class="consensus">
            ${consensusBar(s)}
            <div class="consensus-label">False ${f}% · Misleading ${m}% · True ${t}%</div>
        </div>
        <p>${advice}</p>

        <h3>How we checked</h3>
        <ol class="how">
            <li>Traced the claim back to where it first appeared.</li>
            <li>Checked it against official records and statements.</li>
            <li>Contacted the agencies or people involved to confirm.</li>
        </ol>

        <div class="article-foot">
            <p>Found this useful? Help stop the spread.</p>
            <div class="card-actions">${actionBtns(s.id, true)}</div>
        </div>`;
}

/* ---------- Toast + share dialog (added to the page on load) ---------- */

document.body.insertAdjacentHTML(
  "beforeend",
  `
    <dialog class="modal form-modal" id="share-dialog" aria-labelledby="share-heading">
        <button class="modal-close" data-close aria-label="Close">&times;</button>
        <h3 id="share-heading">Share this fact check</h3>
        <p class="share-title" id="share-title"></p>
        <div class="share-grid">
            <a class="share-opt" id="share-wa" target="_blank" rel="noopener"><span class="share-ic wa">W</span>WhatsApp</a>
            <a class="share-opt" id="share-fb" target="_blank" rel="noopener"><span class="share-ic fb">f</span>Facebook</a>
            <a class="share-opt" id="share-x" target="_blank" rel="noopener"><span class="share-ic x">X</span>X</a>
            <a class="share-opt" id="share-tg" target="_blank" rel="noopener"><span class="share-ic tg">T</span>Telegram</a>
        </div>
        <div class="share-link">
            <input id="share-url" readonly aria-label="Link to this fact check">
            <button class="btn-primary" id="share-copy">Copy</button>
        </div>
        <button class="link-btn share-more" id="share-native" hidden>More sharing options…</button>
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
  document.getElementById("share-copy").textContent = "Copy";
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
  document.getElementById("share-copy").textContent = "Copied!";
  toast("Link copied");
});

document.getElementById("share-native").addEventListener("click", () => {
  navigator
    .share(shareData)
    .then(() => shareDialog.close())
    .catch(() => {});
});
