<?php

declare(strict_types=1);

/**
 * Locale da app e cadeia PokeAPI: idioma selecionado → inglês → (demais na API).
 */
final class LocaleService
{
    public const DEFAULT = 'pt-BR';

    /** @var list<string> */
    public const SUPPORTED = ['pt-BR', 'en', 'es', 'ja', 'ko', 'zh-Hans'];

    private static string $appLocale = self::DEFAULT;

    public static function initFromRequest(): void
    {
        $fromQuery = isset($_GET['lang']) ? trim((string) $_GET['lang']) : '';
        if ($fromQuery !== '') {
            self::$appLocale = self::normalizeAppLocale($fromQuery);

            return;
        }

        $header = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
        if (is_string($header) && $header !== '') {
            foreach (explode(',', $header) as $part) {
                $tag = strtolower(trim(explode(';', $part)[0]));
                if ($tag === '') {
                    continue;
                }
                $norm = self::normalizeAppLocale($tag);
                if (in_array($norm, self::SUPPORTED, true)) {
                    self::$appLocale = $norm;

                    return;
                }
            }
        }

        self::$appLocale = self::DEFAULT;
    }

    public static function setAppLocale(string $locale): void
    {
        self::$appLocale = self::normalizeAppLocale($locale);
    }

    public static function getAppLocale(): string
    {
        return self::$appLocale;
    }

    public static function normalizeAppLocale(string $raw): string
    {
        $s = strtolower(str_replace('_', '-', trim($raw)));
        if ($s === 'pt' || $s === 'pt-br' || str_starts_with($s, 'pt-')) {
            return 'pt-BR';
        }
        if ($s === 'en' || str_starts_with($s, 'en-')) {
            return 'en';
        }
        if ($s === 'es' || str_starts_with($s, 'es-')) {
            return 'es';
        }
        if ($s === 'ja' || $s === 'jp' || str_starts_with($s, 'ja-')) {
            return 'ja';
        }
        if ($s === 'ko' || $s === 'kr' || str_starts_with($s, 'ko-')) {
            return 'ko';
        }
        if ($s === 'zh' || $s === 'zh-hans' || $s === 'zh-cn' || str_starts_with($s, 'zh-hans') || str_starts_with($s, 'zh-cn')) {
            return 'zh-Hans';
        }
        if ($s === 'zh-hant' || $s === 'zh-tw' || str_starts_with($s, 'zh-hant') || str_starts_with($s, 'zh-tw')) {
            return 'zh-Hans';
        }

        return self::DEFAULT;
    }

    public static function langFileKey(string $appLocale): string
    {
        return match (self::normalizeAppLocale($appLocale)) {
            'pt-BR' => 'pt_BR',
            'en' => 'en',
            'es' => 'es',
            'ja' => 'ja',
            'ko' => 'ko',
            'zh-Hans' => 'zh_Hans',
            default => 'pt_BR',
        };
    }

    /**
     * Códigos language.name na PokeAPI (prioridade: locale → en).
     *
     * @return list<string>
     */
    public static function pokeApiLanguageChain(?string $appLocale = null): array
    {
        return match (self::normalizeAppLocale($appLocale ?? self::$appLocale)) {
            'pt-BR' => ['pt-BR', 'pt', 'en'],
            'en' => ['en', 'en-gb'],
            'es' => ['es', 'en'],
            'ja' => ['ja', 'en'],
            'ko' => ['ko', 'en'],
            'zh-Hans' => ['zh-Hans', 'zh-Hant', 'en'],
            default => ['en'],
        };
    }
}
