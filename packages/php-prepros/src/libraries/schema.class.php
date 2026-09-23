<?php

declare(strict_types=1);

/**
 * SCHEMA — JSON Schema validator backed by the native `jsonk` extension
 * (statically built into @kirigami/php-wasm — see php-kirigami/php-jsonk),
 * with an Ajv-like API.
 *
 * jsonk targets draft 2020-12 and takes JSON strings, so this class encodes
 * the PHP schema and data first. The encoding step keeps the schemas written
 * for the previous pure-PHP validator working:
 *   - an empty PHP array in a schema position (`'properties' => []`, a `[]`
 *     sub-schema) becomes `{}` instead of JSON `[]`;
 *   - draft-07 tuple `items` (a list of schemas) becomes `prefixItems`, and
 *     `additionalItems` becomes `items`;
 *   - `format: url` becomes `format: uri`.
 *
 * Errors keep the previous `"path: message"` string format, with paths such
 * as `(root)`, `name` or `tags[1]`.
 *
 * Kept the old implementation as SCHEMA_LEGACY (schema-legacy.class.php) —
 * untouched, still autoloadable — as a rollback path.
 *
 * Usage:
 *   $validator = new SCHEMA(['type' => 'object', 'required' => ['name']]);
 *   if (!$validator->isValid($data)) print_r($validator->getErrors());
 */
final class SCHEMA
{
    /** Keywords whose value is a single sub-schema. */
    private const SUBSCHEMA = [
        'additionalItems', 'additionalProperties', 'contains', 'else', 'if', 'items',
        'not', 'propertyNames', 'then', 'unevaluatedItems', 'unevaluatedProperties',
    ];

    /** Keywords whose value is a list of sub-schemas. */
    private const SUBSCHEMA_LIST = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];

    /** Keywords whose value maps names to sub-schemas. */
    private const SUBSCHEMA_MAP = ['$defs', 'definitions', 'dependentSchemas', 'patternProperties', 'properties'];

    private string $schemaJson;

    /** @var string[] */
    private array $errors = [];

    /**
     * @param array<string,mixed> $schema The root schema (JSON Schema format).
     */
    public function __construct(array $schema)
    {
        if (!function_exists('jsonk_validate')) {
            throw new RuntimeException('SCHEMA requires the jsonk extension; use SCHEMA_LEGACY without it.');
        }
        $this->schemaJson = json_encode(self::normalize($schema), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    /**
     * Validates data. Returns true/false, like Ajv's `validate()`.
     * Errors are available via getErrors().
     */
    public function isValid(mixed $data): bool
    {
        $this->errors = [];

        try {
            $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            $this->errors[] = '(root): value cannot be encoded as JSON: ' . $e->getMessage();
            return false;
        }

        if (jsonk_validate($json, $this->schemaJson)) {
            return true;
        }

        $violations = jsonk_get_last_errors();
        if (!$violations) {
            // Schema-level failure (unresolvable $ref, invalid keyword value…):
            // jsonk reports it through its last error message only.
            $this->errors[] = '(root): ' . jsonk_last_error_msg();
            return false;
        }

        $decoded = json_decode($json);
        foreach ($violations as $violation) {
            $this->errors[] = self::displayPath($violation['path'], $decoded) . ': ' . $violation['message'];
        }
        return false;
    }

    /**
     * Alias closer to Ajv's semantics (validate($data)).
     */
    public function validate(mixed $data): bool
    {
        return $this->isValid($data);
    }

    /**
     * @return string[] List of error messages (path: message).
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    /**
     * Prepares a schema node for JSON encoding (see the class comment).
     */
    private static function normalize(mixed $schema): mixed
    {
        if (is_object($schema)) {
            $schema = get_object_vars($schema);
        }
        if (!is_array($schema)) {
            return $schema; // Boolean schema, or an invalid value jsonk reports.
        }

        if (isset($schema['items']) && is_array($schema['items']) && $schema['items'] !== [] && array_is_list($schema['items'])) {
            $schema['prefixItems'] = $schema['items'];
            unset($schema['items']);
            if (array_key_exists('additionalItems', $schema)) {
                $schema['items'] = $schema['additionalItems'];
                unset($schema['additionalItems']);
            }
        }

        if (($schema['format'] ?? null) === 'url') {
            $schema['format'] = 'uri';
        }

        foreach ($schema as $keyword => $value) {
            if (in_array($keyword, self::SUBSCHEMA, true)) {
                $schema[$keyword] = self::normalize($value);
            } elseif (in_array($keyword, self::SUBSCHEMA_LIST, true) && is_array($value)) {
                $schema[$keyword] = array_map(self::normalize(...), array_values($value));
            } elseif (in_array($keyword, self::SUBSCHEMA_MAP, true) && (is_array($value) || is_object($value))) {
                $schema[$keyword] = (object) array_map(self::normalize(...), is_object($value) ? get_object_vars($value) : $value);
            } elseif ($keyword === 'dependentRequired' && is_array($value)) {
                $schema[$keyword] = (object) $value;
            }
        }

        // An object, even when empty or keyed 0..n.
        return (object) $schema;
    }

    /**
     * Converts a jsonk JSON Pointer ("/tags/1") to the previous validator's
     * path format ("tags[1]"), using the data to tell array indexes from
     * object keys.
     */
    private static function displayPath(string $pointer, mixed $data): string
    {
        $path = '';
        $node = $data;

        foreach (explode('/', ltrim($pointer, '/')) as $segment) {
            if ($segment === '') {
                continue;
            }
            $segment = str_replace(['~1', '~0'], ['/', '~'], $segment);

            if (is_array($node)) {
                $path .= "[{$segment}]";
                $node = $node[(int) $segment] ?? null;
            } else {
                $path .= $path === '' ? $segment : ".{$segment}";
                $node = is_object($node) ? ($node->{$segment} ?? null) : null;
            }
        }

        return $path === '' ? '(root)' : $path;
    }
}
