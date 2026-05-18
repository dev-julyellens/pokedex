/**
 * Renderização da cadeia evolutiva.
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

  function renderEvolutionStages(stages) {
    const esc = Api.escapeHtml;
    if (!stages || !stages.length) {
      return '<p class="text-muted small mb-0">' + esc(t('evolutions_none')) + '</p>';
    }
    const parts = [];
    for (let gi = 0; gi < stages.length; gi++) {
      const group = stages[gi];
      const cards = group
        .map(function (spec) {
          const sid = spec.species_id || 0;
          const img = Api.officialArtUrl(sid);
          return (
            '<button type="button" class="card evolution-card border-0" data-open-name="' +
            esc(spec.name) +
            '">' +
            '<img src="' +
            esc(img) +
            '" class="card-img-top" alt="' +
            esc(spec.display_name || spec.name) +
            '" loading="lazy" onerror="this.onerror=null;this.src=\'' +
            esc(Api.pokemonSpriteUrl(sid)) +
            '\'">' +
            '<div class="card-body p-2 text-center">' +
            '<span class="small fw-semibold">' +
            esc(spec.display_name || spec.name) +
            '</span>' +
            '</div>' +
            '</button>'
          );
        })
        .join('');
      parts.push('<div class="evolution-stage-row">' + cards + '</div>');
      if (gi < stages.length - 1) {
        parts.push(
          '<div class="evolution-arrow" role="presentation" aria-hidden="true"><i class="bi bi-chevron-down"></i></div>'
        );
      }
    }
    return '<div class="evolution-flow evolution-flow-vertical">' + parts.join('') + '</div>';
  }

  global.PokedexEvolution = {
    renderEvolutionStages: renderEvolutionStages,
  };
})(window);
