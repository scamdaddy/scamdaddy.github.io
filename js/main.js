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
      el.textContent = t(key);
    });
    // Тексты в атрибутах: подсказка в поле ввода и подписи для экранных чтецов
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nLabel));
    });
  }

  function renderGreeting() {
    stopTyping();
    stopTyping = window.Effects.typewriter(document.getElementById('greeting'), t('hero.greeting'), {
      startDelay: 500,
    });
  }

  function renderProjects() {
    const list = document.getElementById('project-list');
    list.innerHTML = window.PROJECTS.map((p, i) => {
      const num = String(i + 1).padStart(2, '0');
      const note = p.note ? `<p class="project__note">${esc(pick(p.note))}</p>` : '';
      return `
        <article class="card project reveal">
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

  function renderAbout() {
    const items = t('about.items').map((item) => `
      <div class="about__row reveal">
        <dt class="about__label"><span class="accent-cyan">&gt;</span> ${esc(item.label)}</dt>
        <dd class="about__value">${item.tags ? tagsHtml(item.tags) : esc(item.text)}</dd>
      </div>`).join('');
    document.getElementById('about-list').innerHTML = `<dl class="about">${items}</dl>`;
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
  }

  function toggleLang() {
    setLang(lang === 'ru' ? 'en' : 'ru');
  }

  // ---------- Запуск ----------

  renderAll();
  window.Effects.spotlight(document.getElementById('project-list'));

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
