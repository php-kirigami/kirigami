<?php

class STR {


	public static function htmlesc(string $str)
	{
		return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
	}


	public static function replaceTags($tag, $contents, $clb)
	{
		$contents = preg_replace_callback('#<' . preg_quote($tag, '#') . '([^>]*)>(.*?)</' . preg_quote($tag, '#') . '>#msi', function ($m) use ($clb) {
			return call_user_func($clb, $m[0], self::parseHtmlAttributes($m[1]), $m[2]);
		}, $contents);
		return $contents;
	}


	public static function parseHtmlAttributes($attributes)
	{
		if (preg_match_all('#(\\w+)\s*=\\s*("[^"]*"|\'[^\']*\'|[^"\'\\s>]*)#i', $attributes, $m)) {
			foreach ($m[1] as $k => $key) {
				$attrs[strtolower($key)] = stripslashes(substr($m[2][$k], 1, -1));;
			}
		}
		return isset($attrs) ? $attrs : [];
	}


}