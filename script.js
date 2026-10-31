
"use strict";

// Native page scrolling controls the animations.
// Nothing intercepts wheel or touch events.

const DATA = [
  {
    section: "journey",
    canvas: "journey-canvas",
    count: "journey-count",
    title: "journey-title",
    desc: "journey-desc",
    progress: "journey-progress",

    names: [
      "CHOCOLATE",
      "STRAWBERRY",
      "BLUEBERRY"
    ],

    lines: [
      "Rich. Deep. Unmistakable.",
      "A little sweetness in every swirl.",
      "A beautifully bold finish."
    ],

    colors: [
      "#24130f",
      "#99445c",
      "#292342"
    ],

    folder: [
      "journey-chocolate",
      "journey-strawberry",
      "journey-blueberry"
    ]
  },

  {
    section: "flavors",
    canvas: "showcase-canvas",
    count: "showcase-count",
    title: "showcase-title",
    desc: "showcase-desc",
    progress: "showcase-progress",

    names: [
      "BLUEBERRY",
      "STRAWBERRY",
      "CHOCOLATE"
    ],

    lines: [
      "Wild berries. Velvet swirls.",
      "Fresh berries. Silky sweetness.",
      "Dark drizzle. Pure indulgence."
    ],

    colors: [
      "#292342",
      "#99445c",
      "#24130f"
    ],

    folder: [
      "cone-blueberry",
      "cone-strawberry",
      "cone-chocolate"
    ]
  }
];

// Each flavor uses 72 frames.
const TOTAL = 72;
const MAX_CACHE = 125;

const cache = new Map();
const loading = new Set();

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v));

const frameUrl = (folder, n) =>
  `assets/frames/${folder}/${String(n + 1).padStart(4, "0")}.webp`;

// ===============================
// FRAME LOADING
// ===============================

function loadFrame(folder, n) {
  if (n < 0 || n >= TOTAL) return;

  const key = `${folder}:${n}`;

  if (cache.has(key) || loading.has(key)) {
    return;
  }

  loading.add(key);

  const img = new Image();
  img.decoding = "async";

  img.onload = () => {
    loading.delete(key);

    cache.delete(key);
    cache.set(key, img);

    while (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
  };

  img.onerror = () => {
    loading.delete(key);
  };

  img.src = frameUrl(folder, n);
}

// ===============================
// SCROLL PROGRESS
// ===============================

function sectionProgress(section) {
  const rect = section.getBoundingClientRect();

  const available = Math.max(
    1,
    section.offsetHeight - window.innerHeight
  );

  return clamp(
    -rect.top / available,
    0,
    1
  );
}

// ===============================
// SECTION STATES
// ===============================

const states = DATA.map(item => ({
  ...item,

  sectionEl: document.getElementById(item.section),
  canvasEl: document.getElementById(item.canvas),

  titleEl: document.getElementById(item.title),
  descEl: document.getElementById(item.desc),
  countEl: document.getElementById(item.count),
  progressEl: document.getElementById(item.progress),

  ctx: null,

  progressValue: 0,
  frameDrawn: -1,
  displayedIndex: -1,
  currentIndex: 0,

  lastImage: null,
  forceRedraw: true
}));

// ===============================
// RESPONSIVE CANVAS
// ===============================

function layout(canvas) {
  const dpr = Math.min(
    window.devicePixelRatio || 1,
    1.5
  );

  const w = Math.max(
    1,
    Math.round(canvas.clientWidth * dpr)
  );

  const h = Math.max(
    1,
    Math.round(canvas.clientHeight * dpr)
  );

  const changed =
    canvas.width !== w ||
    canvas.height !== h;

  if (changed) {
    canvas.width = w;
    canvas.height = h;
  }

  return { w, h, changed };
}

// ===============================
// FULL-WIDTH VIDEO FRAME DRAWING
// ===============================

function draw(state, image) {
  if (!image || !image.naturalWidth) return;

  const { w, h } = layout(state.canvasEl);
  const ctx = state.ctx;

  if (!w || !h || !ctx) return;

  const mobile = window.matchMedia(
    "(max-width: 700px)"
  ).matches;

  ctx.clearRect(0, 0, w, h);

  // Background matches the active flavor.
  ctx.fillStyle =
    state.colors[state.currentIndex] ||
    state.colors[0];

  ctx.fillRect(0, 0, w, h);

  const imageW = image.naturalWidth;
  const imageH = image.naturalHeight;

  // Desktop: cover entire viewport.
  // Mobile: contain complete scoop/cone.
  const scale = mobile
    ? Math.min(w / imageW, h / imageH)
    : Math.max(w / imageW, h / imageH);

  const drawnW = imageW * scale;
  const drawnH = imageH * scale;

  // On mobile, position the video above the text.
  const centerY = mobile
    ? h * 0.39
    : h * 0.5;

  ctx.drawImage(
    image,
    (w - drawnW) / 2,
    centerY - drawnH / 2,
    drawnW,
    drawnH
  );
}

// ===============================
// FIND NEAREST LOADED FRAME
// ===============================

function getNearestFrame(folder, index) {
  const exact = cache.get(`${folder}:${index}`);

  if (exact) return exact;

  for (let distance = 1; distance <= 12; distance++) {
    const before = cache.get(
      `${folder}:${index - distance}`
    );

    const after = cache.get(
      `${folder}:${index + distance}`
    );

    if (before) return before;
    if (after) return after;
  }

  return null;
}

// ===============================
// SMOOTH SCROLL ANIMATION
// ===============================

let previousTime = performance.now();

function animate(now) {
  const delta = Math.min(
    64,
    now - previousTime
  );

  previousTime = now;

  // Frame-rate-independent smoothing.
  const blend = 1 - Math.exp(-delta / 95);

  for (const state of states) {
    if (!state.sectionEl || !state.canvasEl) {
      continue;
    }

    const target = sectionProgress(
      state.sectionEl
    );

    state.progressValue +=
      (target - state.progressValue) * blend;

    if (
      Math.abs(target - state.progressValue) <
      0.00015
    ) {
      state.progressValue = target;
    }

    // Three flavors, 72 frames each.
    const raw = Math.min(
      TOTAL * 3 - 1,
      Math.floor(state.progressValue * TOTAL * 3)
    );

    const index = Math.min(
      2,
      Math.floor(raw / TOTAL)
    );

    const frameNumber = raw % TOTAL;
    const folder = state.folder[index];

    state.currentIndex = index;

    // Load current frame.
    loadFrame(folder, frameNumber);

    // Preload forward and backward.
    for (let distance = 1; distance <= 5; distance++) {
      loadFrame(folder, frameNumber + distance);
      loadFrame(folder, frameNumber - distance);
    }

    // Preload next flavor.
    if (
      index < 2 &&
      frameNumber >= TOTAL - 7
    ) {
      for (let n = 0; n < 7; n++) {
        loadFrame(state.folder[index + 1], n);
      }
    }

    // Preload previous flavor.
    if (
      index > 0 &&
      frameNumber <= 6
    ) {
      for (
        let n = TOTAL - 7;
        n < TOTAL;
        n++
      ) {
        loadFrame(state.folder[index - 1], n);
      }
    }

    const { changed } = layout(
      state.canvasEl
    );

    const image = getNearestFrame(
      folder,
      frameNumber
    );

    if (
      image &&
      (
        raw !== state.frameDrawn ||
        changed ||
        state.forceRedraw ||
        image !== state.lastImage
      )
    ) {
      draw(state, image);

      state.frameDrawn = raw;
      state.lastImage = image;
      state.forceRedraw = false;
    }

    // Update headings and background.
    if (state.displayedIndex !== index) {
      state.displayedIndex = index;

      if (state.titleEl) {
        state.titleEl.innerHTML =
          `${state.names[index]}<span class="period">.</span>`;
      }

      if (state.descEl) {
        state.descEl.textContent =
          state.lines[index];
      }

      if (state.countEl) {
        state.countEl.textContent =
          `0${index + 1} — 03`;
      }

      const stage = state.sectionEl.querySelector(
        ".sticky-stage"
      );

      if (stage) {
        stage.style.backgroundColor =
          state.colors[index];
      }
    }

    if (state.progressEl) {
      state.progressEl.style.width =
        `${(state.progressValue * 100).toFixed(1)}%`;
    }
  }

  requestAnimationFrame(animate);
}

// ===============================
// INITIALIZE ANIMATIONS
// ===============================

states.forEach(state => {
  if (!state.canvasEl) return;

  state.ctx = state.canvasEl.getContext(
    "2d",
    { alpha: false }
  );

  loadFrame(state.folder[0], 0);
});

window.addEventListener(
  "resize",
  () => {
    states.forEach(state => {
      state.forceRedraw = true;
      state.frameDrawn = -1;
    });
  },
  { passive: true }
);

requestAnimationFrame(animate);

// ===============================
// FLAVOR CUSTOMIZER
// ===============================

document.querySelectorAll(
  "[data-flavor]"
).forEach(button => {

  button.addEventListener("click", () => {
    const flavor = button.dataset.flavor;

    document.querySelectorAll(
      "[data-flavor]"
    ).forEach(other => {

      const selected = other === button;

      other.classList.toggle(
        "selected",
        selected
      );

      other.setAttribute(
        "aria-pressed",
        String(selected)
      );
    });

    const img = document.querySelector(
      "#custom-img"
    );

    const label = document.querySelector(
      "#custom-name"
    );

    if (img) {
      img.src =
        `assets/stills/cone-${flavor}.webp`;

      img.alt = `${flavor} waffle cone`;
    }

    if (label) {
      label.textContent =
        `${flavor.toUpperCase()} / YOUR SCOOP`;
    }
  });
});

// ===============================
// CINEMATIC VIDEO MODAL
// ===============================

const dialog = document.querySelector(
  "#video-dialog"
);

const detailVideo = document.querySelector(
  "#detail-video"
);

if (dialog && detailVideo) {

  document.querySelectorAll(
    "[data-video]"
  ).forEach(button => {

    button.addEventListener("click", () => {
      const key = button.dataset.video;

      detailVideo.src =
        `assets/videos/${key}.mp4`;

      dialog.showModal();

      detailVideo.play().catch(() => {});
    });
  });

  document.querySelector(
    "#close-dialog"
  )?.addEventListener(
    "click",
    () => dialog.close()
  );

  dialog.addEventListener(
    "close",
    () => {
      detailVideo.pause();
      detailVideo.removeAttribute("src");
      detailVideo.load();
    }
  );
}
