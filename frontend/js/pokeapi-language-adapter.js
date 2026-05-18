/**
 * Adaptador: anexa parâmetro lang às chamadas da API local.
 */
(function (global) {
  'use strict';

  function getLocale() {
    if (global.PokedexI18n && typeof global.PokedexI18n.getLocale === 'function') {
      return global.PokedexI18n.getLocale();
    }
    return 'pt-BR';
  }

  function withLang(url) {
    const loc = encodeURIComponent(getLocale());
    const sep = url.indexOf('?') === -1 ? '?' : '&';
    if (/[?&]lang=/.test(url)) {
      return url.replace(/([?&])lang=[^&]*/, '$1lang=' + loc);
    }
    return url + sep + 'lang=' + loc;
  }

  global.PokedexLangApi = {
    getLocale,
    withLang,
  };
})(typeof window !== 'undefined' ? window : globalThis);
