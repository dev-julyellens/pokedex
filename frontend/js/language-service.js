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

  function renderSelector(container) {
    if (!container) return;
    const current = I18n.getLocale();
    const currentMeta = LOCALES.find((l) => l.id === current) || LOCALES[0];

    let menu = '';
    LOCALES.forEach((loc) => {
      const active = loc.id === current ? ' active' : '';
      menu +=
        '<li><button type="button" class="dropdown-item lang-option' +
        active +
        '" data-locale="' +
        loc.id +
        '"><span class="lang-flag" aria-hidden="true">' +
        loc.flag +
        '</span> ' +
        I18n.t(loc.labelKey) +
        '</button></li>';
    });

    container.innerHTML = [
      '<div class="dropdown lang-dropdown">',
      '<button type="button" class="btn btn-sm btn-outline-light rounded-pill dropdown-toggle lang-dropdown-toggle" ',
      'id="langDropdownBtn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="',
      I18n.t('lang_select_aria'),
      '">',
      '<span class="lang-flag" aria-hidden="true">',
      currentMeta.flag,
      '</span> <span class="lang-label">',
      I18n.t(currentMeta.labelKey),
      '</span></button>',
      '<ul class="dropdown-menu dropdown-menu-end lang-dropdown-menu shadow" aria-labelledby="langDropdownBtn">',
      menu,
      '</ul></div>',
    ].join('');

    bindSelector(container);
  }

  function bindSelector(container) {
    container.querySelectorAll('.lang-option').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const loc = btn.getAttribute('data-locale');
        if (!loc || loc === I18n.getLocale() || switching) return;
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
