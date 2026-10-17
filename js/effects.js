/* =========================================================
   Эффекты: печать текста и глитч.
   ========================================================= */

window.Effects = (function () {
  'use strict';

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  /* ---------- Печать текста ----------
     Хитрость против «прыгающей» вёрстки: в блоке два слоя друг на друге.
     Невидимый «призрак» сразу содержит весь текст и занимает место,
     а поверх него по буквам печатается видимый текст.
     Возвращает функцию остановки (пригодится при смене языка). */
  function typewriter(container, lines, options = {}) {
    const speed = options.speed || 30;
    let timer = 0;

    container.innerHTML = '';
    container.classList.add('typed');

    // Полный текст для экранных чтецов (незрячих пользователей)
    const srText = document.createElement('p');
    srText.className = 'sr-only';
    srText.innerHTML = lines.join(' ');

    const ghost = document.createElement('div');
    ghost.className = 'typed__ghost';
    ghost.setAttribute('aria-hidden', 'true');

    const live = document.createElement('div');
    live.className = 'typed__live';
    live.setAttribute('aria-hidden', 'true');

    const cursor = document.createElement('span');
    cursor.className = 'typed__cursor';
    cursor.textContent = '▍';

    // Каждую строку разбираем на текстовые кусочки, которые будем заполнять по буквам
    const lineData = lines.map((html) => {
      const ghostLine = document.createElement('div');
      ghostLine.innerHTML = html;
      ghost.appendChild(ghostLine);

      const el = document.createElement('div');
      el.innerHTML = html;
      el.hidden = true;
      live.appendChild(el);

      const nodes = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        nodes.push({ node, chars: Array.from(node.textContent) }); // Array.from не ломает эмодзи
        node.textContent = '';
      }
      return { el, nodes };
    });

    container.append(srText, ghost, live);

    // Без анимаций — показываем всё сразу
    if (reducedMotion()) {
      lineData.forEach((line) => {
        line.el.hidden = false;
        line.nodes.forEach((n) => { n.node.textContent = n.chars.join(''); });
      });
      lineData[lineData.length - 1].el.appendChild(cursor);
      return () => {};
    }

    let lineIndex = 0;
    let nodeIndex = 0;
    let charIndex = 0;

    function tick() {
      const line = lineData[lineIndex];
      if (!line) return; // всё напечатано, курсор остаётся мигать

      if (line.el.hidden) {
        line.el.hidden = false;
        line.el.appendChild(cursor);
      }

      const item = line.nodes[nodeIndex];
      if (!item) {
        // Строка закончилась — небольшая пауза перед следующей
        lineIndex++;
        nodeIndex = 0;
        charIndex = 0;
        timer = setTimeout(tick, 420);
        return;
      }

      if (charIndex >= item.chars.length) {
        nodeIndex++;
        charIndex = 0;
        tick();
        return;
      }

      const char = item.chars[charIndex++];
      item.node.textContent += char;

      // После знаков препинания — паузы, как у живого человека
      let delay = speed + rand(-12, 18);
      if (/[.!?]/.test(char)) delay = 280;
      else if (/[,:—]/.test(char)) delay = 140;

      timer = setTimeout(tick, delay);
    }

    timer = setTimeout(tick, options.startDelay || 0);
    return () => clearTimeout(timer);
  }

  /* ---------- Глитч ----------
     Сам эффект описан в CSS (класс .glitch).
     Здесь только включаем его время от времени на ~0.6 секунды. */
  function glitchOnce(el) {
    if (!el || reducedMotion()) return;
    el.classList.add('is-glitching');
    setTimeout(() => el.classList.remove('is-glitching'), 600);
  }

  function glitch(el) {
    if (!el) return;

    function schedule() {
      setTimeout(() => {
        if (!document.hidden) glitchOnce(el);
        schedule();
      }, rand(2500, 6500));
    }

    schedule();
  }

  /* ---------- Появление при прокрутке ----------
     IntersectionObserver сообщает, когда блок заезжает в экран —
     это намного дешевле, чем проверять каждый кадр прокрутки.
     Блоки, появившиеся одновременно, выезжают по очереди «лесенкой». */
  let observer = null;

  function reveal(root) {
    const items = (root || document).querySelectorAll('.reveal:not(.is-visible)');

    if (reducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.style.setProperty('--reveal-delay', `${Math.min(order++ * 90, 450)}ms`);
          el.classList.add('is-visible');
          observer.unobserve(el); // показали один раз — больше не следим
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }

    items.forEach((el) => observer.observe(el));
  }

  /* ---------- Наведение на карточки: пятно света и 3D-наклон ----------
     Передаём в CSS положение мыши внутри карточки:
       --mx, --my — для пятна света
       --rx, --ry — углы наклона (край под курсором «проседает»)
       --gx       — сдвиг голографического блика
     Один обработчик на весь список — работает и для новых карточек. */
  const MAX_TILT = 8; // градусов

  function cardHover(container) {
    if (!container) return;

    container.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const card = e.target.closest('.card');
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);

      if (reducedMotion()) return;
      // Положение курсора от -0.5 до 0.5 относительно центра карточки
      const px = x / rect.width - 0.5;
      const py = y / rect.height - 0.5;
      card.style.setProperty('--rx', `${(-py * MAX_TILT * 2).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${(px * MAX_TILT * 2).toFixed(2)}deg`);
      card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
    }, { passive: true });

    // Курсор ушёл — карточка плавно выпрямляется (переход описан в CSS)
    container.addEventListener('pointerout', (e) => {
      const card = e.target.closest('.card');
      if (!card || card.contains(e.relatedTarget)) return;
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  }

  /* ---------- Глитч-переход ----------
     На ~0.4 секунды экран «ломается»: поверх страницы мелькают цветные полосы,
     которые инвертируют цвета под собой, а сама страница дрожит.
     Каждые 50 мс полосы перекладываются в новые случайные места. */
  const TRANSITION_MS = 420;
  const BAR_COLORS = ['#ffffff', '#ff4fd8', '#22e5ff', '#a855f7'];

  function glitchTransition() {
    return new Promise((resolve) => {
      if (reducedMotion()) {
        resolve();
        return;
      }

      const layer = document.createElement('div');
      layer.className = 'glitch-screen';
      layer.setAttribute('aria-hidden', 'true');

      const bars = Array.from({ length: 9 }, () => {
        const bar = document.createElement('i');
        layer.appendChild(bar);
        return bar;
      });

      function shuffleBars() {
        bars.forEach((bar) => {
          bar.style.top = `${rand(0, 100)}%`;
          bar.style.height = `${rand(0.5, 9)}%`;
          bar.style.background = BAR_COLORS[Math.floor(Math.random() * BAR_COLORS.length)];
          bar.style.transform = `translateX(${rand(-12, 12)}%)`;
          bar.style.opacity = rand(0.5, 1).toFixed(2);
        });
      }

      shuffleBars();
      document.body.appendChild(layer);
      document.body.classList.add('is-glitching-page');

      const timer = setInterval(shuffleBars, 50);
      setTimeout(() => {
        clearInterval(timer);
        layer.remove();
        document.body.classList.remove('is-glitching-page');
        resolve();
      }, TRANSITION_MS);
    });
  }

  /* ---------- Всплывающая подсказка ----------
     Неоновая плашка в углу, сама исчезает через несколько секунд.
     Одновременно показывается только одна. */
  let toastEl = null;
  let toastTimer = 0;

  function toast(html, duration = 4500) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = html;
    toastEl.classList.remove('is-shown');
    void toastEl.offsetWidth; // перезапуск анимации появления
    toastEl.classList.add('is-shown');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), duration);
  }

  return { typewriter, glitch, glitchOnce, reveal, cardHover, glitchTransition, toast };
})();
