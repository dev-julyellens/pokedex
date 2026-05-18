<?php

/**
 * Controller (MVC) — HTTP para Pokémon: lista paginada e detalhe.
 */

declare(strict_types=1);

class PokemonController
{
    private PokemonModel $pokemonModel;
    private SearchHistoryModel $historyModel;

    public function __construct(
        ?PokemonModel $pokemonModel = null,
        ?SearchHistoryModel $historyModel = null
    )
    {
        $this->pokemonModel = $pokemonModel ?? new PokemonModel();
        $this->historyModel = $historyModel ?? new SearchHistoryModel();
    }

    /** GET api/list.php?page=1&limit=20&region=kanto (region opcional) */
    public function index(): void
    {
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
        $region = isset($_GET['region']) ? trim((string) $_GET['region']) : '';
        $type = isset($_GET['type']) ? trim((string) $_GET['type']) : '';
        $idMin = isset($_GET['id_min']) ? (int) $_GET['id_min'] : 0;
        $idMax = isset($_GET['id_max']) ? (int) $_GET['id_max'] : 0;

        try
        {
            $data = $this->pokemonModel->findListPage(
                $page,
                $limit,
                $region !== '' ? $region : null,
                $type !== '' ? $type : null,
                $idMin > 0 ? $idMin : null,
                $idMax > 0 ? $idMax : null
            );
            JsonView::success($data);
        }
        catch (InvalidArgumentException $e)
        {
            JsonView::error($e->getMessage(), 404);
        }
        catch (Throwable $e)
        {
            JsonView::error($e->getMessage(), 502);
        }
    }

    /** GET api/pokemon.php?id= ou ?name= */
    public function show(): void
    {
        $name = isset($_GET['name']) ? (string) $_GET['name'] : '';
        $id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';

        $q = '';
        if ($id !== '')
        {
            $q = $id;
        }
        elseif ($name !== '')
        {
            $q = $name;
        }
        else
        {
            JsonView::error(Lang::get('inform_id_or_name'), 400);
        }

        try
        {
            $detail = $this->pokemonModel->findDetail($q);
            if (DatabaseService::available())
            {
                $this->historyModel->record($q);
            }
            JsonView::success($detail);
        }
        catch (InvalidArgumentException $e)
        {
            JsonView::error(Lang::get('pokemon_not_found'), 404);
        }
        catch (Throwable $e)
        {
            JsonView::error($e->getMessage(), 502);
        }
    }

    /** GET api/cards.php?ids=1,2,3 */
    public function cards(): void
    {
        $raw = trim((string) ($_GET['ids'] ?? ''));
        if ($raw === '')
        {
            JsonView::error(Lang::get('inform_ids'), 400);
        }
        $ids = [];
        foreach (preg_split('/\s*,\s*/', $raw) as $part)
        {
            $n = (int) $part;
            if ($n > 0)
            {
                $ids[] = $n;
            }
        }
        if ($ids === [])
        {
            JsonView::error(Lang::get('inform_ids'), 400);
        }

        try
        {
            $items = $this->pokemonModel->findCardSummaries($ids);
            JsonView::success(['items' => $items]);
        }
        catch (Throwable $e)
        {
            JsonView::error($e->getMessage(), 502);
        }
    }

    /** GET api/search.php?q=pika&limit=80&region=kanto (region opcional) */
    public function search(): void
    {
        $q = trim((string) ($_GET['q'] ?? ''));
        $region = trim((string) ($_GET['region'] ?? ''));
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 80;

        if ($q === '')
        {
            JsonView::error(Lang::get('inform_search_term'), 400);
        }
        if (mb_strlen($q) < 2 && !preg_match('/^\d+$/', $q))
        {
            JsonView::error(Lang::get('search_min_length'), 400);
        }

        try
        {
            $data = $this->pokemonModel->searchGlobal($q, $region !== '' ? $region : null, $limit);
            JsonView::success($data);
        }
        catch (InvalidArgumentException $e)
        {
            JsonView::error($e->getMessage(), 404);
        }
        catch (Throwable $e)
        {
            JsonView::error($e->getMessage(), 502);
        }
    }
}
