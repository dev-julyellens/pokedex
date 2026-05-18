<?php

declare(strict_types=1);

/**
 * Acesso centralizado aos textos em pt-BR.
 */
final class Lang
{
    /** @var array<string, string>|null */
    private static ?array $strings = null;

    /**
     * @param array<string, string|int|float> $replace
     */
    public static function get(string $key, array $replace = []): string
    {
        if (self::$strings === null) {
            /** @var array<string, string> $loaded */
            $loaded = require __DIR__ . '/pt_BR.php';
            self::$strings = $loaded;
        }

        $text = self::$strings[$key] ?? $key;
        foreach ($replace as $name => $value) {
            $text = str_replace('{' . $name . '}', (string) $value, $text);
        }

        return $text;
    }
}
