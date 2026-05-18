<?php

/**
 * Model - regras e montagem de dados de Pokémon (PokeAPI).
 */

declare(strict_types=1);

class PokemonModel
{
    private PokeApiService $api;
    private ?PokemonStorageModel $pokemonStore = null;

    public function __construct(?PokeApiService $api = null)
    {
        $this->api = $api ?? new PokeApiService();
    }

    private function pokemonStore(): ?PokemonStorageModel
    {
        if (!PokemonStorageModel::available())
        {
            return null;
        }
        try
        {
            if ($this->pokemonStore === null)
            {
                $this->pokemonStore = new PokemonStorageModel();
            }

            return $this->pokemonStore;
        }
        catch (Throwable)
        {
            return null;
        }
    }

    /**
     * @param list<array{id:int,name:string,image:string}> $items
     */
    private function persistListItemsCache(?PokemonStorageModel $store, array $items): void
    {
        if ($store === null || $items === [])
        {
            return;
        }
        try
        {
            $store->upsertItems($items);
        }
        catch (Throwable)
        {
            /* tabela ausente ou erro transitório - segue só com API */
        }
    }

    /**
     * @param list<array{id:int,name:string,image:string}> $items
     * @return list<array{id:int,name:string,image:string}>
     */
    private function hydrateListItemsFromDb(?PokemonStorageModel $store, array $items): array
    {
        if ($store === null || $items === [])
        {
            return $items;
        }
        try
        {
            $ids = [];
            foreach ($items as $it)
            {
                $ids[] = (int) ($it['id'] ?? 0);
            }
            $fromDb = $store->fetchByIds($ids);
            $out = [];
            foreach ($items as $it)
            {
                $id = (int) ($it['id'] ?? 0);
                $out[] = $fromDb[$id] ?? $it;
            }

            return $out;
        }
        catch (Throwable)
        {
            return $items;
        }
    }

    /**
     * Intervalo de IDs (inclusivo) dentro de 1..$total. Null = sem limite nesse extremo.
     *
     * @return array{0:int,1:int}
     */
    private function boundIdRange(?int $idMin, ?int $idMax, int $total): array
    {
        $T = max(0, $total);
        if ($T === 0)
        {
            return [1, 0];
        }
        $lo = $idMin !== null && $idMin > 0 ? min($idMin, $T) : 1;
        $hi = $idMax !== null && $idMax > 0 ? min($idMax, $T) : $T;
        if ($lo > $hi)
        {
            $tmp = $lo;
            $lo = $hi;
            $hi = $tmp;
        }

        return [$lo, $hi];
    }

    /**
     * Lista uma página (1-based). Sem região = Pokédex Nacional (todos).
     * Com `region` = espécies das Pokédexes da região (API), mescladas e deduplicadas.
     *
     * @return array{
     *   items: list<array{id:int,name:string,image:string}>,
     *   page:int,
     *   per_page:int,
     *   total:int,
     *   total_pages:int,
     *   region?: string,
     *   region_label?: string,
     *   type?: string,
     *   type_label?: string
     * }
     */
    public function findListPage(int $page, int $perPage, ?string $region = null, ?string $type = null, ?int $idMin = null, ?int $idMax = null): array
    {
        $regionKey = $region !== null ? strtolower(trim($region)) : '';
        $typeKey = $type !== null ? strtolower(trim($type)) : '';
        if ($typeKey !== '')
        {
            if ($regionKey !== '')
            {
                $result = $this->findListPageForRegion($page, $perPage, $regionKey, $idMin, $idMax);
            }
            else
            {
                $result = $this->findListPageByType($page, $perPage, $typeKey, $idMin, $idMax);
            }
        }
        elseif ($regionKey === '')
        {
            $result = $this->findListPageNational($page, $perPage, $idMin, $idMax);
        }
        else
        {
            $result = $this->findListPageForRegion($page, $perPage, $regionKey, $idMin, $idMax);
        }

        return $result;
    }

    /**
     * Resumos para cards enriquecidos (batch, sob demanda).
     *
     * @param list<int> $ids
     * @return array<int, array<string,mixed>>
     */
    public function findCardSummaries(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn(int $x): bool => $x > 0)));
        if ($ids === [])
        {
            return [];
        }
        $ids = array_slice($ids, 0, 24);
        $out = [];
        foreach ($ids as $id)
        {
            try
            {
                $summary = $this->buildCardSummary($id);
                if ($summary !== null)
                {
                    $out[$id] = $summary;
                }
            }
            catch (Throwable)
            {
            }
        }

        return $out;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function buildCardSummary(int $id): ?array
    {
        $store = $this->pokemonStore();
        if ($store !== null)
        {
            try
            {
                $cached = $store->getDetailPayload($id);
                if (is_array($cached))
                {
                    $remapped = $this->remapDetailPayload($cached);
                    if ($remapped !== null && isset($remapped['pokemon']) && is_array($remapped['pokemon']))
                    {
                        return $this->mapCardSummaryFromRich($remapped['pokemon']);
                    }
                }
            }
            catch (Throwable)
            {
            }
        }

        try
        {
            $pokemon = $this->api->getPokemonByIdOrName((string) $id);
        }
        catch (Throwable)
        {
            return null;
        }

        $species = null;
        $speciesUrl = $pokemon['species']['url'] ?? '';
        if (is_string($speciesUrl) && $speciesUrl !== '')
        {
            try
            {
                $species = $this->api->getSpeciesByUrl($speciesUrl);
            }
            catch (Throwable)
            {
                $species = null;
            }
        }

        $rich = $this->mapPokemonRich($pokemon, is_array($species) ? $species : null);

        return $this->mapCardSummaryFromRich($rich);
    }

    /**
     * @param array<string,mixed> $p
     * @return array<string,mixed>
     */
    private function mapCardSummaryFromRich(array $p): array
    {
        $stats = $p['stats'] ?? [];
        $pickStat = static function (string $key) use ($stats): int
        {
            foreach ($stats as $s)
            {
                if (is_array($s) && ($s['id'] ?? '') === $key)
                {
                    return (int) ($s['base'] ?? 0);
                }
            }

            return 0;
        };

        $abilities = [];
        foreach (array_slice($p['abilities'] ?? [], 0, 2) as $a)
        {
            if (!is_array($a))
            {
                continue;
            }
            $abilities[] = [
                'slug' => (string) ($a['slug'] ?? ''),
                'label' => (string) ($a['label'] ?? ''),
                'is_hidden' => !empty($a['is_hidden']),
            ];
        }

        return [
            'id' => (int) ($p['id'] ?? 0),
            'name' => (string) ($p['name'] ?? ''),
            'name_display' => (string) ($p['name_display'] ?? $p['name'] ?? ''),
            'image' => (string) ($p['image'] ?? ''),
            'types' => $p['types'] ?? [],
            'height' => (int) ($p['height'] ?? 0),
            'weight' => (int) ($p['weight'] ?? 0),
            'generation' => $p['generation'] ?? null,
            'rarity' => $p['rarity'] ?? 'common',
            'rarity_label' => $p['rarity_label'] ?? Lang::get('rarity_common'),
            'abilities' => $abilities,
            'stats_mini' => [
                ['id' => 'hp', 'label' => PokeLocalizedStrings::statLabel('hp'), 'base' => $pickStat('hp')],
                ['id' => 'attack', 'label' => PokeLocalizedStrings::statLabel('attack'), 'base' => $pickStat('attack')],
                ['id' => 'defense', 'label' => PokeLocalizedStrings::statLabel('defense'), 'base' => $pickStat('defense')],
                ['id' => 'speed', 'label' => PokeLocalizedStrings::statLabel('speed'), 'base' => $pickStat('speed')],
            ],
        ];
    }

    /**
     * Lista paginada por tipo (Pokédex Nacional apenas - endpoint /type/{slug}).
     *
     * @return array{items: list<array{id:int,name:string,image:string}>, page:int, per_page:int, total:int, total_pages:int, type:string, type_label:string}
     */
    private function findListPageByType(int $page, int $perPage, string $typeSlug, ?int $idMin = null, ?int $idMax = null): array
    {
        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));
        try
        {
            $typeData = $this->api->getTypeByName($typeSlug);
        }
        catch (InvalidArgumentException $e)
        {
            throw $e;
        }
        catch (Throwable $e)
        {
            throw new RuntimeException(Lang::get('load_type_failed'), 0, $e);
        }

        $allItems = [];
        foreach ($typeData['pokemon'] ?? [] as $row)
        {
            if (!is_array($row))
            {
                continue;
            }
            $p = $row['pokemon'] ?? null;
            if (!is_array($p))
            {
                continue;
            }
            $url = (string) ($p['url'] ?? '');
            $name = strtolower(trim((string) ($p['name'] ?? '')));
            $pid = PokeApiService::extractIdFromUrl($url);
            if ($pid <= 0 && $name === '')
            {
                continue;
            }
            if ($name === '')
            {
                $name = 'pokemon-' . $pid;
            }
            $allItems[] = $this->listItemFromPokemonNameAndId($name, $pid);
        }

        if ($idMin !== null || $idMax !== null)
        {
            $natCap = 1025;
            $st = $this->pokemonStore();
            if ($st !== null)
            {
                try
                {
                    $tc = $st->getNationalTotalCount();
                    if ($tc !== null && $tc > 0)
                    {
                        $natCap = $tc;
                    }
                }
                catch (Throwable)
                {
                }
            }
            $bound = $this->boundIdRange($idMin, $idMax, $natCap);
            $lo = $bound[0];
            $hi = $bound[1];
            $allItems = array_values(array_filter(
                $allItems,
                static function (array $it) use ($lo, $hi): bool
                {
                    $id = (int) ($it['id'] ?? 0);

                    return $id >= $lo && $id <= $hi;
                }
            ));
        }

        $total = count($allItems);
        $totalPages = $perPage > 0 ? max(1, (int) ceil($total / $perPage)) : 1;
        $offset = ($page - 1) * $perPage;
        $items = array_slice($allItems, $offset, $perPage);

        $store = $this->pokemonStore();
        $items = $this->hydrateListItemsFromDb($store, $items);
        $this->persistListItemsCache($store, $items);

        return [
            'items' => $items,
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => $totalPages,
            'type' => $typeSlug,
            'type_label' => PokeLocalizedStrings::typeLabel($typeSlug),
        ];
    }

    /**
     * @return array{items: list<array{id:int,name:string,image:string}>, page:int, per_page:int, total:int, total_pages:int, national_total?:int, id_range?: array{min:int,max:int}}
     */
    private function findListPageNational(int $page, int $perPage, ?int $idMin = null, ?int $idMax = null): array
    {
        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));
        $store = $this->pokemonStore();
        $totalFull = null;
        try
        {
            if ($store !== null)
            {
                $totalFull = $store->getNationalTotalCount();
                if ($totalFull === null)
                {
                    $peek = $this->api->getPokemonList(0, 1);
                    $cnt = (int) ($peek['count'] ?? 0);
                    if ($cnt > 0)
                    {
                        $store->setNationalTotalCount($cnt);
                        $totalFull = $cnt;
                    }
                }
            }
            if ($totalFull === null || $totalFull <= 0)
            {
                $peek = $this->api->getPokemonList(0, 1);
                $totalFull = (int) ($peek['count'] ?? 0);
            }
        }
        catch (Throwable)
        {
            $totalFull = 0;
        }
        if ($totalFull <= 0)
        {
            return [
                'items' => [],
                'page' => 1,
                'per_page' => $perPage,
                'total' => 0,
                'total_pages' => 1,
            ];
        }

        [$lo, $hi] = $this->boundIdRange($idMin, $idMax, $totalFull);
        $subset = max(0, $hi - $lo + 1);
        if ($subset <= 0)
        {
            return [
                'items' => [],
                'page' => 1,
                'per_page' => $perPage,
                'total' => 0,
                'total_pages' => 1,
                'national_total' => $totalFull,
                'id_range' => ['min' => $lo, 'max' => $hi],
            ];
        }
        $totalPages = $perPage > 0 ? max(1, (int) ceil($subset / $perPage)) : 1;
        $page = min($page, $totalPages);
        $startId = $lo + ($page - 1) * $perPage;
        $endId = min($startId + $perPage - 1, $hi);
        $needCount = $endId - $startId + 1;

        if ($store !== null)
        {
            try
            {
                $rows = $store->fetchIdRange($startId, $endId);
                if ($store->isCompleteConsecutiveSlice($rows, $startId, $needCount))
                {
                    $items = [];
                    foreach ($rows as $r)
                    {
                        $items[] = [
                            'id' => (int) $r['id'],
                            'name' => (string) $r['name'],
                            'image' => (string) $r['image'],
                        ];
                    }
                    $out = [
                        'items' => $items,
                        'page' => $page,
                        'per_page' => $perPage,
                        'total' => $subset,
                        'total_pages' => $totalPages,
                        'national_total' => $totalFull,
                        'id_range' => ['min' => $lo, 'max' => $hi],
                    ];
                    if ($idMin !== null)
                    {
                        $out['id_min_filter'] = $idMin;
                    }
                    if ($idMax !== null)
                    {
                        $out['id_max_filter'] = $idMax;
                    }

                    return $out;
                }
            }
            catch (Throwable)
            {
                /* fallback: PokeAPI */
            }
        }

        $offset = $startId - 1;
        $pageData = $this->api->getPokemonList($offset, $needCount);
        $results = $pageData['results'] ?? [];

        $items = [];
        foreach ($results as $row)
        {
            if (!is_array($row))
            {
                continue;
            }
            $url = (string) ($row['url'] ?? '');
            $name = (string) ($row['name'] ?? '');
            $pid = PokeApiService::extractIdFromUrl($url);
            if ($pid < $lo || $pid > $hi)
            {
                continue;
            }
            $items[] = $this->listItemFromPokemonNameAndId($name, $pid);
        }

        $this->persistListItemsCache($store, $items);
        if ($store !== null && $totalFull > 0)
        {
            try
            {
                if ($store->getNationalTotalCount() === null)
                {
                    $store->setNationalTotalCount($totalFull);
                }
            }
            catch (Throwable)
            {
            }
        }

        $out = [
            'items' => $items,
            'page' => $page,
            'per_page' => $perPage,
            'total' => $subset,
            'total_pages' => $totalPages,
            'national_total' => $totalFull,
            'id_range' => ['min' => $lo, 'max' => $hi],
        ];
        if ($idMin !== null)
        {
            $out['id_min_filter'] = $idMin;
        }
        if ($idMax !== null)
        {
            $out['id_max_filter'] = $idMax;
        }

        return $out;
    }

    /**
     * @return array{items: list<array{id:int,name:string,image:string}>, page:int, per_page:int, total:int, total_pages:int, region:string, region_label:string}
     */
    private function findListPageForRegion(int $page, int $perPage, string $regionSlug, ?int $idMin = null, ?int $idMax = null): array
    {
        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));

        try
        {
            $species = $this->collectMergedRegionalSpecies($regionSlug);
        }
        catch (InvalidArgumentException $e)
        {
            throw $e;
        }
        catch (Throwable $e)
        {
            throw new RuntimeException(Lang::get('load_region_failed'), 0, $e);
        }

        if ($idMin !== null || $idMax !== null)
        {
            $maxSp = 0;
            foreach ($species as $s)
            {
                $maxSp = max($maxSp, (int) ($s['species_id'] ?? 0));
            }
            $natCap = max($maxSp, 1025);
            $st = $this->pokemonStore();
            if ($st !== null)
            {
                try
                {
                    $tc = $st->getNationalTotalCount();
                    if ($tc !== null && $tc > 0)
                    {
                        $natCap = max($natCap, $tc);
                    }
                }
                catch (Throwable)
                {
                }
            }
            $bound = $this->boundIdRange($idMin, $idMax, $natCap);
            $lo = $bound[0];
            $hi = $bound[1];
            $species = array_values(array_filter(
                $species,
                static function (array $s) use ($lo, $hi): bool
                {
                    $sid = (int) ($s['species_id'] ?? 0);

                    return $sid >= $lo && $sid <= $hi;
                }
            ));
        }

        $total = count($species);
        $totalPages = $perPage > 0 ? max(1, (int) ceil($total / $perPage)) : 1;
        $offset = ($page - 1) * $perPage;
        $slice = array_slice($species, $offset, $perPage);

        $items = [];
        foreach ($slice as $row)
        {
            $items[] = $this->listItemFromPokemonNameAndId($row['name'], $row['species_id']);
        }

        $store = $this->pokemonStore();
        $items = $this->hydrateListItemsFromDb($store, $items);
        $this->persistListItemsCache($store, $items);

        return [
            'items' => $items,
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => $totalPages,
            'region' => $regionSlug,
            'region_label' => RegionModel::labelForSlug($regionSlug),
        ];
    }

    /**
     * Busca global por nome (substring) ou ID exato (apenas dígitos), sobre a Pokédex Nacional
     * ou sobre as espécies da região quando `region` é informado.
     *
     * @return array{
     *   items: list<array{id:int,name:string,image:string}>,
     *   total:int,
     *   query:string,
     *   scope:string,
     *   scope_label:string
     * }
     */
    public function searchGlobal(string $query, ?string $region, int $limit): array
    {
        $q = strtolower(trim($query));
        $limit = min(200, max(1, $limit));
        $regionKey = $region !== null ? strtolower(trim($region)) : '';

        if ($regionKey !== '')
        {
            try
            {
                $species = $this->collectMergedRegionalSpecies($regionKey);
            }
            catch (InvalidArgumentException $e)
            {
                throw $e;
            }
            catch (Throwable $e)
            {
                throw new RuntimeException(Lang::get('load_region_failed'), 0, $e);
            }

            $candidates = [];
            foreach ($species as $row)
            {
                $candidates[] = [
                    'name' => strtolower((string) $row['name']),
                    'id' => (int) $row['species_id'],
                ];
            }
            $scope = $regionKey;
            $scopeLabel = RegionModel::labelForSlug($regionKey);
        }
        else
        {
            $scope = 'national';
            $scopeLabel = Lang::get('national_dex');
            $candidates = [];
            $store = $this->pokemonStore();
            $fromDb = false;
            if ($store !== null)
            {
                try
                {
                    $metaTotal = $store->getNationalTotalCount();
                    if ($metaTotal !== null && $store->countPokemon() >= $metaTotal)
                    {
                        foreach ($store->fetchAllForNationalIndex() as $r)
                        {
                            $n = (string) ($r['name'] ?? '');
                            $id = (int) ($r['id'] ?? 0);
                            if ($n === '' || $id <= 0)
                            {
                                continue;
                            }
                            $candidates[] = [
                                'name' => $n,
                                'id' => $id,
                            ];
                        }
                        $fromDb = $candidates !== [];
                    }
                }
                catch (Throwable)
                {
                    $candidates = [];
                    $fromDb = false;
                }
            }
            if (!$fromDb)
            {
                $pageData = $this->api->getFullPokemonIndex();
                $candidates = [];
                $toUpsert = [];
                foreach ($pageData['results'] ?? [] as $row)
                {
                    if (!is_array($row))
                    {
                        continue;
                    }
                    $url = (string) ($row['url'] ?? '');
                    $name = strtolower(trim((string) ($row['name'] ?? '')));
                    if ($name === '')
                    {
                        continue;
                    }
                    $pid = PokeApiService::extractIdFromUrl($url);
                    $candidates[] = [
                        'name' => $name,
                        'id' => $pid,
                    ];
                    $toUpsert[] = $this->listItemFromPokemonNameAndId($name, $pid);
                }
                $this->persistListItemsCache($store, $toUpsert);
                $cntFromApi = (int) ($pageData['count'] ?? 0);
                if ($store !== null && $cntFromApi > 0)
                {
                    try
                    {
                        $store->setNationalTotalCount($cntFromApi);
                    }
                    catch (Throwable)
                    {
                    }
                }
            }
        }

        $isDigits = (bool) preg_match('/^\d+$/', $q);
        $matches = [];
        foreach ($candidates as $c)
        {
            $hit = false;
            if ($isDigits)
            {
                if ((string) $c['id'] === $q)
                {
                    $hit = true;
                }
            }
            elseif (str_contains($c['name'], $q))
            {
                $hit = true;
            }
            if ($hit)
            {
                $matches[] = $c;
            }
        }

        $total = count($matches);
        if ($isDigits)
        {
            usort(
                $matches,
                static function (array $a, array $b): int
                {
                    return $a['id'] <=> $b['id'];
                }
            );
        }
        else
        {
            usort(
                $matches,
                static function (array $a, array $b): int
                {
                    $cmp = strcmp($a['name'], $b['name']);
                    if ($cmp !== 0)
                    {
                        return $cmp;
                    }

                    return $a['id'] <=> $b['id'];
                }
            );
        }

        $matches = array_slice($matches, 0, $limit);
        $items = [];
        foreach ($matches as $m)
        {
            $items[] = $this->listItemFromPokemonNameAndId($m['name'], $m['id']);
        }

        $store = $this->pokemonStore();
        $items = $this->hydrateListItemsFromDb($store, $items);
        $this->persistListItemsCache($store, $items);

        return [
            'items' => $items,
            'total' => $total,
            'query' => $query,
            'scope' => $scope,
            'scope_label' => $scopeLabel,
        ];
    }

    /**
     * @param list<array{id:int,name:string,image:string}> $items
     * @return list<array{id:int,name:string,image:string,types?:list<array{slug:string,label:string}>>}>
     */
    private function enrichListItemsWithTypes(array $items): array
    {
        if ($items === [])
        {
            return [];
        }

        $ids = [];
        foreach ($items as $it)
        {
            $id = (int) ($it['id'] ?? 0);
            if ($id > 0)
            {
                $ids[] = $id;
            }
        }

        $typesById = [];
        $store = $this->pokemonStore();
        if ($store !== null && $ids !== [])
        {
            try
            {
                $typesById = $store->fetchTypesFromDetailByIds($ids);
            }
            catch (Throwable)
            {
                $typesById = [];
            }
        }

        foreach ($items as &$item)
        {
            $id = (int) ($item['id'] ?? 0);
            if ($id > 0 && isset($typesById[$id]))
            {
                $item['types'] = $typesById[$id];
            }
        }
        unset($item);

        foreach ($items as &$item)
        {
            if (!empty($item['types']))
            {
                continue;
            }
            $id = (int) ($item['id'] ?? 0);
            if ($id <= 0)
            {
                continue;
            }
            try
            {
                $pokemon = $this->api->getPokemonByIdOrName((string) $id);
                $types = $this->extractTypesFromPokemon($pokemon);
                if ($types !== [])
                {
                    $item['types'] = $types;
                }
            }
            catch (Throwable)
            {
            }
        }
        unset($item);

        return $items;
    }

    /**
     * @param array<string,mixed> $pokemon resposta GET /pokemon/{id}
     * @return list<array{slug:string,label:string}>
     */
    private function extractTypesFromPokemon(array $pokemon): array
    {
        $typesOut = [];
        foreach ($pokemon['types'] ?? [] as $t)
        {
            if (!is_array($t) || !isset($t['type']['name']))
            {
                continue;
            }
            $tslug = strtolower((string) $t['type']['name']);
            if ($tslug === '')
            {
                continue;
            }
            $typesOut[] = [
                'slug' => $tslug,
                'label' => PokeLocalizedStrings::typeLabel($tslug),
            ];
        }

        return $typesOut;
    }

    /**
     * @return list<array{name:string,species_id:int}>
     */
    private function collectMergedRegionalSpecies(string $regionSlug): array
    {
        $region = $this->api->getRegionByIdOrName($regionSlug);
        $refs = $region['pokedexes'] ?? [];
        if (!is_array($refs) || $refs === [])
        {
            throw new InvalidArgumentException(Lang::get('region_no_pokedex'));
        }

        $seen = [];
        $ordered = [];

        foreach ($refs as $ref)
        {
            if (!is_array($ref))
            {
                continue;
            }
            $dexName = (string) ($ref['name'] ?? '');
            $dexUrl = (string) ($ref['url'] ?? '');
            if ($dexUrl === '' || !$this->shouldIncludeRegionalPokedex($dexName))
            {
                continue;
            }
            $dex = $this->api->fetchJson($dexUrl);
            foreach ($dex['pokemon_entries'] ?? [] as $entry)
            {
                if (!is_array($entry))
                {
                    continue;
                }
                $sp = $entry['pokemon_species'] ?? null;
                if (!is_array($sp))
                {
                    continue;
                }
                $name = strtolower(trim((string) ($sp['name'] ?? '')));
                if ($name === '')
                {
                    continue;
                }
                if (isset($seen[$name]))
                {
                    continue;
                }
                $seen[$name] = true;
                $spUrl = (string) ($sp['url'] ?? '');
                $ordered[] = [
                    'name' => $name,
                    'species_id' => PokeApiService::extractIdFromUrl($spUrl),
                ];
            }
        }

        if ($ordered === [])
        {
            throw new InvalidArgumentException(Lang::get('region_no_entries'));
        }

        return $ordered;
    }

    private function shouldIncludeRegionalPokedex(string $dexName): bool
    {
        $n = strtolower($dexName);
        if ($n === '' || $n === 'national')
        {
            return false;
        }
        if (str_contains($n, 'letsgo') || str_contains($n, 'lets-go'))
        {
            return false;
        }
        /** @var list<string> */
        static $exclude = ['lumiose-city', 'hyperspace'];
        return !in_array($n, $exclude, true);
    }

    /**
     * @return array{id:int,name:string,image:string}
     */
    private function listItemFromPokemonNameAndId(string $name, int $id): array
    {
        $name = strtolower(trim($name));

        return [
            'id' => $id,
            'name' => $name,
            'image' => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' . $id . '.png',
        ];
    }

    /**
     * Detalhe + evoluções + textos localizados quando disponíveis na API.
     *
     * @return array<string,mixed>
     */
    public function findDetail(string $idOrName): array
    {
        try
        {
            $pokemon = $this->api->getPokemonByIdOrName($idOrName);
        }
        catch (InvalidArgumentException $e)
        {
            throw $e;
        }
        catch (Throwable $e)
        {
            throw new RuntimeException(Lang::get('load_pokemon_failed'), 0, $e);
        }

        $detailId = (int) ($pokemon['id'] ?? 0);
        $store = $this->pokemonStore();
        if ($store !== null && $detailId > 0)
        {
            try
            {
                $row = $store->getDetailPayloadRow($detailId);
                if ($row !== null)
                {
                    $cached = $row['payload'];
                    if (is_array($cached) && $this->detailPayloadIsCurrent($cached) && $this->detailCacheMatchesLocale($cached))
                    {
                        $remapped = $this->remapDetailPayload($cached);
                        if ($remapped !== null)
                        {
                            unset($remapped['meta']);
                            $remapped['meta'] = [
                                'detail_source' => 'database',
                                'detail_cached_at' => $row['updated_at'] !== '' ? $row['updated_at'] : null,
                                'locale' => LocaleService::getAppLocale(),
                            ];

                            return $this->stripI18nSourceFromDetail($remapped);
                        }
                    }
                }
            }
            catch (Throwable)
            {
            }
        }

        $speciesUrl = $pokemon['species']['url'] ?? '';
        $species = null;
        $evolutionStages = [];
        $evolutionChainUrl = null;

        if ($speciesUrl !== '')
        {
            try
            {
                $species = $this->api->getSpeciesByUrl($speciesUrl);
                $chainUrl = $species['evolution_chain']['url'] ?? null;
                if (is_string($chainUrl) && $chainUrl !== '')
                {
                    $evolutionChainUrl = $chainUrl;
                    $chain = $this->api->getEvolutionChainByUrl($chainUrl);
                    $root = $chain['chain'] ?? null;
                    if (is_array($root))
                    {
                        $evolutionStages = $this->buildEvolutionStages($root);
                        $evolutionStages = $this->enrichEvolutionDisplayNames($evolutionStages);
                    }
                }
            }
            catch (Throwable)
            {
                $evolutionStages = [];
            }
        }

        $out = [
            'pokemon' => $this->mapPokemonRich($pokemon, is_array($species) ? $species : null),
            'evolution_stages' => $evolutionStages,
            'evolution_chain_url' => $evolutionChainUrl,
        ];
        $liveAt = (new \DateTimeImmutable('now'))->format(\DateTimeInterface::ATOM);
        $out['meta'] = [
            'detail_source' => 'live',
            'detail_cached_at' => $liveAt,
            'locale' => LocaleService::getAppLocale(),
        ];
        $out['_i18n_source'] = $this->buildI18nSource($pokemon, $species, $evolutionStages, $evolutionChainUrl);
        if ($store !== null && $detailId > 0)
        {
            try
            {
                $store->saveDetailPayload($detailId, $out);
            }
            catch (Throwable)
            {
            }
        }

        return $this->stripI18nSourceFromDetail($out);
    }

    /**
     * @param array<string,mixed> $detail
     * @return array<string,mixed>
     */
    private function stripI18nSourceFromDetail(array $detail): array
    {
        unset($detail['_i18n_source']);

        return $detail;
    }

    /**
     * Dados brutos da API para remapear textos sem nova chamada à PokeAPI.
     *
     * @param array<string,mixed> $pokemon
     * @param array<string,mixed>|null $species
     * @param list<list<array<string,mixed>>> $evolutionStages
     * @return array<string,mixed>
     */
    private function buildI18nSource(array $pokemon, ?array $species, array $evolutionStages, ?string $evolutionChainUrl): array
    {
        $abilitiesRaw = [];
        foreach ($pokemon['abilities'] ?? [] as $a)
        {
            if (!is_array($a) || !isset($a['ability']['name']))
            {
                continue;
            }
            $aslug = strtolower((string) $a['ability']['name']);
            $url = (string) ($a['ability']['url'] ?? '');
            if ($url === '')
            {
                continue;
            }
            try
            {
                $abilitiesRaw[$aslug] = $this->api->fetchJson($url);
            }
            catch (Throwable)
            {
            }
        }

        $movesRaw = [];
        foreach ($pokemon['moves'] ?? [] as $mv)
        {
            if (!is_array($mv) || !isset($mv['move']['name']))
            {
                continue;
            }
            $mslug = strtolower((string) $mv['move']['name']);
            $url = (string) ($mv['move']['url'] ?? '');
            if ($url !== '' && !isset($movesRaw[$mslug]))
            {
                try
                {
                    $movesRaw[$mslug] = $this->api->fetchJson($url);
                }
                catch (Throwable)
                {
                }
            }
        }

        return [
            'pokemon' => $pokemon,
            'species' => is_array($species) ? $species : null,
            'evolution_stages' => $evolutionStages,
            'evolution_chain_url' => $evolutionChainUrl,
            'abilities' => $abilitiesRaw,
            'moves' => $movesRaw,
        ];
    }

    /**
     * @param array<string,mixed> $cached
     * @return array<string,mixed>|null
     */
    private function remapDetailPayload(array $cached): ?array
    {
        $source = $cached['_i18n_source'] ?? null;
        if (is_array($source) && isset($source['pokemon']) && is_array($source['pokemon']))
        {
            $pokemonRaw = $source['pokemon'];
            $species = isset($source['species']) && is_array($source['species']) ? $source['species'] : null;
            $stages = is_array($source['evolution_stages'] ?? null) ? $source['evolution_stages'] : [];
            $chainUrl = isset($source['evolution_chain_url']) ? (string) $source['evolution_chain_url'] : null;
            $rich = $this->mapPokemonRichFromSource(
                $pokemonRaw,
                $species,
                is_array($source['abilities'] ?? null) ? $source['abilities'] : [],
                is_array($source['moves'] ?? null) ? $source['moves'] : []
            );

            return [
                'pokemon' => $rich,
                'evolution_stages' => $this->remapEvolutionDisplayNames($stages),
                'evolution_chain_url' => $chainUrl,
            ];
        }

        $poke = $cached['pokemon'] ?? null;
        if (!is_array($poke) || !isset($poke['type_matchups'], $poke['sprites']))
        {
            return null;
        }

        return [
            'pokemon' => $poke,
            'evolution_stages' => is_array($cached['evolution_stages'] ?? null) ? $cached['evolution_stages'] : [],
            'evolution_chain_url' => $cached['evolution_chain_url'] ?? null,
        ];
    }

    /**
     * @param array<string,mixed> $pokemon
     * @param array<string,mixed>|null $species
     * @param array<string, array<string,mixed>> $abilitiesCache
     * @param array<string, array<string,mixed>> $movesCache
     * @return array<string,mixed>
     */
    private function mapPokemonRichFromSource(array $pokemon, ?array $species, array $abilitiesCache, array $movesCache = []): array
    {
        $rich = $this->mapPokemonRich($pokemon, $species);
        if ($movesCache !== [])
        {
            $movesOut = [];
            foreach ($rich['moves_sample'] ?? [] as $mv)
            {
                if (!is_array($mv))
                {
                    continue;
                }
                $mslug = (string) ($mv['name'] ?? '');
                $moveData = $movesCache[$mslug] ?? null;
                $label = is_array($moveData)
                    ? PokeLocalizedStrings::pickLocalizedName($moveData['names'] ?? [], $mslug)
                    : PokeLocalizedStrings::pickLocalizedName([], $mslug);
                $movesOut[] = [
                    'name' => $mslug,
                    'label' => $label,
                    'level' => (int) ($mv['level'] ?? 0),
                ];
            }
            if ($movesOut !== [])
            {
                $rich['moves_sample'] = $movesOut;
            }
        }
        if ($abilitiesCache === [])
        {
            return $rich;
        }
        $abilitiesOut = [];
        foreach ($pokemon['abilities'] ?? [] as $a)
        {
            if (!is_array($a) || !isset($a['ability']['name']))
            {
                continue;
            }
            $aslug = strtolower((string) $a['ability']['name']);
            $abData = $abilitiesCache[$aslug] ?? null;
            $apiName = is_array($abData) ? PokeLocalizedStrings::pickLocalizedName($abData['names'] ?? [], $aslug) : '';
            $abilityDesc = is_array($abData)
                ? PokeLocalizedStrings::pickAbilityEffect($abData['effect_entries'] ?? [])
                : '';
            $abilitiesOut[] = [
                'slug' => $aslug,
                'label' => PokeLocalizedStrings::abilityLabel($aslug, $apiName),
                'description' => $abilityDesc,
                'is_hidden' => !empty($a['is_hidden']),
            ];
        }
        if ($abilitiesOut !== [])
        {
            $rich['abilities'] = $abilitiesOut;
        }

        return $rich;
    }

    /**
     * @param list<list<array<string,mixed>>> $stages
     * @return list<list<array{name:string,species_id:int,display_name:string,trigger_label?:string}>>
     */
    private function remapEvolutionDisplayNames(array $stages): array
    {
        foreach ($stages as $gi => $group)
        {
            if (!is_array($group))
            {
                continue;
            }
            foreach ($group as $i => $entry)
            {
                if (!is_array($entry))
                {
                    continue;
                }
                $slug = (string) ($entry['name'] ?? '');
                $display = $slug !== '' ? ucfirst(str_replace('-', ' ', $slug)) : '';
                $sid = (int) ($entry['species_id'] ?? 0);
                if ($sid > 0)
                {
                    try
                    {
                        $sp = $this->api->fetchJson(POKEAPI_BASE . '/pokemon-species/' . $sid);
                        $picked = PokeLocalizedStrings::pickLocalizedName($sp['names'] ?? [], $slug);
                        if ($picked !== '')
                        {
                            $display = $picked;
                        }
                    }
                    catch (Throwable)
                    {
                    }
                }
                $stages[$gi][$i]['display_name'] = $display;
            }
        }

        return $stages;
    }

    /**
     * @param list<list<array{name:string,species_id:int,display_name?:string}>> $stages
     * @return list<list<array{name:string,species_id:int,display_name:string}>>
     */
    private function enrichEvolutionDisplayNames(array $stages): array
    {
        foreach ($stages as $gi => $group)
        {
            foreach ($group as $i => $entry)
            {
                $sid = (int) ($entry['species_id'] ?? 0);
                $slug = (string) ($entry['name'] ?? '');
                $display = $slug !== '' ? ucfirst(str_replace('-', ' ', $slug)) : '';
                if ($sid > 0)
                {
                    try
                    {
                        $sp = $this->api->fetchJson(POKEAPI_BASE . '/pokemon-species/' . $sid);
                        $picked = PokeLocalizedStrings::pickLocalizedName($sp['names'] ?? [], $slug);
                        if ($picked !== '')
                        {
                            $display = $picked;
                        }
                    }
                    catch (Throwable)
                    {
                        /* mantém display derivado do slug */
                    }
                }
                $stages[$gi][$i]['display_name'] = $display;
            }
        }
        return $stages;
    }

    /**
     * @return list<list<array{name:string,species_id:int,display_name:string}>>
     */
    /**
     * @param array<string,mixed> $cached
     */
    private function detailCacheMatchesLocale(array $cached): bool
    {
        if (isset($cached['_i18n_source']) && is_array($cached['_i18n_source']))
        {
            return true;
        }
        $metaLocale = isset($cached['meta']['locale']) ? (string) $cached['meta']['locale'] : '';

        return $metaLocale === LocaleService::getAppLocale();
    }

    /**
     * @param array<string,mixed> $cached
     */
    private function detailPayloadIsCurrent(array $cached): bool
    {
        $poke = $cached['pokemon'] ?? null;
        if (!is_array($poke))
        {
            return false;
        }
        $abilities = $poke['abilities'] ?? [];
        if (isset($cached['_i18n_source']) && is_array($cached['_i18n_source']))
        {
            return true;
        }
        if ($abilities !== [] && is_array($abilities[0] ?? null) && !array_key_exists('description', $abilities[0]))
        {
            return false;
        }
        $stages = $cached['evolution_stages'] ?? [];
        if ($stages !== [] && is_array($stages[0][0] ?? null) && !array_key_exists('trigger_label', $stages[0][0]))
        {
            return false;
        }

        return true;
    }

    /**
     * @param list<array<string,mixed>> $detailsList
     */
    private function formatEvolutionTrigger(array $detailsList): string
    {
        if ($detailsList === [])
        {
            return '';
        }
        $d = $detailsList[0] ?? null;
        if (!is_array($d))
        {
            return '';
        }
        $trigger = strtolower((string) ($d['trigger']['name'] ?? ''));
        if ($trigger === 'level-up')
        {
            $lvl = isset($d['min_level']) ? (int) $d['min_level'] : 0;
            if ($lvl > 0)
            {
                return 'Nv. ' . $lvl;
            }

            return Lang::get('evo_level');
        }
        if ($trigger === 'use-item')
        {
            $item = strtolower((string) ($d['item']['name'] ?? ''));
            if ($item !== '')
            {
                return ucfirst(str_replace('-', ' ', $item));
            }

            return Lang::get('evo_item');
        }
        if ($trigger === 'trade')
        {
            return Lang::get('evo_trade');
        }
        if ($trigger === 'shed')
        {
            return Lang::get('evo_other');
        }
        $happiness = isset($d['min_happiness']) ? (int) $d['min_happiness'] : -1;
        if ($happiness >= 0)
        {
            return Lang::get('evo_friendship');
        }

        return $trigger !== '' ? ucfirst(str_replace('-', ' ', $trigger)) : Lang::get('evo_other');
    }

    /**
     * @return list<list<array{name:string,species_id:int,display_name:string,trigger_label:string}>>
     */
    private function buildEvolutionStages(array $rootNode): array
    {
        $byDepth = [];
        $queue = [['node' => $rootNode, 'depth' => 0, 'trigger' => '']];

        while ($queue !== [])
        {
            $item = array_shift($queue);
            $depth = $item['depth'];
            $node = $item['node'];
            $triggerLabel = (string) ($item['trigger'] ?? '');
            if (!isset($byDepth[$depth]))
            {
                $byDepth[$depth] = [];
            }
            $species = $node['species'] ?? [];
            $name = isset($species['name']) ? (string) $species['name'] : '';
            $url = isset($species['url']) ? (string) $species['url'] : '';
            $byDepth[$depth][] = [
                'name' => $name,
                'species_id' => PokeApiService::extractIdFromUrl($url),
                'display_name' => '',
                'trigger_label' => $triggerLabel,
            ];
            foreach ($node['evolves_to'] ?? [] as $child)
            {
                if (!is_array($child))
                {
                    continue;
                }
                $childTrigger = $this->formatEvolutionTrigger($child['evolution_details'] ?? []);
                $queue[] = ['node' => $child, 'depth' => $depth + 1, 'trigger' => $childTrigger];
            }
        }

        ksort($byDepth);

        return array_values($byDepth);
    }

    /**
     * @param array<string,mixed> $pokemon
     * @param array<string,mixed>|null $species
     * @return array<string,mixed>
     */
    private function mapPokemonRich(array $pokemon, ?array $species): array
    {
        $id = (int) ($pokemon['id'] ?? 0);
        $slug = strtolower((string) ($pokemon['name'] ?? ''));

        $sprites = $pokemon['sprites'] ?? [];
        $other = $sprites['other'] ?? [];
        $official = $other['official-artwork'] ?? [];
        $img = $official['front_default'] ?? ($sprites['front_default'] ?? null);

        $typesOut = $this->extractTypesFromPokemon($pokemon);

        $abilitiesOut = [];
        foreach ($pokemon['abilities'] ?? [] as $a)
        {
            if (!is_array($a) || !isset($a['ability']['name']))
            {
                continue;
            }
            $aslug = strtolower((string) $a['ability']['name']);
            $url = (string) ($a['ability']['url'] ?? '');
            $apiName = '';
            $abData = null;
            if ($url !== '')
            {
                try
                {
                    $abData = $this->api->fetchJson($url);
                    $apiName = PokeLocalizedStrings::pickLocalizedName($abData['names'] ?? [], $aslug);
                }
                catch (Throwable)
                {
                    $apiName = '';
                    $abData = null;
                }
            }
            $abilityDesc = is_array($abData)
                ? PokeLocalizedStrings::pickAbilityEffect($abData['effect_entries'] ?? [])
                : '';
            $abilitiesOut[] = [
                'slug' => $aslug,
                'label' => PokeLocalizedStrings::abilityLabel($aslug, $apiName),
                'description' => $abilityDesc,
                'is_hidden' => !empty($a['is_hidden']),
            ];
        }

        $nameDisplay = PokeLocalizedStrings::pickLocalizedName(
            is_array($species) ? ($species['names'] ?? []) : [],
            $slug
        );

        $genus = is_array($species)
            ? PokeLocalizedStrings::pickGenus($species['genera'] ?? [], $slug)
            : PokeLocalizedStrings::pickGenus([], $slug);
        $flavor = is_array($species)
            ? PokeLocalizedStrings::pickFlavorText($species['flavor_text_entries'] ?? [], $slug)
            : PokeLocalizedStrings::pickFlavorText([], $slug);
        $flavorText = $flavor['text'];
        $flavorLang = $flavor['language'];

        $habitatRef = is_array($species) && isset($species['habitat']) ? $species['habitat'] : null;
        $habitatSlug = is_array($habitatRef) ? strtolower((string) ($habitatRef['name'] ?? '')) : '';
        $habitatLabel = PokeLocalizedStrings::habitatLabel(is_array($habitatRef) ? $habitatRef : null, $habitatSlug);
        $captureRate = is_array($species) && isset($species['capture_rate']) ? (int) $species['capture_rate'] : null;
        $baseHappiness = is_array($species) && isset($species['base_happiness']) ? (int) $species['base_happiness'] : null;
        $isBaby = is_array($species) && !empty($species['is_baby']);
        $isLegendary = is_array($species) && !empty($species['is_legendary']);
        $isMythical = is_array($species) && !empty($species['is_mythical']);

        $statsOut = [];
        $evYieldOut = [];
        foreach ($pokemon['stats'] ?? [] as $s)
        {
            if (!is_array($s) || !isset($s['stat']['name']))
            {
                continue;
            }
            $sn = strtolower((string) $s['stat']['name']);
            $base = isset($s['base_stat']) ? (int) $s['base_stat'] : 0;
            $statsOut[] = [
                'id' => $sn,
                'label' => PokeLocalizedStrings::statLabel($sn),
                'base' => $base,
            ];
            $effort = isset($s['effort']) ? (int) $s['effort'] : 0;
            if ($effort > 0)
            {
                $evYieldOut[] = [
                    'id' => $sn,
                    'label' => PokeLocalizedStrings::statLabel($sn),
                    'effort' => $effort,
                ];
            }
        }

        $typeSlugs = array_map(static fn(array $t): string => (string) ($t['slug'] ?? ''), $typesOut);
        $matchups = TypeChart::defensiveMatchups($typeSlugs);

        $generation = $this->extractGeneration(is_array($species) ? $species : null);
        $rarity = $this->resolveRarity($isMythical, $isLegendary, $isBaby, $captureRate);

        $spritesOut = [
            'official' => $img,
            'front' => $sprites['front_default'] ?? null,
            'front_shiny' => $sprites['front_shiny'] ?? null,
        ];

        $colorSlug = '';
        $shapeSlug = '';
        if (is_array($species))
        {
            if (isset($species['color']) && is_array($species['color']))
            {
                $colorSlug = strtolower((string) ($species['color']['name'] ?? ''));
            }
            if (isset($species['shape']) && is_array($species['shape']))
            {
                $shapeSlug = strtolower((string) ($species['shape']['name'] ?? ''));
            }
        }

        $genderRate = is_array($species) && isset($species['gender_rate']) ? (int) $species['gender_rate'] : null;
        $gender = $this->formatGenderRate($genderRate);

        $movesOut = $this->extractLevelUpMoves($pokemon);

        $statsTotal = 0;
        foreach ($statsOut as $st)
        {
            $statsTotal += (int) ($st['base'] ?? 0);
        }

        return [
            'id' => $id,
            'name' => $slug,
            'name_display' => $nameDisplay,
            'image' => $img,
            'sprites' => $spritesOut,
            'types' => $typesOut,
            'height' => isset($pokemon['height']) ? (int) $pokemon['height'] : 0,
            'weight' => isset($pokemon['weight']) ? (int) $pokemon['weight'] : 0,
            'abilities' => $abilitiesOut,
            'genus' => $genus,
            'flavor_text' => $flavorText,
            'flavor_language' => $flavorLang,
            'stats' => $statsOut,
            'stats_total' => $statsTotal,
            'habitat_slug' => $habitatSlug,
            'habitat_label' => $habitatLabel,
            'capture_rate' => $captureRate,
            'base_happiness' => $baseHappiness,
            'is_baby' => $isBaby,
            'is_legendary' => $isLegendary,
            'is_mythical' => $isMythical,
            'generation' => $generation,
            'rarity' => $rarity['slug'],
            'rarity_label' => $rarity['label'],
            'color_slug' => $colorSlug,
            'color_label' => PokeLocalizedStrings::resourceLabel(
                is_array($species) && isset($species['color']) ? $species['color'] : null,
                $colorSlug
            ),
            'shape_slug' => $shapeSlug,
            'shape_label' => PokeLocalizedStrings::resourceLabel(
                is_array($species) && isset($species['shape']) ? $species['shape'] : null,
                $shapeSlug
            ),
            'gender_rate' => $genderRate,
            'gender_label' => $gender,
            'base_experience' => isset($pokemon['base_experience']) ? (int) $pokemon['base_experience'] : null,
            'type_matchups' => $matchups,
            'moves_sample' => $movesOut,
            'ev_yield' => $evYieldOut,
        ];
    }

    /**
     * @param array<string,mixed>|null $species
     * @return array{id:int,name:string,label:string}|null
     */
    private function extractGeneration(?array $species): ?array
    {
        if (!is_array($species))
        {
            return null;
        }
        $genUrl = $species['generation']['url'] ?? '';
        if (!is_string($genUrl) || $genUrl === '')
        {
            return null;
        }
        try
        {
            $gen = $this->api->fetchJson($genUrl);
        }
        catch (Throwable)
        {
            return null;
        }
        $gid = PokeApiService::extractIdFromUrl($genUrl);
        $name = strtolower((string) ($gen['name'] ?? 'generation-' . $gid));
        $num = $gid > 0 ? $gid : (int) preg_replace('/\D+/', '', $name);

        return [
            'id' => $num,
            'name' => $name,
            'label' => $num > 0 ? Lang::get('generation_n', ['n' => $num]) : ucfirst(str_replace('-', ' ', $name)),
        ];
    }

    /**
     * @return array{slug:string,label:string}
     */
    private function resolveRarity(bool $mythical, bool $legendary, bool $baby, ?int $captureRate): array
    {
        if ($mythical)
        {
            return ['slug' => 'mythical', 'label' => Lang::get('rarity_mythical')];
        }
        if ($legendary)
        {
            return ['slug' => 'legendary', 'label' => Lang::get('rarity_legendary')];
        }
        if ($baby)
        {
            return ['slug' => 'baby', 'label' => Lang::get('rarity_baby')];
        }
        if ($captureRate !== null && $captureRate > 0 && $captureRate <= 25)
        {
            return ['slug' => 'rare', 'label' => Lang::get('rarity_rare')];
        }

        return ['slug' => 'common', 'label' => Lang::get('rarity_common')];
    }

    private function formatGenderRate(?int $rate): string
    {
        if ($rate === null)
        {
            return Lang::get('gender_unknown');
        }
        if ($rate === -1)
        {
            return Lang::get('gender_none');
        }
        if ($rate === 0)
        {
            return Lang::get('gender_male_only');
        }
        if ($rate === 8)
        {
            return Lang::get('gender_female_only');
        }
        $femalePct = ($rate / 8) * 100;
        $malePct = 100 - $femalePct;

        return Lang::get('gender_ratio', ['male' => round($malePct), 'female' => round($femalePct)]);
    }

    /**
     * @param array<string,mixed> $pokemon
     * @return list<array{name:string,label:string,level:int}>
     */
    private function extractLevelUpMoves(array $pokemon): array
    {
        $candidates = [];
        foreach ($pokemon['moves'] ?? [] as $mv)
        {
            if (!is_array($mv) || !isset($mv['move']['name']))
            {
                continue;
            }
            $moveRef = $mv['move'];
            $moveSlug = strtolower((string) ($moveRef['name'] ?? ''));
            $level = null;
            foreach ($mv['version_group_details'] ?? [] as $vg)
            {
                if (!is_array($vg))
                {
                    continue;
                }
                $method = $vg['move_learn_method']['name'] ?? '';
                if ($method === 'level-up')
                {
                    $level = (int) ($vg['level_learned_at'] ?? 0);
                    break;
                }
            }
            if ($level === null)
            {
                continue;
            }
            $label = $moveSlug;
            $moveUrl = is_array($moveRef) ? trim((string) ($moveRef['url'] ?? '')) : '';
            if ($moveUrl !== '')
            {
                $moveData = TranslationCache::getOrFetch(
                    $moveUrl,
                    fn(string $u): array => $this->api->fetchJson($u)
                );
                $label = PokeLocalizedStrings::pickLocalizedName($moveData['names'] ?? [], $moveSlug);
            }
            else
            {
                $label = PokeLocalizedStrings::pickLocalizedName([], $moveSlug);
            }
            $candidates[] = ['name' => $moveSlug, 'label' => $label, 'level' => $level];
        }
        usort($candidates, static fn(array $a, array $b): int => $a['level'] <=> $b['level']);

        return array_slice($candidates, 0, 8);
    }
}
