/* =========================================================
   Проекты. Чтобы добавить новый — скопируй любую строку и поменяй данные.
   Поля:
     title  — название (строка или { ru, en })
     desc   — описание { ru, en }
     tags   — теги (теги live и current подсвечиваются особо)
     button — текст кнопки { ru, en }
     url    — ссылка
     note   — необязательная мелкая подпись под описанием { ru, en }
   ========================================================= */

window.PROJECTS = [
  {
    title: 'QuestLog',
    desc: {
      ru: 'to-do список, где задачи — это квесты. выполняешь дела, а твой фэнтези-герой получает опыт, монеты и новые скины. пропустишь — потеряешь здоровье.',
      en: 'a to-do list where tasks are quests. get things done and your fantasy hero earns XP, coins and new skins. skip them — and lose HP.',
    },
    tags: ['app', 'react', 'supabase', 'live'],
    button: { ru: 'открыть', en: 'open' },
    url: 'https://questloggg.vercel.app/',
  },
  {
    title: 'Runaway',
    desc: {
      ru: 'бесконечный раннер в браузере. прыгай, пригибайся, собирай монеты и открывай скины — от ниндзя до радужного единорога. а ещё там есть секретный скин 👀',
      en: 'an endless runner in your browser. jump, duck, collect coins and unlock skins — from a ninja to a rainbow unicorn. there\'s also a secret skin 👀',
    },
    tags: ['game', 'javascript', 'live'],
    button: { ru: 'играть', en: 'play' },
    url: 'https://runaway-rose.vercel.app/',
  },
  {
    title: 'Forculus VPN',
    desc: {
      ru: 'telegram-бот для подключения к VPN.',
      en: 'a telegram bot for connecting to a VPN.',
    },
    note: {
      ru: 'не является рекламой. проект показан как пример моей работы',
      en: 'this is not an advertisement. shown as an example of my work',
    },
    tags: ['telegram', 'bot', 'vpn'],
    button: { ru: 'открыть бота', en: 'open bot' },
    url: 'https://t.me/forculusbot',
  },
  {
    title: { ru: 'этот сайт', en: 'this site' },
    desc: {
      ru: 'ты сейчас на нём. звёзды, глитч и терминал — попробуй ввести help.',
      en: 'you\'re looking at it. stars, glitch and a terminal — try typing help.',
    },
    tags: ['html', 'css', 'javascript', 'current'],
    button: { ru: 'исходный код', en: 'source code' },
    url: 'https://github.com/scamdaddy/scamdaddy.github.io',
  },
];

// Ссылки внизу страницы (их же покажет команда links в терминале)
window.SOCIAL_LINKS = [
  { name: 'github', url: 'https://github.com/scamdaddy', icon: 'github' },
  { name: 'telegram', url: 'https://t.me/scamdaddy', icon: 'telegram' },
];
