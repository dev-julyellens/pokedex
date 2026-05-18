/**
 * Cliente HTTP da API local Pokédex.
 */
(function (global) {
  'use strict';

  const API_BASE = (function () {
    const path = global.location.pathname || '/';
    const idx = path.indexOf('/frontend');
    if (idx === -1) return 'api/';
    return path.slice(0, idx) + '/api/';
  })();

  const cardCache = new Map();
  const detailCache = new Map();

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, Object.assign({ headers: { Accept: 'application/json' } }, options || {}));
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
      if (cardCache.has(n)) {
        out[n] = cardCache.get(n);
      } else {
        missing.push(n);
      }
    });
    if (!missing.length) return out;

    const json = await fetchJson(API_BASE + 'cards.php?ids=' + encodeURIComponent(missing.join(',')));
    const items = (json.data && json.data.items) || {};
    Object.keys(items).forEach((k) => {
      const n = parseInt(k, 10);
      cardCache.set(n, items[k]);
      out[n] = items[k];
    });
    return out;
  }

  async function fetchPokemonDetail(identifier) {
    const key = String(identifier).trim().toLowerCase();
    if (detailCache.has(key)) return detailCache.get(key);
    const q = /^\d+$/.test(key) ? 'id=' + encodeURIComponent(key) : 'name=' + encodeURIComponent(key);
    const json = await fetchJson(API_BASE + 'pokemon.php?' + q);
    detailCache.set(key, json.data);
    return json.data;
  }

  global.PokedexApi = {
    API_BASE,
    escapeHtml,
    fetchJson,
    fetchCardSummaries,
    fetchPokemonDetail,
    pokemonSpriteUrl,
    officialArtUrl,
    clearCardCache: () => cardCache.clear(),
    clearDetailCache: () => detailCache.clear(),
  };
})(window);
