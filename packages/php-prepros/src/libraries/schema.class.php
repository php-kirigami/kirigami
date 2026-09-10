<?php

declare(strict_types=1);

/**
 * SchemaValidator
 *
 * A pure PHP JSON Schema validator (Draft 7 style, similar to Ajv),
 * with no external dependencies.
 *
 * Usage example:
 *
 *   $schema = [
 *       'type' => 'object',
 *       'required' => ['name', 'age'],
 *       'properties' => [
 *           'name' => ['type' => 'string', 'minLength' => 1],
 *           'age'  => ['type' => 'integer', 'minimum' => 0],
 *           'tags' => ['type' => 'array', 'items' => ['type' => 'string']],
 *       ],
 *       'additionalProperties' => false,
 *   ];
 *
 *   $validator = new SchemaValidator($schema);
 *
 *   if (!$validator->isValid(['name' => 'Alice', 'age' => 30])) {
 *       foreach ($validator->getErrors() as $error) {
 *           echo $error, PHP_EOL;
 *       }
 *   }
 */
final class SCHEMA
{
    /** @var array<string,mixed> Schema used as the entry point of isValid(). */
    private array $rootSchema;

    /** @var array<string,mixed> Root document used to resolve local $ref pointers. */
    private array $refRoot;

    /** @var string[] */
    private array $errors = [];

    /**
     * @param array<string,mixed> $schema The root schema (JSON Schema format).
     */
    public function __construct(array $schema)
    {
        $this->rootSchema = $schema;
        $this->refRoot = $schema;
    }

    /**
     * Validates data. Returns true/false, like Ajv's `validate()`.
     * Errors are available via getErrors().
     *
     * @param mixed $data
     */
    public function isValid(mixed $data): bool
    {
        $this->errors = [];
        $this->validateAgainst($data, $this->rootSchema, '');

        return count($this->errors) === 0;
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

    private function addError(string $path, string $message): void
    {
        $p = $path === '' ? '(root)' : $path;
        $this->errors[] = "{$p}: {$message}";
    }

    /**
     * @param mixed                $data
     * @param array<string,mixed>  $schema
     */
    private function validateAgainst(mixed $data, array $schema, string $path): void
    {
        // Local $ref (#/definitions/xxx or #/$defs/xxx)
        if (isset($schema['$ref'])) {
            $resolved = $this->resolveRef((string) $schema['$ref']);
            if ($resolved === null) {
                $this->addError($path, "reference not found: {$schema['$ref']}");
                return;
            }
            $this->validateAgainst($data, $resolved, $path);
            return;
        }

        if (isset($schema['const'])) {
            if (!$this->looseEquals($data, $schema['const'])) {
                $this->addError($path, 'does not match the expected const value');
            }
        }

        if (isset($schema['enum']) && is_array($schema['enum'])) {
            $found = false;
            foreach ($schema['enum'] as $candidate) {
                if ($this->looseEquals($data, $candidate)) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $this->addError($path, 'is not one of the allowed enum values');
            }
        }

        if (isset($schema['type'])) {
            $this->validateType($data, $schema['type'], $path);
        }

        $this->validateCombinators($data, $schema, $path);

        $type = $this->detectType($data);

        switch ($type) {
            case 'string':
                $this->validateString($data, $schema, $path);
                break;
            case 'integer':
            case 'number':
                $this->validateNumber($data, $schema, $path);
                break;
            case 'array':
                $this->validateArray($data, $schema, $path);
                break;
            case 'object':
                $this->validateObject($data, $schema, $path);
                break;
        }
    }

    /**
     * @param array<string,mixed> $schema
     */
    private function validateCombinators(mixed $data, array $schema, string $path): void
    {
        if (isset($schema['allOf']) && is_array($schema['allOf'])) {
            foreach ($schema['allOf'] as $sub) {
                $this->validateAgainst($data, $sub, $path);
            }
        }

        if (isset($schema['anyOf']) && is_array($schema['anyOf'])) {
            $ok = false;
            foreach ($schema['anyOf'] as $sub) {
                if ($this->isSubSchemaValid($data, $sub)) {
                    $ok = true;
                    break;
                }
            }
            if (!$ok) {
                $this->addError($path, 'does not satisfy any of the anyOf schemas');
            }
        }

        if (isset($schema['oneOf']) && is_array($schema['oneOf'])) {
            $matches = 0;
            foreach ($schema['oneOf'] as $sub) {
                if ($this->isSubSchemaValid($data, $sub)) {
                    $matches++;
                }
            }
            if ($matches !== 1) {
                $this->addError($path, "must satisfy exactly one oneOf schema ({$matches} match(es))");
            }
        }

        if (isset($schema['not'])) {
            if ($this->isSubSchemaValid($data, $schema['not'])) {
                $this->addError($path, 'must not satisfy the "not" schema');
            }
        }
    }

    /**
     * @param array<string,mixed> $schema
     */
    private function isSubSchemaValid(mixed $data, array $schema): bool
    {
        $sub = new self($schema);
        // $ref pointers inside the sub-schema must keep resolving against
        // the original root document, not against the sub-schema itself.
        $sub->refRoot = $this->refRoot;
        return $sub->isValid($data);
    }

    private function validateType(mixed $data, mixed $expected, string $path): void
    {
        $expectedTypes = is_array($expected) ? $expected : [$expected];
        $actual = $this->detectType($data);

        foreach ($expectedTypes as $t) {
            if ($t === 'integer' && $actual === 'number' && is_float($data) && floor($data) === $data) {
                return;
            }
            if ($t === $actual) {
                return;
            }
            if ($t === 'number' && $actual === 'integer') {
                return;
            }
        }

        $expectedStr = implode('|', $expectedTypes);
        $this->addError($path, "invalid type: expected {$expectedStr}, got {$actual}");
    }

    private function detectType(mixed $data): string
    {
        return match (true) {
            $data === null => 'null',
            is_bool($data) => 'boolean',
            is_int($data) => 'integer',
            is_float($data) => (floor($data) === $data ? 'integer' : 'number'),
            is_string($data) => 'string',
            // A JSON array always decodes to a PHP list array, whether or not
            // json_decode() was called with associative=true.
            is_array($data) && $this->isList($data) => 'array',
            // A JSON object decodes to either an associative array
            // (json_decode(..., true)) or a stdClass (json_decode(..., false)).
            is_array($data) || is_object($data) => 'object',
            default => 'unknown',
        };
    }

    /**
     * True for plain PHP list arrays (sequential integer keys from 0).
     * Objects (stdClass or associative arrays) are never lists.
     */
    private function isList(mixed $arr): bool
    {
        if (!is_array($arr)) {
            return false;
        }
        if ($arr === []) {
            return true;
        }
        return array_keys($arr) === range(0, count($arr) - 1);
    }

    /**
     * True when $data behaves like a JSON object: either a stdClass
     * (json_decode(..., false)) or a non-list associative array
     * (json_decode(..., true)).
     */
    private function isObjectLike(mixed $data): bool
    {
        return is_object($data) || (is_array($data) && !$this->isList($data));
    }

    /**
     * @return string[] Property names of an object-like value, in order.
     */
    private function objectKeys(mixed $data): array
    {
        if (is_object($data)) {
            return array_keys(get_object_vars($data));
        }
        if (is_array($data)) {
            return array_map('strval', array_keys($data));
        }
        return [];
    }

    private function objectHas(mixed $data, string $key): bool
    {
        if (is_object($data)) {
            return property_exists($data, $key);
        }
        if (is_array($data)) {
            return array_key_exists($key, $data);
        }
        return false;
    }

    private function objectGet(mixed $data, string $key): mixed
    {
        if (is_object($data)) {
            return $data->{$key};
        }
        return $data[$key];
    }

    /**
     * @param array<string,mixed> $schema
     */
    private function validateString(mixed $data, array $schema, string $path): void
    {
        if (!is_string($data)) {
            return;
        }

        $len = function_exists('mb_strlen') ? mb_strlen($data) : strlen($data);

        if (isset($schema['minLength']) && $len < (int) $schema['minLength']) {
            $this->addError($path, "minimum length {$schema['minLength']} not met ({$len})");
        }

        if (isset($schema['maxLength']) && $len > (int) $schema['maxLength']) {
            $this->addError($path, "maximum length {$schema['maxLength']} exceeded ({$len})");
        }

        if (isset($schema['pattern'])) {
            $pattern = '/' . str_replace('/', '\/', (string) $schema['pattern']) . '/u';
            if (@preg_match($pattern, $data) !== 1) {
                $this->addError($path, "does not match pattern {$schema['pattern']}");
            }
        }

        if (isset($schema['format'])) {
            $this->validateFormat($data, (string) $schema['format'], $path);
        }
    }

    private function validateFormat(string $data, string $format, string $path): void
    {
        $ok = match ($format) {
            'email' => (bool) filter_var($data, FILTER_VALIDATE_EMAIL),
            'uri', 'url' => (bool) filter_var($data, FILTER_VALIDATE_URL),
            'date' => (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)
                && checkdate((int) substr($data, 5, 2), (int) substr($data, 8, 2), (int) substr($data, 0, 4)),
            'date-time' => (bool) preg_match(
                '/^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/',
                $data
            ),
            'ipv4' => (bool) filter_var($data, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4),
            'ipv6' => (bool) filter_var($data, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6),
            'uuid' => (bool) preg_match(
                '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
                $data
            ),
            default => true, // Unknown format: does not block, same as Ajv in non-strict mode.
        };

        if (!$ok) {
            $this->addError($path, "invalid format, expected '{$format}'");
        }
    }

    /**
     * @param array<string,mixed> $schema
     */
    private function validateNumber(mixed $data, array $schema, string $path): void
    {
        if (!is_int($data) && !is_float($data)) {
            return;
        }

        if (isset($schema['minimum']) && $data < $schema['minimum']) {
            $this->addError($path, "must be >= {$schema['minimum']}");
        }

        if (isset($schema['maximum']) && $data > $schema['maximum']) {
            $this->addError($path, "must be <= {$schema['maximum']}");
        }

        if (isset($schema['exclusiveMinimum']) && $data <= $schema['exclusiveMinimum']) {
            $this->addError($path, "must be > {$schema['exclusiveMinimum']}");
        }

        if (isset($schema['exclusiveMaximum']) && $data >= $schema['exclusiveMaximum']) {
            $this->addError($path, "must be < {$schema['exclusiveMaximum']}");
        }

        if (isset($schema['multipleOf'])) {
            $factor = (float) $schema['multipleOf'];
            if ($factor > 0) {
                $div = $data / $factor;
                if (abs($div - round($div)) > 1e-9) {
                    $this->addError($path, "must be a multiple of {$schema['multipleOf']}");
                }
            }
        }
    }

    /**
     * @param array<string,mixed> $schema
     */
    private function validateArray(mixed $data, array $schema, string $path): void
    {
        if (!is_array($data) || !$this->isList($data)) {
            return;
        }

        $count = count($data);

        if (isset($schema['minItems']) && $count < (int) $schema['minItems']) {
            $this->addError($path, "must contain at least {$schema['minItems']} item(s)");
        }

        if (isset($schema['maxItems']) && $count > (int) $schema['maxItems']) {
            $this->addError($path, "must contain at most {$schema['maxItems']} item(s)");
        }

        if (($schema['uniqueItems'] ?? false) === true) {
            $seen = [];
            foreach ($data as $item) {
                $key = json_encode($item, JSON_THROW_ON_ERROR);
                if (isset($seen[$key])) {
                    $this->addError($path, 'items must be unique');
                    break;
                }
                $seen[$key] = true;
            }
        }

        if (isset($schema['items'])) {
            $items = $schema['items'];

            if ($this->isList($items) && array_is_list($items)) {
                // Tuple mode: items is a list of positional schemas.
                foreach ($data as $i => $item) {
                    if (isset($items[$i])) {
                        $this->validateAgainst($item, $items[$i], "{$path}[{$i}]");
                    } elseif (isset($schema['additionalItems']) && $schema['additionalItems'] === false) {
                        $this->addError("{$path}[{$i}]", 'additional item not allowed');
                    }
                }
            } else {
                // Standard mode: a single schema applied to every item.
                foreach ($data as $i => $item) {
                    $this->validateAgainst($item, $items, "{$path}[{$i}]");
                }
            }
        }
    }

    /**
     * @param array<string,mixed> $schema
     */
    private function validateObject(mixed $data, array $schema, string $path): void
    {
        // Accepts a JSON object regardless of how it was decoded:
        // associative array (json_decode(..., true)) or stdClass (json_decode(..., false)).
        if (!$this->isObjectLike($data)) {
            return;
        }

        $keys = $this->objectKeys($data);

        // required
        if (isset($schema['required']) && is_array($schema['required'])) {
            foreach ($schema['required'] as $requiredKey) {
                if (!$this->objectHas($data, (string) $requiredKey)) {
                    $this->addError($path, "missing required property: '{$requiredKey}'");
                }
            }
        }

        $properties = $schema['properties'] ?? [];
        $patternProperties = $schema['patternProperties'] ?? [];
        $additional = $schema['additionalProperties'] ?? true;

        foreach ($keys as $key) {
            $value = $this->objectGet($data, $key);
            $childPath = $path === '' ? $key : "{$path}.{$key}";
            $matched = false;

            if (isset($properties[$key])) {
                $matched = true;
                $this->validateAgainst($value, $properties[$key], $childPath);
            }

            foreach ($patternProperties as $pattern => $subSchema) {
                $regex = '/' . str_replace('/', '\/', (string) $pattern) . '/u';
                if (@preg_match($regex, $key) === 1) {
                    $matched = true;
                    $this->validateAgainst($value, $subSchema, $childPath);
                }
            }

            if (!$matched) {
                if ($additional === false) {
                    $this->addError($childPath, 'additional property not allowed');
                } elseif (is_array($additional)) {
                    $this->validateAgainst($value, $additional, $childPath);
                }
            }
        }

        $count = count($keys);

        if (isset($schema['minProperties']) && $count < (int) $schema['minProperties']) {
            $this->addError($path, "must have at least {$schema['minProperties']} propert(y/ies)");
        }

        if (isset($schema['maxProperties']) && $count > (int) $schema['maxProperties']) {
            $this->addError($path, "must have at most {$schema['maxProperties']} propert(y/ies)");
        }
    }

    /**
     * Resolves a local reference such as "#/definitions/foo" or "#/$defs/foo".
     *
     * @return array<string,mixed>|null
     */
    private function resolveRef(string $ref): ?array
    {
        if (!str_starts_with($ref, '#/')) {
            return null; // External references are not supported.
        }

        $segments = explode('/', substr($ref, 2));
        $current = $this->refRoot;

        foreach ($segments as $segment) {
            $segment = str_replace(['~1', '~0'], ['/', '~'], $segment);
            if (!is_array($current) || !array_key_exists($segment, $current)) {
                return null;
            }
            $current = $current[$segment];
        }

        return is_array($current) ? $current : null;
    }

    private function looseEquals(mixed $a, mixed $b): bool
    {
        $aStructured = is_array($a) || is_object($a);
        $bStructured = is_array($b) || is_object($b);

        if ($aStructured && $bStructured) {
            try {
                // Compares structural (JSON) equality, so an associative array
                // and a stdClass with the same content are considered equal.
                return json_encode($a, JSON_THROW_ON_ERROR) === json_encode($b, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                return false;
            }
        }
        return $a === $b;
    }
}