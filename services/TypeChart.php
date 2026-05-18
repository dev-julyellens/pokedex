<?php

/**
 * Relações de tipo (fraquezas, resistências, imunidades) para cálculo competitivo.
 */

declare(strict_types=1);

class TypeChart
{
    /** @var array<string, array{weak: list<string>, resist: list<string>, immune: list<string>}> */
    private const DEFENSE = [
        'normal' => ['weak' => ['fighting'], 'resist' => [], 'immune' => ['ghost']],
        'fire' => ['weak' => ['water', 'ground', 'rock'], 'resist' => ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], 'immune' => []],
        'water' => ['weak' => ['electric', 'grass'], 'resist' => ['fire', 'water', 'ice', 'steel'], 'immune' => []],
        'electric' => ['weak' => ['ground'], 'resist' => ['electric', 'flying', 'steel'], 'immune' => []],
        'grass' => ['weak' => ['fire', 'ice', 'poison', 'flying', 'bug'], 'resist' => ['water', 'electric', 'grass', 'ground'], 'immune' => []],
        'ice' => ['weak' => ['fire', 'fighting', 'rock', 'steel'], 'resist' => ['ice'], 'immune' => []],
        'fighting' => ['weak' => ['flying', 'psychic', 'fairy'], 'resist' => ['bug', 'rock', 'dark'], 'immune' => []],
        'poison' => ['weak' => ['ground', 'psychic'], 'resist' => ['grass', 'fighting', 'poison', 'bug', 'fairy'], 'immune' => []],
        'ground' => ['weak' => ['water', 'grass', 'ice'], 'resist' => ['poison', 'rock'], 'immune' => ['electric']],
        'flying' => ['weak' => ['electric', 'ice', 'rock'], 'resist' => ['grass', 'fighting', 'bug'], 'immune' => ['ground']],
        'psychic' => ['weak' => ['bug', 'ghost', 'dark'], 'resist' => ['fighting', 'psychic'], 'immune' => []],
        'bug' => ['weak' => ['fire', 'flying', 'rock'], 'resist' => ['grass', 'fighting', 'ground'], 'immune' => []],
        'rock' => ['weak' => ['water', 'grass', 'fighting', 'ground', 'steel'], 'resist' => ['normal', 'fire', 'poison', 'flying'], 'immune' => []],
        'ghost' => ['weak' => ['ghost', 'dark'], 'resist' => ['poison', 'bug'], 'immune' => ['normal', 'fighting']],
        'dragon' => ['weak' => ['ice', 'dragon', 'fairy'], 'resist' => ['fire', 'water', 'electric', 'grass'], 'immune' => []],
        'dark' => ['weak' => ['fighting', 'bug', 'fairy'], 'resist' => ['ghost', 'dark'], 'immune' => ['psychic']],
        'steel' => ['weak' => ['fire', 'fighting', 'ground'], 'resist' => ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], 'immune' => ['poison']],
        'fairy' => ['weak' => ['poison', 'steel'], 'resist' => ['fighting', 'bug', 'dark'], 'immune' => ['dragon']],
    ];

    /**
     * @param list<string> $typeSlugs
     * @return array{
     *   weak_to: list<array{slug:string,label:string}>,
     *   resistant_to: list<array{slug:string,label:string}>,
     *   immune_to: list<array{slug:string,label:string}>
     * }
     */
    public static function defensiveMatchups(array $typeSlugs): array
    {
        $typeSlugs = array_values(array_unique(array_filter(array_map(
            static fn ($t): string => strtolower(trim((string) $t)),
            $typeSlugs
        ))));

        $weakMult = [];
        $resistMult = [];
        $immuneSet = [];

        foreach ($typeSlugs as $defType)
        {
            $def = self::DEFENSE[$defType] ?? null;
            if ($def === null)
            {
                continue;
            }
            foreach ($def['weak'] as $atk)
            {
                $weakMult[$atk] = ($weakMult[$atk] ?? 1) * 2;
            }
            foreach ($def['resist'] as $atk)
            {
                $resistMult[$atk] = ($resistMult[$atk] ?? 1) * 0.5;
            }
            foreach ($def['immune'] as $atk)
            {
                $immuneSet[$atk] = true;
            }
        }

        $weak = [];
        $resist = [];
        $immune = [];

        foreach ($immuneSet as $slug => $_)
        {
            $immune[] = ['slug' => $slug, 'label' => PokeLocalizedStrings::typeLabelPt($slug)];
        }

        foreach ($weakMult as $slug => $mult)
        {
            if (isset($immuneSet[$slug]))
            {
                continue;
            }
            if ($mult >= 2)
            {
                $weak[] = ['slug' => $slug, 'label' => PokeLocalizedStrings::typeLabelPt($slug)];
            }
        }

        foreach ($resistMult as $slug => $mult)
        {
            if (isset($immuneSet[$slug]))
            {
                continue;
            }
            if ($mult <= 0.5 && ($weakMult[$slug] ?? 0) < 2)
            {
                $resist[] = ['slug' => $slug, 'label' => PokeLocalizedStrings::typeLabelPt($slug)];
            }
        }

        usort($weak, static fn ($a, $b): int => strcmp($a['slug'], $b['slug']));
        usort($resist, static fn ($a, $b): int => strcmp($a['slug'], $b['slug']));
        usort($immune, static fn ($a, $b): int => strcmp($a['slug'], $b['slug']));

        return [
            'weak_to' => $weak,
            'resistant_to' => $resist,
            'immune_to' => $immune,
        ];
    }
}
