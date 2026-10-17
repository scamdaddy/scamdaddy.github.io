/* =========================================================
   Главный файл: собирает страницу из текстов и данных.
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'lang';
  const isTouch = window.matchMedia('(hover: none)').matches;
  let lang = detectLang();
  let stopTyping = () => {};

  // ---------- Язык ----------

  // Сначала — то, что посетитель выбрал раньше, иначе — язык браузера.
  // Русский для русскоязычных браузеров, английский для всех остальных.
  function detectLang() {
    const saved = readSavedLang();
    if (saved && window.I18N[saved]) return saved;
    const browserLangs = navigator.languages || [navigator.language || ''];
    return browserLangs.some((l) => /^ru\b/i.test(l)) ? 'ru' : 'en';
  }

  // localStorage может быть запрещён (приватный режим и т.п.) — поэтому try/catch
  function readSavedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveLang(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      // не получилось запомнить — не страшно, просто в следующий раз язык определится заново
    }
  }

  // ---------- Помощники ----------

  // Текст по ключу на текущем языке (если перевода нет — берём русский)
  function t(key) {
    const dict = window.I18N[lang] || window.I18N.ru;
    return key in dict ? dict[key] : window.I18N.ru[key];
  }

  // Поле может быть строкой или объектом { ru, en }
  function pick(value) {
    if (value && typeof value === 'object') return value[lang] || value.ru;
    return value;
  }

  // Защита от случайного HTML в данных
  function esc(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  // Один и тот же тег всегда получает один и тот же цвет
  const TAG_COLORS = ['cyan', 'pink', 'violet'];
  function tagColor(tag) {
    if (tag === 'live' || tag === 'current') return 'live';
    let hash = 0;
    for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return TAG_COLORS[hash % TAG_COLORS.length];
  }

  function tagsHtml(tags) {
    const items = tags.map((tag) => `<li class="tag tag--${tagColor(tag)}">${esc(tag)}</li>`).join('');
    return `<ul class="tags">${items}</ul>`;
  }

  // Иконки — простые SVG прямо в коде, без внешних файлов
  const ICONS = {
    github: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.3l-3.2 15.1c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 13.1l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5z"/></svg>',
  };

  // ---------- Блоки страницы ----------

  function renderStaticTexts() {
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    document.querySelector('meta[name="description"]').content = t('meta.description');

    // Подсвечиваем текущий язык в переключателе
    document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      // data-i18n-touch — другой текст для телефонов (например, без упоминания клавиш)
      const key = isTouch && el.dataset.i18nTouch ? el.dataset.i18nTouch : el.dataset.i18n;
      // Перевода нет (например, браузер взял старый файл из кэша) — оставляем текст из разметки
      const text = t(key);
      if (typeof text === 'string') el.textContent = text;
    });
    // Тексты в атрибутах: подсказка в поле ввода и подписи для экранных чтецов
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nLabel));
    });
  }

  // Приветствие начинает печататься, когда закончится вступление (js/fx.js)
  function renderGreeting() {
    window.Intro.done.then(() => {
      stopTyping();
      stopTyping = window.Effects.typewriter(document.getElementById('greeting'), t('hero.greeting'), {
        startDelay: 500,
      });
    });
  }

  function renderProjects() {
    const list = document.getElementById('project-list');
    list.innerHTML = window.PROJECTS.map((p, i) => {
      const num = String(i + 1).padStart(2, '0');
      const note = p.note ? `<p class="project__note">${esc(pick(p.note))}</p>` : '';
      return `
        <article class="card project reveal">
          ${window.Effects.seasonDeco()}
          <span class="project__num" aria-hidden="true">${num}</span>
          <h3 class="project__title">${esc(pick(p.title))}</h3>
          <p class="project__desc">${esc(pick(p.desc))}</p>
          ${note}
          ${tagsHtml(p.tags)}
          <a class="btn project__btn" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
            ${esc(pick(p.button))} <span class="btn__arrow" aria-hidden="true">↗</span>
          </a>
        </article>`;
    }).join('');
  }

  // Неоновая шкала: заполняется, когда строка выезжает на экран (см. CSS .progress).
  // Это кнопка: клик запускает денежный дождь и подсказывает про команду money
  function progressHtml(item) {
    return `
      <button class="progress-trigger" type="button" title="${esc(t('progress.hint'))}">
        <span class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"
              aria-valuenow="${item.progress}" aria-label="${esc(item.label)}">
          <span class="progress__fill" style="--value: ${item.progress}%"></span>
        </span>
        <span class="progress__value">${item.progress}%</span>
      </button>
      <span class="progress__note">— ${esc(item.text)}</span>`;
  }

  function aboutValueHtml(item) {
    if (item.tags) return tagsHtml(item.tags);
    if (item.progress !== undefined) return progressHtml(item);
    return esc(item.text);
  }

  function renderAbout() {
    const items = t('about.items').map((item) => `
      <div class="about__row reveal">
        <dt class="about__label"><span class="accent-cyan">&gt;</span> ${esc(item.label)}</dt>
        <dd class="about__value${item.progress !== undefined ? ' about__value--progress' : ''}">${aboutValueHtml(item)}</dd>
      </div>`).join('');
    document.getElementById('about-list').innerHTML = `<dl class="about">${items}</dl>`;
  }

  // ---------- Аватар ----------
  // Картинка 16×16 пикселей: каждая буква — свой цвет, точка — пусто.
  // Чтобы перерисовать аватар, достаточно поменять буквы в карте.
  const AVATAR_MAP = [
    '....HHHHHHHH....',
    '...HhhhhhhhhH...',
    '..HhhHHHHHHhhH..',
    '..HhHSSSSSSHhH..',
    '.HhHSSSSSSSSHhH.',
    '.HhSGGGSSGGGShH.',
    '.HhSGgGGGGgGShH.',
    '.HhSSGGSSGGSShH.',
    '.HhSSSSSSSSSShH.',
    '.HhSSSSSMMMSShH.',
    '..HhsSSSSSSshH..',
    '..HhHssssssHhH..',
    '.BBHhHHCCHHhHBB.',
    'BBBBBBCBBCBBBBBB',
    'BBPBBBCBBCBBBPBB',
    'BBPBBBBBBBBBBPBB',
  ];
  const AVATAR_COLORS = {
    H: '#4c1d95', // капюшон
    h: '#a855f7', // светлая кромка капюшона
    S: '#f2c6a0', // лицо
    s: '#d9a27e', // тень на лице
    G: '#120822', // тёмные очки
    g: '#22e5ff', // блик на очках
    M: '#be185d', // ухмылка
    B: '#2e1065', // худи
    C: '#ece6ff', // шнурки капюшона
    P: '#ff4fd8', // неоновая полоска
    K: '#7c3aed', // шляпа ведьмы
    O: '#ff7a1a', // оранжевая лента на шляпе
    R: '#e11d48', // шапка Деда Мороза
    W: '#f8fafc', // белый мех и помпон
  };

  // Сезонные шляпы. top — с какой строки начинается шляпа:
  // отрицательные строки торчат над головой, остальные ложатся поверх аватара (точка — не трогать)
  const AVATAR_HATS = {
    halloween: {
      top: -4,
      rows: [
        '.........KK.....',
        '........KKK.....',
        '.......KKKK.....',
        '......KKKKKK....',
        '.....OOOOOOOO...',
        '..KKKKKKKKKKKK..',
      ],
    },
    newyear: {
      top: -3,
      rows: [
        '...........WW...',
        '........RRRWW...',
        '......RRRRRR....',
        '....RRRRRRRR....',
        '...WWWWWWWWWW...',
      ],
    },
  };

  function renderAvatar() {
    const hat = AVATAR_HATS[window.SEASON];
    const top = hat ? hat.top : 0;
    const rows = {};
    AVATAR_MAP.forEach((row, y) => { rows[y] = row; });
    if (hat) {
      hat.rows.forEach((hatRow, i) => {
        const y = top + i;
        const base = rows[y] || '.'.repeat(16);
        rows[y] = Array.from(base).map((ch, x) => (hatRow[x] !== '.' ? hatRow[x] : ch)).join('');
      });
    }

    const rects = [];
    Object.keys(rows).forEach((key) => {
      const y = Number(key);
      Array.from(rows[key]).forEach((ch, x) => {
        if (AVATAR_COLORS[ch]) {
          const glint = ch === 'g' ? ' class="avatar__glint"' : '';
          rects.push(`<rect${glint} x="${x}" y="${y}" width="1.02" height="1.02" fill="${AVATAR_COLORS[ch]}"/>`);
        }
      });
    });
    // Со шляпой картинка выше — растягиваем область рисования вверх
    const height = 16 - top;
    document.getElementById('avatar-pixels').innerHTML =
      `<svg viewBox="0 ${top} 16 ${height}" style="height: ${(76 * height) / 16}%" shape-rendering="crispEdges">${rects.join('')}</svg>`;
  }

  function renderLinks() {
    document.getElementById('social-links').innerHTML = window.SOCIAL_LINKS.map((link) => `
      <a class="social" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(link.name)}">
        <span class="social__icon">${ICONS[link.icon] || ''}</span>
        <span class="social__name">${esc(link.name)}</span>
      </a>`).join('');
  }

  function renderAll() {
    renderStaticTexts();
    renderGreeting();
    renderProjects();
    renderAbout();
    renderLinks();
    window.Effects.reveal(document);
  }

  // Смена языка: запоминаем выбор и перерисовываем все тексты.
  // Имя на секунду «глючит» — так переключение выглядит эффектнее
  function setLang(newLang) {
    if (!window.I18N[newLang] || newLang === lang) return;
    lang = newLang;
    saveLang(lang);
    renderAll();
    window.Effects.glitchOnce(document.querySelector('.hero__name'));
    document.querySelectorAll('.section__title').forEach(window.Effects.retitle);
  }

  function toggleLang() {
    setLang(lang === 'ru' ? 'en' : 'ru');
  }

  // ---------- Запуск ----------

  renderAll();
  window.Effects.cardHover(document.getElementById('project-list'));
  window.Effects.waveLetters(document.querySelector('.hero__name'));
  renderAvatar();

  // Клик по аватару — случайная фраза (но не та же, что в прошлый раз)
  let lastQuip = -1;
  document.getElementById('avatar').addEventListener('click', () => {
    const quips = t('avatar.quips');
    let index;
    do index = Math.floor(Math.random() * quips.length);
    while (index === lastQuip && quips.length > 1);
    lastQuip = index;
    window.Effects.toast(esc(quips[index]), 3000);
    window.Effects.glitchOnce(document.getElementById('avatar'));
  });

  // Глитч-переход при клике на кнопку проекта: сначала экран «ломается»,
  // потом открывается новая вкладка
  document.getElementById('project-list').addEventListener('click', (e) => {
    const link = e.target.closest('.project__btn');
    // Ctrl/Shift/средняя кнопка мыши — не мешаем, пусть браузер сделает своё
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    window.Effects.glitchTransition().then(() => {
      const tab = window.open(link.href, '_blank');
      if (tab) tab.opener = null; // новая вкладка не получит доступ к нашей странице
      else window.location.href = link.href; // браузер заблокировал вкладку — открываем здесь
    });
  });

  // Клик по шкале прогресса: немного денег с неба и намёк на секретную команду
  document.getElementById('about-list').addEventListener('click', (e) => {
    if (!e.target.closest('.progress-trigger')) return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.Terminal.moneyRain(2200);
    }
    window.Effects.toast(t('toast.money'));
  });

  // Плотный фон у шапки, как только страницу начали прокручивать
  const topbar = document.querySelector('.topbar');
  const updateTopbar = () => topbar.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', updateTopbar, { passive: true });
  updateTopbar();

  // Кнопки ru / en в углу
  document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // Терминалу отдаём помощников, чтобы он говорил на текущем языке
  window.Terminal.init({ t, pick, esc, toggleLang });

  // Глитч включаем, когда загрузится шрифт имени
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => window.Effects.glitch(document.querySelector('.hero__name')));
})();
