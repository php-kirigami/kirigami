<?php

class STR
{


	public static function htmlesc(string $str): string
	{
		return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
	}


	public static function replaceTags(string $tag, string $contents, callable $clb): string
	{
		$t = preg_quote($tag, '#');

		$pattern = '#<' . $t . '([^>]*)>(.*?)</' . $t . '>'
			. '|<' . $t . '([^>]*)/>'
			. '|<' . $t . '([^>]*)>#msi';

		return preg_replace_callback($pattern, function ($m) use ($clb) {
			if (isset($m[1]) || isset($m[2])) {
				// forme appariée : <tag>contenu</tag>
				$attrs = $m[1] ?? '';
				$inner = $m[2] ?? '';
			} elseif (isset($m[3])) {
				// auto-fermant : <tag ... />
				$attrs = $m[3];
				$inner = '';
			} else {
				// ouvrant seul, sans fermeture (img, meta, br, ...)
				$attrs = $m[4] ?? '';
				$inner = '';
			}
			return call_user_func($clb, $m[0], self::parseHtmlAttributes($attrs), $inner);
		}, $contents, -1, $count, PREG_UNMATCHED_AS_NULL); // <-- le flag qui règle tout
	}


	public static function parseHtmlAttributes(string $attributes): array
	{
		$attrs = [];
		if (preg_match_all('#(\w+)(?:\s*=\s*("[^"]*"|\'[^\']*\'|[^"\'\s>]*))?#i', $attributes, $m, PREG_SET_ORDER)) {
			foreach ($m as $match) {
				$key = strtolower($match[1]);
				if (isset($match[2]) && $match[2] !== '') {
					$value = $match[2];
					// retire les guillemets seulement s'ils sont présents
					if (($value[0] === '"' || $value[0] === "'") && $value[0] === substr($value, -1)) {
						$value = substr($value, 1, -1);
					}
					$attrs[$key] = stripslashes($value);
				} else {
					// attribut booléen : selected, muted, disabled, checked...
					$attrs[$key] = true;
				}
			}
		}
		return $attrs;
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


	public static function is_url(string $str): bool
	{
		if (!$sheme = strtolower(@parse_url($str, PHP_URL_SCHEME))) return false;
		return in_array($sheme, ['http', 'https', 'itunes', 'ftp', 'ftps', 'ssh', 'ssl', 'sftp']);
	}


	public static function html_entities_decode(string $str): string
	{
		$str = html_entity_decode(trim($str), ENT_QUOTES, 'UTF-8');
		return $str;
	}


	public static function shorthash(string $str): string
	{
		return substr(hash('sha256', $str), 0, 12);
	}


	public static function normalize(string $str) {
		$str = Normalizer::normalize($str, Normalizer::FORM_D);
		$str = preg_replace('/\p{Mn}/u', '', $str);
		return $str;
	}


	public static function slug(string $str, $sep = ''): string
	{
		$str = self::normalize($str);
		$str = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $str);
		$str = strtolower($str);
		$str = preg_replace('/[^a-z0-9]/', $sep, $str);
		return $str;
	}

}
