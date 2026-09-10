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


	/**
	 * Lists the immediate child pages of the calling template.
	 *
	 * Scans the directories directly below the folder of the file that
	 * called this function, keeps the ones that hold an `_index.php`, parses
	 * that file's first PHPDOC block via {@see FS::phpFileInfo()} and returns
	 * the pages ordered by `@position` ascending (a missing `@position`
	 * counts as 999999), then by folder name.
	 *
	 * Only usable while a render is in progress (`PREPROS::$file` set).
	 *
	 * @param  string $backtrace Path of the caller's file; defaults to the
	 *                           file that invoked this method. The
	 *                           `fs_get_children()` wrapper forwards the real
	 *                           caller here.
	 * @return object[]          One `stdClass` per child: the parsed PHPDOC
	 *                           of its `_index.php`, plus a `->file` key
	 *                           holding that file's absolute path.
	 * @throws \Exception        When called outside of a render.
	 */
	public static function getChildren(string $backtrace = ''): array
	{
		if (PREPROS::$file === '') throw new Exception('FS::getChildren() can only be called during a render.');
		if (!$backtrace) $backtrace = PREPROS::backtraceFile();
		if (!$backtrace || !$dir = realpath(pathinfo($backtrace, PATHINFO_DIRNAME))) return [];

		$children = [];
		foreach (glob($dir . '/*', GLOB_ONLYDIR) as $subdir) {
			$index = $subdir . '/_index.php';
			if (!is_file($index)) continue;
			$info = FS::phpFileInfo($index) ?: new stdClass;
			$info = clone $info;
			$info->file = realpath($index);
			$position = (isset($info->position) && is_numeric($info->position)) ? (int) $info->position : 999999;
			$children[] = ['position' => $position, 'name' => pathinfo($subdir, PATHINFO_BASENAME), 'info' => $info];
		}

		usort($children, fn($a, $b) => ($a['position'] <=> $b['position']) ?: strnatcasecmp($a['name'], $b['name']));

		return array_column($children, 'info');
	}


	/**
	 * Builds the breadcrumb trail of the calling page.
	 *
	 * Only runs when the calling file opts in with `@breadcrumb true` (or
	 * `@breadcrumb 1`) in its first PHPDOC block; otherwise returns `[]`.
	 *
	 * Starting from the folder *above* the caller's own folder (the current
	 * page is never part of its own trail), it walks the parent directories
	 * upward, collecting the `_index.php` of each one via
	 * {@see FS::phpFileInfo()}. The walk stops at the source root, or at the
	 * first ancestor `_index.php` that does not carry an active `@breadcrumb`
	 * tag — that page is a pure separator and is left out of the result.
	 * Directories with no `_index.php` are skipped without breaking the chain.
	 *
	 * Only usable while a render is in progress (`PREPROS::$file` set).
	 *
	 * @param  string $backtrace Path of the caller's file; defaults to the
	 *                           file that invoked this method. The
	 *                           `fs_get_breadcrumb()` wrapper forwards the
	 *                           real caller here.
	 * @return object[]          One `stdClass` per ancestor page, ordered from
	 *                           the top-most ancestor down to the nearest
	 *                           parent: the parsed PHPDOC of its `_index.php`,
	 *                           plus a `->file` key holding that file's
	 *                           absolute path.
	 * @throws \Exception        When called outside of a render.
	 */
	public static function getBreadcrumb(string $backtrace = ''): array
	{
		if (PREPROS::$file === '') throw new Exception('FS::getBreadcrumb() can only be called during a render.');
		if (!$backtrace) $backtrace = PREPROS::backtraceFile();
		if (!$backtrace || !$dir = realpath(pathinfo($backtrace, PATHINFO_DIRNAME))) return [];

		$self = FS::phpFileInfo($backtrace) ?: new stdClass;
		if (!self::truthy($self->breadcrumb ?? null)) return [];

		if (!$root = realpath(PREPROS::$config->root)) return [];
		$root = rtrim(str_replace('\\', '/', $root), '/');
		$dir  = rtrim(str_replace('\\', '/', $dir), '/');

		$trail = [];
		while (true) {
			$parent = str_replace('\\', '/', dirname($dir));
			if ($parent === $dir) break;                                      // filesystem root
			$dir = $parent;
			if (strncmp($dir . '/', $root . '/', strlen($root) + 1) !== 0) break; // above the source root

			$index = $dir . '/_index.php';
			if (is_file($index)) {
				$info = FS::phpFileInfo($index) ?: new stdClass;
				if (!self::truthy($info->breadcrumb ?? null)) break;          // separator page: stop, exclude it
				$info = clone $info;
				$info->file = realpath($index);
				$trail[] = $info;
			}

			if ($dir === $root) break;
		}

		return array_reverse($trail);
	}


	/**
	 * Loose truthiness test for a PHPDOC tag value (`true` / `1` / `yes` /
	 * `on`, case-insensitive). PHPDOC values always come through as strings,
	 * but bool/int are handled too for callers that pass a raw value.
	 */
	private static function truthy(mixed $v): bool
	{
		if (is_bool($v)) return $v;
		if (is_int($v))  return $v === 1;
		if (!is_string($v)) return false;
		return in_array(strtolower(trim($v)), ['1', 'true', 'yes', 'on'], true);
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
			if (!preg_match_all('#@([a-z0-9_]+)[\s\t]+([^\n]+)#msi', $block, $m)) $files[$file] = new stdClass;
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
