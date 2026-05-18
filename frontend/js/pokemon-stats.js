/**
 * Barras de status base e helpers visuais.
 */
(function (global) {
  'use strict';

  const Api = global.PokedexApi;
  const t =
    typeof global.PokedexT === 'function'
      ? global.PokedexT
      : function (k) {
          return (global.PokedexLang && global.PokedexLang[k]) || k;
        };

  const STAT_MAX = 255;

  function typeBadgeClass(type) {
    const map = {
      normal: 'text-bg-secondary',
      fire: 'text-bg-danger',
      water: 'text-bg-primary',
      grass: 'text-bg-success',
      electric: 'text-bg-warning',
      ice: 'text-bg-info',
      fighting: 'text-bg-dark',
      poison: 'text-bg-dark',
      ground: 'text-bg-warning',
      flying: 'text-bg-info',
      psychic: 'text-bg-info',
      bug: 'text-bg-success',
      rock: 'text-bg-secondary',
      ghost: 'text-bg-dark',
      dragon: 'text-bg-danger',
      dark: 'text-bg-dark',
      steel: 'text-bg-secondary',
      fairy: 'text-bg-danger',
    };
    return map[type] || 'text-bg-secondary';
  }

  function renderTypeBadges(types) {
    const esc = Api.escapeHtml;
    return (types || [])
      .map((tp) => {
        const slug = typeof tp === 'string' ? tp : tp.slug || '';
        const label = typeof tp === 'string' ? tp : tp.label || slug;
        return '<span class="badge type-badge ' + typeBadgeClass(slug) + '">' + esc(label) + '</span>';
      })
      .join('');
  }

  function statBarHtml(stat, opts) {
    const esc = Api.escapeHtml;
    const base = Math.max(0, parseInt(String(stat.base), 10) || 0);
    const pct = Math.min(100, Math.round((base / STAT_MAX) * 100));
    const high = base >= 100;
    const compact = opts && opts.compact;
    const label = stat.label || stat.id || '';
    const id = stat.id || '';
    const rowCls =
      'pk-stat-row' +
      (compact ? ' pk-stat-row--compact' : '') +
      (high ? ' pk-stat-row--high' : '');

    return (
      '<div class="' +
      rowCls +
      '" data-stat="' +
      esc(id) +
      '">' +
      '<div class="pk-stat-label">' +
      esc(label) +
      '</div>' +
      '<div class="pk-stat-track" role="presentation">' +
      '<div class="pk-stat-fill" style="--stat-pct:' +
      pct +
      '%"></div>' +
      '</div>' +
      '<div class="pk-stat-val">' +
      base +
      '</div>' +
      '</div>'
    );
  }

  function renderStatBars(stats, opts) {
    return (stats || []).map(function (s) {
      return statBarHtml(s, opts);
    }).join('');
  }

  function renderMiniStats(stats) {
    return '<div class="pk-stats-mini">' + renderStatBars(stats, { compact: true }) + '</div>';
  }

  function renderFullStatsTable(stats, total) {
    const esc = Api.escapeHtml;
    const bars = renderStatBars(stats);
    let totalLine = '';
    if (total != null) {
      totalLine =
        '<p class="pk-stats-total small text-muted mb-0 mt-2">' +
        esc(t('stats_total')) +
        ': <strong>' +
        esc(String(total)) +
        '</strong></p>';
    }
    return '<div class="pk-stats-panel">' + bars + totalLine + '</div>';
  }

  global.PokedexStats = {
    STAT_MAX: STAT_MAX,
    typeBadgeClass: typeBadgeClass,
    renderTypeBadges: renderTypeBadges,
    statBarHtml: statBarHtml,
    renderStatBars: renderStatBars,
    renderMiniStats: renderMiniStats,
    renderFullStatsTable: renderFullStatsTable,
  };
})(window);
