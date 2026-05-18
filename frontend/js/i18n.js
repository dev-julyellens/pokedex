/**
 * Textos internos da interface (JSON). Dados da PokeAPI vêm do backend via ?lang=
 */
(function (global) {
  'use strict';

  const LS_LANGUAGE = 'pokedex_language';
  const LS_LEGACY = 'pokedex_locale';
  const SUPPORTED = ['pt-BR', 'en', 'es', 'ja', 'ko', 'zh-Hans'];
  const DEFAULT = 'pt-BR';
  const UI_FALLBACK = ['en', 'pt-BR'];

  /** @type {Record<string, Record<string, string>>} */
  const bundleCache = {};
  let currentLocale = DEFAULT;
  let readyResolve;
  const readyPromise = new Promise((r) => {
    readyResolve = r;
  });

  function normalizeLocale(raw) {
    const s = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-');
    if (s === 'pt' || s === 'pt-br' || s.startsWith('pt-')) return 'pt-BR';
    if (s === 'en' || s.startsWith('en-')) return 'en';
    if (s === 'es' || s.startsWith('es-')) return 'es';
    if (s === 'ja' || s === 'jp' || s.startsWith('ja-')) return 'ja';
    if (s === 'ko' || s === 'kr' || s.startsWith('ko-')) return 'ko';
    if (s === 'zh' || s === 'zh-hans' || s === 'zh-cn' || s.startsWith('zh-hans') || s.startsWith('zh-cn')) {
      return 'zh-Hans';
    }
    if (s === 'zh-hant' || s === 'zh-tw' || s.startsWith('zh-hant') || s.startsWith('zh-tw')) {
      return 'zh-Hans';
    }
    return DEFAULT;
  }

  function detectBrowserLocale() {
    const langs =
      navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (let i = 0; i < langs.length; i++) {
      const n = normalizeLocale(langs[i]);
      if (SUPPORTED.indexOf(n) !== -1) return n;
    }
    return DEFAULT;
  }

  function getStoredLocale() {
    try {
      const v = localStorage.getItem(LS_LANGUAGE) || localStorage.getItem(LS_LEGACY);
      if (v) return normalizeLocale(v);
    } catch (e) {}
    return null;
  }

  function persistLocale(loc) {
    try {
      localStorage.setItem(LS_LANGUAGE, loc);
      localStorage.removeItem(LS_LEGACY);
    } catch (e) {}
  }

  function translationsBase() {
    const path = global.location.pathname || '/';
    const idx = path.indexOf('/frontend');
    if (idx === -1) return 'translations/';
    return path.slice(0, idx + '/frontend'.length) + '/translations/';
  }

  async function loadBundle(locale) {
    const loc = normalizeLocale(locale);
    if (bundleCache[loc]) return bundleCache[loc];
    const url = translationsBase() + encodeURIComponent(loc) + '.json';
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      if (loc !== 'en') return loadBundle('en');
      throw new Error('locale bundle ' + loc);
    }
    const json = await res.json();
    bundleCache[loc] = json;
    return json;
  }

  function t(key, repl) {
    const bundles = [bundleCache[currentLocale]];
    UI_FALLBACK.forEach((loc) => {
      if (loc !== currentLocale && bundleCache[loc]) bundles.push(bundleCache[loc]);
    });
    let s = key;
    for (let i = 0; i < bundles.length; i++) {
      const b = bundles[i];
      if (b && b[key] != null && String(b[key]).trim() !== '') {
        s = b[key];
        break;
      }
    }
    if (repl && typeof repl === 'object') {
      Object.keys(repl).forEach((k) => {
        s = String(s).replace(new RegExp('\\{' + k + '\\}', 'g'), String(repl[k]));
      });
    }
    return s;
  }

  function applyHtmlI18n(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (!k) return;
      const val = t(k);
      if (el.hasAttribute('data-i18n-placeholder')) {
        el.placeholder = val;
      } else if (el.hasAttribute('data-i18n-title')) {
        el.title = val;
      } else if (el.hasAttribute('data-i18n-aria')) {
        el.setAttribute('aria-label', val);
      } else {
        el.textContent = val;
      }
    });
  }

  function setDocumentLang(locale) {
    const loc = normalizeLocale(locale);
    document.documentElement.lang = loc;
    document.documentElement.setAttribute('data-locale', loc);
    document.documentElement.classList.remove('locale-ja', 'locale-ko', 'locale-zh', 'locale-cjk');
    if (loc === 'ja' || loc === 'ko' || loc === 'zh-Hans') {
      document.documentElement.classList.add('locale-cjk');
      if (loc === 'ja') document.documentElement.classList.add('locale-ja');
      if (loc === 'ko') document.documentElement.classList.add('locale-ko');
      if (loc === 'zh-Hans') document.documentElement.classList.add('locale-zh');
    }
  }

  async function setLocale(locale, options) {
    const opts = options || {};
    const loc = normalizeLocale(locale);
    const prev = currentLocale;
    if (loc === prev && bundleCache[loc] && !opts.force) {
      return loc;
    }

    const toLoad = [loc].concat(UI_FALLBACK.filter((x) => x !== loc));
    await Promise.all(
      toLoad.map((l) =>
        loadBundle(l).catch(() => {
          bundleCache[l] = bundleCache[l] || {};
          return bundleCache[l];
        })
      )
    );

    currentLocale = loc;
    persistLocale(loc);
    setDocumentLang(loc);
    global.PokedexLang = bundleCache[loc] || {};
    applyHtmlI18n();

    if (!opts.silent && prev !== loc) {
      global.dispatchEvent(
        new CustomEvent('pokedex:localechange', {
          detail: { locale: loc, previous: prev },
        })
      );
    }

    return loc;
  }

  async function init() {
    const initial = getStoredLocale() || detectBrowserLocale();
    await setLocale(initial, { silent: true });
    readyResolve(currentLocale);
    return currentLocale;
  }

  global.PokedexI18n = {
    SUPPORTED,
    DEFAULT,
    LS_LANGUAGE,
    normalizeLocale,
    detectBrowserLocale,
    getLocale: () => currentLocale,
    t,
    applyHtmlI18n,
    setLocale,
    init,
    ready: readyPromise,
  };

  global.PokedexT = t;
  global.PokedexLangApply = applyHtmlI18n;

  init().catch(() => {
    bundleCache[DEFAULT] = bundleCache[DEFAULT] || {};
    currentLocale = DEFAULT;
    readyResolve(DEFAULT);
  });
})(typeof window !== 'undefined' ? window : globalThis);
