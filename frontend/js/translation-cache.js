/**
 * Cache de respostas da API local por idioma + deduplicação de fetch em voo.
 * Separado dos textos de UI (PokedexI18n).
 */
(function (global) {
  'use strict';

  /** @type {Map<string, unknown>} */
  const store = new Map();
  /** @type {Map<string, Promise<unknown>>} */
  const inFlight = new Map();

  function localeKey() {
    if (global.PokedexI18n && typeof global.PokedexI18n.getLocale === 'function') {
      return global.PokedexI18n.getLocale();
    }
    return 'pt-BR';
  }

  function key(prefix, id) {
    return prefix + ':' + localeKey() + ':' + String(id).trim().toLowerCase();
  }

  function get(prefix, id) {
    const k = key(prefix, id);
    return store.has(k) ? store.get(k) : null;
  }

  function set(prefix, id, value) {
    store.set(key(prefix, id), value);
  }

  /**
   * @param {string} prefix
   * @param {string|number} id
   * @param {() => Promise<unknown>} fetcher
   */
  async function getOrFetch(prefix, id, fetcher) {
    const cached = get(prefix, id);
    if (cached !== null) return cached;

    const k = key(prefix, id);
    if (inFlight.has(k)) return inFlight.get(k);

    const p = Promise.resolve()
      .then(fetcher)
      .then((data) => {
        set(prefix, id, data);
        inFlight.delete(k);
        return data;
      })
      .catch((err) => {
        inFlight.delete(k);
        throw err;
      });

    inFlight.set(k, p);
    return p;
  }

  function clearLocale(loc) {
    const prefix = String(loc) + ':';
    store.forEach((_v, k) => {
      if (k.indexOf(':' + loc + ':') !== -1) store.delete(k);
    });
    inFlight.forEach((_v, k) => {
      if (k.indexOf(':' + loc + ':') !== -1) inFlight.delete(k);
    });
  }

  function clearAll() {
    store.clear();
    inFlight.clear();
  }

  global.PokedexTranslationCache = {
    key,
    get,
    set,
    getOrFetch,
    clearLocale,
    clearAll,
  };
})(typeof window !== 'undefined' ? window : globalThis);
