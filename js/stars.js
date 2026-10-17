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

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

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
        });
      }
      return { depth: layer.depth, stars };
    });
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
  function drawStars(time, animated) {
    const scroll = window.scrollY;
    const fieldW = width + EDGE * 2;
    const fieldH = height + EDGE * 2;

    for (const layer of layers) {
      // Насколько сдвинуть этот слой: мышь + прокрутка + дрейф
      const offsetX = animated ? mouse.x * MOUSE_SHIFT * layer.depth + drift * layer.depth : 0;
      const offsetY = animated
        ? mouse.y * MOUSE_SHIFT * layer.depth + scroll * SCROLL_SHIFT * layer.depth + drift * 0.35 * layer.depth
        : 0;

      for (const star of layer.stars) {
        const x = wrap(star.x - offsetX, fieldW) - EDGE;
        const y = wrap(star.y - offsetY, fieldH) - EDGE;

        // Мерцание
        const twinkle = animated ? 0.7 + 0.3 * Math.sin(time * star.twinkleSpeed + star.phase) : 1;
        const size = star.r * 6;

        ctx.globalAlpha = star.alpha * twinkle;
        ctx.drawImage(star.sprite, x - size / 2, y - size / 2, size, size);
      }
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    drawStars(0, false);
    ctx.globalAlpha = 1;
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

    ctx.clearRect(0, 0, width, height);
    drawStars(now, true);
    drawShootingStars(dt);
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
  }, { passive: true });

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

  // Для отладки в консоли: window.starfield.count()
  window.starfield = {
    count: () => layers.reduce((sum, l) => sum + l.stars.length, 0),
    quality: () => quality,
  };
})();
