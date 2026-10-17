/* =========================================================
   Интерактивные эффекты:
   - вступление: CRT-включение + звёзды собираются в «ARTEM»
   - НЛО (пятый секрет), сверхновая по клику на небо
   - неоновый курсор, магнитные кнопки, искры при клике
   - неоновая полоса прокрутки под шапкой
   Всё уважает настройку «уменьшить движение».
   ========================================================= */

(function () {
  'use strict';

  const html = document.documentElement;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rand = (min, max) => min + Math.random() * (max - min);

  // Текст на текущем языке (язык выставляет main.js в <html lang>)
  const tr = (key) => (window.I18N[html.lang] || window.I18N.ru)[key];

  // Цвета искр зависят от сезона
  const COLORS = {
    halloween: ['#ff7a1a', '#a3ff3d', '#c084fc', '#ffe066'],
    newyear: ['#ff3b5c', '#5dffb0', '#ffe066', '#ffffff', '#22e5ff'],
  }[window.SEASON] || ['#ff4fd8', '#c084fc', '#22e5ff', '#ffffff', '#5dffb0'];

  /* =========================================================
     Вступление
     Класс crt-boot ставит маленький скрипт в <head> — один раз за сессию.
     Порядок: экран «включается» → звёзды слетаются в ARTEM →
     разлетаются, и в этот момент появляется приветствие.
     ========================================================= */

  const CRT_MS = 2600;          // сколько длится CSS-анимация включения
  const FORMATION_START = 1500; // когда звёзды начинают слетаться (экран уже раскрывается)

  let introDone;
  window.Intro = { done: new Promise((resolve) => { introDone = resolve; }) };

  function runIntro() {
    try {
      sessionStorage.setItem('booted', '1');
    } catch (e) {
      // не страшно: просто покажем вступление ещё раз
    }
    html.classList.add('intro-running');

    let finished = false;
    const skipEvents = ['keydown', 'pointerdown', 'wheel', 'touchstart'];

    // Конец вступления — по сценарию или если посетитель не захотел ждать
    function finish() {
      if (finished) return;
      finished = true;
      skipEvents.forEach((type) => window.removeEventListener(type, finish));
      endCrt();
      window.starfield.skipFormation();
      html.classList.remove('intro-running');
      introDone();
    }

    function endCrt() {
      html.classList.remove('crt-boot');
      const crt = document.getElementById('crt');
      if (crt) crt.remove();
    }

    skipEvents.forEach((type) => window.addEventListener(type, finish, { passive: true }));
    setTimeout(endCrt, CRT_MS);

    setTimeout(async () => {
      if (finished) return;
      // Ждём шрифт Orbitron (но не дольше секунды), иначе буквы будут «не те»
      try {
        await Promise.race([
          document.fonts.load('900 100px Orbitron'),
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]);
      } catch (e) {
        // без шрифта тоже соберётся
      }
      if (finished) return;
      window.starfield.formWord('ARTEM').then(finish);
    }, FORMATION_START);
  }

  if (html.classList.contains('crt-boot') && !reducedMotion()) runIntro();
  else {
    html.classList.remove('crt-boot');
    introDone();
  }

  /* =========================================================
     Сверхновая: клик по пустому небу (не по тексту и кнопкам)
     ========================================================= */

  const NOT_SKY = 'a, button, input, label, h1, h2, h3, p, dl, li, .card, .terminal, .topbar, .footer__links, .toast, .ufo';

  document.addEventListener('click', (e) => {
    if (html.classList.contains('intro-running') || e.target.closest(NOT_SKY)) return;
    // На Новый год вместо сверхновой — салют
    if (window.SEASON === 'newyear') window.starfield.firework(e.clientX, e.clientY);
    else window.starfield.supernova(e.clientX, e.clientY);
  });

  /* =========================================================
     Искры при клике
     Отдельный холст поверх страницы; рисуем, только пока есть искры.
     ========================================================= */

  const sparkCanvas = document.createElement('canvas');
  sparkCanvas.className = 'sparks';
  sparkCanvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sparkCanvas);
  const sctx = sparkCanvas.getContext('2d');
  let sparks = [];
  let sparksRunning = false;
  let sparksLast = 0;

  function sizeSparkCanvas() {
    sparkCanvas.width = window.innerWidth;
    sparkCanvas.height = window.innerHeight;
  }
  sizeSparkCanvas();
  window.addEventListener('resize', sizeSparkCanvas);

  function burst(x, y, count = 14) {
    if (reducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(0.12, 0.42);
      sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        duration: rand(380, 700),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    if (!sparksRunning) {
      sparksRunning = true;
      sparksLast = performance.now();
      requestAnimationFrame(drawSparks);
    }
  }

  function drawSparks(now) {
    const dt = Math.min(now - sparksLast, 50);
    sparksLast = now;
    sctx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);

    sparks = sparks.filter((s) => (s.life += dt) < s.duration);
    for (const s of sparks) {
      s.vy += 0.0007 * dt; // лёгкая гравитация
      s.vx *= 0.985;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const fade = 1 - s.life / s.duration;
      // Искра — короткий светящийся штрих по направлению полёта
      sctx.globalAlpha = fade;
      sctx.strokeStyle = s.color;
      sctx.shadowColor = s.color;
      sctx.shadowBlur = 8;
      sctx.lineWidth = 2;
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(s.x, s.y);
      sctx.lineTo(s.x - s.vx * 18, s.y - s.vy * 18);
      sctx.stroke();
    }

    if (sparks.length) requestAnimationFrame(drawSparks);
    else {
      sparksRunning = false;
      sctx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);
    }
  }

  window.addEventListener('pointerdown', (e) => {
    if (html.classList.contains('intro-running')) return;
    burst(e.clientX, e.clientY);
  }, { passive: true });

  /* =========================================================
     НЛО — пролетает раз в 1–2 минуты. Поймал — нашёл пятый секрет.
     ========================================================= */

  const UFO_SVG = `
    <svg viewBox="0 0 64 34" width="64" height="34" aria-hidden="true">
      <ellipse cx="32" cy="13" rx="11" ry="9" fill="rgba(34, 229, 255, 0.3)" stroke="#22e5ff" stroke-width="1.5"/>
      <ellipse cx="32" cy="20" rx="29" ry="7.5" fill="#1a0b33" stroke="#c084fc" stroke-width="2"/>
      <circle class="ufo__light" cx="17" cy="21" r="2.2" fill="#ff4fd8"/>
      <circle class="ufo__light" cx="32" cy="23.5" r="2.2" fill="#5dffb0"/>
      <circle class="ufo__light" cx="47" cy="21" r="2.2" fill="#ff4fd8"/>
    </svg>`;

  // На Хэллоуин вместо НЛО летает летучая мышь (секрет тот же — ufo)
  const BAT_SVG = `
    <svg viewBox="0 0 64 34" width="64" height="34" aria-hidden="true">
      <g fill="#1a0b2e" stroke="#ff7a1a" stroke-width="1.4" stroke-linejoin="round">
        <path class="bat__wing" d="M29 16 C24 6 14 4 3 8 C9 10 10 14 7 19 C13 15 17 18 18 23 C21 18 25 18 29 21 Z"/>
        <path class="bat__wing bat__wing--right" d="M35 16 C40 6 50 4 61 8 C55 10 54 14 57 19 C51 15 47 18 46 23 C43 18 39 18 35 21 Z"/>
        <path d="M28 13 L29 6 L31.5 11 L32.5 11 L35 6 L36 13 C37 20 35 25 32 26 C29 25 27 20 28 13 Z"/>
      </g>
      <circle cx="30" cy="14.5" r="1.3" fill="#ffe066"/>
      <circle cx="34" cy="14.5" r="1.3" fill="#ffe066"/>
    </svg>`;

  // Хэллоуин: летающая тарелка-тыква
  const PUMPKIN_UFO_SVG = `
    <svg viewBox="0 0 64 40" width="64" height="40" aria-hidden="true">
      <path d="M32 3 Q34 0 37 1" stroke="#4d7c0f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <g fill="#ff7a1a" stroke="#8a2c00" stroke-width="1">
        <ellipse cx="25" cy="14" rx="8" ry="10"/>
        <ellipse cx="39" cy="14" rx="8" ry="10"/>
        <ellipse cx="32" cy="14" rx="8" ry="11"/>
      </g>
      <g fill="#ffe066">
        <path d="M26 12 L30 12 L28 8 Z"/>
        <path d="M34 12 L38 12 L36 8 Z"/>
        <path d="M25 16 L39 16 L36 20 L28 20 Z"/>
      </g>
      <ellipse cx="32" cy="27" rx="29" ry="7.5" fill="#1a0b33" stroke="#c084fc" stroke-width="2"/>
      <circle class="ufo__light" cx="17" cy="28" r="2.2" fill="#a3ff3d"/>
      <circle class="ufo__light" cx="32" cy="30.5" r="2.2" fill="#ff7a1a"/>
      <circle class="ufo__light" cx="47" cy="28" r="2.2" fill="#a3ff3d"/>
    </svg>`;

  // Новый год: сани с оленем Рудольфом (красный нос светится)
  const SLEIGH_SVG = `
    <svg viewBox="0 0 112 44" width="112" height="44" aria-hidden="true">
      <g stroke="#ffe066" stroke-width="1.6" fill="none" stroke-linecap="round">
        <path d="M31 9 L28 3 M28 6 L25 5 M34 9 L36 3 M36 6 L39 5"/>
        <path d="M14 24 L12 33 M18 25 L19 33 M26 25 L24 33 M30 24 L32 33"/>
        <path d="M33 16 Q48 20 62 23" stroke-width="1" opacity="0.7"/>
        <path d="M56 36 L100 36 Q107 36 106 30"/>
      </g>
      <ellipse cx="22" cy="21" rx="11" ry="5.5" fill="#7c4a1e" stroke="#ffe066" stroke-width="1.2"/>
      <circle cx="32" cy="13" r="4.5" fill="#7c4a1e" stroke="#ffe066" stroke-width="1.2"/>
      <circle class="sleigh__nose" cx="36.5" cy="13.5" r="2" fill="#ff3b5c"/>
      <path d="M60 18 L94 18 Q102 18 102 10 L104 10 L104 22 Q104 32 94 32 L64 32 Q58 32 60 18 Z" fill="#9f1239" stroke="#ffe066" stroke-width="1.4"/>
      <rect x="66" y="9" width="9" height="9" fill="#22e5ff" stroke="#ffe066" stroke-width="1"/>
      <rect x="77" y="5" width="11" height="13" fill="#5dffb0" stroke="#ffe066" stroke-width="1"/>
      <rect x="89" y="11" width="7" height="7" fill="#ff4fd8" stroke="#ffe066" stroke-width="1"/>
    </svg>`;

  // Кто летает в каждом сезоне. Ловится любой — это всё тот же пятый секрет (ufo)
  const FLYERS = {
    default: [{ svg: UFO_SVG, className: 'ufo', label: 'ufo.label', caught: 'ufo.caught' }],
    halloween: [
      { svg: PUMPKIN_UFO_SVG, className: 'ufo ufo--pumpkin', label: 'pumpkin.label', caught: 'pumpkin.caught' },
      { svg: BAT_SVG, className: 'ufo ufo--bat', label: 'bat.label', caught: 'bat.caught' },
    ],
    newyear: [
      { svg: SLEIGH_SVG, className: 'ufo ufo--sleigh', label: 'sleigh.label', caught: 'sleigh.caught', flips: true },
    ],
  };

  function scheduleUfo(delay) {
    setTimeout(launchUfo, delay);
  }

  function launchUfo() {
    if (document.hidden || reducedMotion() || html.classList.contains('intro-running')) {
      scheduleUfo(rand(20000, 40000));
      return;
    }

    const options = FLYERS[window.SEASON] || FLYERS.default;
    const flyer = options[Math.floor(Math.random() * options.length)];

    const ufo = document.createElement('button');
    ufo.type = 'button';
    ufo.className = flyer.className;
    ufo.setAttribute('aria-label', tr(flyer.label));
    ufo.innerHTML = flyer.svg;
    document.body.appendChild(ufo);

    const fromLeft = Math.random() < 0.5;
    // Сани смотрят вправо — если летят влево, разворачиваем картинку
    if (flyer.flips && !fromLeft) ufo.querySelector('svg').style.transform = 'scaleX(-1)';
    const startX = fromLeft ? -130 : window.innerWidth + 16;
    const endX = fromLeft ? window.innerWidth + 16 : -130;
    const baseY = window.innerHeight * rand(0.1, 0.4);
    const duration = rand(9000, 12000);
    const start = performance.now();
    let caught = false;

    function fly(now) {
      if (caught) return;
      const t = (now - start) / duration;
      if (t >= 1) {
        ufo.remove();
        scheduleUfo(rand(60000, 120000));
        return;
      }
      // Летит с покачиванием, наклоняясь в такт
      const x = startX + (endX - startX) * t;
      const y = baseY + Math.sin(t * Math.PI * 6) * 14;
      const tilt = Math.cos(t * Math.PI * 6) * 8;
      ufo.style.transform = `translate(${x}px, ${y}px) rotate(${tilt}deg)`;
      requestAnimationFrame(fly);
    }
    requestAnimationFrame(fly);

    ufo.addEventListener('click', () => {
      if (caught) return;
      caught = true;
      const rect = ufo.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 28);
      ufo.classList.add('is-caught'); // улетает вверх в луче света (CSS)
      setTimeout(() => ufo.remove(), 900);
      window.Effects.toast(tr(flyer.caught));
      window.Terminal.markSecret('ufo');
      scheduleUfo(rand(60000, 120000));
    });
  }

  scheduleUfo(rand(20000, 35000));

  /* =========================================================
     Неоновый курсор: точка + кольцо, которое догоняет точку.
     Над кнопками кольцо «прилипает» и обнимает кнопку.
     Только для мыши и только если анимации не выключены.
     ========================================================= */

  const SNAP = '.btn, .social__icon, .terminal-fab, .lang-switch__btn, .progress-trigger, .terminal__close, .ufo, .avatar';
  const HOVER = 'a, button, input, .tag, .card';

  if (finePointer && !reducedMotion()) {
    html.classList.add('has-neon-cursor');

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.append(ring, dot);

    const pos = { x: -100, y: -100 };
    const ringState = { x: -100, y: -100, w: 34, h: 34 };
    let snapEl = null;
    let hovering = false;

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      snapEl = e.target.closest(SNAP);
      hovering = !!e.target.closest(HOVER);
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      html.classList.remove('cursor-hidden');
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget) html.classList.add('cursor-hidden');
    });
    window.addEventListener('pointerdown', () => ring.classList.add('is-pressed'));
    window.addEventListener('pointerup', () => ring.classList.remove('is-pressed'));

    function loop() {
      let tx = pos.x;
      let ty = pos.y;
      let tw = hovering ? 52 : 34;
      let th = tw;
      let radius = '50%';

      if (snapEl && snapEl.isConnected) {
        const r = snapEl.getBoundingClientRect();
        tx = r.left + r.width / 2;
        ty = r.top + r.height / 2;
        tw = r.width + 12;
        th = r.height + 12;
        radius = getComputedStyle(snapEl).borderRadius;
      }

      // Плавно догоняем цель: 20% пути за кадр
      ringState.x += (tx - ringState.x) * 0.2;
      ringState.y += (ty - ringState.y) * 0.2;
      ringState.w += (tw - ringState.w) * 0.2;
      ringState.h += (th - ringState.h) * 0.2;

      ring.style.width = `${ringState.w}px`;
      ring.style.height = `${ringState.h}px`;
      ring.style.borderRadius = radius === '0px' ? '12px' : radius;
      ring.style.transform = `translate(${ringState.x - ringState.w / 2}px, ${ringState.y - ringState.h / 2}px)`;
      ring.classList.toggle('is-snapped', !!snapEl);

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    /* ---------- Магнитные кнопки ----------
       Кнопка рядом с курсором слегка тянется к нему (свойство translate). */
    const MAGNETS = '.btn, .social__icon, .terminal-fab';
    let magnetFrame = 0;

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || magnetFrame) return;
      magnetFrame = requestAnimationFrame(() => {
        magnetFrame = 0;
        const elements = [...document.querySelectorAll(MAGNETS)];
        // Сначала все измерения, потом все изменения — так браузер не пересчитывает страницу лишний раз
        const moves = elements.map((el) => {
          const m = el._magnet || { x: 0, y: 0 };
          const r = el.getBoundingClientRect();
          if (!r.width) return [el, m, 0, 0];
          const cx = r.left + r.width / 2 - m.x;
          const cy = r.top + r.height / 2 - m.y;
          const dx = pos.x - cx;
          const dy = pos.y - cy;
          const reach = Math.max(r.width, r.height) / 2 + 40;
          if (Math.hypot(dx, dy) > reach) return [el, m, 0, 0];
          const clamp = (v) => Math.max(-12, Math.min(12, v));
          return [el, m, clamp(dx * 0.3), clamp(dy * 0.35)];
        });
        moves.forEach(([el, m, x, y]) => {
          m.x = x;
          m.y = y;
          el._magnet = m;
          el.style.translate = x || y ? `${x.toFixed(1)}px ${y.toFixed(1)}px` : '';
        });
      });
    }, { passive: true });
  }

  /* =========================================================
     Полоса прокрутки под шапкой
     ========================================================= */

  const progressBar = document.getElementById('scroll-progress');
  let progressFrame = 0;

  function updateProgress() {
    progressFrame = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? window.scrollY / max : 0;
    progressBar.style.transform = `scaleX(${value.toFixed(4)})`;
  }

  if (progressBar) {
    window.addEventListener('scroll', () => {
      if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
    }, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  /* =========================================================
     Сезонные украшения (даты — в js/season.js)
     ========================================================= */

  const topbar = document.querySelector('.topbar');

  // Хэллоуин: паук спускается на паутинке из шапки и покачивается
  if (window.SEASON === 'halloween' && topbar) {
    const spider = document.createElement('div');
    spider.className = 'spider';
    spider.setAttribute('aria-hidden', 'true');
    spider.innerHTML = `
      <span class="spider__thread"></span>
      <svg class="spider__body" viewBox="0 0 40 30" width="40" height="30">
        <g stroke="#ff7a1a" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M14 13 L5 6 L1 11 M14 16 L3 15 L0 21 M15 19 L5 23 L3 29 M16 21 L10 27"/>
          <path d="M26 13 L35 6 L39 11 M26 16 L37 15 L40 21 M25 19 L35 23 L37 29 M24 21 L30 27"/>
        </g>
        <ellipse cx="20" cy="17" rx="7" ry="8" fill="#1a0b2e" stroke="#ff7a1a" stroke-width="1.6"/>
        <circle cx="17.5" cy="15" r="1.5" fill="#ffe066"/>
        <circle cx="22.5" cy="15" r="1.5" fill="#ffe066"/>
      </svg>`;
    topbar.appendChild(spider);
  }

  // Новый год: мигающая гирлянда висит под шапкой
  if (window.SEASON === 'newyear' && topbar) {
    const garland = document.createElement('div');
    garland.className = 'garland';
    garland.setAttribute('aria-hidden', 'true');
    const colors = ['#ff4fd8', '#22e5ff', '#ffe066', '#5dffb0', '#c084fc'];
    const count = Math.max(12, Math.round(window.innerWidth / 42));
    for (let i = 0; i < count; i++) {
      const bulb = document.createElement('i');
      bulb.style.setProperty('--bulb', colors[i % colors.length]);
      bulb.style.setProperty('--delay', `${(i % 3) * 0.5}s`);
      garland.appendChild(bulb);
    }
    topbar.appendChild(garland);
  }

  // Слой для фоновых украшений: над звёздами, под текстом
  const seasonLayer = document.createElement('div');
  seasonLayer.className = 'season-layer';
  seasonLayer.setAttribute('aria-hidden', 'true');
  document.getElementById('stars').after(seasonLayer);

  const GHOST_SVG = `
    <svg viewBox="0 0 40 48" width="100%" height="100%">
      <path d="M20 2 C9 2 4 10 4 20 L4 44 L10 39 L15 45 L20 39 L25 45 L30 39 L36 44 L36 20 C36 10 31 2 20 2 Z"
            fill="rgba(236, 230, 255, 0.85)" stroke="#c084fc" stroke-width="1.5"/>
      <ellipse cx="14" cy="18" rx="3" ry="4" fill="#1a0b2e"/>
      <ellipse cx="26" cy="18" rx="3" ry="4" fill="#1a0b2e"/>
      <ellipse cx="20" cy="28" rx="3" ry="4" fill="#1a0b2e"/>
    </svg>`;

  // Призрак медленно всплывает снизу вверх, покачиваясь, и тает
  function spawnGhost() {
    if (document.hidden || seasonLayer.querySelectorAll('.ghost').length >= 3) return;
    const ghost = document.createElement('div');
    ghost.className = 'ghost';
    const size = rand(34, 64);
    ghost.style.width = `${size}px`;
    ghost.style.height = `${size * 1.2}px`;
    ghost.innerHTML = `<div class="ghost__inner">${GHOST_SVG}</div>`;
    seasonLayer.appendChild(ghost);

    const x = rand(0.05, 0.85) * window.innerWidth;
    const drift = rand(-80, 80);
    ghost.animate([
      { transform: `translate(${x}px, ${window.innerHeight + 40}px)`, opacity: 0 },
      { opacity: 0.55, offset: 0.15 },
      { opacity: 0.55, offset: 0.8 },
      { transform: `translate(${x + drift}px, -120px)`, opacity: 0 },
    ], { duration: rand(14000, 20000), easing: 'linear' }).onfinish = () => ghost.remove();
  }

  // Стайка маленьких летучих мышей проносится по небу
  function spawnBatFlock() {
    if (document.hidden) return;
    const fromLeft = Math.random() < 0.5;
    const baseY = rand(0.08, 0.5) * window.innerHeight;
    const count = Math.round(rand(4, 7));
    for (let i = 0; i < count; i++) {
      const bat = document.createElement('div');
      bat.className = 'flock-bat ufo--bat';
      bat.innerHTML = BAT_SVG;
      seasonLayer.appendChild(bat);
      const y = baseY + rand(-50, 50);
      const startX = fromLeft ? -60 - i * 40 : window.innerWidth + 20 + i * 40;
      const endX = fromLeft ? window.innerWidth + 60 : -100;
      bat.animate([
        { transform: `translate(${startX}px, ${y}px)` },
        { transform: `translate(${(startX + endX) / 2}px, ${y - rand(20, 60)}px)` },
        { transform: `translate(${endX}px, ${y + rand(-30, 30)}px)` },
      ], { duration: rand(6000, 8500), delay: i * 120, easing: 'ease-in-out' }).onfinish = () => bat.remove();
    }
  }

  // Команда boo: огромный призрак с воплем пролетает через экран
  function ghostScare() {
    if (reducedMotion()) return;
    const ghost = document.createElement('div');
    ghost.className = 'ghost ghost--scare';
    ghost.innerHTML = `<div class="ghost__inner">${GHOST_SVG}</div>`;
    document.body.appendChild(ghost);
    const y = window.innerHeight * 0.3;
    ghost.animate([
      { transform: `translate(-260px, ${y}px) scale(0.6)`, opacity: 0 },
      { transform: `translate(${window.innerWidth * 0.35}px, ${y - 40}px) scale(1.15)`, opacity: 0.9, offset: 0.45 },
      { transform: `translate(${window.innerWidth + 40}px, ${y + 30}px) scale(0.8)`, opacity: 0 },
    ], { duration: 2200, easing: 'ease-in-out' }).onfinish = () => ghost.remove();
  }

  if (!reducedMotion()) {
    if (window.SEASON === 'halloween') {
      setInterval(spawnGhost, 7000);
      setTimeout(spawnGhost, 2500);
      setInterval(spawnBatFlock, 32000);
      setTimeout(spawnBatFlock, 9000);
    }
  }

  // Украшение на окне терминала: паутинка в углу или снежная шапка
  const terminalBox = document.getElementById('terminal');
  if (window.SEASON && terminalBox) {
    terminalBox.insertAdjacentHTML('beforeend', window.Effects.seasonDeco());
  }

  // Для отладки в консоли: Fx.launchUfo() — запустить НЛО прямо сейчас
  window.Fx = { burst, launchUfo, ghostScare };
})();
