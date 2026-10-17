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
  },
};
