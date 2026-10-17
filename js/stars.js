/* =========================================================
   Звёздное небо на canvas.
   - 3 слоя: дальние звёзды мелкие и почти не двигаются,
     ближние крупнее и смещаются сильнее — так появляется глубина
   - параллакс от прокрутки и мыши, на телефоне — медленный дрейф
   - изредка падающие звёзды
   - на слабых устройствах звёзд меньше, при просадке FPS — ещё меньше
   - prefers-reduced-motion: статичная картинка без движения
   ========================================================= */

(function () {
  'use strict';

  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // Слабое устройство: мало ядер процессора или мало памяти
  const isWeak = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;

  // Множитель количества звёзд (1 = максимум)
  let quality = isWeak ? 0.6 : 1;
  if (isTouch) quality *= 0.8;

  // depth — насколько сильно слой реагирует на мышь и прокрутку
  // density — звёзд на квадратный пиксель экрана
  const LAYERS = [
    { depth: 0.12, density: 0.0003, size: [0.35, 0.9] },
    { depth: 0.3, density: 0.00012, size: [0.7, 1.5] },
    { depth: 0.6, density: 0.00004, size: [1.2, 2.3] },
  ];

  // Большинство звёзд белые, немного фиолетовых, розовых и голубых
  const COLORS = ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#e4d4ff', '#c084fc', '#ff9cf0', '#9ff3ff'];

  // Сезонный режим (js/season.js): на Хэллоуин часть звёзд оранжевые
  const SEASON = window.SEASON || '';
  if (SEASON === 'halloween') COLORS.push('#ffb347', '#ff7a1a', '#ffb347');

  const MOUSE_SHIFT = 60;   // максимальный сдвиг от мыши в пикселях
  const SCROLL_SHIFT = 0.5; // доля прокрутки, которую повторяют звёзды
  const EDGE = 30;          // запас за краем экрана, чтобы звёзды не «выпрыгивали»

  let width = 0;
  let height = 0;
  let dpr = 1;
  let layers = [];          // звёзды по слоям
  let shooting = [];        // падающие звёзды
  let nextShootAt = 0;
  let rafId = 0;
  let lastTime = 0;
  let drift = 0;            // накопленный дрейф для телефона

  // x, y — плавная позиция мыши от -1 до 1 (для параллакса),
  // px, py — точные координаты на экране (для созвездий)
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, px: 0, py: 0, active: false };

  const kicked = new Set(); // звёзды, которые сейчас отброшены взрывом сверхновой
  const novas = [];         // ударные волны сверхновых
  let formation = null;     // звёзды, собирающиеся в слово

  // ---------- Спрайты свечения ----------
  // Заранее рисуем по одной «светящейся точке» на каждый цвет,
  // а потом просто копируем картинку — это намного быстрее, чем считать градиент для каждой звезды.
  const sprites = {};
  COLORS.forEach((color) => {
    if (sprites[color]) return;
    const size = 32;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.12, color);
    grad.addColorStop(0.35, hexToRgba(color, 0.25));
    grad.addColorStop(1, hexToRgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    sprites[color] = c;
  });

  function hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // Остаток от деления, который работает и для отрицательных чисел
  function wrap(value, max) {
    return ((value % max) + max) % max;
  }

  // ---------- Создание звёзд ----------
  function buildStars() {
    const area = width * height;
    layers = LAYERS.map((layer) => {
      const count = Math.round(area * layer.density * quality);
      const stars = [];
      for (let i = 0; i < count; i++) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        stars.push({
          x: Math.random() * (width + EDGE * 2),
          y: Math.random() * (height + EDGE * 2),
          r: rand(layer.size[0], layer.size[1]),
          alpha: rand(0.45, 1),
          twinkleSpeed: rand(0.0005, 0.002),
          phase: Math.random() * Math.PI * 2,
          sprite: sprites[color],
          dx: 0, dy: 0, vx: 0, vy: 0, // смещение и скорость после взрыва сверхновой
        });
      }
      return { depth: layer.depth, stars, ox: 0, oy: 0 };
    });
    buildSnow();
  }

  // ---------- Размер холста ----------
  function resize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    // Чёткость на экранах с высокой плотностью пикселей, но не выше 2 — экономим силы
    dpr = Math.min(window.devicePixelRatio || 1, isWeak ? 1.5 : 2);

    const widthChanged = newWidth !== width;
    width = newWidth;
    height = newHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // На телефоне высота меняется, когда прячется адресная строка.
    // Пересоздаём звёзды только при смене ширины, иначе небо будет «мигать».
    if (widthChanged || layers.length === 0) buildStars();

    if (reducedMotionQuery.matches) drawStatic();
  }

  // ---------- Падающие звёзды ----------
  function spawnShootingStar() {
    const angle = rand(Math.PI * 0.62, Math.PI * 0.78); // летят вниз-влево
    const speed = rand(0.7, 1.2);                       // пикселей в миллисекунду
    shooting.push({
      x: rand(width * 0.3, width * 1.05),
      y: rand(-20, height * 0.45),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: rand(120, 240),
      life: 0,
      duration: rand(700, 1300),
    });
  }

  function drawShootingStars(dt) {
    for (let i = shooting.length - 1; i >= 0; i--) {
      const s = shooting[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const t = s.life / s.duration;
      if (t >= 1) {
        shooting.splice(i, 1);
        continue;
      }

      // Плавно появляется и гаснет
      const fade = Math.sin(Math.PI * t);
      const speed = Math.hypot(s.vx, s.vy);
      const tailX = s.x - (s.vx / speed) * s.length;
      const tailY = s.y - (s.vy / speed) * s.length;

      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * fade})`);
      grad.addColorStop(0.25, `rgba(192, 132, 252, ${0.6 * fade})`);
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Яркая «голова»
      ctx.globalAlpha = fade;
      ctx.drawImage(sprites['#c084fc'], s.x - 8, s.y - 8, 16, 16);
    }
  }

  // ---------- Отрисовка ----------
  const CONSTELLATION_RADIUS = 160; // какие звёзды вокруг курсора соединять
  const CONSTELLATION_LINK = 120;   // максимальная длина линии между звёздами

  function drawStars(time, animated) {
    const scroll = window.scrollY;
    const fieldW = width + EDGE * 2;
    const fieldH = height + EDGE * 2;
    const near = []; // звёзды рядом с курсором — для созвездий

    layers.forEach((layer, index) => {
      // Насколько сдвинуть этот слой: мышь + прокрутка + дрейф
      layer.ox = animated ? mouse.x * MOUSE_SHIFT * layer.depth + drift * layer.depth : 0;
      layer.oy = animated
        ? mouse.y * MOUSE_SHIFT * layer.depth + scroll * SCROLL_SHIFT * layer.depth + drift * 0.35 * layer.depth
        : 0;

      for (const star of layer.stars) {
        const x = wrap(star.x - layer.ox, fieldW) - EDGE + star.dx;
        const y = wrap(star.y - layer.oy, fieldH) - EDGE + star.dy;

        // Мерцание
        const twinkle = animated ? 0.7 + 0.3 * Math.sin(time * star.twinkleSpeed + star.phase) : 1;
        const size = star.r * 6;

        ctx.globalAlpha = star.alpha * twinkle;
        ctx.drawImage(star.sprite, x - size / 2, y - size / 2, size, size);

        // Для созвездий берём только средний и ближний слой — они крупнее
        if (mouse.active && index > 0 && near.length < 14) {
          const d = Math.hypot(x - mouse.px, y - mouse.py);
          if (d < CONSTELLATION_RADIUS) near.push({ x, y, d });
        }
      }

      // Планета живёт между дальним и средним слоем
      if (index === 0) drawPlanet(time, animated, scroll);
    });

    if (near.length > 1) drawConstellation(near);
  }

  // Тонкие неоновые линии между звёздами возле курсора
  function drawConstellation(near) {
    ctx.lineWidth = 0.8;
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        const a = near[i];
        const b = near[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > CONSTELLATION_LINK) continue;
        // Чем короче линия и ближе к курсору — тем ярче
        const fade = (1 - dist / CONSTELLATION_LINK) * (1 - Math.max(a.d, b.d) / CONSTELLATION_RADIUS);
        ctx.globalAlpha = fade * 0.7;
        ctx.strokeStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // ---------- Планета с кольцом ----------
  function drawPlanet(time, animated, scroll) {
    const small = width < 640;
    const r = Math.max(26, Math.min(70, Math.min(width, height) * (small ? 0.075 : 0.065)));
    const depth = 0.2;
    const cx = width * (small ? 0.8 : 0.84) - (animated ? mouse.x * MOUSE_SHIFT * depth : 0);
    const cy = height * (small ? 0.16 : 0.22) - (animated ? mouse.y * MOUSE_SHIFT * depth + scroll * SCROLL_SHIFT * depth : 0);
    if (cy < -r * 3) return; // уехала за верх экрана — не рисуем

    // На Хэллоуин вместо планеты — светящаяся тыква
    if (SEASON === 'halloween') {
      drawPumpkin(cx, cy, r, time, animated);
      return;
    }

    const tilt = -0.35;
    const ringRx = r * 2.1;
    const ringRy = r * 0.5;

    ctx.save();
    ctx.globalAlpha = 1;

    // Задняя половина кольца (уходит за планету)
    drawRing(cx, cy, ringRx, ringRy, tilt, Math.PI, Math.PI * 2, r);

    // Шар планеты: свет падает слева сверху
    const body = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r);
    body.addColorStop(0, '#8b5cf6');
    body.addColorStop(0.55, '#3b0f7a');
    body.addColorStop(1, '#0d0620');
    ctx.shadowColor = 'rgba(168, 85, 247, 0.7)';
    ctx.shadowBlur = r * 0.6;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Полосы облаков медленно ползут — кажется, что планета вращается
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(tilt * 0.6);
    const shift = animated ? (time * 0.006) % (r * 2) : 0;
    const bands = [[-0.55, 0.1, '#ff4fd8'], [-0.15, 0.14, '#22e5ff'], [0.3, 0.09, '#ff4fd8'], [0.62, 0.12, '#c084fc']];
    bands.forEach(([y, h, color], i) => {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = color;
      for (let k = 0; k < 2; k++) {
        // Пятна разной длины, чтобы было видно движение
        const x = wrap(shift * (i % 2 ? 1 : 0.7) + k * r * 1.3, r * 2.6) - r * 1.3;
        ctx.beginPath();
        ctx.ellipse(x, y * r, r * 0.55, h * r, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();

    // Неоновый ободок с освещённой стороны
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#22e5ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#22e5ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, Math.PI * 0.95, Math.PI * 1.6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Передняя половина кольца (поверх планеты)
    drawRing(cx, cy, ringRx, ringRy, tilt, 0, Math.PI, r);
    ctx.restore();
  }

  // ---------- Тыква (Хэллоуин) ----------
  function drawPumpkin(cx, cy, r, time, animated) {
    ctx.save();
    ctx.globalAlpha = 1;

    // Тело из нескольких «долек»-эллипсов
    const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.1);
    body.addColorStop(0, '#ffb347');
    body.addColorStop(0.6, '#ff7a1a');
    body.addColorStop(1, '#8a2c00');
    ctx.fillStyle = body;
    ctx.strokeStyle = 'rgba(90, 25, 0, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255, 122, 26, 0.8)';
    ctx.shadowBlur = r * 0.7;
    [-0.6, 0.6, -0.3, 0.3, 0].forEach((k) => {
      ctx.beginPath();
      ctx.ellipse(cx + k * r * 0.75, cy, r * (k === 0 ? 0.5 : 0.55), r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Хвостик
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.08, cy - r * 0.78);
    ctx.quadraticCurveTo(cx - r * 0.02, cy - r * 1.15, cx + r * 0.22, cy - r * 1.2);
    ctx.lineTo(cx + r * 0.1, cy - r * 0.78);
    ctx.closePath();
    ctx.fill();

    // Вырезанное лицо светится, как от свечки внутри (мерцает)
    const flicker = animated ? 0.75 + 0.15 * Math.sin(time * 0.013) + 0.1 * Math.sin(time * 0.037) : 1;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffb000';
    ctx.shadowBlur = r * 0.4;
    const tri = (points) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * r, cy + y * r) : ctx.moveTo(cx + x * r, cy + y * r)));
      ctx.closePath();
      ctx.fill();
    };
    tri([[-0.42, -0.08], [-0.18, -0.08], [-0.3, -0.36]]);  // левый глаз
    tri([[0.18, -0.08], [0.42, -0.08], [0.3, -0.36]]);     // правый глаз
    tri([[-0.07, 0.1], [0.07, 0.1], [0, -0.04]]);          // нос
    tri([                                                   // зубастая улыбка
      [-0.5, 0.2], [-0.3, 0.32], [-0.2, 0.22], [-0.08, 0.34], [0.05, 0.22],
      [0.18, 0.34], [0.3, 0.22], [0.5, 0.2], [0.32, 0.52], [-0.32, 0.52],
    ]);
    ctx.restore();
  }

  // ---------- Снег (Новый год) ----------
  // Мягкие снежинки падают поверх звёзд и чуть покачиваются
  let snow = [];

  function buildSnow() {
    if (SEASON !== 'newyear') return;
    const count = Math.min(180, Math.round(width * height * 0.00011 * quality));
    snow = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: rand(0.6, 2.4),
      speed: rand(0.02, 0.07),
      sway: Math.random() * Math.PI * 2,
      swaySpeed: rand(0.0008, 0.002),
      alpha: rand(0.4, 0.9),
    }));
  }

  function drawSnow(dt, animated) {
    for (const f of snow) {
      if (animated) {
        f.y += f.speed * dt * (0.6 + f.r * 0.3); // крупные падают быстрее
        f.sway += f.swaySpeed * dt;
        if (f.y > height + 6) {
          f.y = -6;
          f.x = Math.random() * width;
        }
      }
      const x = f.x + Math.sin(f.sway) * 12;
      const size = f.r * 5;
      ctx.globalAlpha = f.alpha;
      ctx.drawImage(sprites['#ffffff'], x - size / 2, f.y - size / 2, size, size);
    }
  }

  function drawRing(cx, cy, rx, ry, tilt, from, to, r) {
    const grad = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
    grad.addColorStop(0, 'rgba(255, 79, 216, 0.85)');
    grad.addColorStop(0.5, 'rgba(192, 132, 252, 0.9)');
    grad.addColorStop(1, 'rgba(34, 229, 255, 0.85)');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = grad;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, tilt, from, to);
    ctx.stroke();
    // Второе, тонкое кольцо снаружи
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.18, ry * 1.18, tilt, from, to);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    drawStars(0, false);
    if (snow.length) drawSnow(0, false);
    ctx.globalAlpha = 1;
  }

  // ---------- Сверхновая ----------
  // Вспышка в точке клика: ближайшие звёзды разлетаются волной,
  // а потом пружиной возвращаются на свои места.
  function supernova(cx, cy) {
    if (reducedMotionQuery.matches) return;
    const radius = Math.max(220, Math.min(width, height) * 0.4);
    novas.push({ x: cx, y: cy, radius, life: 0, duration: 1000 });

    const fieldW = width + EDGE * 2;
    const fieldH = height + EDGE * 2;
    for (const layer of layers) {
      for (const s of layer.stars) {
        const x = wrap(s.x - layer.ox, fieldW) - EDGE + s.dx;
        const y = wrap(s.y - layer.oy, fieldH) - EDGE + s.dy;
        const ddx = x - cx;
        const ddy = y - cy;
        const d = Math.hypot(ddx, ddy);
        if (d > radius || d < 1) continue;
        // Ближние к центру и «ближние к нам» звёзды отлетают сильнее
        const force = (1 - d / radius) * 0.9 * (0.5 + layer.depth);
        s.vx += (ddx / d) * force;
        s.vy += (ddy / d) * force;
        kicked.add(s);
      }
    }
  }

  // Пружина тянет звёзды домой, трение гасит скорость
  function updateKicked(dt) {
    const damping = Math.pow(0.994, dt);
    for (const s of kicked) {
      s.vx = (s.vx - s.dx * 0.00003 * dt) * damping;
      s.vy = (s.vy - s.dy * 0.00003 * dt) * damping;
      s.dx += s.vx * dt;
      s.dy += s.vy * dt;
      if (Math.abs(s.dx) + Math.abs(s.dy) < 0.3 && Math.abs(s.vx) + Math.abs(s.vy) < 0.01) {
        s.dx = s.dy = s.vx = s.vy = 0;
        kicked.delete(s);
      }
    }
  }

  function drawNovas(dt) {
    for (let i = novas.length - 1; i >= 0; i--) {
      const n = novas[i];
      n.life += dt;
      const t = n.life / n.duration;
      if (t >= 1) {
        novas.splice(i, 1);
        continue;
      }
      const ease = 1 - Math.pow(1 - t, 3);

      // Яркая вспышка в центре
      const flash = (1 - t) * 140;
      ctx.globalAlpha = Math.pow(1 - t, 2);
      ctx.drawImage(sprites['#ffffff'], n.x - flash / 2, n.y - flash / 2, flash, flash);

      // Две ударные волны: фиолетовая и розовая чуть позади
      [[1, '#c084fc', 2.5], [0.75, '#ff4fd8', 1.5]].forEach(([scale, color, line]) => {
        ctx.globalAlpha = (1 - t) * 0.8;
        ctx.strokeStyle = color;
        ctx.lineWidth = line;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ease * n.radius * scale, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }
  }

  // ---------- Звёзды собираются в слово ----------
  // Точки берём из слова, нарисованного на невидимом холсте.
  function sampleWord(word) {
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const g = off.getContext('2d');
    const fontSize = Math.min(width * 0.19, height * 0.32);
    g.font = `900 ${fontSize}px Orbitron, Unbounded, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(word, width / 2, height * 0.46);

    const data = g.getImageData(0, 0, width, height).data;
    const step = Math.max(4, Math.round(fontSize / 24));
    const points = [];
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (data[(y * width + x) * 4 + 3] > 128) points.push([x, y]);
      }
    }

    // Не больше заданного числа звёзд: на слабых устройствах — меньше
    const max = Math.round((isTouch || isWeak ? 280 : 560) * Math.min(1, quality + 0.2));
    while (points.length > max) points.splice(Math.floor(Math.random() * points.length), 1);
    return points;
  }

  const GATHER_MS = 1500;
  const HOLD_MS = 900;
  const SCATTER_MS = 1400;

  function formWord(word) {
    if (reducedMotionQuery.matches) return Promise.resolve();
    return new Promise((resolve) => {
      const particles = sampleWord(word).map(([tx, ty]) => {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        return {
          sx: Math.random() * width, sy: Math.random() * height, // откуда летит
          tx: tx + rand(-1.5, 1.5), ty: ty + rand(-1.5, 1.5),    // точка в слове
          ex: Math.random() * width, ey: Math.random() * height, // куда разлетится
          delay: Math.random() * 350,
          r: rand(0.8, 1.8),
          phase: Math.random() * Math.PI * 2,
          sprite: sprites[color],
        };
      });
      formation = { particles, time: 0, scatterAt: GATHER_MS + 350 + HOLD_MS, onScatter: resolve };
    });
  }

  // Посетитель не хочет ждать — сразу разлетаемся
  function skipFormation() {
    if (formation && formation.time < formation.scatterAt) formation.time = formation.scatterAt;
  }

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function drawFormation(dt, time) {
    const f = formation;
    f.time += dt;

    if (f.onScatter && f.time >= f.scatterAt) {
      f.onScatter();
      f.onScatter = null;
    }
    if (f.time > f.scatterAt + SCATTER_MS + 400) {
      formation = null;
      return;
    }

    for (const p of f.particles) {
      let x;
      let y;
      let alpha;
      if (f.time < f.scatterAt) {
        // Слетаются в слово, потом мерцают на месте
        const t = Math.min(Math.max((f.time - p.delay) / GATHER_MS, 0), 1);
        const e = easeInOut(t);
        x = p.sx + (p.tx - p.sx) * e;
        y = p.sy + (p.ty - p.sy) * e;
        alpha = 0.35 + 0.65 * e;
        if (t === 1) alpha = 0.75 + 0.25 * Math.sin(time * 0.006 + p.phase);
      } else {
        // Разлетаются по небу и растворяются
        const t = Math.min((f.time - f.scatterAt - p.delay * 0.4) / SCATTER_MS, 1);
        const e = t <= 0 ? 0 : t * t * (3 - 2 * t);
        x = p.tx + (p.ex - p.tx) * e;
        y = p.ty + (p.ey - p.ty) * e;
        alpha = 1 - Math.max(t, 0);
      }
      const size = p.r * 6;
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.drawImage(p.sprite, x - size / 2, y - size / 2, size, size);
    }
  }

  // ---------- Контроль производительности ----------
  // Каждые 2 секунды смотрим средний FPS. Если ниже ~45 — убираем часть звёзд.
  const perf = { frames: 0, time: 0, warmup: 1500, cuts: 0 };

  function checkPerformance(dt) {
    if (perf.warmup > 0) {
      perf.warmup -= dt;
      return;
    }
    perf.frames++;
    perf.time += dt;
    if (perf.time < 2000) return;

    const avgFrame = perf.time / perf.frames;
    perf.frames = 0;
    perf.time = 0;

    if (avgFrame > 22 && perf.cuts < 4) {
      quality *= 0.7;
      perf.cuts++;
      buildStars();
    }
  }

  // ---------- Главный цикл ----------
  function frame(now) {
    rafId = requestAnimationFrame(frame);

    // Ограничиваем шаг, чтобы после паузы ничего не «прыгало»
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;

    checkPerformance(dt);

    // Мышь догоняем плавно — так движение мягче
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    if (isTouch) drift += dt * 0.012;

    if (now > nextShootAt) {
      spawnShootingStar();
      nextShootAt = now + rand(3500, 9000);
    }

    if (kicked.size) updateKicked(dt);

    ctx.clearRect(0, 0, width, height);
    drawStars(now, true);
    if (snow.length) drawSnow(dt, true);
    drawShootingStars(dt);
    if (novas.length) drawNovas(dt);
    if (formation) drawFormation(dt, now);
    ctx.globalAlpha = 1;
  }

  function start() {
    stop();
    if (reducedMotionQuery.matches) {
      drawStatic();
      return;
    }
    lastTime = performance.now();
    nextShootAt = lastTime + rand(1500, 4000);
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  // ---------- События ----------
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    // Переводим позицию мыши в диапазон от -1 до 1
    mouse.targetX = (e.clientX / width) * 2 - 1;
    mouse.targetY = (e.clientY / height) * 2 - 1;
    mouse.px = e.clientX;
    mouse.py = e.clientY;
    mouse.active = true;
  }, { passive: true });

  // Мышь ушла за пределы окна — созвездия гаснут
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) mouse.active = false;
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Когда вкладка скрыта — не тратим батарею
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // Пользователь поменял настройку анимаций прямо во время просмотра
  reducedMotionQuery.addEventListener('change', start);

  resize();
  start();

  // Управление небом из других файлов (и для отладки: window.starfield.count())
  window.starfield = {
    count: () => layers.reduce((sum, l) => sum + l.stars.length, 0),
    quality: () => quality,
    supernova,
    formWord,
    skipFormation,
  };
})();
