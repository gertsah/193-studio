const progress = document.getElementById('scrollProgress');
const topbar = document.getElementById('topbar');
const hero = document.querySelector('.hero');
const heroTitleWrap = document.querySelector('.hero-title-wrap');
const siteIntro = document.getElementById('siteIntro');
const siteIntroLogo = document.getElementById('siteIntroLogo');
const revealNodes = document.querySelectorAll('.reveal');
const parallaxNodes = document.querySelectorAll('[data-parallax]');
const driftNodes = document.querySelectorAll('[data-drift]');
const storyStages = document.querySelectorAll('.story-stage');
const textRiseSelectors = [
  '.hero-kicker',
  '.hero-summary > p',
  '.hero-pills span',
  '.hero-meta',
  '.stage-label',
  '.stage-title span',
  '.stage-text',
  '.stage-tags span',
  '.panel-kicker',
  '.stage-panel strong',
  '.stage-panel p',
  '.stage-services p',
  '.stage-services li',
  '.projects-head p',
  '.projects-head h2',
  '.project-card span',
  '.project-card h3',
  '.project-card p',
  '.manifest-label',
  '.manifest-grid p',
  '.contact h2',
  '.mail',
  '.footer p'
];
const stackScenes = Array.from(document.querySelectorAll('.story-stage, .projects, .manifest, .contact'))
  .map((scene) => ({
    scene,
    panel: scene.querySelector('.stage-pin, .projects-pin, .manifest-pin, .contact-pin')
  }))
  .filter((entry) => entry.panel);
const sceneRevealNodes = document.querySelectorAll(
  '.story-stage .reveal, .projects .reveal, .manifest .reveal, .contact .reveal'
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (start, end, amount) => start + (end - start) * amount;
const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
const easeInOutCubic = (value) =>
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;

let previousScroll = window.scrollY;
let scrollVelocity = 0;
let animationFrame = null;
let introState = 'idle';
let introCleanupTimer = null;
let introStartTimer = null;
let introHoldTimer = null;
let introFinalizeTimer = null;
let textRiseNodes = [];

function setupTextRise() {
  const groups = new WeakMap();

  document.querySelectorAll(textRiseSelectors.join(',')).forEach((node) => {
    if (node.dataset.textRiseReady === 'true') return;

    const inner = document.createElement('span');
    inner.className = 'text-rise__inner';
    inner.innerHTML = node.innerHTML;

    node.innerHTML = '';
    node.appendChild(inner);
    node.classList.add('text-rise');
    node.dataset.textRiseReady = 'true';

    if (hero && hero.contains(node)) {
      node.dataset.textRiseHero = 'true';
    }

    const group =
      node.closest('.hero-main, .stage-copy, .stage-panel, .stage-services, .projects-head, .project-card, .manifest-surface, .contact-surface, .footer')
      || node.parentElement
      || node;

    const order = groups.get(group) || 0;
    groups.set(group, order + 1);
    node.style.setProperty('--text-rise-delay', `${Math.min(order * 0.065, 0.36)}s`);
  });

  textRiseNodes = Array.from(document.querySelectorAll('.text-rise'));
}

setupTextRise();

sceneRevealNodes.forEach((node) => node.classList.add('show'));

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -10% 0px'
    }
  );

  revealNodes.forEach((node) => observer.observe(node));
} else {
  revealNodes.forEach((node) => node.classList.add('show'));
}

revealNodes.forEach((node) => {
  const rect = node.getBoundingClientRect();
  if (rect.top < window.innerHeight * 0.92) {
    node.classList.add('show');
  }
});

const activateHeroTextRise = () => {
  const heroTextNodes = textRiseNodes.filter((node) => node.dataset.textRiseHero === 'true');

  heroTextNodes.forEach((node, index) => {
    window.setTimeout(() => {
      node.classList.add('show');
    }, index * 70);
  });
};

if ('IntersectionObserver' in window) {
  const textObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          textObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -10% 0px'
    }
  );

  textRiseNodes.forEach((node) => {
    if (node.dataset.textRiseHero === 'true') return;
    textObserver.observe(node);
  });
} else {
  textRiseNodes.forEach((node) => {
    if (node.dataset.textRiseHero === 'true') return;
    node.classList.add('show');
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function syncIntroToHero() {
  if (!siteIntro || !siteIntroLogo || !heroTitleWrap) return;

  const rect = heroTitleWrap.getBoundingClientRect();
  const target = document.documentElement;

  target.style.setProperty('--intro-left', `${rect.left}px`);
  target.style.setProperty('--intro-top', `${rect.top}px`);
  target.style.setProperty('--intro-width', `${rect.width}px`);
  target.style.setProperty('--intro-height', `${rect.height}px`);
  siteIntro.style.setProperty('--intro-left', `${rect.left}px`);
  siteIntro.style.setProperty('--intro-top', `${rect.top}px`);
  siteIntro.style.setProperty('--intro-width', `${rect.width}px`);
  siteIntro.style.setProperty('--intro-height', `${rect.height}px`);
}

function setIntroVars(edge, waveX, waveOpacity) {
  const target = document.documentElement;
  target.style.setProperty('--intro-edge', `${edge}%`);
  target.style.setProperty('--intro-wave-x', `${waveX}`);
  target.style.setProperty('--intro-wave-o', `${waveOpacity}`);
  siteIntro.style.setProperty('--intro-edge', `${edge}%`);
  siteIntro.style.setProperty('--intro-wave-x', `${waveX}`);
  siteIntro.style.setProperty('--intro-wave-o', `${waveOpacity}`);
}

function finishIntro(immediate = false) {
  if (!siteIntro) return;

  introState = 'done';
  syncIntroToHero();
  setIntroVars(118, 112, 0);
  document.body.classList.add('intro-ending');

  const finalize = () => {
    if (introFinalizeTimer) {
      window.clearTimeout(introFinalizeTimer);
      introFinalizeTimer = null;
    }
    document.body.classList.remove('intro-lock', 'intro-active', 'intro-ending');
    document.body.classList.add('intro-complete');
    document.body.classList.add('hero-live');
    siteIntro.classList.add('is-hidden');
    activateHeroTextRise();
    if (introCleanupTimer) {
      window.clearTimeout(introCleanupTimer);
      introCleanupTimer = null;
    }
    if (introHoldTimer) {
      window.clearTimeout(introHoldTimer);
      introHoldTimer = null;
    }
  };

  if (immediate) {
    finalize();
    return;
  }

  introFinalizeTimer = window.setTimeout(finalize, 560);
}

function playIntro() {
  if (!siteIntro || !siteIntroLogo || !heroTitleWrap) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.scrollY > 8) {
    finishIntro(true);
    return;
  }

  introState = 'playing';
  document.body.classList.add('intro-active', 'intro-lock');
  syncIntroToHero();
  setIntroVars(-18, -20, 0);

  const start = performance.now();
  const duration = 1220;

  const animate = (now) => {
    if (introState !== 'playing') return;

    const raw = clamp((now - start) / duration, 0, 1);
    const draw = easeInOutCubic(raw);
    const edge = mix(-18, 128, draw);
    setIntroVars(edge, mix(-20, 96, draw), 0);

    if (raw < 1) {
      window.requestAnimationFrame(animate);
      return;
    }

    introState = 'holding';
    setIntroVars(128, 96, 0);
    introHoldTimer = window.setTimeout(() => {
      finishIntro();
    }, 220);
  };

  window.requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  previousScroll = window.scrollY;
  scrollVelocity = 0;
  syncIntroToHero();
  requestTick();
});

if ('ResizeObserver' in window && heroTitleWrap) {
  const introObserver = new ResizeObserver(() => {
    if (introState !== 'done') {
      syncIntroToHero();
    }
  });

  introObserver.observe(heroTitleWrap);
}

function updateHeroScene(scrollY, velocity) {
  if (!hero) return;

  const total = Math.max(hero.offsetHeight - window.innerHeight, 1);
  const moved = clamp(scrollY - hero.offsetTop, 0, total);
  const raw = moved / total;
  const eased = easeOutCubic(Math.min(raw / 0.58, 1));
  const compact = window.innerWidth <= 820;

  hero.style.setProperty('--hero-shell-shift', `${mix(0, compact ? -10 : -18, raw)}px`);
  hero.style.setProperty('--hero-shell-scale', '1');
  hero.style.setProperty('--hero-meta-y', `${mix(0, compact ? 6 : 14, eased)}px`);
  hero.style.setProperty('--hero-main-y', `${mix(0, compact ? -8 : -18, eased)}px`);
  hero.style.setProperty('--hero-title-y', `${mix(0, compact ? -4 : -10, eased)}px`);
  hero.style.setProperty('--hero-top-x', `${mix(0, compact ? -8 : -16, eased)}px`);
  hero.style.setProperty('--hero-top-y', `${mix(0, compact ? -3 : -8, eased)}px`);
  hero.style.setProperty('--hero-top-r', `${mix(0, compact ? -0.4 : -0.8, eased)}deg`);
  hero.style.setProperty('--hero-bottom-x', `${mix(0, compact ? 10 : 22, eased)}px`);
  hero.style.setProperty('--hero-bottom-y', `${mix(0, compact ? 4 : 12, eased)}px`);
  hero.style.setProperty('--hero-bottom-r', `${mix(0, compact ? 0.3 : 0.7, eased)}deg`);
}

function updateParallax(scrollY, velocity) {
  parallaxNodes.forEach((node) => {
    const speed = Number(node.dataset.parallax || 0);
    node.style.setProperty('--parallax-y', `${scrollY * speed * 0.35}px`);
  });

  driftNodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const speed = Number(node.dataset.drift || 0);
    const viewportCenter = window.innerHeight * 0.5;
    const distance = rect.top + rect.height * 0.5 - viewportCenter;
    const offset = clamp(distance * speed * -0.06 + velocity * 0.18, -18, 18);
    node.style.setProperty('--drift-y', `${offset}px`);
  });

  updateHeroScene(scrollY, velocity);
}

function resetStage(stage) {
  stage.style.removeProperty('--stage-progress');
  stage.style.removeProperty('--wash-x');
  stage.style.removeProperty('--wash-y');
  stage.style.removeProperty('--wash-r');
  stage.style.removeProperty('--wash-s');

  const copy = stage.querySelector('.stage-copy');
  const titleLines = stage.querySelectorAll('.stage-title span');
  const panels = stage.querySelectorAll('.stage-panel');
  const progressFill = stage.querySelector('.stage-progressline span');
  const ghostWords = stage.querySelectorAll('.stage-ghost span');
  const stageServices = stage.querySelector('.stage-services');

  if (copy) {
    copy.style.removeProperty('--copy-x');
    copy.style.removeProperty('--copy-y');
    copy.style.removeProperty('--copy-r');
    copy.style.removeProperty('--copy-o');
  }

  titleLines.forEach((line) => {
    line.style.removeProperty('--title-x');
    line.style.removeProperty('--title-y');
    line.style.removeProperty('--title-skew');
  });

  panels.forEach((panel) => {
    panel.style.removeProperty('--panel-x');
    panel.style.removeProperty('--panel-y');
    panel.style.removeProperty('--panel-z');
    panel.style.removeProperty('--panel-r');
    panel.style.removeProperty('--panel-scale');
    panel.style.removeProperty('--panel-blur');
    panel.style.removeProperty('--panel-opacity');
    panel.style.removeProperty('--panel-focus');
    panel.style.zIndex = '';
  });

  if (progressFill) {
    progressFill.style.width = '100%';
  }

  ghostWords.forEach((word) => {
    word.style.removeProperty('--ghost-x');
    word.style.removeProperty('--ghost-y');
    word.style.removeProperty('--ghost-r');
    word.style.removeProperty('--ghost-scale');
    word.style.opacity = '';
  });

  if (stageServices) {
    stageServices.style.removeProperty('--service-y');
    stageServices.style.removeProperty('--service-r');
    stageServices.style.removeProperty('--service-opacity');
    stageServices.style.opacity = '';
  }
}

function updateMobileStoryStages() {
  storyStages.forEach((stage) => {
    const stageRect = stage.getBoundingClientRect();
    const stageProgress = clamp(
      (window.innerHeight * 0.84 - stageRect.top) / Math.max(window.innerHeight * 0.9, 1),
      0,
      1
    );
    const copy = stage.querySelector('.stage-copy');
    const titleLines = stage.querySelectorAll('.stage-title span');
    const panels = stage.querySelectorAll('.stage-panel');
    const progressFill = stage.querySelector('.stage-progressline span');
    const stageServices = stage.querySelector('.stage-services');

    stage.style.setProperty('--stage-progress', stageProgress.toFixed(4));
    stage.style.setProperty('--wash-x', '0px');
    stage.style.setProperty('--wash-y', '0px');
    stage.style.setProperty('--wash-r', '0deg');
    stage.style.setProperty('--wash-s', '1');

    if (progressFill) {
      progressFill.style.width = `${stageProgress * 100}%`;
    }

    if (copy) {
      const copyLift = (1 - stageProgress) * 18;
      copy.style.setProperty('--copy-x', `${(1 - stageProgress) * 6}px`);
      copy.style.setProperty('--copy-y', `${copyLift}px`);
      copy.style.setProperty('--copy-r', '0deg');
      copy.style.setProperty('--copy-o', `${mix(0.74, 1, stageProgress).toFixed(3)}`);
    }

    titleLines.forEach((line, index) => {
      const direction = index === 0 ? -1 : 1;
      const offset = (1 - stageProgress) * 10 * direction;
      line.style.setProperty('--title-x', `${offset}px`);
      line.style.setProperty('--title-y', `${(1 - stageProgress) * 6}px`);
      line.style.setProperty('--title-skew', '0deg');
    });

    panels.forEach((panel, index) => {
      const rect = panel.getBoundingClientRect();
      const local = clamp((window.innerHeight * 0.9 - rect.top) / (window.innerHeight * 0.44), 0, 1);
      const eased = easeOutCubic(local);
      const direction = index % 2 === 0 ? -1 : 1;
      const y = (1 - eased) * (24 + index * 8);
      const x = direction * (1 - eased) * 10;
      const scale = 0.96 + eased * 0.04;
      const opacity = 0.58 + eased * 0.42;

      panel.style.zIndex = String(10 + index);
      panel.style.setProperty('--panel-x', `${x}px`);
      panel.style.setProperty('--panel-y', `${y}px`);
      panel.style.setProperty('--panel-z', '0px');
      panel.style.setProperty('--panel-r', `${(1 - eased) * direction * 1.8}deg`);
      panel.style.setProperty('--panel-scale', scale.toFixed(3));
      panel.style.setProperty('--panel-blur', '0px');
      panel.style.setProperty('--panel-opacity', opacity.toFixed(3));
      panel.style.setProperty('--panel-focus', eased.toFixed(3));
    });

    if (stageServices) {
      const rect = stageServices.getBoundingClientRect();
      const local = clamp((window.innerHeight * 0.94 - rect.top) / (window.innerHeight * 0.52), 0, 1);
      const eased = easeOutCubic(local);

      stageServices.style.setProperty('--service-y', `${(1 - eased) * 18}px`);
      stageServices.style.setProperty('--service-r', '0deg');
      stageServices.style.setProperty('--service-opacity', `${(0.68 + eased * 0.32).toFixed(3)}`);
      stageServices.style.opacity = `${(0.68 + eased * 0.32).toFixed(3)}`;
    }
  });
}

function updateStoryStages(scrollY, velocity) {
  if (window.innerWidth <= 820) {
    updateMobileStoryStages();
    return;
  }

  storyStages.forEach((stage) => {
    const total = Math.max(stage.offsetHeight - window.innerHeight, 1);
    const moved = clamp(scrollY - stage.offsetTop, 0, total);
    const raw = moved / total;
    const narrativeRaw = clamp(raw / 0.78, 0, 1);
    const eased = easeInOutCubic(narrativeRaw);
    const swing = Math.sin(narrativeRaw * Math.PI);
    const push = clamp(velocity * 0.18, -8, 8);
    const copy = stage.querySelector('.stage-copy');
    const titleLines = stage.querySelectorAll('.stage-title span');
    const panels = stage.querySelectorAll('.stage-panel');
    const progressFill = stage.querySelector('.stage-progressline span');
    const ghostWords = stage.querySelectorAll('.stage-ghost span');
    const stageServices = stage.querySelector('.stage-services');

    stage.style.setProperty('--stage-progress', narrativeRaw.toFixed(4));
    stage.style.setProperty('--wash-x', `${mix(-36, 36, narrativeRaw)}px`);
    stage.style.setProperty('--wash-y', `${Math.sin(narrativeRaw * Math.PI) * 18 - 10}px`);
    stage.style.setProperty('--wash-r', `${mix(-3, 3, narrativeRaw)}deg`);
    stage.style.setProperty('--wash-s', `${(1 + swing * 0.04).toFixed(3)}`);

    if (progressFill) {
      progressFill.style.width = `${narrativeRaw * 100}%`;
    }

    if (copy) {
      copy.style.setProperty('--copy-x', `${mix(0, 10, eased)}px`);
      copy.style.setProperty('--copy-y', `${mix(18, -8, eased)}px`);
      copy.style.setProperty('--copy-r', '0deg');
      copy.style.setProperty('--copy-o', `${mix(0.8, 1, narrativeRaw).toFixed(3)}`);
    }

    titleLines.forEach((line, index) => {
      const direction = index === 0 ? -1 : 1;
      line.style.setProperty('--title-x', `${direction * mix(0, 12, eased) + push * 0.12}px`);
      line.style.setProperty('--title-y', `${direction * mix(0, 3, swing)}px`);
      line.style.setProperty('--title-skew', '0deg');
    });

    ghostWords.forEach((word, index) => {
      const direction = index === 0 ? 1 : -1;
      const x = (narrativeRaw - 0.5) * direction * 120 + push * 0.35;
      const y = Math.sin((narrativeRaw + index * 0.12) * Math.PI) * 18 - 8;
      const rotate = direction * mix(-3, 3, narrativeRaw);
      const scale = 0.98 + swing * 0.04;
      const opacity = 0.05 + swing * 0.06;

      word.style.setProperty('--ghost-x', `${x}px`);
      word.style.setProperty('--ghost-y', `${y}px`);
      word.style.setProperty('--ghost-r', `${rotate}deg`);
      word.style.setProperty('--ghost-scale', scale.toFixed(3));
      word.style.opacity = `${opacity.toFixed(3)}`;
    });

    const focus = eased * Math.max(panels.length - 1, 1);

    panels.forEach((panel, index) => {
      const relative = index - focus;
      const distance = Math.abs(relative);
      const focusValue = clamp(1 - distance, 0, 1);
      const glow = easeOutCubic(focusValue);
      const past = relative < 0;
      const x = relative * 92 + (past ? -8 * distance : 8 * distance) + push * 0.12;
      const y = past
        ? -distance * 24 - glow * 4
        : distance * 30 - glow * 6;
      const rotate = relative * 2.2 + push * 0.02;
      const scale = 1 - distance * 0.05 + glow * 0.02;
      const opacity = clamp(0.1 + glow * 0.9, 0.08, 1);

      panel.style.zIndex = String(30 - Math.round(distance * 10) + index);
      panel.style.setProperty('--panel-x', `${x}px`);
      panel.style.setProperty('--panel-y', `${y}px`);
      panel.style.setProperty('--panel-z', '0px');
      panel.style.setProperty('--panel-r', `${rotate}deg`);
      panel.style.setProperty('--panel-scale', scale.toFixed(3));
      panel.style.setProperty('--panel-blur', '0px');
      panel.style.setProperty('--panel-opacity', opacity.toFixed(3));
      panel.style.setProperty('--panel-focus', glow.toFixed(3));
    });

    if (stageServices) {
      const local = clamp((narrativeRaw - 0.55) / 0.32, 0, 1);
      const easedLocal = easeOutCubic(local);
      stageServices.style.setProperty('--service-y', `${mix(28, 0, easedLocal)}px`);
      stageServices.style.setProperty('--service-r', '0deg');
      stageServices.style.opacity = `${mix(0.7, 1, easedLocal).toFixed(3)}`;
    }
  });
}

function updateStackScenes() {
  stackScenes.forEach(({ panel }) => {
    panel.style.setProperty('--stack-enter-y', '0px');
    panel.style.setProperty('--stack-enter-scale', '1');
    panel.style.setProperty('--stack-shadow', '0');
  });
}

function updateFrame() {
  animationFrame = null;
  const scrollY = window.scrollY;
  const frameVelocity = scrollY - previousScroll;
  scrollVelocity += (frameVelocity - scrollVelocity) * 0.24;
  previousScroll = scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  if (progress) {
    const percent = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;
    progress.style.width = `${percent}%`;
  }

  if (topbar) {
    topbar.classList.toggle('is-solid', scrollY > 24);
  }

  updateParallax(scrollY, scrollVelocity);
  updateStackScenes();
  updateStoryStages(scrollY, scrollVelocity);
}

function requestTick() {
  if (animationFrame !== null) return;
  animationFrame = window.requestAnimationFrame(updateFrame);
}

window.addEventListener('scroll', requestTick, { passive: true });

requestTick();

syncIntroToHero();
introCleanupTimer = window.setTimeout(() => {
  // If the intro gets stuck in a throttled tab or a stalled RAF loop,
  // force it to settle so the page never remains covered.
  if (introState !== 'done') {
    finishIntro(true);
  }
}, 2600);

const startIntro = () => {
  if (introState !== 'idle') return;
  syncIntroToHero();
  playIntro();
};

if (document.fonts && 'ready' in document.fonts) {
  Promise.race([
    document.fonts.ready,
    new Promise((resolve) => {
      introStartTimer = window.setTimeout(resolve, 240);
    })
  ]).then(() => {
    if (introStartTimer) {
      window.clearTimeout(introStartTimer);
      introStartTimer = null;
    }
    startIntro();
  });
} else {
  introStartTimer = window.setTimeout(startIntro, 120);
}

if (document.fonts && 'ready' in document.fonts) {
  document.fonts.ready.then(() => {
    if (introState !== 'done') {
      syncIntroToHero();
    }
  });
}
