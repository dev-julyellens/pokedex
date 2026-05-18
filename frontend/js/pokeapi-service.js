/**
 * Cliente HTTP da API local — cache por idioma via PokedexTranslationCache.
 */
(function (global) {
  'use strict';

  const Cache = global.PokedexTranslationCache;

  const API_BASE = (function () {
    const path = global.location.pathname || '/';
    const idx = path.indexOf('/frontend');
    if (idx === -1) return 'api/';
    return path.slice(0, idx) + '/api/';
  })();

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function withLang(url) {
    if (global.PokedexLangApi && typeof global.PokedexLangApi.withLang === 'function') {
      return global.PokedexLangApi.withLang(url);
    }
    return url;
  }

  async function fetchJson(url, options) {
    const res = await fetch(withLang(url), Object.assign({ headers: { Accept: 'application/json' } }, options || {}));
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error((json && json.error) || 'Erro na requisição');
    }
    return json;
  }

  function pokemonSpriteUrl(id) {
    const n = parseInt(String(id), 10);
    return (
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' +
      (Number.isFinite(n) ? n : 0) +
      '.png'
    );
  }

  function officialArtUrl(id) {
    const n = parseInt(String(id), 10);
    return (
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' +
      (Number.isFinite(n) ? n : 0) +
      '.png'
    );
  }

  async function fetchCardSummaries(ids) {
    const missing = [];
    const out = {};
    (ids || []).forEach((id) => {
      const n = parseInt(String(id), 10);
      if (!Number.isFinite(n) || n <= 0) return;
      const cached = Cache ? Cache.get('card', n) : null;
      if (cached) {
        out[n] = cached;
      } else {
        missing.push(n);
      }
    });
    if (!missing.length) return out;

    const json = await fetchJson(API_BASE + 'cards.php?ids=' + encodeURIComponent(missing.join(',')));
    const items = (json.data && json.data.items) || {};
    Object.keys(items).forEach((k) => {
      const n = parseInt(k, 10);
      if (Cache) Cache.set('card', n, items[k]);
      out[n] = items[k];
    });
    return out;
  }

  async function fetchPokemonDetail(identifier) {
    const idKey = String(identifier).trim().toLowerCase();
    if (Cache) {
      return Cache.getOrFetch('detail', idKey, async () => {
        const q = /^\d+$/.test(idKey) ? 'id=' + encodeURIComponent(idKey) : 'name=' + encodeURIComponent(idKey);
        const json = await fetchJson(API_BASE + 'pokemon.php?' + q);
        return json.data;
      });
    }
    const q = /^\d+$/.test(idKey) ? 'id=' + encodeURIComponent(idKey) : 'name=' + encodeURIComponent(idKey);
    const json = await fetchJson(API_BASE + 'pokemon.php?' + q);
    return json.data;
  }

  function clearCardCache() {
    if (Cache) Cache.clearAll();
  }

  function clearDetailCache() {
    if (Cache) Cache.clearAll();
  }

  global.PokedexApi = {
    API_BASE,
    escapeHtml,
    fetchJson,
    fetchCardSummaries,
    fetchPokemonDetail,
    pokemonSpriteUrl,
    officialArtUrl,
    clearCardCache,
    clearDetailCache,
  };
})(window);
