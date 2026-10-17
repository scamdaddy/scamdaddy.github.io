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
  function glitch(el) {
    if (!el) return;

    function schedule() {
      setTimeout(() => {
        if (!reducedMotion() && !document.hidden) {
          el.classList.add('is-glitching');
          setTimeout(() => el.classList.remove('is-glitching'), 600);
        }
        schedule();
      }, rand(2500, 6500));
    }

    schedule();
  }

  return { typewriter, glitch };
})();
