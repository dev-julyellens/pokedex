<?php

declare(strict_types=1);

/**
 * Cache em memória (por requisição) de recursos PokeAPI usados na localização.
 */
final class TranslationCache
{
    /** @var array<string, array<string, mixed>> */
    private static array $store = [];

    /**
     * @return array<string, mixed>
     */
    public static function getOrFetch(string $url, ?callable $fetcher = null): array
    {
        $key = trim($url);
        if ($key === '') {
            return [];
        }
        if (isset(self::$store[$key])) {
            return self::$store[$key];
        }
        $fetcher ??= static function (string $u): array {
            $api = new PokeApiService();

            return $api->fetchJson($u);
        };
        try {
            $data = $fetcher($key);
            if (!is_array($data)) {
                $data = [];
            }
        } catch (Throwable) {
            $data = [];
        }
        self::$store[$key] = $data;

        return $data;
    }

    public static function clear(): void
    {
        self::$store = [];
    }
}
