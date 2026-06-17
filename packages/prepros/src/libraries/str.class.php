<?php

class STR
{


	public static function htmlesc(string $str): string
	{
		return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
	}


	public static function replaceTags(string $tag, string $contents, callable $clb): string
	{
		$contents = preg_replace_callback('#<' . preg_quote($tag, '#') . '([^>]*)>(.*?)</' . preg_quote($tag, '#') . '>#msi', function ($m) use ($clb) {
			return call_user_func($clb, $m[0], self::parseHtmlAttributes($m[1]), $m[2]);
		}, $contents);
		return $contents;
	}


	public static function parseHtmlAttributes(string $attributes): array
	{
		if (preg_match_all('#(\\w+)\s*=\\s*("[^"]*"|\'[^\']*\'|[^"\'\\s>]*)#i', $attributes, $m)) {
			foreach ($m[1] as $k => $key) {
				$attrs[strtolower($key)] = stripslashes(substr($m[2][$k], 1, -1));;
			}
		}
		return isset($attrs) ? $attrs : [];
	}


	public static function trimIndent(string $str): string
	{
		$lines = explode("\n", $str);
		$minIndent = PHP_INT_MAX;
		foreach ($lines as $line) {
			if (trim($line) === '') continue;
			preg_match('/^(\s*)/', $line, $m);
			$minIndent = min($minIndent, strlen($m[1]));
		}
		if ($minIndent > 0 && $minIndent !== PHP_INT_MAX) {
			$lines = array_map(fn($line) => substr($line, $minIndent), $lines);
		}
		return implode("\n", $lines);
	}
}
