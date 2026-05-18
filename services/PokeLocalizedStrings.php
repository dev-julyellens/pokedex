<?php

declare(strict_types=1);

/**
 * Seleção multilíngue de textos da PokeAPI: idioma atual → inglês → primeiro disponível.
 */
class PokeLocalizedStrings
{
    /** @var array<string, array<string, string>> */
    private const TYPE_LABELS = [
        'pt-BR' => [
            'normal' => 'Normal', 'fighting' => 'Lutador', 'flying' => 'Voador', 'poison' => 'Venenoso',
            'ground' => 'Terra', 'rock' => 'Pedra', 'bug' => 'Inseto', 'ghost' => 'Fantasma',
            'steel' => 'Aço', 'fire' => 'Fogo', 'water' => 'Água', 'grass' => 'Planta',
            'electric' => 'Elétrico', 'psychic' => 'Psíquico', 'ice' => 'Gelo', 'dragon' => 'Dragão',
            'dark' => 'Noturno', 'fairy' => 'Fada', 'unknown' => '???', 'shadow' => 'Sombra',
        ],
        'en' => [
            'normal' => 'Normal', 'fighting' => 'Fighting', 'flying' => 'Flying', 'poison' => 'Poison',
            'ground' => 'Ground', 'rock' => 'Rock', 'bug' => 'Bug', 'ghost' => 'Ghost',
            'steel' => 'Steel', 'fire' => 'Fire', 'water' => 'Water', 'grass' => 'Grass',
            'electric' => 'Electric', 'psychic' => 'Psychic', 'ice' => 'Ice', 'dragon' => 'Dragon',
            'dark' => 'Dark', 'fairy' => 'Fairy', 'unknown' => '???', 'shadow' => 'Shadow',
        ],
        'es' => [
            'normal' => 'Normal', 'fighting' => 'Lucha', 'flying' => 'Volador', 'poison' => 'Veneno',
            'ground' => 'Tierra', 'rock' => 'Roca', 'bug' => 'Bicho', 'ghost' => 'Fantasma',
            'steel' => 'Acero', 'fire' => 'Fuego', 'water' => 'Agua', 'grass' => 'Planta',
            'electric' => 'Eléctrico', 'psychic' => 'Psíquico', 'ice' => 'Hielo', 'dragon' => 'Dragón',
            'dark' => 'Siniestro', 'fairy' => 'Hada', 'unknown' => '???', 'shadow' => 'Sombra',
        ],
        'ja' => [
            'normal' => 'ノーマル', 'fighting' => 'かくとう', 'flying' => 'ひこう', 'poison' => 'どく',
            'ground' => 'じめん', 'rock' => 'いわ', 'bug' => 'むし', 'ghost' => 'ゴースト',
            'steel' => 'はがね', 'fire' => 'ほのお', 'water' => 'みず', 'grass' => 'くさ',
            'electric' => 'でんき', 'psychic' => 'エスパー', 'ice' => 'こおり', 'dragon' => 'ドラゴン',
            'dark' => 'あく', 'fairy' => 'フェアリー', 'unknown' => '???', 'shadow' => 'シャドウ',
        ],
        'ko' => [
            'normal' => '노말', 'fighting' => '격투', 'flying' => '비행', 'poison' => '독',
            'ground' => '땅', 'rock' => '바위', 'bug' => '벌레', 'ghost' => '고스트',
            'steel' => '강철', 'fire' => '불꽃', 'water' => '물', 'grass' => '풀',
            'electric' => '전기', 'psychic' => '에스퍼', 'ice' => '얼음', 'dragon' => '드래곤',
            'dark' => '악', 'fairy' => '페어리', 'unknown' => '???', 'shadow' => '그림자',
        ],
        'zh-Hans' => [
            'normal' => '一般', 'fighting' => '格斗', 'flying' => '飞行', 'poison' => '毒',
            'ground' => '地面', 'rock' => '岩石', 'bug' => '虫', 'ghost' => '幽灵',
            'steel' => '钢', 'fire' => '火', 'water' => '水', 'grass' => '草',
            'electric' => '电', 'psychic' => '超能力', 'ice' => '冰', 'dragon' => '龙',
            'dark' => '恶', 'fairy' => '妖精', 'unknown' => '???', 'shadow' => '暗影',
        ],
    ];

    /** @param list<array<string,mixed>> $namesList */
    public static function pickLocalizedName(array $namesList, string $slugFallback = ''): string
    {
        return self::pickByLanguage($namesList, 'name', $slugFallback);
    }

    /** @param list<array<string,mixed>> $genera */
    public static function pickGenus(array $genera, string $slugFallback = ''): string
    {
        return self::pickByLanguage($genera, 'genus', $slugFallback);
    }

    /**
     * @param list<array<string,mixed>> $entries
     * @return array{text: string, language: string}
     */
    public static function pickFlavorText(array $entries, string $slugFallback = ''): array
    {
        foreach (self::languageChain() as $code) {
            $hit = self::matchFlavorRow($entries, $code);
            if ($hit !== null) {
                return $hit;
            }
        }
        foreach ($entries as $row) {
            if (!is_array($row)) {
                continue;
            }
            $lang = (string) ($row['language']['name'] ?? '');
            $txt = isset($row['flavor_text']) ? (string) $row['flavor_text'] : '';
            if ($txt !== '') {
                return self::formatFlavorRow($txt, $lang);
            }
        }

        return ['text' => self::fallbackSlug($slugFallback), 'language' => ''];
    }

    /** @param list<array<string,mixed>> $entries */
    public static function pickAbilityEffect(array $entries, string $slugFallback = ''): string
    {
        foreach (self::languageChain() as $code) {
            foreach ($entries as $row) {
                if (!is_array($row) || ($row['language']['name'] ?? '') !== $code) {
                    continue;
                }
                $short = isset($row['short_effect']) ? trim((string) $row['short_effect']) : '';
                if ($short !== '') {
                    return self::normalizeSpaces($short);
                }
                $effect = isset($row['effect']) ? trim((string) $row['effect']) : '';
                if ($effect !== '') {
                    return self::normalizeSpaces($effect);
                }
            }
        }
        foreach ($entries as $row) {
            if (!is_array($row)) {
                continue;
            }
            $short = isset($row['short_effect']) ? trim((string) $row['short_effect']) : '';
            if ($short !== '') {
                return self::normalizeSpaces($short);
            }
            $effect = isset($row['effect']) ? trim((string) $row['effect']) : '';
            if ($effect !== '') {
                return self::normalizeSpaces($effect);
            }
        }

        return self::fallbackSlug($slugFallback);
    }

    public static function typeLabel(string $slug): string
    {
        $s = strtolower(trim($slug));
        $locale = LocaleService::getAppLocale();
        $map = self::TYPE_LABELS[$locale] ?? self::TYPE_LABELS['en'];

        return $map[$s] ?? self::fallbackSlug($s);
    }

    public static function statLabel(string $slug): string
    {
        $s = strtolower(trim($slug));
        $locale = LocaleService::getAppLocale();
        $maps = [
            'pt-BR' => ['hp' => 'PS', 'attack' => 'Ataque', 'defense' => 'Defesa', 'special-attack' => 'At. Esp.', 'special-defense' => 'Def. Esp.', 'speed' => 'Velocidade'],
            'en' => ['hp' => 'HP', 'attack' => 'Attack', 'defense' => 'Defense', 'special-attack' => 'Sp. Atk', 'special-defense' => 'Sp. Def', 'speed' => 'Speed'],
            'es' => ['hp' => 'PS', 'attack' => 'Ataque', 'defense' => 'Defensa', 'special-attack' => 'At. Esp.', 'special-defense' => 'Def. Esp.', 'speed' => 'Velocidad'],
            'ja' => ['hp' => 'HP', 'attack' => 'こうげき', 'defense' => 'ぼうぎょ', 'special-attack' => 'とくこう', 'special-defense' => 'とくぼう', 'speed' => 'すばやさ'],
            'ko' => ['hp' => 'HP', 'attack' => '공격', 'defense' => '방어', 'special-attack' => '특수공격', 'special-defense' => '특수방어', 'speed' => '스피드'],
            'zh-Hans' => ['hp' => 'HP', 'attack' => '攻击', 'defense' => '防御', 'special-attack' => '特攻', 'special-defense' => '特防', 'speed' => '速度'],
        ];
        $map = $maps[$locale] ?? $maps['en'];

        return $map[$s] ?? self::fallbackSlug($s);
    }

    public static function abilityLabel(string $slug, string $apiFallbackName = ''): string
    {
        $fromApi = trim($apiFallbackName);
        if ($fromApi !== '') {
            return $fromApi;
        }

        return self::fallbackSlug($slug);
    }

    /**
     * Rótulo de habitat via names[] da API ou slug formatado.
     *
     * @param array<string,mixed>|null $habitatRef campo habitat da espécie
     */
    public static function habitatLabel(?array $habitatRef, string $slugFallback = ''): string
    {
        $slug = is_array($habitatRef) ? strtolower(trim((string) ($habitatRef['name'] ?? $slugFallback))) : $slugFallback;
        $url = is_array($habitatRef) ? trim((string) ($habitatRef['url'] ?? '')) : '';
        if ($url !== '') {
            $data = TranslationCache::getOrFetch($url);

            return self::pickLocalizedName($data['names'] ?? [], $slug);
        }

        return self::fallbackSlug($slug);
    }

    /**
     * @param array<string,mixed>|null $resourceRef ex.: move, color, shape com url+name
     */
    public static function resourceLabel(?array $resourceRef, string $slugFallback = ''): string
    {
        if (!is_array($resourceRef)) {
            return self::fallbackSlug($slugFallback);
        }
        $slug = strtolower(trim((string) ($resourceRef['name'] ?? $slugFallback)));
        $url = trim((string) ($resourceRef['url'] ?? ''));
        if ($url !== '') {
            $data = TranslationCache::getOrFetch($url);
            $picked = self::pickLocalizedName($data['names'] ?? [], $slug);
            if ($picked !== '' && $picked !== self::fallbackSlug('')) {
                return $picked;
            }
        }

        return self::fallbackSlug($slug);
    }

    /**
     * @param list<array<string,mixed>> $rows
     */
    private static function pickByLanguage(array $rows, string $field, string $slugFallback = ''): string
    {
        foreach (self::languageChain() as $code) {
            foreach ($rows as $row) {
                if (!is_array($row)) {
                    continue;
                }
                if (($row['language']['name'] ?? '') !== $code) {
                    continue;
                }
                $val = isset($row[$field]) ? trim((string) $row[$field]) : '';
                if ($val !== '') {
                    return $val;
                }
            }
        }
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $val = isset($row[$field]) ? trim((string) $row[$field]) : '';
            if ($val !== '') {
                return $val;
            }
        }

        return self::fallbackSlug($slugFallback);
    }

    /**
     * @param list<array<string,mixed>> $entries
     * @return array{text: string, language: string}|null
     */
    private static function matchFlavorRow(array $entries, string $code): ?array
    {
        foreach ($entries as $row) {
            if (!is_array($row)) {
                continue;
            }
            if (($row['language']['name'] ?? '') !== $code) {
                continue;
            }
            $txt = isset($row['flavor_text']) ? (string) $row['flavor_text'] : '';
            if ($txt !== '') {
                return self::formatFlavorRow($txt, $code);
            }
        }

        return null;
    }

    /**
     * @return array{text: string, language: string}
     */
    private static function formatFlavorRow(string $txt, string $lang): array
    {
        $clean = preg_replace("/\s+/u", ' ', str_replace(["\f", "\n", "\r"], ' ', $txt));

        return [
            'text' => trim((string) $clean),
            'language' => $lang,
        ];
    }

    private static function normalizeSpaces(string $text): string
    {
        $clean = preg_replace("/\s+/u", ' ', $text);

        return $clean !== null && $clean !== '' ? $clean : $text;
    }

    private static function fallbackSlug(string $slug): string
    {
        $s = strtolower(trim($slug));
        if ($s === '') {
            return '—';
        }

        return ucfirst(str_replace('-', ' ', $s));
    }

    /** @return list<string> */
    private static function languageChain(): array
    {
        return LocaleService::pokeApiLanguageChain();
    }
}
