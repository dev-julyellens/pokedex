/**
 * Pokédex — JavaScript + Bootstrap + API PHP local
 */
(function () {
  'use strict';

  const g = typeof window !== 'undefined' ? window : globalThis;

  const t =
    typeof window.PokedexT === 'function'
      ? window.PokedexT
      : function (key, repl) {
          let s = (window.PokedexLang && window.PokedexLang[key]) || key;
          if (repl && typeof repl === 'object') {
            Object.keys(repl).forEach((k) => {
              s = String(s).replace(new RegExp('\\{' + k + '\\}', 'g'), String(repl[k]));
            });
          }
          return s;
        };

  const API_BASE = (function () {
    const path = window.location.pathname || '/';
    const idx = path.indexOf('/frontend');
    if (idx === -1) {
      return 'api/';
    }
    return path.slice(0, idx) + '/api/';
  })();

  const state = {
    page: 1,
    perPage: 20,
    totalPages: 1,
    total: 0,
    loading: false,
    lastListMeta: null,
    searchActive: false,
    searchResponse: null,
    /** @type {Set<number>} */
    favoritePokemonIds: new Set(),
  };

  let searchDebounce = null;
  let paginationInputDebounce = null;
  /** Invalida respostas antigas quando uma nova lista ou busca é disparada. */
  let navToken = 0;

  const els = {
    grid: document.getElementById('pokemonGrid'),
    search: document.getElementById('searchInput'),
    regionFilter: document.getElementById('regionFilter'),
    typeFilter: document.getElementById('typeFilter'),
    paginationNav: document.getElementById('paginationNav'),
    listMeta: document.getElementById('listMeta'),
    loader: document.getElementById('globalLoader'),
    modalEl: document.getElementById('pokemonModal'),
    modalBody: document.getElementById('pokemonModalBody'),
    toastEl: document.getElementById('appToast'),
    favoritesList: document.getElementById('favoritesList'),
    historyList: document.getElementById('historyList'),
    recentList: document.getElementById('recentList'),
    achievementsList: document.getElementById('achievementsList'),
    btnFav: document.getElementById('btnFavorite'),
    btnTheme: document.getElementById('btnTheme'),
    btnSound: document.getElementById('btnSound'),
    btnRandom: document.getElementById('btnRandom'),
    btnSharePokemon: document.getElementById('btnSharePokemon'),
    btnCompare: document.getElementById('btnCompare'),
    btnExportFav: document.getElementById('btnExportFav'),
    importFavFile: document.getElementById('importFavFile'),
    compareModal: document.getElementById('compareModal'),
    compareA: document.getElementById('compareA'),
    compareB: document.getElementById('compareB'),
    btnRunCompare: document.getElementById('btnRunCompare'),
    compareResult: document.getElementById('compareResult'),
    catalogLive: document.getElementById('catalogLiveRegion'),
    filterIdMin: document.getElementById('filterIdMin'),
    filterIdMax: document.getElementById('filterIdMax'),
    btnApplyFilters: document.getElementById('btnApplyFilters'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    btnDensity: document.getElementById('btnDensity'),
    btnShortcuts: document.getElementById('btnShortcuts'),
    btnCollections: document.getElementById('btnCollections'),
    btnQuiz: document.getElementById('btnQuiz'),
    btnA11y: document.getElementById('btnA11y'),
    regionProgress: document.getElementById('regionProgress'),
    shortcutsModal: document.getElementById('shortcutsModal'),
    collectionsModal: document.getElementById('collectionsModal'),
    quizModal: document.getElementById('quizModal'),
    a11yModal: document.getElementById('a11yModal'),
    collectionListEl: document.getElementById('collectionListEl'),
    collectionItemsEl: document.getElementById('collectionItemsEl'),
    newCollectionName: document.getElementById('newCollectionName'),
    btnCreateCollection: document.getElementById('btnCreateCollection'),
    quizSilhouette: document.getElementById('quizSilhouette'),
    quizChoices: document.getElementById('quizChoices'),
    quizFeedback: document.getElementById('quizFeedback'),
    btnQuizNext: document.getElementById('btnQuizNext'),
    btnFontSmaller: document.getElementById('btnFontSmaller'),
    btnFontReset: document.getElementById('btnFontReset'),
    btnFontLarger: document.getElementById('btnFontLarger'),
    btnToggleHc: document.getElementById('btnToggleHc'),
  };

  const modal = els.modalEl ? new bootstrap.Modal(els.modalEl) : null;
  const compareModalBootstrap = els.compareModal ? new bootstrap.Modal(els.compareModal) : null;
  const shortcutsModalBootstrap = els.shortcutsModal ? new bootstrap.Modal(els.shortcutsModal) : null;
  const collectionsModalBootstrap = els.collectionsModal ? new bootstrap.Modal(els.collectionsModal) : null;
  const quizModalBootstrap = els.quizModal ? new bootstrap.Modal(els.quizModal) : null;
  const a11yModalBootstrap = els.a11yModal ? new bootstrap.Modal(els.a11yModal) : null;
  const toast = els.toastEl ? new bootstrap.Toast(els.toastEl, { delay: 3200 }) : null;

  let currentDetail = null;

  const Card = g.PokedexCard;
  const Modal = g.PokedexModal;
  const Stats = g.PokedexStats;
  if (!Card || !Modal || !Stats) {
    console.error('Módulos Pokédex não carregados. Verifique a ordem dos scripts em index.html.');
  }
  const renderTypeBadges = Stats ? Stats.renderTypeBadges.bind(Stats) : function () { return ''; };
  const cardHtml = Card ? Card.cardHtml.bind(Card) : function () { return ''; };

  const LS_THEME = 'pokedex_theme';
  const LS_SOUND = 'pokedex_sound';
  const LS_RECENT = 'pokedex_recent_v1';
  const LS_STATS = 'pokedex_stats_v1';
  const LS_DENSITY = 'pokedex_density';
  const LS_FONT_SCALE = 'pokedex_font_scale';
  const LS_HIGH_CONTRAST = 'pokedex_high_contrast';
  const LS_REGION_SEEN = 'pokedex_region_seen_v1';
  const LS_QUIZ_SCORE = 'pokedex_quiz_score_v1';

  function skeletonGridHtml() {
    const n = Math.min(20, Math.max(1, state.perPage || 20));
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `<div class="pokemon-grid-item"><div class="card pokemon-skeleton h-100 border-0"><div class="skeleton-img"></div><div class="card-body py-2 px-2"><div class="skeleton-line skeleton-num"></div><div class="skeleton-line skeleton-name"></div></div></div></div>`;
    }
    return html;
  }

  function syncTypeFilterEnabled() {
    const tf = els.typeFilter;
    if (!tf) return;
    const reg = els.regionFilter && els.regionFilter.value;
    tf.disabled = !!reg;
    if (reg) tf.value = '';
  }

  function applyTheme(dark) {
    const root = document.documentElement;
    if (dark) {
      root.setAttribute('data-theme', 'dark');
      try {
        localStorage.setItem(LS_THEME, 'dark');
      } catch (e) {}
    } else {
      root.removeAttribute('data-theme');
      try {
        localStorage.setItem(LS_THEME, 'light');
      } catch (e) {}
    }
    if (els.btnTheme) {
      const i = els.btnTheme.querySelector('i');
      if (i) i.className = dark ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#0a0a12' : '#f0f2f8');
  }

  function closeSidebarDrawer() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('btnSidebarToggle');
    if (sidebar) sidebar.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-visible');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function initModalLayerFix() {
    document.addEventListener('show.bs.modal', () => {
      closeSidebarDrawer();
      showLoader(false);
    });
  }

  function initSidebarDrawer() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('btnSidebarToggle');
    if (!sidebar || !overlay || !toggle) return;
    const close = () => closeSidebarDrawer();
    const open = () => {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
    };
    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('is-open')) close();
      else open();
    });
    overlay.addEventListener('click', close);
  }

  function initThemeToggle() {
    if (!els.btnTheme) return;
    const syncIcon = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const i = els.btnTheme.querySelector('i');
      if (i) i.className = dark ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
    };
    syncIcon();
    els.btnTheme.addEventListener('click', () => {
      applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
    });
  }

  function initSoundToggle() {
    if (!els.btnSound) return;
    let on = false;
    try {
      on = localStorage.getItem(LS_SOUND) === '1';
    } catch (e) {}
    const syncIcon = () => {
      const i = els.btnSound.querySelector('i');
      if (i) i.className = on ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill';
    };
    syncIcon();
    els.btnSound.addEventListener('click', () => {
      on = !on;
      try {
        localStorage.setItem(LS_SOUND, on ? '1' : '0');
      } catch (e) {}
      syncIcon();
      showToast(on ? t('sound_on') : t('sound_off'));
    });
  }

  function playFavoriteBlip() {
    try {
      if (localStorage.getItem(LS_SOUND) !== '1') return;
    } catch (e) {
      return;
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 90);
    } catch (e) {}
  }

  function readStats() {
    try {
      const raw = localStorage.getItem(LS_STATS);
      const o = raw ? JSON.parse(raw) : {};
      return {
        views: parseInt(String(o.views || '0'), 10) || 0,
        favAdds: parseInt(String(o.favAdds || '0'), 10) || 0,
        quizHits: parseInt(String(o.quizHits || '0'), 10) || 0,
      };
    } catch (e) {
      return { views: 0, favAdds: 0, quizHits: 0 };
    }
  }

  function writeStats(s) {
    try {
      localStorage.setItem(LS_STATS, JSON.stringify(s));
    } catch (e) {}
  }

  function bumpAchievement(kind) {
    const s = readStats();
    if (kind === 'views') s.views += 1;
    if (kind === 'favadd') s.favAdds += 1;
    if (kind === 'quiz') s.quizHits += 1;
    writeStats(s);
    renderAchievements();
  }

  function renderAchievements() {
    if (!els.achievementsList) return;
    const s = readStats();
    const milestones = [
      { k: 'views', n: 1, label: t('achievement_view_1') },
      { k: 'views', n: 5, label: t('achievement_view_5') },
      { k: 'views', n: 25, label: t('achievement_view_25') },
      { k: 'favadd', n: 1, label: t('achievement_fav_1') },
      { k: 'favadd', n: 5, label: t('achievement_fav_5') },
      { k: 'quizHits', n: 1, label: t('achievement_quiz_1') },
      { k: 'quizHits', n: 10, label: t('achievement_quiz_10') },
    ];
    const lines = milestones.map((m) => {
      const v = m.k === 'views' ? s.views : m.k === 'favadd' ? s.favAdds : s.quizHits;
      const ok = v >= m.n;
      return `<li class="list-group-item py-2 d-flex align-items-center gap-2"><span class="${ok ? 'text-success' : 'text-muted'}">${ok ? '✓' : '○'}</span><span>${escapeHtml(m.label)}</span></li>`;
    });
    els.achievementsList.innerHTML = lines.join('');
  }

  function readRecent() {
    try {
      const raw = localStorage.getItem(LS_RECENT);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeRecent(arr) {
    try {
      localStorage.setItem(LS_RECENT, JSON.stringify(arr.slice(0, 12)));
    } catch (e) {}
  }

  function recordRecentView(pokemon) {
    if (!pokemon || !pokemon.id) return;
    const id = parseInt(String(pokemon.id), 10);
    const name = String(pokemon.name_display || pokemon.name || '').trim() || String(pokemon.name);
    let list = readRecent().filter((x) => x && x.id !== id);
    list.unshift({ id, name });
    writeRecent(list);
    renderRecentList();
  }

  function renderRecentList() {
    if (!els.recentList) return;
    const list = readRecent();
    if (!list.length) {
      els.recentList.innerHTML = `<li class="list-group-item small text-muted">${escapeHtml(t('recent_empty'))}</li>`;
      return;
    }
    els.recentList.innerHTML = list
      .map(
        (r) => `
      <li class="list-group-item py-2">
        <a href="#" class="small history-chip text-capitalize" data-open-recent="${escapeHtml(String(r.name))}">#${r.id} ${escapeHtml(String(r.name))}</a>
      </li>`
      )
      .join('');
    els.recentList.querySelectorAll('[data-open-recent]').forEach((a) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        openPokemon(a.getAttribute('data-open-recent'));
      });
    });
  }

  function syncPokemonUrlQuery(identifier) {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('pokemon', String(identifier).toLowerCase().trim());
      history.replaceState({}, '', u.pathname + (u.search ? u.search : ''));
    } catch (e) {}
  }

  function clearPokemonUrlQuery() {
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('pokemon');
      const q = u.searchParams.toString();
      history.replaceState({}, '', u.pathname + (q ? '?' + q : ''));
    } catch (e) {}
  }

  async function openRandomPokemon() {
    let max = state.total;
    if (!max) {
      try {
        const j = await fetchJson(API_BASE + 'list.php?page=1&limit=1');
        max = parseInt(String((j.data || {}).total || '0'), 10) || 1025;
      } catch (e) {
        max = 1025;
      }
    }
    const id = 1 + Math.floor(Math.random() * Math.max(1, max));
    openPokemon(String(id));
  }

  async function exportFavoritesJson() {
    try {
      const json = await fetchJson(API_BASE + 'favorites.php');
      if (json.db === false) {
        showToast(t('configure_db_favorites'), true);
        return;
      }
      const blob = new Blob([JSON.stringify(json.data || [], null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pokedex-favoritos.json';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(t('export_done'));
    } catch (e) {
      showToast(e.message || t('export_failed'), true);
    }
  }

  async function importFavoritesFromFile(file) {
    const text = await file.text();
    const rows = JSON.parse(text);
    if (!Array.isArray(rows)) throw new Error(t('invalid_json'));
    let ok = 0;
    for (const r of rows) {
      const id = r.pokemon_id != null ? parseInt(String(r.pokemon_id), 10) : parseInt(String(r.id || '0'), 10);
      const nome = (r.nome != null ? String(r.nome) : r.name != null ? String(r.name) : '').trim();
      if (!id || !nome) continue;
      try {
        await fetchJson(API_BASE + 'favorites.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pokemon_id: id, nome }),
        });
        ok++;
      } catch (e) {}
    }
    await refreshFavorites();
    showToast(ok ? t('import_done', { count: ok }) : t('import_none'));
  }

  function statValueNum(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  }

  /** Classes por célula: [classeA, classeB] para destacar vencedor da stat. */
  function compareStatHighlightClasses(va, vb) {
    const na = statValueNum(va);
    const nb = statValueNum(vb);
    if (na === null || nb === null) return ['compare-stat-na', 'compare-stat-na'];
    if (na > nb) return ['compare-stat-winner', 'compare-stat-loser'];
    if (nb > na) return ['compare-stat-loser', 'compare-stat-winner'];
    return ['compare-stat-tie', 'compare-stat-tie'];
  }

  function renderCompareBoard(pA, pB) {
    const labels = ['PS', 'Ataque', 'Defesa', 'At. Esp.', 'Def. Esp.', 'Velocidade'];
    const ids = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const byId = (stats, id) => {
      const row = (stats || []).find((s) => s.id === id);
      return row ? Number(row.base) : '—';
    };
    const na = escapeHtml(pA.name_display || pA.name);
    const nb = escapeHtml(pB.name_display || pB.name);
    const imgA = escapeHtml(pA.image || '');
    const imgB = escapeHtml(pB.image || '');
    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    const cells = [];
    for (let i = 0; i < ids.length; i++) {
      const va = byId(pA.stats, ids[i]);
      const vb = byId(pB.stats, ids[i]);
      const [cA, cB] = compareStatHighlightClasses(va, vb);
      const nA = statValueNum(va);
      const nB = statValueNum(vb);
      if (nA !== null && nB !== null) {
        if (nA > nB) winsA += 1;
        else if (nB > nA) winsB += 1;
        else ties += 1;
      }
      const ariaA =
        nA !== null && nB !== null
          ? nA > nB
            ? 'Maior que o oponente nesta stat'
            : nA < nB
              ? 'Menor que o oponente nesta stat'
              : 'Empate com o oponente nesta stat'
          : 'Valor da stat';
      const ariaB =
        nA !== null && nB !== null
          ? nB > nA
            ? 'Maior que o oponente nesta stat'
            : nB < nA
              ? 'Menor que o oponente nesta stat'
              : 'Empate com o oponente nesta stat'
          : 'Valor da stat';
      cells.push(`
        <div class="compare-stat-name">${escapeHtml(labels[i])}</div>
        <div class="compare-stat-val ${cA}" aria-label="${ariaA}">${va}</div>
        <div class="compare-stat-val ${cB}" aria-label="${ariaB}">${vb}</div>`);
    }
    const bstA = (pA.stats || []).reduce((s, x) => s + Number(x.base || 0), 0);
    const bstB = (pB.stats || []).reduce((s, x) => s + Number(x.base || 0), 0);
    const cBST = compareStatHighlightClasses(bstA, bstB);
    if (Number.isFinite(bstA) && Number.isFinite(bstB)) {
      if (bstA > bstB) winsA += 1;
      else if (bstB > bstA) winsB += 1;
      else ties += 1;
    }
    cells.push(`
        <div class="compare-stat-name">Total base (BST)</div>
        <div class="compare-stat-val ${cBST[0]}" aria-label="${escapeHtml(t('compare_stat_sum'))}">${bstA}</div>
        <div class="compare-stat-val ${cBST[1]}" aria-label="${escapeHtml(t('compare_stat_sum'))}">${bstB}</div>`);
    const shortA = escapeHtml((pA.name_display || pA.name || 'A').split(' ')[0]);
    const shortB = escapeHtml((pB.name_display || pB.name || 'B').split(' ')[0]);
    const summaryParts = [];
    if (winsA || winsB || ties) {
      summaryParts.push(
        `<strong class="compare-summary-name">${shortA}</strong> <span class="text-muted">lidera em</span> <strong class="compare-summary-name">${winsA}</strong> <span class="text-muted">stat(s)</span>`
      );
      summaryParts.push(
        `<strong class="compare-summary-name">${shortB}</strong> <span class="text-muted">lidera em</span> <strong class="compare-summary-name">${winsB}</strong> <span class="text-muted">stat(s)</span>`
      );
      if (ties) summaryParts.push(`<span class="text-muted">empates:</span> <strong class="compare-summary-name">${ties}</strong>`);
    }
    const summary =
      summaryParts.length > 0
        ? `<p class="compare-summary mb-0 mt-3"><span class="compare-summary-label">Resumo</span> · ${summaryParts.join(' · ')}. <span class="compare-summary-hint">Verde = maior na linha · Vermelho = menor.</span></p>`
        : '';

    return `
      <div class="compare-board" role="table" aria-label="${escapeHtml(t('compare_table_label'))}">
        <div class="compare-board-corner" aria-hidden="true"></div>
        <div class="compare-board-poke">
          <img src="${imgA}" class="compare-head-img mb-2" alt="" onerror="this.onerror=null;this.src='${pokemonSpriteUrl(pA.id)}'">
          <div class="compare-poke-name">${na} <span class="text-muted fw-normal">#${String(pA.id).padStart(4, '0')}</span></div>
          <div class="compare-poke-types mt-1">${renderTypeBadges(pA.types)}</div>
        </div>
        <div class="compare-board-poke">
          <img src="${imgB}" class="compare-head-img mb-2" alt="" onerror="this.onerror=null;this.src='${pokemonSpriteUrl(pB.id)}'">
          <div class="compare-poke-name">${nb} <span class="text-muted fw-normal">#${String(pB.id).padStart(4, '0')}</span></div>
          <div class="compare-poke-types mt-1">${renderTypeBadges(pB.types)}</div>
        </div>
        ${cells.join('')}
      </div>
      ${summary}`;
  }

  async function runCompare() {
    const a = (els.compareA && els.compareA.value.trim()) || '';
    const b = (els.compareB && els.compareB.value.trim()) || '';
    if (!a || !b) {
      showToast(t('compare_inform_both'), true);
      return;
    }
    if (!els.compareResult) return;
    els.compareResult.innerHTML = `<p class="text-muted mb-0">${escapeHtml(t('loading'))}</p>`;
    try {
      const qa = /^\d+$/.test(a) ? 'id=' + encodeURIComponent(a) : 'name=' + encodeURIComponent(a.toLowerCase());
      const qb = /^\d+$/.test(b) ? 'id=' + encodeURIComponent(b) : 'name=' + encodeURIComponent(b.toLowerCase());
      const [ja, jb] = await Promise.all([
        fetchJson(API_BASE + 'pokemon.php?' + qa),
        fetchJson(API_BASE + 'pokemon.php?' + qb),
      ]);
      const pa = ja.data && ja.data.pokemon ? ja.data.pokemon : null;
      const pb = jb.data && jb.data.pokemon ? jb.data.pokemon : null;
      if (!pa || !pb) throw new Error(t('compare_incomplete'));
      els.compareResult.innerHTML = renderCompareBoard(pa, pb);
    } catch (e) {
      els.compareResult.innerHTML = `<p class="text-danger mb-0">${escapeHtml(e.message || t('error'))}</p>`;
    }
  }

  function registerServiceWorkerSafe() {
    if (!('serviceWorker' in navigator)) return;
    const path = window.location.pathname || '/';
    const idx = path.indexOf('/frontend');
    const swUrl = idx === -1 ? 'sw.js' : path.slice(0, idx) + '/sw.js';
    const scope = idx === -1 ? './' : path.slice(0, idx) + '/';
    navigator.serviceWorker.register(swUrl, { scope }).catch(() => {});
  }

  function bindGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inField && e.target !== els.search) return;
        if (e.target === els.search) return;
        e.preventDefault();
        els.search && els.search.focus();
      }
      if (e.key === 'Escape') {
        if (els.modalEl && els.modalEl.classList.contains('show') && modal) modal.hide();
        if (els.compareModal && els.compareModal.classList.contains('show') && compareModalBootstrap) {
          compareModalBootstrap.hide();
        }
        if (els.shortcutsModal && els.shortcutsModal.classList.contains('show') && shortcutsModalBootstrap) {
          shortcutsModalBootstrap.hide();
        }
        if (els.collectionsModal && els.collectionsModal.classList.contains('show') && collectionsModalBootstrap) {
          collectionsModalBootstrap.hide();
        }
        if (els.quizModal && els.quizModal.classList.contains('show') && quizModalBootstrap) {
          quizModalBootstrap.hide();
        }
        if (els.a11yModal && els.a11yModal.classList.contains('show') && a11yModalBootstrap) {
          a11yModalBootstrap.hide();
        }
      }
    });
  }

  function showLoader(show) {
    if (!els.loader) return;
    els.loader.classList.toggle('d-none', !show);
    els.loader.classList.toggle('d-flex', !!show);
  }

  function showToast(message, isError) {
    if (!els.toastEl || !toast) {
      alert(message);
      return;
    }
    const t = els.toastEl;
    t.classList.toggle('text-bg-danger', !!isError);
    t.classList.toggle('text-bg-dark', !isError);
    t.querySelector('.toast-body').textContent = message;
    toast.show();
  }

  async function fetchJson(url, options = {}, attempt = 1) {
    const maxAttempts = 4;
    let res;
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });
    } catch (netErr) {
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
        return fetchJson(url, options, attempt + 1);
      }
      throw netErr instanceof Error ? netErr : new Error(t('network_failure'));
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const err = data.error || res.statusText || t('request_error');
      if (
        attempt < maxAttempts &&
        (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504)
      ) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
        return fetchJson(url, options, attempt + 1);
      }
      throw new Error(err);
    }
    return data;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pokemonSpriteUrl(id) {
    const n = parseInt(String(id), 10);
    return (
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' +
      (Number.isFinite(n) ? n : 0) +
      '.png'
    );
  }


  function buildListUrl(page, limitOverride) {
    const limit = limitOverride != null ? limitOverride : state.perPage;
    let url =
      API_BASE +
      'list.php?page=' +
      encodeURIComponent(String(page)) +
      '&limit=' +
      encodeURIComponent(String(limit));
    const region = els.regionFilter && els.regionFilter.value ? els.regionFilter.value.trim() : '';
    if (region) {
      url += '&region=' + encodeURIComponent(region);
    }
    const typeSlug = els.typeFilter && !els.typeFilter.disabled && els.typeFilter.value ? els.typeFilter.value.trim() : '';
    if (typeSlug) {
      url += '&type=' + encodeURIComponent(typeSlug);
    }
    const idMinRaw = els.filterIdMin && els.filterIdMin.value.trim();
    const idMaxRaw = els.filterIdMax && els.filterIdMax.value.trim();
    const idMin = idMinRaw ? parseInt(String(idMinRaw), 10) : 0;
    const idMax = idMaxRaw ? parseInt(String(idMaxRaw), 10) : 0;
    if (Number.isFinite(idMin) && idMin > 0) {
      url += '&id_min=' + encodeURIComponent(String(idMin));
    }
    if (Number.isFinite(idMax) && idMax > 0) {
      url += '&id_max=' + encodeURIComponent(String(idMax));
    }
    return url;
  }

  function announceCatalog(message) {
    const el = els.catalogLive;
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }

  function prefetchListAdjacent() {
    if (state.searchActive) return;
    const tp = state.totalPages;
    const p = state.page;
    const urls = [];
    if (p < tp) urls.push(buildListUrl(p + 1));
    if (p > 1) urls.push(buildListUrl(p - 1));
    urls.forEach((u) => {
      fetch(u, { headers: { Accept: 'application/json' } }).catch(() => {});
    });
  }

  function regionProgressKey() {
    return (els.regionFilter && els.regionFilter.value) || '__national__';
  }

  function recordRegionSeen(pokemonId) {
    try {
      const k = regionProgressKey();
      const raw = localStorage.getItem(LS_REGION_SEEN);
      const o = raw ? JSON.parse(raw) : {};
      if (!o[k]) o[k] = [];
      const id = String(pokemonId);
      if (!o[k].includes(id)) {
        o[k].push(id);
        if (o[k].length > 2000) o[k] = o[k].slice(-2000);
      }
      localStorage.setItem(LS_REGION_SEEN, JSON.stringify(o));
      renderRegionProgress();
    } catch (e) {}
  }

  function renderRegionProgress() {
    if (!els.regionProgress) return;
    const k = regionProgressKey();
    let o = {};
    try {
      o = JSON.parse(localStorage.getItem(LS_REGION_SEEN) || '{}');
    } catch (e) {}
    const arr = o[k] || [];
    const label = k === '__national__' ? t('progress_national') : k;
    const total = state.total || 0;
    els.regionProgress.innerHTML = escapeHtml(
      t('progress_species', {
        label,
        count: arr.length,
        extra: total ? ` · ${t('progress_list_current', { total })}` : '',
      })
    );
    const barFill = document.getElementById('regionProgressBarFill');
    const barWrap = document.getElementById('regionProgressBar');
    if (barFill && barWrap) {
      const pct = total > 0 ? Math.min(100, Math.round((arr.length / total) * 100)) : arr.length > 0 ? 12 : 0;
      barFill.style.width = pct + '%';
      barWrap.setAttribute('aria-valuenow', String(pct));
    }
  }

  function applyDensityUi() {
    const wrap = document.getElementById('catalogGridWrap');
    if (!wrap) return;
    let mode = 'comfy';
    try {
      mode = localStorage.getItem(LS_DENSITY) === 'compact' ? 'compact' : 'comfy';
    } catch (e) {}
    wrap.classList.toggle('catalog-density-compact', mode === 'compact');
    if (els.btnDensity) {
      els.btnDensity.title = mode === 'compact' ? t('density_comfortable') : t('density_compact');
    }
  }

  function toggleDensity() {
    try {
      const cur = localStorage.getItem(LS_DENSITY) === 'compact' ? 'compact' : 'comfy';
      localStorage.setItem(LS_DENSITY, cur === 'compact' ? 'comfy' : 'compact');
    } catch (e) {}
    applyDensityUi();
    showToast(t('density_changed'));
  }

  function initA11yFromStorage() {
    let scale = 1;
    try {
      const s = parseFloat(localStorage.getItem(LS_FONT_SCALE) || '1');
      if (Number.isFinite(s) && s >= 0.85 && s <= 1.35) scale = s;
    } catch (e) {}
    document.documentElement.style.setProperty('--pk-font-scale', String(scale));
    let hc = false;
    try {
      hc = localStorage.getItem(LS_HIGH_CONTRAST) === '1';
    } catch (e) {}
    document.documentElement.toggleAttribute('data-a11y-hc', hc);
  }

  function setFontScale(delta) {
    let s = 1;
    try {
      s = parseFloat(localStorage.getItem(LS_FONT_SCALE) || '1');
    } catch (e) {}
    s = Math.min(1.35, Math.max(0.85, s + delta));
    try {
      localStorage.setItem(LS_FONT_SCALE, String(s));
    } catch (e) {}
    document.documentElement.style.setProperty('--pk-font-scale', String(s));
    showToast(t('font_adjusted'));
  }

  function toggleHighContrast() {
    const on = !document.documentElement.hasAttribute('data-a11y-hc');
    document.documentElement.toggleAttribute('data-a11y-hc', on);
    try {
      localStorage.setItem(LS_HIGH_CONTRAST, on ? '1' : '0');
    } catch (e) {}
    showToast(on ? t('high_contrast_on') : t('high_contrast_off'));
  }

  let quizAnswerName = '';
  let quizPrefetchPromise = null;
  const QUIZ_LIST_LIMIT = 32;

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function getQuizTotalPages() {
    const perPage = Math.max(1, state.perPage || 20);
    if (state.totalPages > 0) return state.totalPages;
    const total = Math.max(1, state.total || 1025);
    return Math.max(1, Math.ceil(total / perPage));
  }

  function mergeUniquePokemonPool(a, b) {
    const seen = new Set();
    const out = [];
    for (const it of [...a, ...b]) {
      const name = it && it.name != null ? String(it.name) : '';
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(it);
    }
    return out;
  }

  async function fetchQuizListPage(page) {
    const j = await fetchJson(buildListUrl(page, QUIZ_LIST_LIMIT));
    const items = (j.data && j.data.items) || [];
    return items.filter((it) => it && it.name != null && it.id != null);
  }

  async function fetchQuizRoundDataByIds() {
    const maxId = Math.max(1, state.total || 1025);
    const ids = new Set();
    let guard = 0;
    while (ids.size < 4 && guard < 50) {
      guard += 1;
      ids.add(Math.floor(Math.random() * maxId) + 1);
    }
    const results = await Promise.all(
      [...ids].map((id) =>
        fetchJson(API_BASE + 'pokemon.php?id=' + encodeURIComponent(String(id)))
          .then((j) => (j.data && j.data.pokemon ? j.data.pokemon : null))
          .catch(() => null)
      )
    );
    const pool = results.filter((p) => p && p.name);
    if (pool.length < 4) throw new Error(t('no_data'));
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const opts = shuffleArray(pool.map((p) => String(p.name)));
    return {
      correctName: String(correct.name),
      correctImage:
        correct.image ||
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' +
          correct.id +
          '.png',
      options: opts,
    };
  }

  async function fetchQuizRoundData() {
    const totalPages = getQuizTotalPages();
    const page = Math.floor(Math.random() * totalPages) + 1;
    let pool = await fetchQuizListPage(page);
    if (pool.length < 4 && totalPages > 1) {
      let alt = page;
      let tries = 0;
      while (alt === page && tries < 8) {
        tries += 1;
        alt = Math.floor(Math.random() * totalPages) + 1;
      }
      if (alt !== page) {
        pool = mergeUniquePokemonPool(pool, await fetchQuizListPage(alt));
      }
    }
    if (pool.length < 4) {
      return fetchQuizRoundDataByIds();
    }
    const picked = shuffleArray(pool.slice()).slice(0, 4);
    const correct = picked[Math.floor(Math.random() * picked.length)];
    const opts = shuffleArray(picked.map((p) => String(p.name)));
    return {
      correctName: String(correct.name),
      correctImage: correct.image || pokemonSpriteUrl(correct.id),
      options: opts,
    };
  }

  function prefetchNextQuizRound() {
    if (quizPrefetchPromise) return;
    quizPrefetchPromise = fetchQuizRoundData().catch(() => null);
  }

  function quizShowChoiceSkeletons() {
    if (!els.quizChoices) return;
    els.quizChoices.innerHTML = Array(4)
      .fill(
        '<button type="button" class="btn btn-outline-secondary answer-option placeholder-glow" disabled aria-hidden="true"><span class="placeholder col-8 mx-auto"></span></button>'
      )
      .join('');
  }

  function renderQuizRound(round) {
    if (!round || !els.quizSilhouette || !els.quizChoices || !els.quizFeedback) return;
    quizAnswerName = round.correctName;
    els.quizSilhouette.src = round.correctImage;
    els.quizSilhouette.alt = 'Silhueta';
    els.quizFeedback.textContent = t('quiz_question');
    els.quizChoices.innerHTML = round.options
      .map(
        (n) =>
          `<button type="button" class="btn btn-outline-primary quiz-choice-btn answer-option text-capitalize" data-name="${escapeHtml(n)}">${escapeHtml(
            n.replace(/-/g, ' ')
          )}</button>`
      )
      .join('');
    els.quizChoices.querySelectorAll('.answer-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) return;
        const guess = btn.getAttribute('data-name');
        const ok = guess === quizAnswerName;
        applyQuizVisualFeedback(btn);
        els.quizFeedback.textContent = ok
          ? t('quiz_correct')
          : t('quiz_wrong', { name: quizAnswerName.replace(/-/g, ' ') });
        let sc = 0;
        try {
          sc = parseInt(localStorage.getItem(LS_QUIZ_SCORE) || '0', 10) || 0;
        } catch (e) {}
        if (ok) {
          sc += 1;
          try {
            localStorage.setItem(LS_QUIZ_SCORE, String(sc));
          } catch (e) {}
          bumpAchievement('quiz');
        }
      });
    });
  }

  async function loadCollectionSelectOptions(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">${escapeHtml(t('collection_option'))}</option>`;
    try {
      const j = await fetchJson(API_BASE + 'collections.php');
      const rows = j.data || [];
      rows.forEach((r) => {
        const id = r.id != null ? String(r.id) : '';
        const nome = r.nome != null ? String(r.nome) : '';
        if (!id) return;
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = nome + (r.item_count != null ? ` (${r.item_count})` : '');
        selectEl.appendChild(opt);
      });
    } catch (e) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = t('collections_unavailable');
      selectEl.appendChild(opt);
    }
  }

  async function refreshCollectionsPanel() {
    if (!els.collectionListEl) return;
    els.collectionListEl.innerHTML = `<li class="list-group-item text-muted">${escapeHtml(t('loading'))}</li>`;
    try {
      const j = await fetchJson(API_BASE + 'collections.php');
      const rows = j.data || [];
      if (!rows.length) {
        els.collectionListEl.innerHTML = `<li class="list-group-item small text-muted">${escapeHtml(t('collections_none'))}</li>`;
        return;
      }
      els.collectionListEl.innerHTML = rows
        .map((r) => {
          const id = r.id != null ? String(r.id) : '';
          const nome = escapeHtml(r.nome != null ? String(r.nome) : '');
          const c = r.item_count != null ? String(r.item_count) : '0';
          return `<li class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <button type="button" class="btn btn-link btn-sm text-start p-0 js-open-collection" data-collection-id="${escapeHtml(id)}">${nome} <span class="text-muted">(${c})</span></button>
            <button type="button" class="btn btn-sm btn-outline-danger js-del-collection" data-collection-id="${escapeHtml(id)}" title="${escapeHtml(t('collection_delete_title'))}">×</button>
          </li>`;
        })
        .join('');
      els.collectionListEl.querySelectorAll('.js-open-collection').forEach((btn) => {
        btn.addEventListener('click', () => loadCollectionItems(parseInt(btn.getAttribute('data-collection-id'), 10)));
      });
      els.collectionListEl.querySelectorAll('.js-del-collection').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.getAttribute('data-collection-id'), 10);
          if (!id || !confirm(t('collection_delete_confirm'))) return;
          try {
            await fetchJson(API_BASE + 'collections.php?id=' + encodeURIComponent(String(id)), { method: 'DELETE' });
            showToast(t('collection_removed'));
            refreshCollectionsPanel();
            if (els.collectionItemsEl) els.collectionItemsEl.innerHTML = '';
          } catch (e) {
            showToast(e.message || t('error'), true);
          }
        });
      });
    } catch (e) {
      els.collectionListEl.innerHTML = `<li class="list-group-item small text-danger">${escapeHtml(t('collections_db_missing'))}</li>`;
    }
  }

  async function loadCollectionItems(collectionId) {
    if (!els.collectionItemsEl || !collectionId) return;
    els.collectionItemsEl.innerHTML = `<li class="list-group-item text-muted">${escapeHtml(t('loading'))}</li>`;
    try {
      const j = await fetchJson(API_BASE + 'collections.php?items=' + encodeURIComponent(String(collectionId)));
      const rows = j.data || [];
      if (!rows.length) {
        els.collectionItemsEl.innerHTML = `<li class="list-group-item small text-muted">${escapeHtml(t('collection_items_empty'))}</li>`;
        return;
      }
      els.collectionItemsEl.innerHTML = rows
        .map((r) => {
          const pid = r.pokemon_id != null ? String(r.pokemon_id) : '';
          const nome = r.nome != null ? String(r.nome) : '';
          return `<li class="list-group-item d-flex justify-content-between align-items-center">
            <a href="#" class="small js-open-poke" data-open="${escapeHtml(nome)}">#${escapeHtml(pid)} ${escapeHtml(nome)}</a>
            <button type="button" class="btn btn-sm btn-outline-secondary js-remove-ci" data-cid="${collectionId}" data-pid="${escapeHtml(pid)}">×</button>
          </li>`;
        })
        .join('');
      els.collectionItemsEl.querySelectorAll('.js-open-poke').forEach((a) => {
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          const n = a.getAttribute('data-open');
          if (n) openPokemon(n);
          if (collectionsModalBootstrap) collectionsModalBootstrap.hide();
        });
      });
      els.collectionItemsEl.querySelectorAll('.js-remove-ci').forEach((b) => {
        b.addEventListener('click', async () => {
          const cid = parseInt(b.getAttribute('data-cid'), 10);
          const pid = parseInt(b.getAttribute('data-pid'), 10);
          try {
            await fetchJson(
              API_BASE + 'collections.php?collection_id=' + encodeURIComponent(String(cid)) + '&pokemon_id=' + encodeURIComponent(String(pid)),
              { method: 'DELETE' }
            );
            loadCollectionItems(cid);
            refreshCollectionsPanel();
          } catch (e) {
            showToast(e.message || t('error'), true);
          }
        });
      });
    } catch (e) {
      els.collectionItemsEl.innerHTML = `<li class="list-group-item small text-danger">${escapeHtml(t('collection_items_load_error'))}</li>`;
    }
  }

  function applyQuizVisualFeedback(selectedBtn) {
    if (!els.quizChoices) return;
    els.quizChoices.querySelectorAll('.answer-option').forEach((btn) => {
      const name = btn.getAttribute('data-name');
      const isCorrect = name === quizAnswerName;
      const isSelected = btn === selectedBtn;
      if (isCorrect) {
        btn.classList.add('correct-answer');
      } else {
        btn.classList.add('wrong-answer');
      }
      if (isSelected) {
        btn.classList.add('selected-answer');
      }
      btn.classList.add('disabled');
      btn.setAttribute('aria-disabled', 'true');
    });
  }

  async function startQuizRound() {
    if (!els.quizSilhouette || !els.quizChoices || !els.quizFeedback) return;
    els.quizFeedback.textContent = t('quiz_loading');
    quizShowChoiceSkeletons();
    try {
      const pending = quizPrefetchPromise;
      quizPrefetchPromise = null;
      let round = pending ? await pending : await fetchQuizRoundData();
      if (!round) {
        round = await fetchQuizRoundData();
      }
      renderQuizRound(round);
      prefetchNextQuizRound();
    } catch (e) {
      els.quizFeedback.textContent = t('quiz_start_failed');
      els.quizChoices.innerHTML = '';
    }
  }

  function updateListMeta(data) {
    if (!els.listMeta) return;
    if (state.searchActive && state.searchResponse) {
      const s = state.searchResponse;
      const more =
        s.total > s.itemsShown
          ? t('search_more', { shown: s.itemsShown, total: s.total })
          : '';
      els.listMeta.innerHTML = `<i class="bi bi-search" aria-hidden="true"></i> ${escapeHtml(
        t('search_meta', { query: String(s.query), total: s.total, more, scope: String(s.scope_label) })
      )}`;
      return;
    }
    const d = data || state.lastListMeta || {};
    state.lastListMeta = d;
    const regLabel = d.region_label ? String(d.region_label) : t('national_dex');
    const countLabel =
      state.total > 0 ? t('catalog_pokemon_count', { total: state.total }) : t('list_page');
    const typeExtra = d.type_label ? ` · Tipo: ${escapeHtml(String(d.type_label))}` : '';
    els.listMeta.innerHTML = `<i class="bi bi-bookmarks-fill" aria-hidden="true"></i> Pág. ${state.page}/${
      state.totalPages
    } · ${escapeHtml(regLabel)} · ${escapeHtml(countLabel)}${typeExtra}`;
  }

  function applyPaginationPageInput(pageInput, totalPages, currentPage) {
    let n = parseInt(String(pageInput.value).trim(), 10);
    if (!Number.isFinite(n)) {
      pageInput.value = String(currentPage);
      return;
    }
    n = Math.min(Math.max(1, n), totalPages);
    pageInput.value = String(n);
    if (n !== currentPage) {
      loadListPage(n);
    }
  }

  function renderPagination() {
    if (!els.paginationNav) return;
    const totalPages = Math.max(1, state.totalPages);
    const page = Math.min(Math.max(1, state.page), totalPages);
    state.page = page;

    const firstDisabled = page <= 1 ? 'disabled' : '';
    const prevDisabled = page <= 1 ? 'disabled' : '';
    const nextDisabled = page >= totalPages ? 'disabled' : '';
    const lastDisabled = page >= totalPages ? 'disabled' : '';
    const prevPage = page - 1;
    const nextPage = page + 1;

    const html = `
      <ul class="pagination pagination-pokedex flex-wrap justify-content-center align-items-center gap-1 mb-0" role="navigation" aria-label="Paginação do catálogo">
        <li class="page-item ${firstDisabled}">
          <a class="page-link d-inline-flex align-items-center justify-content-center px-2" href="#" data-nav-page="1" title="Primeira página" aria-label="Primeira página" ${firstDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></a>
        </li>
        <li class="page-item ${prevDisabled}">
          <a class="page-link d-inline-flex align-items-center gap-1" href="#" data-nav-page="${prevPage}" aria-label="Página anterior" ${prevDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}><i class="bi bi-chevron-left" aria-hidden="true"></i> Anterior</a>
        </li>
        <li class="page-item pagination-page-go">
          <div class="page-link border-0 bg-transparent d-flex align-items-center justify-content-center gap-1 py-1 px-2">
            <label for="paginationPageInput" class="visually-hidden">Ir para a página</label>
            <input type="number" inputmode="numeric" min="1" max="${totalPages}" class="form-control form-control-sm pagination-page-input" id="paginationPageInput" value="${page}" autocomplete="off" aria-label="Número da página" />
            <span class="text-secondary fw-semibold small text-nowrap" aria-hidden="true">/ ${totalPages}</span>
          </div>
        </li>
        <li class="page-item ${nextDisabled}">
          <a class="page-link d-inline-flex align-items-center gap-1" href="#" data-nav-page="${nextPage}" aria-label="Próxima página" ${nextDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}>Próximo <i class="bi bi-chevron-right" aria-hidden="true"></i></a>
        </li>
        <li class="page-item ${lastDisabled}">
          <a class="page-link d-inline-flex align-items-center justify-content-center px-2" href="#" data-nav-page="${totalPages}" title="Última página" aria-label="Última página" ${lastDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></a>
        </li>
      </ul>`;
    els.paginationNav.innerHTML = html;

    els.paginationNav.querySelectorAll('[data-nav-page]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const li = a.closest('.page-item');
        if (li && li.classList.contains('disabled')) return;
        const p = parseInt(a.getAttribute('data-nav-page'), 10);
        if (p >= 1 && p <= totalPages) loadListPage(p);
      });
    });

    const pageInput = document.getElementById('paginationPageInput');
    if (pageInput) {
      const apply = () => applyPaginationPageInput(pageInput, totalPages, page);
      pageInput.addEventListener('change', () => {
        clearTimeout(paginationInputDebounce);
        paginationInputDebounce = null;
        apply();
      });
      pageInput.addEventListener('input', () => {
        clearTimeout(paginationInputDebounce);
        paginationInputDebounce = setTimeout(() => {
          paginationInputDebounce = null;
          apply();
        }, 380);
      });
      pageInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        clearTimeout(paginationInputDebounce);
        paginationInputDebounce = null;
        apply();
      });
    }
  }

  function renderSearchToolbar() {
    if (!els.paginationNav) return;
    els.paginationNav.innerHTML = `
      <div class="text-center py-1">
        <button type="button" class="btn btn-sm btn-outline-light rounded-pill" id="btnClearSearch">
          <i class="bi bi-x-lg me-1" aria-hidden="true"></i>${escapeHtml(t('clear_search'))}
        </button>
      </div>`;
    const btn = document.getElementById('btnClearSearch');
    if (btn) {
      btn.addEventListener('click', () => {
        if (els.search) els.search.value = '';
        clearSearchAndReload();
      });
    }
  }

  async function clearSearchAndReload() {
    clearTimeout(searchDebounce);
    await loadListPage(1);
  }

  async function runGlobalSearch(rawQuery) {
    const q = (rawQuery || '').trim();
    if (!q) {
      await clearSearchAndReload();
      return;
    }
    if (q.length < 2 && !/^\d+$/.test(q)) {
      return;
    }
    const token = ++navToken;
    state.loading = true;
    showLoader(true);
    try {
      let url = API_BASE + 'search.php?q=' + encodeURIComponent(q) + '&limit=80';
      const region = els.regionFilter && els.regionFilter.value ? els.regionFilter.value.trim() : '';
      if (region) url += '&region=' + encodeURIComponent(region);
      const json = await fetchJson(url);
      if (token !== navToken) return;
      const d = json.data || {};
      const items = d.items || [];
      state.searchActive = true;
      const total = d.total != null ? parseInt(String(d.total), 10) : 0;
      state.searchResponse = {
        query: d.query != null ? String(d.query) : q,
        total,
        scope_label: d.scope_label != null ? String(d.scope_label) : '',
        itemsShown: items.length,
      };
      els.grid.innerHTML = items.length
        ? items.map(cardHtml).join('')
        : `<div class="col-12 py-5 text-center">
            <div class="fs-1 text-body-secondary mb-2" aria-hidden="true"><i class="bi bi-search"></i></div>
            <p class="text-secondary mb-0 fw-medium">${escapeHtml(t('search_no_results'))}</p>
            <p class="small text-muted mt-1 mb-0">${escapeHtml(t('search_try_other'))}</p>
          </div>`;
      updateListMeta();
      renderSearchToolbar();
      announceCatalog(t('search_announce', { count: items.length }));
      if (items.length && Card) Card.hydrateGrid(els.grid);
      window.scrollTo({ top: els.grid.offsetTop ? els.grid.offsetTop - 24 : 0, behavior: 'smooth' });
    } catch (e) {
      if (token === navToken) {
        showToast(e.message || t('search_failed'), true);
      }
    } finally {
      if (token === navToken) {
        state.loading = false;
        showLoader(false);
      }
    }
  }

  async function loadListPage(page) {
    const token = ++navToken;
    state.searchActive = false;
    state.searchResponse = null;
    state.loading = true;
    showLoader(true);
    if (els.grid) els.grid.innerHTML = skeletonGridHtml();
    try {
      const url = buildListUrl(page);
      const json = await fetchJson(url);
      if (token !== navToken) return;
      const d = json.data || {};
      const items = d.items || [];
      state.page = d.page != null ? parseInt(String(d.page), 10) : page;
      state.perPage = d.per_page != null ? parseInt(String(d.per_page), 10) : state.perPage;
      state.total = d.total != null ? parseInt(String(d.total), 10) : 0;
      state.totalPages = d.total_pages != null ? Math.max(1, parseInt(String(d.total_pages), 10)) : 1;

      els.grid.innerHTML = items.length
        ? items.map(cardHtml).join('')
        : `<div class="col-12 py-5 text-center">
            <div class="fs-1 text-body-secondary mb-2" aria-hidden="true"><i class="bi bi-inbox"></i></div>
            <p class="text-secondary mb-0 fw-medium">${escapeHtml(t('list_empty_page'))}</p>
            <p class="small text-muted mt-1 mb-0">${escapeHtml(t('list_empty_hint'))}</p>
          </div>`;

      updateListMeta(d);
      renderPagination();
      announceCatalog(
        t('list_announce', {
          page: state.page,
          totalPages: state.totalPages,
          count: items.length,
          totalHint: state.total ? t('list_total_hint', { total: state.total }) : '',
        })
      );
      prefetchListAdjacent();
      prefetchNextQuizRound();
      renderRegionProgress();
      if (items.length && Card) Card.hydrateGrid(els.grid);
      window.scrollTo({ top: els.grid.offsetTop ? els.grid.offsetTop - 24 : 0, behavior: 'smooth' });
    } catch (e) {
      if (token === navToken) {
        showToast(e.message || t('list_load_failed'), true);
      }
    } finally {
      if (token === navToken) {
        state.loading = false;
        showLoader(false);
      }
    }
  }

  async function openPokemon(identifier) {
    showLoader(true);
    try {
      const q = /^\d+$/.test(String(identifier).trim())
        ? 'id=' + encodeURIComponent(String(identifier).trim())
        : 'name=' + encodeURIComponent(String(identifier).trim().toLowerCase());
      const json = await fetchJson(API_BASE + 'pokemon.php?' + q);
      currentDetail = json.data;
      if (!Modal) {
        showToast(t('modules_load_failed'), true);
        return;
      }
      els.modalBody.innerHTML = Modal.renderDetail(currentDetail);
      Modal.wireModalInteractions(els.modalBody, currentDetail, {
        onOpenPokemon: openPokemon,
        onExportJson: function (detail) {
          if (!detail) return;
          const blob = new Blob([JSON.stringify(detail, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          const pid = detail.pokemon && detail.pokemon.id ? String(detail.pokemon.id) : 'pokemon';
          a.href = URL.createObjectURL(blob);
          a.download = 'pokemon-' + pid + '.json';
          a.click();
          URL.revokeObjectURL(a.href);
          showToast(t('export_json_done'));
        },
        onLoadCollections: loadCollectionSelectOptions,
        onAddToCollection: async function (sel, detail) {
          const cid = parseInt(String(sel.value), 10);
          if (!cid || !detail || !detail.pokemon) {
            showToast(t('collection_choose'), true);
            return;
          }
          const pid = parseInt(String(detail.pokemon.id), 10);
          const nome = String(detail.pokemon.name || '').trim();
          try {
            await fetchJson(API_BASE + 'collections.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'add', collection_id: cid, pokemon_id: pid, nome }),
            });
            showToast(t('collection_added'));
          } catch (e) {
            showToast(e.message || t('collection_add_failed'), true);
          }
        },
      });
      await syncFavoriteIdsFromApi();
      updateFavoriteButton();
      if (currentDetail && currentDetail.pokemon) {
        recordRecentView(currentDetail.pokemon);
        recordRegionSeen(currentDetail.pokemon.id);
        syncPokemonUrlQuery(currentDetail.pokemon.name || String(currentDetail.pokemon.id));
        bumpAchievement('views');
      }
      if (els.btnSharePokemon) els.btnSharePokemon.classList.remove('d-none');
      modal.show();
      refreshHistory();
    } catch (e) {
      showToast(e.message || t('pokemon_not_found'), true);
    } finally {
      showLoader(false);
    }
  }


  function onGridClick(e) {
    const moreBtn = e.target.closest('[data-card-more]');
    if (moreBtn) {
      e.preventDefault();
      e.stopPropagation();
      const name = moreBtn.getAttribute('data-pokemon-name');
      const id = moreBtn.getAttribute('data-pokemon-id');
      if (name || id) openPokemon(name || id);
      return;
    }
    const hit = e.target.closest('a.pokemon-card-hitarea');
    if (!hit) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const article = hit.closest('article.pokemon-card');
    const name = article ? article.getAttribute('data-name') : null;
    if (name) openPokemon(name);
  }

  function onGridKeydown(e) {
    const hit = e.target.closest('a.pokemon-card-hitarea');
    if (!hit) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const article = hit.closest('article.pokemon-card');
      const name = article ? article.getAttribute('data-name') : null;
      if (name) openPokemon(name);
    }
  }

  /** Busca global na API (debounce). */
  function onSearchInput() {
    if (!els.search) return;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      const raw = (els.search.value || '').trim();
      if (!raw) {
        clearSearchAndReload();
        return;
      }
      runGlobalSearch(raw);
    }, 420);
  }

  function onSearchKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = (els.search.value || '').trim();
      if (raw.length) openPokemon(raw);
    }
  }

  async function populateRegionFilter() {
    const sel = els.regionFilter;
    if (!sel) return;
    try {
      const json = await fetchJson(API_BASE + 'regions.php');
      const rows = json.data || [];
      sel.innerHTML = `<option value="">${escapeHtml(t('all_national'))}</option>`;
      rows.forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r.name;
        opt.textContent = r.label || r.name;
        sel.appendChild(opt);
      });
    } catch (e) {
      showToast(e.message || t('regions_load_failed'), true);
    }
  }

  async function syncFavoriteIdsFromApi() {
    try {
      const json = await fetchJson(API_BASE + 'favorites.php');
      if (json.db === false) {
        state.favoritePokemonIds = new Set();
        return;
      }
      const rows = json.data || [];
      state.favoritePokemonIds = new Set(rows.map((r) => parseInt(String(r.pokemon_id), 10)));
    } catch {
      /* mantém o Set anterior */
    }
  }

  async function refreshFavorites() {
    if (!els.favoritesList) return;
    try {
      const json = await fetchJson(API_BASE + 'favorites.php');
      if (json.db === false) {
        state.favoritePokemonIds = new Set();
        els.favoritesList.innerHTML =
          `<li class="list-group-item small text-muted">${escapeHtml(t('configure_db_favorites_short'))}</li>`;
        syncFavoriteButtonIfModalOpen();
        return;
      }
      const rows = json.data || [];
      state.favoritePokemonIds = new Set(rows.map((r) => parseInt(String(r.pokemon_id), 10)));
      if (!rows.length) {
        els.favoritesList.innerHTML = `<li class="list-group-item small text-muted">${escapeHtml(t('favorites_none'))}</li>`;
        syncFavoriteButtonIfModalOpen();
        return;
      }
      els.favoritesList.innerHTML = rows
        .map((r) => {
          const pid = parseInt(String(r.pokemon_id), 10);
          const thumb = pokemonSpriteUrl(pid);
          return `
        <li class="list-group-item favorite-row d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2 favorite-link-wrap flex-grow-1">
            <img class="favorite-thumb" src="${escapeHtml(thumb)}" width="40" height="40" alt="" loading="lazy"
              onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
            <a href="#" class="text-capitalize history-chip text-truncate" data-open="${escapeHtml(r.nome)}">#${r.pokemon_id} ${escapeHtml(r.nome)}</a>
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0" data-del-fav="${r.id}" aria-label="Remover favorito">&times;</button>
        </li>`;
        })
        .join('');
      els.favoritesList.querySelectorAll('[data-open]').forEach((a) => {
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          openPokemon(a.getAttribute('data-open'));
        });
      });
      els.favoritesList.querySelectorAll('[data-del-fav]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-del-fav');
          try {
            await fetchJson(API_BASE + 'favorites.php?id=' + encodeURIComponent(id), { method: 'DELETE' });
            await refreshFavorites();
          } catch (e) {
            showToast(e.message, true);
          }
        });
      });
      syncFavoriteButtonIfModalOpen();
    } catch (e) {
      els.favoritesList.innerHTML =
        `<li class="list-group-item small text-danger">${escapeHtml(t('favorites_load_error'))}</li>`;
    }
  }

  function syncFavoriteButtonIfModalOpen() {
    if (els.modalEl && els.modalEl.classList.contains('show')) {
      updateFavoriteButton();
    }
  }

  async function refreshHistory() {
    if (!els.historyList) return;
    try {
      const json = await fetchJson(API_BASE + 'history.php?limit=12');
      if (json.db === false) {
        els.historyList.innerHTML =
          `<li class="list-group-item small text-muted">${escapeHtml(t('history_db_required'))}</li>`;
        return;
      }
      const rows = json.data || [];
      if (!rows.length) {
        els.historyList.innerHTML = `<li class="list-group-item small text-muted">${escapeHtml(t('history_none'))}</li>`;
        return;
      }
      els.historyList.innerHTML = rows
        .map(
          (r) => `
        <li class="list-group-item py-2">
          <a href="#" class="small history-chip" data-open="${escapeHtml(r.termo)}">${escapeHtml(r.termo)}</a>
        </li>`
        )
        .join('');
      els.historyList.querySelectorAll('[data-open]').forEach((a) => {
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          els.search.value = a.getAttribute('data-open');
          openPokemon(a.getAttribute('data-open'));
        });
      });
    } catch {
      /* silencioso */
    }
  }

  function updateFavoriteButton() {
    if (!els.btnFav || !currentDetail) return;
    const id = currentDetail.pokemon.id;
    els.btnFav.dataset.pokemonId = String(id);
    els.btnFav.dataset.nome = currentDetail.pokemon.name;
    const isFav = state.favoritePokemonIds.has(id);
    els.btnFav.classList.toggle('is-favorited', isFav);
    const icon = els.btnFav.querySelector('i');
    if (icon) {
      icon.className = isFav ? 'bi bi-heart-fill' : 'bi bi-heart';
    }
    const label = isFav ? t('remove_favorite') : t('add_favorites');
    els.btnFav.setAttribute('title', label);
    els.btnFav.setAttribute('aria-label', label);
    els.btnFav.setAttribute('aria-pressed', isFav ? 'true' : 'false');
    const textSpan = els.btnFav.querySelector('.btn-favorite-label');
    if (textSpan) {
      textSpan.textContent = isFav ? t('remove') : t('favorited');
    }
  }

  async function toggleFavorite() {
    if (!els.btnFav || !currentDetail) return;
    const pokemonId = parseInt(els.btnFav.dataset.pokemonId, 10);
    const nome = els.btnFav.dataset.nome || '';
    const isFav = state.favoritePokemonIds.has(pokemonId);
    try {
      if (isFav) {
        await fetchJson(API_BASE + 'favorites.php?pokemon_id=' + encodeURIComponent(String(pokemonId)), {
          method: 'DELETE',
        });
        showToast(t('favorite_removed'));
      } else {
        await fetchJson(API_BASE + 'favorites.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pokemon_id: pokemonId, nome: nome }),
        });
        showToast(t('favorite_added'));
        playFavoriteBlip();
        bumpAchievement('favadd');
      }
      await refreshFavorites();
      updateFavoriteButton();
    } catch (e) {
      showToast(e.message || t('favorites_update_failed'), true);
    }
  }

  async function init() {
    if (typeof window.PokedexLangApply === 'function') {
      window.PokedexLangApply();
    }
    initThemeToggle();
    initSidebarDrawer();
    initModalLayerFix();
    initSoundToggle();
    renderRecentList();
    renderAchievements();
    applyDensityUi();
    initA11yFromStorage();
    renderRegionProgress();
    registerServiceWorkerSafe();
    bindGlobalShortcuts();

    if (els.modalEl) {
      els.modalEl.addEventListener('hidden.bs.modal', () => {
        clearPokemonUrlQuery();
        if (els.btnSharePokemon) els.btnSharePokemon.classList.add('d-none');
      });
    }

    els.grid.addEventListener('click', onGridClick);
    els.grid.addEventListener('keydown', onGridKeydown);
    if (els.search) {
      els.search.addEventListener('input', onSearchInput);
      els.search.addEventListener('keydown', onSearchKeydown);
    }
    if (els.regionFilter) {
      els.regionFilter.addEventListener('change', () => {
        syncTypeFilterEnabled();
        renderRegionProgress();
        const raw = (els.search && els.search.value ? els.search.value : '').trim();
        if (raw.length >= 2 || /^\d+$/.test(raw)) {
          runGlobalSearch(raw);
        } else {
          loadListPage(1);
        }
      });
    }
    if (els.btnDensity) {
      els.btnDensity.addEventListener('click', () => toggleDensity());
    }
    if (els.btnShortcuts && shortcutsModalBootstrap) {
      els.btnShortcuts.addEventListener('click', () => shortcutsModalBootstrap.show());
    }
    if (els.btnCollections && collectionsModalBootstrap) {
      els.btnCollections.addEventListener('click', () => {
        refreshCollectionsPanel();
        collectionsModalBootstrap.show();
      });
    }
    if (els.btnCreateCollection) {
      els.btnCreateCollection.addEventListener('click', async () => {
        const nome = (els.newCollectionName && els.newCollectionName.value.trim()) || '';
        if (!nome) {
          showToast(t('inform_name'), true);
          return;
        }
        try {
          const j = await fetchJson(API_BASE + 'collections.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', nome }),
          });
          if (els.newCollectionName) els.newCollectionName.value = '';
          showToast(t('collection_created'));
          refreshCollectionsPanel();
          const id = j.data && j.data.id != null ? j.data.id : null;
          if (id) loadCollectionItems(parseInt(String(id), 10));
        } catch (e) {
          showToast(e.message || t('error'), true);
        }
      });
    }
    if (els.btnQuiz && quizModalBootstrap) {
      els.btnQuiz.addEventListener('click', () => {
        if (!quizPrefetchPromise) prefetchNextQuizRound();
        startQuizRound();
        quizModalBootstrap.show();
      });
    }
    if (els.btnQuizNext) {
      els.btnQuizNext.addEventListener('click', () => startQuizRound());
    }
    if (els.btnA11y && a11yModalBootstrap) {
      els.btnA11y.addEventListener('click', () => a11yModalBootstrap.show());
    }
    if (els.btnFontSmaller) els.btnFontSmaller.addEventListener('click', () => setFontScale(-0.05));
    if (els.btnFontLarger) els.btnFontLarger.addEventListener('click', () => setFontScale(0.05));
    if (els.btnFontReset) els.btnFontReset.addEventListener('click', () => {
      try {
        localStorage.removeItem(LS_FONT_SCALE);
      } catch (e) {}
      document.documentElement.style.setProperty('--pk-font-scale', '1');
      showToast(t('font_default'));
    });
    if (els.btnToggleHc) els.btnToggleHc.addEventListener('click', () => toggleHighContrast());
    if (els.btnApplyFilters) {
      els.btnApplyFilters.addEventListener('click', () => loadListPage(1));
    }
    if (els.btnResetFilters) {
      els.btnResetFilters.addEventListener('click', () => {
        if (els.filterIdMin) els.filterIdMin.value = '';
        if (els.filterIdMax) els.filterIdMax.value = '';
        loadListPage(1);
      });
    }
    if (els.typeFilter) {
      els.typeFilter.addEventListener('change', () => {
        loadListPage(1);
      });
    }
    if (els.btnFav) {
      els.btnFav.addEventListener('click', toggleFavorite);
    }
    if (els.btnRandom) {
      els.btnRandom.addEventListener('click', () => openRandomPokemon());
    }
    if (els.btnSharePokemon) {
      els.btnSharePokemon.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast(t('link_copied'));
        } catch (e) {
          showToast(t('link_copy_failed'), true);
        }
      });
    }
    if (els.btnCompare) {
      els.btnCompare.addEventListener('click', () => {
        if (compareModalBootstrap) compareModalBootstrap.show();
      });
    }
    if (els.btnRunCompare) {
      els.btnRunCompare.addEventListener('click', () => runCompare());
    }
    if (els.btnExportFav) {
      els.btnExportFav.addEventListener('click', () => exportFavoritesJson());
    }
    if (els.importFavFile) {
      els.importFavFile.addEventListener('change', async (ev) => {
        const f = ev.target.files && ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        try {
          await importFavoritesFromFile(f);
        } catch (e) {
          showToast(e.message || t('import_invalid'), true);
        }
      });
    }

    await populateRegionFilter();
    syncTypeFilterEnabled();
    await loadListPage(1);
    refreshFavorites();
    refreshHistory();

    try {
      const u = new URL(window.location.href);
      const qp = (u.searchParams.get('pokemon') || '').trim();
      if (qp) openPokemon(qp);
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', init);
})();
