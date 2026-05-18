/**
 * Cards enriquecidos do catálogo com carregamento lazy.
 */
(function (global) {
  'use strict';

  const Api = global.PokedexApi;
  const Stats = global.PokedexStats;
  const t =
    typeof global.PokedexT === 'function'
      ? global.PokedexT
      : function (k, repl) {
          let s = (global.PokedexLang && global.PokedexLang[k]) || k;
          if (repl && typeof repl === 'object') {
            Object.keys(repl).forEach(function (rk) {
              s = String(s).replace(new RegExp('\\{' + rk + '\\}', 'g'), String(repl[rk]));
            });
          }
          return s;
        };

  function getCardTypeSlug(item) {
    if (item.types && item.types.length) {
      const t0 = item.types[0];
      return typeof t0 === 'string' ? t0 : t0.slug || '';
    }
    return '';
  }

  function formatHeightWeight(height, weight) {
    const h = (parseInt(String(height), 10) || 0) / 10;
    const w = (parseInt(String(weight), 10) || 0) / 10;
    return h.toFixed(1) + ' m · ' + w.toFixed(1) + ' kg';
  }

  function rarityBadgeHtml(rarity, label) {
    const esc = Api.escapeHtml;
    const slug = rarity || 'common';
    return (
      '<span class="card-rarity rarity-' +
      esc(slug) +
      '">' +
      esc(label || slug) +
      '</span>'
    );
  }

  function cardMetaSkeleton() {
    return (
      '<div class="card-meta card-meta--loading" data-card-meta>' +
      '<div class="card-meta-skeleton"><span></span><span></span><span></span></div>' +
      '</div>'
    );
  }

  function cardMetaHtml(summary) {
    const esc = Api.escapeHtml;
    if (!summary) return cardMetaSkeleton();

    const types = summary.types || [];
    const abilities = (summary.abilities || [])
      .map(function (a) {
        const lbl = esc(a.label || a.slug || '');
        const hid = a.is_hidden ? ' <em class="opacity-75">(' + esc(t('ability_hidden_short')) + ')</em>' : '';
        return '<span class="card-ability-chip">' + lbl + hid + '</span>';
      })
      .join('');

    const gen =
      summary.generation && summary.generation.label
        ? '<span class="card-gen">' + esc(summary.generation.label) + '</span>'
        : '';

    return (
      '<div class="card-meta" data-card-meta>' +
      '<div class="card-type-badges">' +
      Stats.renderTypeBadges(types) +
      '</div>' +
      '<div class="card-phys-row">' +
      formatHeightWeight(summary.height, summary.weight) +
      '</div>' +
      '<div class="card-meta-tags">' +
      rarityBadgeHtml(summary.rarity, summary.rarity_label) +
      gen +
      '</div>' +
      (abilities ? '<div class="card-abilities-mini">' + abilities + '</div>' : '') +
      Stats.renderMiniStats(summary.stats_mini || []) +
      '</div>'
    );
  }

  function cardHtml(item) {
    const esc = Api.escapeHtml;
    const name = esc(item.name);
    const num = String(item.id).padStart(4, '0');
    const rawName = String(item.name);
    const href = './?pokemon=' + encodeURIComponent(rawName);
    const typeSlug = getCardTypeSlug(item);
    const typeClass = typeSlug ? ' pokemon-card--type-' + esc(typeSlug) : '';

    return (
      '<div class="pokemon-grid-item" data-pokemon-id="' +
      esc(String(item.id)) +
      '">' +
      '<article class="card pokemon-card h-100' +
      typeClass +
      '" data-id="' +
      esc(String(item.id)) +
      '" data-name="' +
      name +
      '">' +
      '<a href="' +
      href +
      '" class="pokemon-card-hitarea text-decoration-none text-reset" tabindex="0" aria-label="' +
      esc(t('card_open_aria', { name: item.name })) +
      '">' +
      '<div class="card-img-wrap">' +
      '<img src="' +
      esc(item.image) +
      '" class="card-img-top" alt="' +
      esc(t('card_img_alt', { name: item.name })) +
      '" loading="lazy" onerror="this.onerror=null;this.src=\'' +
      esc(Api.pokemonSpriteUrl(item.id)) +
      '\'">' +
      '</div>' +
      '<div class="card-body">' +
      '<div class="poke-number">#' +
      num +
      '</div>' +
      '<div class="poke-name text-capitalize">' +
      name +
      '</div>' +
      cardMetaSkeleton() +
      '</div>' +
      '</a>' +
      '<button type="button" class="btn btn-card-more" data-card-more data-pokemon-id="' +
      esc(String(item.id)) +
      '" data-pokemon-name="' +
      name +
      '">' +
      '<i class="bi bi-info-circle" aria-hidden="true"></i> ' +
      esc(t('card_more_btn')) +
      '</button>' +
      '</article>' +
      '</div>'
    );
  }

  function applySummaryToCard(article, summary) {
    if (!article || !summary) return;
    const typeSlug = getCardTypeSlug(summary);
    article.className =
      'card pokemon-card h-100' + (typeSlug ? ' pokemon-card--type-' + typeSlug : '');
    const meta = article.querySelector('[data-card-meta]');
    if (meta) {
      const wrap = document.createElement('div');
      wrap.innerHTML = cardMetaHtml(summary);
      meta.replaceWith(wrap.firstElementChild || wrap);
    }
    const nameEl = article.querySelector('.poke-name');
    if (nameEl && summary.name_display) {
      nameEl.textContent = summary.name_display;
    }
  }

  let cardObserver = null;

  async function hydrateArticles(articles) {
    const ids = [];
    const list = [];
    articles.forEach(function (a) {
      if (a.dataset.cardHydrated === '1') return;
      const id = parseInt(a.getAttribute('data-id'), 10);
      if (Number.isFinite(id) && id > 0) {
        ids.push(id);
        list.push(a);
      }
    });
    if (!ids.length) return;

    try {
      const map = await Api.fetchCardSummaries(ids);
      list.forEach(function (article) {
        const id = parseInt(article.getAttribute('data-id'), 10);
        if (map[id]) {
          applySummaryToCard(article, map[id]);
          article.dataset.cardHydrated = '1';
        }
      });
    } catch (e) {
      list.forEach(function (article) {
        const meta = article.querySelector('[data-card-meta]');
        if (meta) meta.classList.remove('card-meta--loading');
      });
    }
  }

  async function hydrateGrid(gridEl) {
    if (!gridEl) return;
    const articles = gridEl.querySelectorAll('article.pokemon-card[data-id]');
    if (!articles.length) return;

    if (cardObserver) {
      cardObserver.disconnect();
      cardObserver = null;
    }

    if (typeof IntersectionObserver === 'undefined') {
      await hydrateArticles(articles);
      return;
    }

    cardObserver = new IntersectionObserver(
      function (entries) {
        const pending = [];
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const article = entry.target;
          cardObserver.unobserve(article);
          pending.push(article);
        });
        if (pending.length) hydrateArticles(pending);
      },
      { root: null, rootMargin: '120px', threshold: 0.05 }
    );

    articles.forEach(function (article) {
      if (article.dataset.cardHydrated === '1') return;
      cardObserver.observe(article);
    });

    const visible = [];
    articles.forEach(function (article) {
      if (article.dataset.cardHydrated === '1') return;
      const r = article.getBoundingClientRect();
      if (r.top < window.innerHeight + 120 && r.bottom > -120) visible.push(article);
    });
    if (visible.length) await hydrateArticles(visible);
  }

  function resetHydration(gridEl) {
    if (!gridEl) return;
    gridEl.querySelectorAll('article.pokemon-card[data-id]').forEach(function (article) {
      delete article.dataset.cardHydrated;
    });
  }

  if (global.addEventListener) {
    global.addEventListener('pokedex:localechange', function () {
      const grid = document.getElementById('pokemonGrid');
      if (grid) {
        resetHydration(grid);
        hydrateGrid(grid);
      }
    });
  }

  global.PokedexCard = {
    cardHtml: cardHtml,
    hydrateGrid: hydrateGrid,
    resetHydration: resetHydration,
    getCardTypeSlug: getCardTypeSlug,
    applySummaryToCard: applySummaryToCard,
  };
})(window);
