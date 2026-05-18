<?php

/**
 * Resumos para cards enriquecidos: ?ids=1,2,3 (máx. 24)
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

(new PokemonController())->cards();
