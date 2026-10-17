/* =========================================================
   Все тексты сайта на двух языках.
   Чтобы поменять текст — правь его здесь, код трогать не нужно.
   В приветствии можно использовать HTML-теги для подсветки слов.
   ========================================================= */

window.I18N = {
  ru: {
    'hero.greeting': [
      'привет! я <b class="hl">Artem</b>, в сети — <span class="accent-pink">@scamdaddy</span>.',
      'я вайбкодер: придумываю идеи и превращаю их в работающие проекты вместе с <span class="accent-cyan">ИИ</span>.',
      'мечтаю сделать приложение, которым будут пользоваться тысячи людей.',
      'а пока — делаю игры и полезные штуки.',
    ],
    'hero.scroll': 'листай вниз ↓',

    'projects.title': 'проекты',

    'about.title': 'обо мне',
    // Пункт либо с текстом (text), либо со списком тегов (tags)
    'about.items': [
      { label: 'чем пишу', text: 'Claude Code и собственной головой. я — идеи и решения, ИИ — тысячи строк кода' },
      { label: 'сейчас изучаю', tags: ['веб-разработку', 'работу с ИИ', 'иностранный язык'] },
      { label: 'люблю', tags: ['видеоигры', 'музыку', 'путешествия'] },
      { label: 'мечта', text: 'приложение, которым пользуются тысячи людей' },
    ],

    'links.title': 'ссылки',
    'footer.credit': 'сделано Artem вместе с Claude ❤️',

    // ---------- Терминал ----------
    'term.section': 'терминал',
    'term.hint': 'пиши команды прямо здесь или нажми ~ в любом месте страницы',
    'term.placeholder': 'введи help',
    'term.open': 'открыть терминал',
    'term.close': 'закрыть терминал',
    'term.welcome': 'добро пожаловать в терминал! введи <span class="term-cmd">help</span>, чтобы увидеть команды.',
    'term.help': [
      ['help', 'список команд'],
      ['about', 'коротко обо мне'],
      ['projects', 'мои проекты со ссылками'],
      ['play', 'запустить Runaway'],
      ['links', 'где меня найти'],
      ['lang', 'switch to english'],
      ['clear', 'очистить экран'],
    ],
    'term.helpHint': 'tab — дополнить команду, ↑ ↓ — история. а ещё тут есть секретные команды 👀',
    'term.unknown': 'команда не найдена: {cmd}. введи <span class="term-cmd">help</span>',
    'term.play': 'запускаю Runaway в новой вкладке… беги! 🏃',
    'term.lang': 'язык: русский',
    'term.sudo': [
      '[sudo] пароль для guest: ********',
      'nice try. у тебя нет прав, у меня тоже 🙃',
    ],
    'term.coffee.start': 'завариваю кофе…',
    'term.coffee.level': 'кофеин',
    'term.coffee.done': 'готово. теперь можно кодить до утра ☕',
    'term.hack': [
      'подключаюсь к мейнфрейму…',
      'обхожу файрвол…',
      'access granted… шучу 😄 это просто зелёные буквы',
    ],
  },

  en: {
    'hero.greeting': [
      'hi! i\'m <b class="hl">Artem</b>, online — <span class="accent-pink">@scamdaddy</span>.',
      'i\'m a vibe coder: i come up with ideas and turn them into working projects together with <span class="accent-cyan">AI</span>.',
      'my dream is to build an app used by thousands of people.',
      'for now — i make games and useful stuff.',
    ],
    'hero.scroll': 'scroll down ↓',

    'projects.title': 'projects',

    'about.title': 'about me',
    'about.items': [
      { label: 'what i code with', text: 'Claude Code and my own head. i bring ideas and decisions, AI brings thousands of lines of code' },
      { label: 'currently learning', tags: ['web development', 'working with AI', 'a foreign language'] },
      { label: 'i love', tags: ['video games', 'music', 'travelling'] },
      { label: 'dream', text: 'an app used by thousands of people' },
    ],

    'links.title': 'links',
    'footer.credit': 'made by Artem with Claude ❤️',

    // ---------- Terminal ----------
    'term.section': 'terminal',
    'term.hint': 'type commands right here or press ~ anywhere on the page',
    'term.placeholder': 'type help',
    'term.open': 'open terminal',
    'term.close': 'close terminal',
    'term.welcome': 'welcome to the terminal! type <span class="term-cmd">help</span> to see the commands.',
    'term.help': [
      ['help', 'list of commands'],
      ['about', 'a few words about me'],
      ['projects', 'my projects with links'],
      ['play', 'launch Runaway'],
      ['links', 'where to find me'],
      ['lang', 'переключить на русский'],
      ['clear', 'clear the screen'],
    ],
    'term.helpHint': 'tab — autocomplete, ↑ ↓ — history. there are also some secret commands 👀',
    'term.unknown': 'command not found: {cmd}. type <span class="term-cmd">help</span>',
    'term.play': 'launching Runaway in a new tab… run! 🏃',
    'term.lang': 'language: english',
    'term.sudo': [
      '[sudo] password for guest: ********',
      'nice try. you don\'t have root here. neither do i 🙃',
    ],
    'term.coffee.start': 'brewing coffee…',
    'term.coffee.level': 'caffeine',
    'term.coffee.done': 'done. now we can code till sunrise ☕',
    'term.hack': [
      'connecting to the mainframe…',
      'bypassing the firewall…',
      'access granted… just kidding 😄 it\'s just green letters',
    ],
  },
};
