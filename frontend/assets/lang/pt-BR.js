/**
 * Textos da interface Pokédex (pt-BR).
 * Carregado antes de app.js; expõe window.PokedexLang.
 */
(function (global) {
  'use strict';

  const strings = {
  // Geral
  loading: 'Carregando…',
  loading_pokedex: 'Carregando sua Pokédex…',
  close: 'Fechar',
  error: 'Erro',
  empty_dash: '—',

  // Som e tema
  sound_on: 'Som ativado',
  sound_off: 'Som desativado',
  high_contrast_on: 'Alto contraste ativado',
  high_contrast_off: 'Alto contraste desativado',

  // Favoritos
  configure_db_favorites: 'Configure o banco de dados para usar favoritos.',
  configure_db_favorites_short: 'Configure o banco de dados para favoritos.',
  export_done: 'Exportação concluída.',
  export_failed: 'Falha ao exportar',
  import_done: 'Importados {count} favorito(s).',
  import_none: 'Nenhum favorito novo importado.',
  import_invalid: 'Importação inválida',
  favorites_none: 'Nenhum favorito.',
  favorites_load_error: 'Erro ao carregar favoritos.',
  favorite_removed: 'Removido dos favoritos.',
  favorite_added: 'Adicionado aos favoritos!',
  favorites_update_failed: 'Não foi possível atualizar favoritos.',
  remove_favorite: 'Remover favorito',
  add_favorites: 'Adicionar aos favoritos',
  favorited: 'Favoritar',
  remove: 'Remover',

  // Recentes e conquistas
  recent_empty: 'Abra um Pokémon para preencher.',
  achievement_view_1: 'Ver 1 detalhe',
  achievement_view_5: 'Ver 5 detalhes',
  achievement_view_25: 'Ver 25 detalhes',
  achievement_fav_1: '1 favorito adicionado',
  achievement_fav_5: '5 favoritos',
  achievement_quiz_1: 'Acertar 1 quiz',
  achievement_quiz_10: 'Acertar 10 quizzes',

  // Comparador
  compare_inform_both: 'Informe os dois Pokémon.',
  compare_incomplete: 'Resposta incompleta',
  compare_stat_sum: 'Soma das stats base',
  compare_table_label: 'Comparação de stats base',
  compare_bst: 'Total (BST)',
  compare_hint: 'Informe dois Pokémon e clique em Comparar.',

  // Rede / API
  network_failure: 'Falha de rede',
  request_error: 'Erro na requisição',
  invalid_json: 'JSON inválido',
  no_data: 'Sem dados',

  // Densidade e fonte
  density_changed: 'Densidade da lista alterada.',
  density_compact: 'Visualização compacta',
  density_comfortable: 'Visualização confortável',
  font_adjusted: 'Tamanho do texto ajustado.',
  font_default: 'Texto no tamanho padrão.',

  // Progresso
  progress_species: '{label}: {count} espécies únicas abertas nos detalhes{extra}',
  progress_national: 'Pokédex nacional',
  progress_list_current: 'lista atual: {total} entradas',
  pagination_go_page: 'Ir para a página',
  compare_hint_default: 'Informe dois Pokémon e clique em Comparar.',

  // Quiz
  quiz_question: 'Quem é este Pokémon?',
  quiz_loading: 'Carregando…',
  quiz_correct: 'Correto!',
  quiz_wrong: 'Errado — era {name}',
  quiz_start_failed: 'Não foi possível iniciar o quiz.',

  // Coleções
  collection_option: '— Coleção —',
  collections_unavailable: 'Coleções indisponíveis',
  collections_none: 'Nenhuma coleção. Crie uma acima.',
  collection_delete_title: 'Excluir coleção',
  collection_delete_confirm: 'Excluir esta coleção?',
  collection_removed: 'Coleção removida.',
  collections_db_missing: 'Banco de dados indisponível ou tabelas ausentes.',
  collection_items_empty: 'Vazio.',
  collection_items_load_error: 'Erro ao carregar itens.',
  collection_choose: 'Escolha uma coleção.',
  collection_added: 'Adicionado à coleção.',
  collection_add_failed: 'Não foi possível adicionar',
  collection_created: 'Coleção criada.',
  collection_label: 'Coleção',
  collection_select_aria: 'Escolher coleção',
  collection_add_btn: 'Adicionar à coleção',
  inform_name: 'Informe um nome.',

  // Lista e busca
  search_meta: 'Busca “{query}” · {total} resultado(s){more} · {scope}',
  search_more: ' · mostrando {shown} de {total} (limite da busca)',
  list_meta: 'Pág. {page}/{totalPages} · {total} Pokémon · {region}',
  list_page: 'Página {page}',
  national_dex: 'Pokédex Nacional',
  pagination_label: 'Paginação do catálogo',
  first_page: 'Primeira página',
  prev_page: 'Página anterior',
  previous: 'Anterior',
  page_number: 'Número da página',
  next_page: 'Próxima página',
  next: 'Próximo',
  last_page: 'Última página',
  clear_search: 'Limpar busca',
  search_no_results: 'Nenhum Pokémon encontrado para esse termo.',
  search_try_other: 'Tente outro nome, ID ou limpe a busca.',
  search_announce: 'Busca: {count} resultado(s) para o termo atual.',
  search_failed: 'Falha na busca',
  list_empty_page: 'Nenhum Pokémon nesta página.',
  list_empty_hint: 'Tente outra página ou outro filtro de região.',
  list_announce: 'Página {page} de {totalPages}. {count} Pokémon na grade{totalHint}.',
  list_total_hint: ' de {total} no filtro',
  list_load_failed: 'Falha ao carregar lista',
  catalog_pokemon_count: '{total} Pokémon',

  // Detalhe
  pokemon_not_found: 'Pokémon não encontrado',
  evolutions_none: 'Este Pokémon não possui evoluções registradas na cadeia padrão.',
  ability_hidden: 'Oculta',
  pokedex_heading: 'Pokédex',
  flavor_lang_note: ' (texto da Pokédex: {lang})',
  stats_heading: 'Status base',
  trivia_heading: 'Curiosidades',
  habitat: 'Habitat típico: {label}',
  capture_rate: 'Taxa de captura: {rate} (255 = mais difícil)',
  happiness: 'Felicidade base: {value}',
  badge_baby: 'Bebê',
  badge_legendary: 'Lendário',
  badge_mythical: 'Mítico',
  meta_cache_db: 'Cache no banco de dados',
  meta_cache_api: 'Obtidos agora (API)',
  export_json: 'Exportar JSON',
  export_json_done: 'Arquivo JSON gerado.',
  height: 'Altura:',
  weight: 'Peso:',
  abilities: 'Habilidades',
  evolutions: 'Evoluções',
  details: 'Detalhes',
  card_view_details: 'Ver detalhes de {name}',

  // Regiões e histórico
  regions_load_failed: 'Não foi possível carregar regiões.',
  all_national: 'Todas — Pokédex Nacional',
  history_db_required: 'Histórico requer banco de dados configurado.',
  history_none: 'Sem buscas ainda.',

  // Link
  link_copied: 'Link copiado para a área de transferência.',
  link_copy_failed: 'Não foi possível copiar o link.',

  // HTML estático (data-i18n)
  html_search_label: 'Buscar Pokémon',
  html_search_placeholder: 'Nome ou número (ex: pikachu, 25)',
  html_search_help: 'Busca em toda a Pokédex (ou só na região selecionada) ·',
  html_search_help_focus: 'foca a busca',
  html_search_help_enter: 'abre os detalhes',
  html_btn_theme: 'Tema',
  html_btn_sound: 'Som',
  html_btn_random: 'Surpreenda-me',
  html_btn_link: 'Link',
  html_btn_compare: 'Comparar',
  html_btn_favorites: 'Favoritos',
  html_btn_import: 'Importar',
  html_btn_density: 'Visualização',
  html_btn_shortcuts: 'Atalhos',
  html_btn_collections: 'Coleções',
  html_btn_quiz: 'Quiz',
  html_btn_a11y: 'A11y',
  html_title_theme: 'Alternar tema',
  html_title_sound: 'Som ao favoritar',
  html_title_random: 'Pokémon aleatório',
  html_title_share: 'Copiar link deste Pokémon',
  html_title_compare: 'Comparar dois Pokémon',
  html_title_export_fav: 'Exportar favoritos JSON',
  html_title_import_fav: 'Importar favoritos (JSON)',
  html_title_density: 'Alternar visualização compacta',
  html_title_shortcuts: 'Atalhos de teclado',
  html_title_collections: 'Coleções salvas',
  html_title_quiz: 'Quiz silhueta',
  html_title_a11y: 'Acessibilidade (contraste e texto)',
  html_sidebar_favorites: 'Favoritos',
  html_sidebar_recent: 'Vistos recentemente',
  html_sidebar_achievements: 'Conquistas',
  html_sidebar_progress: 'Progresso',
  html_progress_hint: 'Abra detalhes de Pokémon para contar o progresso nesta visualização.',
  html_history_show: 'Mostrar buscas recentes',
  html_history_hide: 'Ocultar buscas recentes',
  html_catalog: 'Catálogo',
  html_region: 'Região',
  html_type: 'Tipo',
  html_all_types: 'Todos os tipos',
  html_filter_hint: 'Filtro por tipo só na Pokédex Nacional. Kalos reúne várias Pokédexes regionais.',
  html_advanced_filters: 'Filtros avançados (intervalo de nº)',
  html_id_min: 'Nº mín.',
  html_id_max: 'Nº máx.',
  html_apply: 'Aplicar',
  html_clear: 'Limpar',
  html_filter_apply_hint: 'Aplica-se à lista atual (nacional, tipo ou região).',
  html_footer: 'Pokédex educacional · Dados',
  html_compare_title: 'Comparar Pokémon',
  html_compare_a: 'Pokémon A',
  html_compare_b: 'Pokémon B',
  html_compare_btn: 'Comparar',
  html_shortcuts_title: 'Atalhos de teclado',
  html_a11y_title: 'Acessibilidade',
  html_a11y_motion: 'Respeitamos prefers-reduced-motion do sistema para animações leves.',
  html_font_size: 'Tamanho do texto',
  html_font_smaller: 'Diminuir',
  html_font_default: 'Padrão',
  html_font_larger: 'Aumentar',
  html_high_contrast: 'Alternar alto contraste',
  html_collections_title: 'Coleções',
  html_new_collection: 'Nova coleção',
  html_collection_name_ph: 'Nome da coleção',
  html_create: 'Criar',
  html_your_collections: 'Suas coleções',
  html_collection_items: 'Itens da coleção',
  html_collection_items_hint: 'Clique em uma coleção à esquerda.',
  html_quiz_title: 'Quiz — quem é esse Pokémon?',
  html_quiz_next: 'Próxima',
  html_region_filter_aria: 'Filtrar lista por região',
  html_type_filter_aria: 'Filtrar por tipo (Pokédex Nacional)',
  html_pagination_aria: 'Paginação da lista',
  };

  function t(key, repl) {
    let s = strings[key];
    if (s === undefined || s === null) return key;
    if (repl && typeof repl === 'object') {
      Object.keys(repl).forEach((k) => {
        s = String(s).replace(new RegExp('\\{' + k + '\\}', 'g'), String(repl[k]));
      });
    }
    return s;
  }

  function applyHtmlI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = t(key);
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

  global.PokedexLang = strings;
  global.PokedexT = t;
  global.PokedexLangApply = applyHtmlI18n;
})(typeof window !== 'undefined' ? window : globalThis);
