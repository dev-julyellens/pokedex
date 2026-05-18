<?php

declare(strict_types=1);

/**
 * Textos da API por locale (pt-BR, en, es, ja).
 */
final class Lang
{
    /** @var array<string, array<string, string>> */
    private static array $cache = [];

    public static function setLocale(string $locale): void
    {
        LocaleService::setAppLocale($locale);
    }

    public static function getLocale(): string
    {
        return LocaleService::getAppLocale();
    }

    /**
     * @param array<string, string|int|float> $replace
     */
    public static function get(string $key, array $replace = []): string
    {
        $fileKey = LocaleService::langFileKey(LocaleService::getAppLocale());
        if (!isset(self::$cache[$fileKey])) {
            $path = __DIR__ . '/' . $fileKey . '.php';
            if (!is_file($path)) {
                $path = __DIR__ . '/pt_BR.php';
            }
            /** @var array<string, string> $loaded */
            $loaded = require $path;
            self::$cache[$fileKey] = $loaded;
        }

        $strings = self::$cache[$fileKey];
        $text = $strings[$key] ?? self::fallbackEnglish($key) ?? $key;
        foreach ($replace as $name => $value) {
            $text = str_replace('{' . $name . '}', (string) $value, $text);
        }

        return $text;
    }

    private static function fallbackEnglish(string $key): ?string
    {
        if (LocaleService::getAppLocale() === 'en') {
            return null;
        }
        if (!isset(self::$cache['en'])) {
            $path = __DIR__ . '/en.php';
            if (!is_file($path)) {
                return null;
            }
            /** @var array<string, string> $loaded */
            $loaded = require $path;
            self::$cache['en'] = $loaded;
        }

        return self::$cache['en'][$key] ?? null;
    }
}
