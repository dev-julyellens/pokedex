/**
 * Seletor de idioma e orquestração da troca de locale na UI.
 */
(function (global) {
  'use strict';

  const I18n = global.PokedexI18n;
  if (!I18n) return;

  const LOCALES = [
    { id: 'pt-BR', flag: '🇧🇷', labelKey: 'lang_pt' },
    { id: 'en', flag: '🇺🇸', labelKey: 'lang_en' },
    { id: 'es', flag: '🇪🇸', labelKey: 'lang_es' },
    { id: 'ja', flag: '🇯🇵', labelKey: 'lang_ja' },
    { id: 'ko', flag: '🇰🇷', labelKey: 'lang_ko' },
    { id: 'zh-Hans', flag: '🇨🇳', labelKey: 'lang_zh' },
  ];

  let switching = false;
  let docListenersBound = false;

  function closeLangDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.remove('is-open');
    const btn = dropdown.querySelector('#langDropdownBtn');
    const menu = dropdown.querySelector('.lang-dropdown-menu');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (menu) menu.setAttribute('aria-hidden', 'true');
  }

  function openLangDropdown(dropdown) {
    document.querySelectorAll('.lang-dropdown.is-open').forEach((el) => {
      if (el !== dropdown) closeLangDropdown(el);
    });
    dropdown.classList.add('is-open');
    const btn = dropdown.querySelector('#langDropdownBtn');
    const menu = dropdown.querySelector('.lang-dropdown-menu');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (menu) menu.setAttribute('aria-hidden', 'false');
  }

  function bindDocListeners() {
    if (docListenersBound) return;
    docListenersBound = true;

    document.addEventListener('click', (ev) => {
      requestAnimationFrame(() => {
        if (ev.target.closest('.lang-dropdown')) return;
        document.querySelectorAll('.lang-dropdown.is-open').forEach(closeLangDropdown);
      });
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      document.querySelectorAll('.lang-dropdown.is-open').forEach(closeLangDropdown);
    });
  }

  function initLangDropdown(container) {
    const dropdown = container.querySelector('.lang-dropdown');
    const btn = container.querySelector('#langDropdownBtn');
    if (!dropdown || !btn) return;

    bindDocListeners();

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (dropdown.classList.contains('is-open')) {
        closeLangDropdown(dropdown);
      } else {
        openLangDropdown(dropdown);
      }
    });
  }

  function renderSelector(container) {
    if (!container) return;
    const current = I18n.getLocale();
    const currentMeta = LOCALES.find((l) => l.id === current) || LOCALES[0];

    let menu = '';
    LOCALES.forEach((loc) => {
      const active = loc.id === current ? ' active' : '';
      menu +=
        '<li role="none"><button type="button" class="lang-option' +
        active +
        '" role="menuitem" data-locale="' +
        loc.id +
        '"><span class="lang-flag" aria-hidden="true">' +
        loc.flag +
        '</span> ' +
        I18n.t(loc.labelKey) +
        '</button></li>';
    });

    container.innerHTML = [
      '<div class="lang-dropdown">',
      '<button type="button" class="btn btn-sm btn-outline-light rounded-pill lang-dropdown-toggle" ',
      'id="langDropdownBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="langDropdownMenu" ',
      'aria-label="',
      I18n.t('lang_select_aria'),
      '">',
      '<span class="lang-flag" aria-hidden="true">',
      currentMeta.flag,
      '</span> <span class="lang-label">',
      I18n.t(currentMeta.labelKey),
      '</span> <i class="bi bi-chevron-down lang-chevron" aria-hidden="true"></i></button>',
      '<ul class="lang-dropdown-menu" id="langDropdownMenu" role="menu" aria-hidden="true">',
      menu,
      '</ul></div>',
    ].join('');

    bindSelector(container);
    initLangDropdown(container);
  }

  function bindSelector(container) {
    const dropdown = container.querySelector('.lang-dropdown');

    container.querySelectorAll('.lang-option').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const loc = btn.getAttribute('data-locale');
        if (!loc || loc === I18n.getLocale() || switching) return;
        if (dropdown) closeLangDropdown(dropdown);
        await switchLocale(loc);
      });
    });
  }

  async function switchLocale(locale) {
    if (switching) return;
    switching = true;
    const overlay = document.getElementById('langSwitchOverlay');
    if (overlay) {
      overlay.classList.remove('d-none');
      overlay.setAttribute('aria-busy', 'true');
    }
    document.body.classList.add('locale-switching');
    try {
      await I18n.setLocale(locale);
      const host = document.getElementById('langSelectorHost');
      if (host) renderSelector(host);
    } finally {
      document.body.classList.remove('locale-switching');
      if (overlay) {
        overlay.classList.add('d-none');
        overlay.setAttribute('aria-busy', 'false');
      }
      switching = false;
    }
  }

  function mount() {
    const host = document.getElementById('langSelectorHost');
    if (host) renderSelector(host);
  }

  global.PokedexLanguage = {
    mount,
    switchLocale,
    renderSelector,
    LOCALES,
  };

  I18n.ready.then(mount);
})(typeof window !== 'undefined' ? window : globalThis);
