/* =========================================================
   Сезонные режимы. Включаются сами по дате у посетителя, каждый год.
   Даты — [месяц, день], обе границы включительно.
   Чтобы поменять даты, правь только этот список.

   Посмотреть режим в любой день: добавь к адресу
     ?season=halloween   или   ?season=newyear   (а ?season=none — выключить)
   ========================================================= */

(function () {
  'use strict';

  const SEASONS = [
    { name: 'halloween', from: [10, 17], to: [11, 2] },  // с 17 октября по 2 ноября
    { name: 'newyear', from: [12, 15], to: [1, 15] },    // с 15 декабря по 15 января
  ];

  // Попадает ли дата в промежуток (умеет промежутки через Новый год)
  function inRange(date, from, to) {
    const day = (date.getMonth() + 1) * 100 + date.getDate();
    const start = from[0] * 100 + from[1];
    const end = to[0] * 100 + to[1];
    return start <= end ? day >= start && day <= end : day >= start || day <= end;
  }

  let season = '';
  const forced = new URLSearchParams(window.location.search).get('season');
  if (forced) {
    season = SEASONS.some((s) => s.name === forced) ? forced : '';
  } else {
    const today = new Date();
    const match = SEASONS.find((s) => inRange(today, s.from, s.to));
    if (match) season = match.name;
  }

  // Класс на <html> включает сезонные цвета в CSS, остальные файлы читают window.SEASON
  window.SEASON = season;
  if (season) {
    document.documentElement.classList.add(`season-${season}`);
    document.documentElement.dataset.season = season;
  }
})();
