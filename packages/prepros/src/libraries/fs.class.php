<?php


class FS
{


	public static function dig(string $path): iterable
	{
		$patt = pathinfo($path, PATHINFO_BASENAME);
		$path = pathinfo($path, PATHINFO_DIRNAME);
		if ($path = realpath($path)) {
			$path .= '/';
			foreach (glob($path . $patt) as $file) {
				if (!is_dir($file)) yield $file;
			}
			foreach (glob($path . '*', GLOB_ONLYDIR) as $dir) {
				foreach (call_user_func(__METHOD__, $dir . '/' . $patt) as $file) yield $file;
			}
		}
	}


	public static function getRelativePath(string $from, string $to): string
	{
		$from     = is_dir($from) ? rtrim($from, '\/') . '/' : $from;
		$to       = is_dir($to)   ? rtrim($to, '\/') . '/'   : $to;
		$from     = str_replace('\\', '/', $from);
		$to       = str_replace('\\', '/', $to);
		$from     = explode('/', $from);
		$to       = explode('/', $to);
		$relPath  = $to;

		foreach ($from as $depth => $dir) {
			if ($dir === $to[$depth]) {
				array_shift($relPath);
			} else {
				$remaining = count($from) - $depth;
				if ($remaining > 1) {
					$padLength = (count($relPath) + $remaining - 1) * -1;
					$relPath = array_pad($relPath, $padLength, '..');
					break;
				} else {
					$relPath[0] = './' . $relPath[0];
				}
			}
		}
		return $relPath ? implode('/', $relPath) : './';
	}


	public static function phpFileInfo(string $file): object|bool
	{
		static $files = [];
		if (!$file = realpath($file)) return false;
		if (!isset($files[$file])) {
			$tokens = token_get_all(file_get_contents($file));
			foreach ($tokens as $tok) {
				if (!is_array($tok)) continue;
				if ($tok[0] == T_DOC_COMMENT) {
					$block = $tok[1];
					break;
				}
			}
			if (empty($block)) return new stdClass;
			if (!preg_match_all('#@([a-z0-9]+)[\s\t]+([^\n]+)#msi', $block, $m)) $files[$file] = new stdClass;
			else {
				$info = [];
				foreach ($m[1] as $k => $v) $info[trim($v)] = trim($m[2][$k]);
				$files[$file] = (object)$info;
			}
		}
		return $files[$file];
	}


	public static function rmdir(string $dir, bool $removeSelf = true): bool
	{
		if (!file_exists($dir)) return true;
		if (is_file($dir) || is_link($dir)) return @unlink($dir);
		$items = @scandir($dir);
		if ($items === false) return false;
		foreach ($items as $item) {
			if ($item === '.' || $item === '..') continue;
			$path = $dir . DIRECTORY_SEPARATOR . $item;
			if (is_dir($path) && !is_link($path)) {
				if (!call_user_func(__METHOD__, $path, true)) return false;
			} else {
				if (!@unlink($path)) return false;
			}
		}
		return $removeSelf ? @rmdir($dir) : true;
	}


	public static function pathJoin(string ...$parts): string
	{
		if (empty($parts)) return '';
		$isAbsolute = str_starts_with($parts[0], '/');
		$hasTrailingSlash = str_ends_with(end($parts), '/');

		$prefix = '';
		$isUrl = (bool) preg_match('#^[a-zA-Z][a-zA-Z0-9+\-.]*://#', $parts[0]);
		if ($isUrl) {
			preg_match('#^([a-zA-Z][a-zA-Z0-9+\-.]*://[^/]*)(.*)$#', $parts[0], $m);
			$prefix   = $m[1];
			$parts[0] = $m[2] ?? '';
		}

		$merged = implode('/', $parts);
		$merged = preg_replace('#/+#', '/', $merged);

		$segments = explode('/', $merged);
		$resolved = [];
		foreach ($segments as $seg) {
			if ($seg === '' || $seg === '.') {
				continue;
			}
			if ($seg === '..') {
				if (!empty($resolved)) {
					array_pop($resolved);
				}
			} else {
				$resolved[] = $seg;
			}
		}

		$path = implode('/', $resolved);
		if ($isAbsolute || $isUrl) $path = '/' . $path;
		if ($hasTrailingSlash && !str_ends_with($path, '/')) $path .= '/';
		return $prefix . $path;
	}
}
