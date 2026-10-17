/* =========================================================
   Мини-терминал.
   Одно и то же окно живёт внизу страницы, а по клавише ~
   (или кнопке >_ на телефоне) всплывает поверх всего.
   Ответы берутся из js/i18n.js на текущем языке.
   ========================================================= */

window.Terminal = (function () {
  'use strict';

  // Команды, которые показываются в help и дополняются по Tab
  const PUBLIC = ['help', 'about', 'projects', 'play', 'links', 'lang', 'clear'];
  const RUNAWAY_URL = 'https://runaway-rose.vercel.app/';

  // Секретные команды, которые считаются в «найдено секретов»
  // ufo — не команда: это НЛО, которое иногда пролетает по небу (js/fx.js)
  const SECRETS = ['sudo', 'coffee', 'hack', 'money', 'ufo'];
  const SECRETS_KEY = 'secrets';

  // Подсказки к секретам: если ввести похожее слово, терминал намекнёт на команду.
  // Проверяются по порядку, срабатывает первая подходящая
  const SECRET_HINTS = [
    { cmd: 'ufo', key: 'term.ufoHint', words: /ufo|alien|space|нло|пришел|инопланет|космос|тарелк/i },
    { cmd: 'sudo', emoji: '🔐', words: /password|root|admin|access|пароль|админ|права|доступ|^su$/i },
    { cmd: 'coffee', emoji: '☕', words: /coff|tea|tired|sleep|energy|latte|espresso|кофе|кофей|чай|устал|спать|сонн|энерг|латте|эспрессо/i },
    { cmd: 'hack', emoji: '🕶️', words: /matrix|hacker|virus|exploit|mainframe|firewall|neo|матриц|взлом|хакер|вирус|нео/i },
    { cmd: 'money', emoji: '💸', words: /cash|rich|dollar|bank|salary|earn|coin|деньг|денег|бабк|бабл|доллар|банк|зарплат|зараб|мани|рубл|монет|богат|\$/i },
  ];

  // Найденные секреты храним в браузере, чтобы счёт не сбрасывался
  function loadFound() {
    try {
      return new Set(JSON.parse(localStorage.getItem(SECRETS_KEY)) || []);
    } catch (e) {
      return new Set();
    }
  }

  const found = loadFound();

  function secretsLine(key) {
    return app.t(key).replace('{n}', found.size).replace('{total}', SECRETS.length);
  }

  function markSecret(name) {
    if (!SECRETS.includes(name) || found.has(name)) return;
    found.add(name);
    try {
      localStorage.setItem(SECRETS_KEY, JSON.stringify([...found]));
    } catch (e) {
      // не запомнили — не страшно
    }
    print(found.size === SECRETS.length ? app.t('term.secretsAll') : secretsLine('term.secretFound'), 'term-trophy');
  }

  let app;        // помощники из main.js: t, pick, esc, toggleLang
  let section, box, output, form, input, backdrop, fab;
  const history = [];
  let historyIndex = 0;

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion() ? 0 : ms));

  // ---------- Вывод ----------

  function print(html, className) {
    const line = document.createElement('div');
    line.className = 'term-line' + (className ? ' ' + className : '');
    line.innerHTML = html;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
    return line;
  }

  function link(url) {
    const text = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `<a href="${app.esc(url)}" target="_blank" rel="noopener noreferrer">${app.esc(text)}</a>`;
  }

  // Выравнивание колонок пробелами, как в настоящей консоли
  function pad(text, width) {
    return app.esc(text) + ' '.repeat(Math.max(1, width - text.length));
  }

  // ---------- Команды ----------

  const commands = {
    help() {
      app.t('term.help').forEach(([name, desc]) => {
        print(`<span class="term-cmd">${pad(name, 10)}</span>${app.esc(desc)}`);
      });
      print(app.t('term.helpHint'), 'term-muted');
      print(secretsLine('term.secrets'), 'term-trophy');
    },

    about() {
      app.t('about.items').forEach((item) => {
        let value = item.tags ? item.tags.join(' • ') : item.text;
        if (item.progress !== undefined) {
          // Шкала из символов: каждые 10% — один квадратик
          const filled = Math.round(item.progress / 10);
          value = `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${item.progress}% — ${item.text}`;
        }
        print(`<span class="term-accent">&gt; ${app.esc(item.label)}:</span> ${app.esc(value)}`);
      });
    },

    projects() {
      window.PROJECTS.forEach((p, i) => {
        const num = String(i + 1).padStart(2, '0');
        print(`<span class="term-muted">${num}</span> <span class="term-accent">${pad(app.pick(p.title), 14)}</span>${link(p.url)}`);
      });
    },

    play() {
      // Открываем сразу по нажатию Enter — так браузер не считает это всплывающим окном
      window.open(RUNAWAY_URL, '_blank', 'noopener');
      print(`${app.t('term.play')} ${link(RUNAWAY_URL)}`);
    },

    links() {
      window.SOCIAL_LINKS.forEach((l) => {
        print(`<span class="term-accent">${pad(l.name, 10)}</span>${link(l.url)}`);
      });
    },

    lang() {
      app.toggleLang();
      print(app.t('term.lang'));
    },

    clear() {
      output.innerHTML = '';
    },

    // ---------- Секретные команды ----------

    async sudo() {
      const [prompt, answer] = app.t('term.sudo');
      print(prompt, 'term-muted');
      await sleep(700);
      print(answer, 'term-error');
    },

    async coffee() {
      print(app.t('term.coffee.start'));
      print([
        '      ( (',
        '       ) )',
        '    ........',
        '    |      |]',
        '    \\      /',
        '     `----\'',
      ].join('\n'), 'term-accent');

      // Шкала кофеина заполняется постепенно
      const bar = print('');
      for (let step = 0; step <= 10; step++) {
        const filled = '█'.repeat(step) + '░'.repeat(10 - step);
        bar.textContent = `${app.t('term.coffee.level')}: [${filled}] ${step * 10}%`;
        await sleep(110);
      }
      print(app.t('term.coffee.done'), 'term-cmd');
    },

    async hack() {
      const [first, second, last] = app.t('term.hack');
      print(first, 'term-hack');
      await sleep(500);
      print(second, 'term-hack');
      if (!reducedMotion()) await matrixRain(3000);
      print(last, 'term-hack');
    },

    async money() {
      print(app.t('term.money.start'), 'term-hack');
      const counter = print('', 'term-money');
      const label = app.t('term.money.label');
      const format = new Intl.NumberFormat(app.t('term.money.locale'));
      const target = 1000000;

      if (!reducedMotion()) moneyRain(3200);

      // Счётчик разгоняется от $0 до миллиона: сначала быстро, под конец медленно
      const duration = reducedMotion() ? 0 : 2600;
      const start = performance.now();
      await new Promise((resolve) => {
        function step(now) {
          const t = duration ? Math.min((now - start) / duration, 1) : 1;
          const eased = 1 - Math.pow(1 - t, 3);
          counter.textContent = `${label}: $${format.format(Math.round(target * eased))}`;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });

      await sleep(900);
      print(app.t('term.money.end'), 'term-error');
    },

    exit() {
      close();
    },
  };

  // ---------- Запуск команды ----------

  function run(raw) {
    const text = raw.trim();
    print(`<span class="term-prompt">guest@artem:~$</span> ${app.esc(text)}`, 'term-echo');
    if (!text) return;

    history.push(text);
    historyIndex = history.length;

    const name = text.split(/\s+/)[0].toLowerCase();
    const command = Object.prototype.hasOwnProperty.call(commands, name) ? commands[name] : null;

    if (command) {
      // Когда команда доиграет (у секретных бывают анимации) — засчитываем секрет
      Promise.resolve(command()).then(() => markSecret(name));
    } else {
      const hint = SECRET_HINTS.find((h) => h.words.test(text));
      let message = app.t('term.unknown');
      if (hint && hint.key) message = app.t(hint.key);
      else if (hint) message = app.t('term.secretHint').replace('{emoji}', hint.emoji).replace('{target}', hint.cmd);
      print(message.replace('{cmd}', app.esc(name)), 'term-error');
    }
  }

  // ---------- Автодополнение по Tab ----------

  function autocomplete() {
    const value = input.value.trim().toLowerCase();
    const matches = PUBLIC.filter((cmd) => cmd.startsWith(value));
    if (matches.length === 1) {
      input.value = matches[0];
    } else if (matches.length > 1) {
      print(`<span class="term-prompt">guest@artem:~$</span> ${app.esc(input.value)}`, 'term-echo');
      print(matches.map((m) => `<span class="term-cmd">${m}</span>`).join('   '));
    }
  }

  // ---------- Клавиши в поле ввода ----------

  function onInputKey(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault(); // иначе курсор прыгнет в начало строки
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex];
      } else {
        historyIndex = history.length;
        input.value = '';
      }
    } else if (e.key === 'Tab' && input.value.trim()) {
      // Пустой Tab не перехватываем — по нему можно уйти с поля клавиатурой
      e.preventDefault();
      autocomplete();
    }
  }

  // ---------- Всплывающий режим ----------

  function isOpen() {
    return box.classList.contains('is-floating');
  }

  function open() {
    if (isOpen()) return;
    // Держим место на странице, пока окно «улетело» наверх
    section.style.minHeight = `${section.offsetHeight}px`;
    box.classList.add('is-floating', 'is-visible');
    backdrop.classList.add('is-open');
    fab.hidden = true;
    input.focus();
  }

  function close() {
    if (!isOpen()) return;
    box.classList.remove('is-floating');
    backdrop.classList.remove('is-open');
    section.style.minHeight = '';
    fab.hidden = false;
    input.blur();
  }

  function onGlobalKey(e) {
    // ~ и Ё на одной клавише — code одинаковый при любой раскладке.
    // Символ проверяем тоже: некоторые клавиатуры и программы не передают code
    const isTilde = e.code === 'Backquote' || e.key === '`' || e.key === '~';
    if (isTilde && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const inOtherField = e.target.matches('input, textarea, [contenteditable]') && e.target !== input;
      // В непустом поле терминала даём напечатать символ
      if (inOtherField || (e.target === input && input.value)) return;
      e.preventDefault();
      if (isOpen()) close();
      else open();
    } else if (e.key === 'Escape' && isOpen()) {
      close();
    }
  }

  // ---------- Секрет: «матрица» ----------

  function matrixRain(duration) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.className = 'fx-overlay';
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const width = (canvas.width = window.innerWidth);
      const height = (canvas.height = window.innerHeight);
      const size = 16;
      const columns = Math.ceil(width / size);
      const drops = Array.from({ length: columns }, () => Math.random() * -40);
      const chars = 'アイウエオカキクケコサシスセソタチツテト0123456789ARTEM';
      const start = performance.now();

      function draw(now) {
        // Полупрозрачная заливка оставляет за буквами светящийся хвост
        ctx.fillStyle = 'rgba(5, 3, 10, 0.14)';
        ctx.fillRect(0, 0, width, height);
        ctx.font = `${size}px "JetBrains Mono", monospace`;

        for (let i = 0; i < columns; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const y = drops[i] * size;
          ctx.fillStyle = Math.random() < 0.04 ? '#ffffff' : i % 6 === 0 ? '#c084fc' : '#5dffb0';
          ctx.fillText(char, i * size, y);
          if (y > height && Math.random() > 0.97) drops[i] = 0;
          drops[i]++;
        }

        if (now - start < duration) {
          requestAnimationFrame(draw);
        } else {
          canvas.classList.add('is-fading');
          setTimeout(() => {
            canvas.remove();
            resolve();
          }, 600);
        }
      }

      requestAnimationFrame(draw);
    });
  }

  // ---------- Секрет: денежный дождь ----------
  // Сверху падают неоновые $ и 💸, кружатся и покачиваются

  function moneyRain(duration) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-overlay';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const colors = ['#5dffb0', '#c084fc', '#ff4fd8', '#22e5ff'];
    const count = Math.min(70, Math.round(width / 18));

    const bills = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: -Math.random() * height,          // стартуют выше экрана, чтобы падали «волной»
      speed: 0.15 + Math.random() * 0.25,  // пикселей в миллисекунду
      size: 18 + Math.random() * 22,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.006,
      sway: Math.random() * Math.PI * 2,
      emoji: Math.random() < 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const start = performance.now();
    let last = start;

    function draw(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const b of bills) {
        b.y += b.speed * dt;
        b.angle += b.spin * dt;
        b.sway += 0.003 * dt;

        ctx.save();
        ctx.translate(b.x + Math.sin(b.sway) * 20, b.y);
        ctx.rotate(b.angle);
        if (b.emoji) {
          ctx.font = `${b.size}px sans-serif`;
          ctx.shadowBlur = 0;
          ctx.fillText('💸', 0, 0);
        } else {
          ctx.font = `900 ${b.size}px Orbitron, sans-serif`;
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 12;
          ctx.fillText('$', 0, 0);
        }
        ctx.restore();
      }

      if (now - start < duration) {
        requestAnimationFrame(draw);
      } else {
        canvas.classList.add('is-fading');
        setTimeout(() => canvas.remove(), 600);
      }
    }

    requestAnimationFrame(draw);
  }

  // ---------- Запуск ----------

  function init(helpers) {
    app = helpers;
    section = document.getElementById('terminal-section');
    box = document.getElementById('terminal');
    output = document.getElementById('terminal-output');
    form = document.getElementById('terminal-form');
    input = document.getElementById('terminal-input');
    backdrop = document.getElementById('terminal-backdrop');
    fab = document.getElementById('terminal-fab');

    print(app.t('term.welcome'), 'term-muted');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      run(input.value);
      input.value = '';
    });

    input.addEventListener('keydown', onInputKey);
    document.addEventListener('keydown', onGlobalKey);
    backdrop.addEventListener('click', close);
    fab.addEventListener('click', open);
    document.getElementById('terminal-close').addEventListener('click', close);

    // Клик по окну ставит курсор в поле ввода (но не мешает выделять текст и жать ссылки)
    box.addEventListener('click', (e) => {
      if (e.target.closest('a, button') || window.getSelection().toString()) return;
      input.focus({ preventScroll: true });
    });
  }

  return { init, run, open, close, moneyRain, markSecret };
})();
