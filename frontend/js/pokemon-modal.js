/**
 * Modal premium com abas para detalhe completo do Pokémon.
 */
(function (global) {
  'use strict';

  const Api = global.PokedexApi;
  const Stats = global.PokedexStats;
  const Evo = global.PokedexEvolution;
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

  function matchupSection(title, items) {
    const esc = Api.escapeHtml;
    if (!items || !items.length) {
      return '';
    }
    const badges = items
      .map(function (x) {
        return '<span class="badge type-badge ' + Stats.typeBadgeClass(x.slug) + ' me-1 mb-1">' + esc(x.label) + '</span>';
      })
      .join('');
    return (
      '<div class="matchup-block mb-2">' +
      '<div class="small fw-semibold matchup-label mb-1">' +
      esc(title) +
      '</div>' +
      '<div class="d-flex flex-wrap">' +
      badges +
      '</div>' +
      '</div>'
    );
  }

  function renderTabAbout(p, data) {
    const esc = Api.escapeHtml;
    const h = (parseInt(String(p.height), 10) || 0) / 10;
    const w = (parseInt(String(p.weight), 10) || 0) / 10;
    const titleName = p.name_display || p.name;
    const genusHtml = p.genus ? '<p class="pk-genus small mb-2">' + esc(p.genus) + '</p>' : '';
    const gen =
      p.generation && p.generation.label
        ? '<span class="badge bg-secondary me-1">' + esc(p.generation.label) + '</span>'
        : '';
    const rarity =
      p.rarity_label ? '<span class="badge rarity-' + esc(p.rarity || 'common') + '">' + esc(p.rarity_label) + '</span>' : '';

    const bio = [];
    if (p.color_label) bio.push(t('bio_color') + ': <strong>' + esc(p.color_label) + '</strong>');
    if (p.shape_label) bio.push(t('bio_shape') + ': <strong>' + esc(p.shape_label) + '</strong>');
    if (p.habitat_label) bio.push(t('bio_habitat') + ': <strong>' + esc(p.habitat_label) + '</strong>');
    if (p.gender_label) bio.push(t('bio_gender') + ': <strong>' + esc(p.gender_label) + '</strong>');
    if (p.capture_rate != null) bio.push(t('bio_capture') + ': <strong>' + esc(String(p.capture_rate)) + '</strong>');
    if (p.base_happiness != null) bio.push(t('bio_happiness') + ': <strong>' + esc(String(p.base_happiness)) + '</strong>');
    if (p.base_experience != null) bio.push(t('bio_exp') + ': <strong>' + esc(String(p.base_experience)) + '</strong>');

    const matchups = p.type_matchups || {};
    const matchupHtml =
      matchupSection(t('type_weak'), matchups.weak_to) +
      matchupSection(t('type_resist'), matchups.resistant_to) +
      matchupSection(t('type_immune'), matchups.immune_to);

    let metaHtml = '';
    const meta = data.meta;
    if (meta && (meta.detail_cached_at != null || meta.detail_source)) {
      const src = meta.detail_source === 'database' ? t('meta_cache_db') : t('meta_cache_api');
      const cachedAt = meta.detail_cached_at != null ? esc(String(meta.detail_cached_at)) : t('empty_dash');
      metaHtml =
        '<p class="small pokedex-meta-line mb-2" role="note"><i class="bi bi-info-circle me-1"></i>' +
        esc(src) +
        '. <time datetime="' +
        cachedAt +
        '">' +
        cachedAt +
        '</time> · <button type="button" class="btn btn-link btn-sm p-0 align-baseline" id="btnExportDetailJson">' +
        esc(t('export_json')) +
        '</button></p>';
    }

    const collectionBar =
      '<div class="detail-collection-bar d-flex flex-wrap gap-2 align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">' +
      '<span class="small text-theme-muted mb-0">' +
      esc(t('collection_label')) +
      '</span>' +
      '<select id="detailCollectionSelect" class="form-select form-select-sm" style="max-width:14rem" aria-label="' +
      esc(t('collection_select_aria')) +
      '"></select>' +
      '<button type="button" class="btn btn-sm btn-primary" id="btnDetailAddToCollection">' +
      esc(t('collection_add_btn')) +
      '</button>' +
      '</div>';

    return (
      collectionBar +
      metaHtml +
      '<h4 class="mb-1">' +
      esc(titleName) +
      ' <span class="pk-detail-id fs-6">#' +
      String(p.id).padStart(4, '0') +
      '</span></h4>' +
      genusHtml +
      '<div class="mb-2 d-flex flex-wrap gap-1">' +
      gen +
      rarity +
      '</div>' +
      '<p class="mb-2"><strong>' +
      esc(t('height_weight')) +
      ':</strong> ' +
      h +
      ' m · ' +
      w +
      ' kg</p>' +
      (bio.length ? '<p class="small bio-grid mb-3">' + bio.join(' · ') + '</p>' : '') +
      '<h6 class="mt-2">' +
      esc(t('type_matchups_heading')) +
      '</h6>' +
      matchupHtml
    );
  }

  function renderTabStats(p) {
    return '<h6 class="mb-3">' + Api.escapeHtml(t('stats_heading')) + '</h6>' + Stats.renderFullStatsTable(p.stats, p.stats_total);
  }

  function renderTabAbilities(p) {
    const esc = Api.escapeHtml;
    const abilities = (p.abilities || [])
      .map(function (a, idx) {
        const label = a.label || a.slug || '';
        const hidden = a.is_hidden
          ? ' <span class="badge bg-secondary">' + esc(t('ability_hidden')) + '</span>'
          : '';
        const desc = a.description
          ? '<p class="small ability-desc mb-0 mt-1">' + esc(a.description) + '</p>'
          : '';
        const collapseId = 'abilityDesc' + idx;
        if (!desc) {
          return (
            '<li class="list-group-item d-flex justify-content-between align-items-center">' +
            esc(label) +
            hidden +
            '</li>'
          );
        }
        return (
          '<li class="list-group-item">' +
          '<button class="btn btn-link btn-sm p-0 text-start w-100 ability-accordion-btn" type="button" data-bs-toggle="collapse" data-bs-target="#' +
          collapseId +
          '" aria-expanded="false">' +
          '<span class="fw-semibold">' +
          esc(label) +
          '</span>' +
          hidden +
          '</button>' +
          '<div class="collapse" id="' +
          collapseId +
          '">' +
          desc +
          '</div>' +
          '</li>'
        );
      })
      .join('');
    let evHtml = '';
    if (p.ev_yield && p.ev_yield.length) {
      evHtml =
        '<h6 class="mt-4 mb-2">' +
        esc(t('ev_yield_heading')) +
        '</h6><ul class="list-group list-group-flush small">' +
        p.ev_yield
          .map(function (e) {
            return '<li class="list-group-item">' + esc(e.label) + ': +' + esc(String(e.effort)) + '</li>';
          })
          .join('') +
        '</ul>';
    }
    let movesHtml = '';
    if (p.moves_sample && p.moves_sample.length) {
      movesHtml =
        '<h6 class="mt-4 mb-2">' +
        esc(t('moves_sample_heading')) +
        '</h6><ul class="list-group list-group-flush small">' +
        p.moves_sample
          .map(function (m) {
            return (
              '<li class="list-group-item d-flex justify-content-between"><span class="text-capitalize">' +
              esc(m.label || m.name || '') +
              '</span><span class="text-theme-muted">Lv ' +
              esc(String(m.level)) +
              '</span></li>'
            );
          })
          .join('') +
        '</ul>';
    }
    return (
      '<ul class="list-group list-group-flush">' +
      (abilities || '<li class="list-group-item pk-empty-hint">-</li>') +
      '</ul>' +
      evHtml +
      movesHtml
    );
  }

  function renderTabLore(p) {
    const esc = Api.escapeHtml;
    if (!p.flavor_text) {
      return '<p class="pk-empty-hint small mb-0">' + esc(t('lore_empty')) + '</p>';
    }
    const langNote =
      p.flavor_language && !String(p.flavor_language).startsWith('pt')
        ? '<span class="lore-lang-note small"> (' + esc(t('flavor_lang_note', { lang: p.flavor_language })) + ')</span>'
        : '';
    return (
      '<p class="lore-text fst-italic border-start border-3 ps-3 mb-1">' + esc(p.flavor_text) + '</p>' + langNote
    );
  }

  function renderTabEvolutions(data) {
    return (
      '<h6 class="mb-3">' +
      Api.escapeHtml(t('evolutions')) +
      '</h6>' +
      Evo.renderEvolutionStages(data.evolution_stages)
    );
  }

  function renderDetail(data) {
    const p = data.pokemon;
    const sprites = p.sprites || {};
    const front = sprites.front || Api.pokemonSpriteUrl(p.id);
    const shiny = sprites.front_shiny || front;
    const official = sprites.official || p.image || Api.officialArtUrl(p.id);
    const esc = Api.escapeHtml;

    return (
      '<div class="pk-detail-shell" data-pokemon-id="' +
      esc(String(p.id)) +
      '">' +
      '<div class="row g-3 mb-3">' +
      '<div class="col-md-5 text-center">' +
      '<div class="pk-sprite-stage mb-2">' +
      '<img src="' +
      esc(official) +
      '" class="img-fluid modal-pokemon-img pk-sprite-official" alt="' +
      esc(p.name_display || p.name) +
      '" data-sprite-official onerror="this.onerror=null;this.src=\'' +
      esc(Api.pokemonSpriteUrl(p.id)) +
      '\'">' +
      '<img src="' +
      esc(front) +
      '" class="img-fluid pk-sprite-alt d-none" alt="" data-sprite-normal>' +
      '<img src="' +
      esc(shiny) +
      '" class="img-fluid pk-sprite-alt d-none" alt="" data-sprite-shiny>' +
      '</div>' +
      '<div class="btn-group btn-group-sm mb-2 pk-sprite-toggle" role="group" aria-label="' +
      esc(t('sprite_toggle_aria')) +
      '">' +
      '<button type="button" class="btn btn-outline-secondary active" data-sprite-mode="official">' +
      esc(t('sprite_official')) +
      '</button>' +
      '<button type="button" class="btn btn-outline-secondary" data-sprite-mode="normal">' +
      esc(t('sprite_normal')) +
      '</button>' +
      '<button type="button" class="btn btn-outline-secondary" data-sprite-mode="shiny">' +
      esc(t('sprite_shiny')) +
      '</button>' +
      '</div>' +
      '<div>' +
      Stats.renderTypeBadges(p.types) +
      '</div>' +
      '</div>' +
      '<div class="col-md-7">' +
      '<ul class="nav nav-tabs pk-detail-tabs" role="tablist">' +
      '<li class="nav-item" role="presentation"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#pkTabAbout" type="button" role="tab">' +
      esc(t('tab_about')) +
      '</button></li>' +
      '<li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#pkTabStats" type="button" role="tab">' +
      esc(t('tab_stats')) +
      '</button></li>' +
      '<li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#pkTabAbilities" type="button" role="tab">' +
      esc(t('tab_abilities')) +
      '</button></li>' +
      '<li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#pkTabEvo" type="button" role="tab">' +
      esc(t('tab_evolutions')) +
      '</button></li>' +
      '<li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#pkTabLore" type="button" role="tab">' +
      esc(t('tab_lore')) +
      '</button></li>' +
      '</ul>' +
      '<div class="tab-content pk-tab-panels pt-3">' +
      '<div class="tab-pane fade show active" id="pkTabAbout" role="tabpanel">' +
      renderTabAbout(p, data) +
      '</div>' +
      '<div class="tab-pane fade" id="pkTabStats" role="tabpanel">' +
      renderTabStats(p) +
      '</div>' +
      '<div class="tab-pane fade" id="pkTabAbilities" role="tabpanel">' +
      renderTabAbilities(p) +
      '</div>' +
      '<div class="tab-pane fade" id="pkTabEvo" role="tabpanel">' +
      renderTabEvolutions(data) +
      '</div>' +
      '<div class="tab-pane fade" id="pkTabLore" role="tabpanel">' +
      renderTabLore(p) +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function wireSpriteToggle(modalBody) {
    if (!modalBody) return;
    const official = modalBody.querySelector('[data-sprite-official]');
    const normal = modalBody.querySelector('[data-sprite-normal]');
    const shiny = modalBody.querySelector('[data-sprite-shiny]');
    modalBody.querySelectorAll('[data-sprite-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        modalBody.querySelectorAll('[data-sprite-mode]').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        const mode = btn.getAttribute('data-sprite-mode');
        if (official) official.classList.toggle('d-none', mode !== 'official');
        if (normal) normal.classList.toggle('d-none', mode !== 'normal');
        if (shiny) shiny.classList.toggle('d-none', mode !== 'shiny');
      });
    });
  }

  function wireModalInteractions(modalBody, currentDetail, hooks) {
    if (!modalBody) return;
    wireSpriteToggle(modalBody);
    modalBody.querySelectorAll('[data-open-name]').forEach(function (node) {
      node.addEventListener('click', function () {
        const n = node.getAttribute('data-open-name');
        if (n && hooks && hooks.onOpenPokemon) hooks.onOpenPokemon(n);
      });
    });
    const ex = modalBody.querySelector('#btnExportDetailJson');
    if (ex && hooks && hooks.onExportJson) {
      ex.addEventListener('click', function () {
        hooks.onExportJson(currentDetail);
      });
    }
    const sel = modalBody.querySelector('#detailCollectionSelect');
    const addB = modalBody.querySelector('#btnDetailAddToCollection');
    if (sel && addB && hooks && hooks.onLoadCollections && hooks.onAddToCollection) {
      hooks.onLoadCollections(sel);
      addB.addEventListener('click', function () {
        hooks.onAddToCollection(sel, currentDetail);
      });
    }
  }

  global.PokedexModal = {
    renderDetail: renderDetail,
    wireModalInteractions: wireModalInteractions,
  };
})(window);
