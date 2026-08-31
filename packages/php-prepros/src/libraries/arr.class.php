<?php


class ARR
{
    public static function find_key(mixed $data, string $key)
    {
        if (is_object($data)) {
            $data = (array) $data;
        }

        if (is_array($data)) {
            foreach ($data as $k => $value) {
                if ($k === $key) {
                    return $value;
                }

                if (is_array($value) || is_object($value)) {
                    $found = ARR::find_key($value, $key);
                    if ($found !== null) {
                        return $found;
                    }
                }
            }
        }

        return null;
    }
}
