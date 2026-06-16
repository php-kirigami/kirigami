<?php

class SYS {
	

	public static function requireExtension(string $extName, array $dlCandidates = []): void
	{
		$extName = strtolower(trim($extName));
		if ($extName === '') {
			throw new InvalidArgumentException("require_extension: extName cannot be empty.");
		}

		// 1) Already loaded?
		if (extension_loaded($extName)) {
			return;
		}

		// 2) Can we try dl() ?
		$canDl =
			function_exists('dl')
			&& filter_var(ini_get('enable_dl'), FILTER_VALIDATE_BOOLEAN)
			&& !in_array(PHP_SAPI, ['fpm-fcgi', 'cgi-fcgi'], true); // commonly blocked there

		if ($canDl) {
			// Build default candidates if none provided
			if (!$dlCandidates) {
				$suffix = PHP_SHLIB_SUFFIX; // so / dll / dylib
				if ($suffix === 'dll') {
					$dlCandidates = [
						"php_{$extName}.dll",
						"{$extName}.dll",
					];
				} else {
					$dlCandidates = [
						"{$extName}.{$suffix}",
						"php_{$extName}.{$suffix}",
					];
				}
			}

			foreach ($dlCandidates as $file) {
				$file = trim((string)$file);
				if ($file === '') continue;

				// dl() can emit warnings; suppress and re-check
				if (@dl($file)) {
					if (extension_loaded($extName)) {
						return;
					}
				}
			}
		}

		// 3) Still missing -> error with useful context
		$msg =
			"Required PHP extension '{$extName}' is not loaded and could not be loaded dynamically.\n"
			. "SAPI: " . PHP_SAPI . "\n"
			. "enable_dl: " . (ini_get('enable_dl') ?: '0') . "\n"
			. "Try enabling it in php.ini (e.g. extension={$extName}) or installing the appropriate package, then restart PHP.";

		throw new RuntimeException($msg);
	}


}