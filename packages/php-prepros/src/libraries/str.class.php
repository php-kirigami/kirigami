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

		// A tag written inside Markdown code (a fenced block or an inline
		// code span) is example text, not a tag: `<markdown>` shown in a
		// code span must not close the real block around it, and
		// `<img asset="...">` shown in one must not become an image. Mask
		// that code before matching and put it back afterwards, both in the
		// output and in what the callback receives.
		$code = [];
		if (!str_contains($contents, "\x1A")) $contents = preg_replace_callback(
			'#^[ \t]*(`{3,}|~{3,})[^\n]*\n.*?^[ \t]*\1[ \t]*$'
			. '|(?<!`)(`+)(?!`)[^\n]*?(?<!`)\2(?!`)#ms',
			function ($m) use (&$code) {
				$code[] = $m[0];
				return "\x1A" . (count($code) - 1) . "\x1A";
			},
			$contents
		);
		$restore = fn(?string $s) => $s === null || !$code ? $s
			: preg_replace_callback("#\x1A(\d+)\x1A#", fn($m) => $code[$m[1]], $s);

		$result = preg_replace_callback($pattern, function ($m) use ($clb, $restore) {
			$m = array_map($restore, $m);
			if (isset($m[1]) || isset($m[2])) {
				// paired form: <tag>content</tag>
				$attrs = $m[1] ?? '';
				$inner = $m[2] ?? '';
			} elseif (isset($m[3])) {
				// self-closing: <tag ... />
				$attrs = $m[3];
				$inner = '';
			} else {
				// opening only, no closing (img, meta, br, ...)
				$attrs = $m[4] ?? '';
				$inner = '';
			}
			return call_user_func($clb, $m[0], self::parseHtmlAttributes($attrs), $inner);
		}, $contents, -1, $count, PREG_UNMATCHED_AS_NULL); // <-- the flag that fixes everything

		return $restore($result);
	}


	public static function parseHtmlAttributes(string $attributes): array
	{
		$attrs = [];
		if (preg_match_all('#(\w+)(?:\s*=\s*("[^"]*"|\'[^\']*\'|[^"\'\s>]*))?#i', $attributes, $m, PREG_SET_ORDER)) {
			foreach ($m as $match) {
				$key = strtolower($match[1]);
				if (isset($match[2]) && $match[2] !== '') {
					$value = $match[2];
					// strip the quotes only if they're present
					if (($value[0] === '"' || $value[0] === "'") && $value[0] === substr($value, -1)) {
						$value = substr($value, 1, -1);
					}
					$attrs[$key] = stripslashes($value);
				} else {
					// boolean attribute: selected, muted, disabled, checked...
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
		if (!$sheme = strtolower((string) @parse_url($str, PHP_URL_SCHEME))) return false;
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
