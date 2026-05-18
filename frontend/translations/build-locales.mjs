import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pt = JSON.parse(fs.readFileSync(path.join(__dirname, 'pt-BR.json'), 'utf8'));

/** @type {Record<string, Record<string, string>>} */
const overrides = {
  en: {
    loading: 'Loading…',
    loading_pokedex: 'Loading your Pokédex…',
    close: 'Close',
    error: 'Error',
    sound_on: 'Sound on',
    sound_off: 'Sound off',
    high_contrast_on: 'High contrast on',
    high_contrast_off: 'High contrast off',
    configure_db_favorites: 'Configure the database to use favorites.',
    favorites_none: 'No favorites yet.',
    favorite_added: 'Added to favorites!',
    favorite_removed: 'Removed from favorites.',
    recent_empty: 'Open a Pokémon to fill this list.',
    compare_hint: 'Enter two Pokémon and click Compare.',
    network_failure: 'Network failure',
    request_error: 'Request error',
    quiz_question: 'Who is this Pokémon?',
    quiz_correct: 'Correct!',
    quiz_wrong: 'Wrong - it was {name}',
    search_no_results: 'No Pokémon found for that term.',
    pokemon_not_found: 'Pokémon not found',
    national_dex: 'National Pokédex',
    all_national: 'All - National Pokédex',
    html_search_label: 'Search Pokémon',
    html_search_placeholder: 'Name or number (e.g. pikachu, 25)',
    html_btn_theme: 'Theme',
    html_btn_sound: 'Sound',
    html_btn_random: 'Surprise me',
    html_btn_compare: 'Compare',
    html_btn_favorites: 'Favorites',
    html_btn_import: 'Import',
    html_btn_density: 'View',
    html_btn_shortcuts: 'Shortcuts',
    html_btn_collections: 'Collections',
    html_btn_quiz: 'Quiz',
    html_btn_a11y: 'A11y',
    html_sidebar_favorites: 'Favorites',
    html_sidebar_recent: 'Recently viewed',
    html_sidebar_achievements: 'Achievements',
    html_sidebar_progress: 'Progress',
    html_catalog: 'Catalog',
    html_region: 'Region',
    html_type: 'Type',
    html_all_types: 'All types',
    html_compare_title: 'Compare Pokémon',
    html_quiz_title: 'Quiz - who is this Pokémon?',
    card_more_btn: 'More info',
    tab_about: 'About',
    tab_stats: 'Stats',
    tab_abilities: 'Abilities',
    tab_evolutions: 'Evolutions',
    tab_lore: 'Lore',
    type_weak: 'Weak to',
    type_resist: 'Resists',
    type_immune: 'Immune to',
    lang_select_aria: 'Choose language',
    lang_changing: 'Switching language…',
    lang_pt: 'Portuguese',
    lang_en: 'English',
    lang_es: 'Spanish',
    lang_ja: 'Japanese',
    hero_lead: 'Discover species, types and evolutions with a UI built for you. Official data via PokeAPI.',
    hero_badge: 'Live · PokeAPI',
    type_normal: 'Normal',
    type_fire: 'Fire',
    type_water: 'Water',
    type_electric: 'Electric',
    type_grass: 'Grass',
    type_ice: 'Ice',
    type_fighting: 'Fighting',
    type_poison: 'Poison',
    type_ground: 'Ground',
    type_flying: 'Flying',
    type_psychic: 'Psychic',
    type_bug: 'Bug',
    type_rock: 'Rock',
    type_ghost: 'Ghost',
    type_dragon: 'Dragon',
    type_dark: 'Dark',
    type_steel: 'Steel',
    type_fairy: 'Fairy',
  },
  es: {
    loading: 'Cargando…',
    loading_pokedex: 'Cargando tu Pokédex…',
    close: 'Cerrar',
    error: 'Error',
    favorites_none: 'Sin favoritos.',
    favorite_added: '¡Añadido a favoritos!',
    national_dex: 'Pokédex Nacional',
    all_national: 'Todas - Pokédex Nacional',
    html_search_label: 'Buscar Pokémon',
    html_btn_theme: 'Tema',
    html_btn_compare: 'Comparar',
    html_btn_favorites: 'Favoritos',
    card_more_btn: 'Más información',
    tab_about: 'Acerca de',
    tab_stats: 'Estadísticas',
    tab_abilities: 'Habilidades',
    tab_evolutions: 'Evoluciones',
    tab_lore: 'Lore',
    lang_select_aria: 'Elegir idioma',
    lang_changing: 'Cambiando idioma…',
    lang_pt: 'Portugués',
    lang_en: 'Inglés',
    lang_es: 'Español',
    lang_ja: 'Japonés',
    type_fire: 'Fuego',
    type_water: 'Agua',
    type_grass: 'Planta',
    type_electric: 'Eléctrico',
  },
  ja: {
    loading: '読み込み中…',
    loading_pokedex: 'ポケデックスを読み込み中…',
    close: '閉じる',
    error: 'エラー',
    favorites_none: 'お気に入りはありません。',
    favorite_added: 'お気に入りに追加しました！',
    national_dex: '全国図鑑',
    all_national: 'すべて - 全国図鑑',
    html_search_label: 'ポケモンを検索',
    html_btn_theme: 'テーマ',
    html_btn_compare: '比較',
    html_btn_favorites: 'お気に入り',
    card_more_btn: '詳細',
    tab_about: '概要',
    tab_stats: 'ステータス',
    tab_abilities: '特性',
    tab_evolutions: '進化',
    tab_lore: '図鑑',
    lang_select_aria: '言語を選択',
    lang_changing: '言語を切り替え中…',
    lang_pt: 'ポルトガル語',
    lang_en: '英語',
    lang_es: 'スペイン語',
    lang_ja: '日本語',
    type_fire: 'ほのお',
    type_water: 'みず',
    type_grass: 'くさ',
    type_electric: 'でんき',
  },
};

function build(locale, base) {
  const out = { ...base };
  const o = overrides[locale] || {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = v;
  }
  if (locale === 'en') {
    for (const k of Object.keys(out)) {
      if (k.startsWith('type_') && !o[k]) {
        const slug = k.slice(5);
        out[k] = slug.charAt(0).toUpperCase() + slug.slice(1);
      }
    }
  }
  return out;
}

for (const loc of ['en', 'es', 'ja']) {
  fs.writeFileSync(path.join(__dirname, `${loc}.json`), JSON.stringify(build(loc, pt), null, 2));
  console.log('wrote', loc);
}
