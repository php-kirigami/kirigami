<?php

class DATE {

	public static function setDefaultTimezone(): array
	{
		$idents = timezone_identifiers_list();

		$isValidTz = function (?string $tz) use ($idents): bool {
			if (!$tz) return false;
			$tz = trim($tz);
			return $tz !== '' && in_array($tz, $idents, true);
		};

		$isPlaceholderUTC = function (?string $tz): bool {
			if (!$tz) return true;
			$tz = trim($tz);
			if ($tz === '') return true;
			// Considère ces valeurs comme "placeholder / default"
			return in_array($tz, ['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT'], true);
		};

		$apply = function (string $tz, string $source) use ($isValidTz): ?array {
			$tz = trim($tz);
			if (!$isValidTz($tz)) return null;
			if (@date_default_timezone_set($tz)) {
				return ['timezone' => $tz, 'source' => $source];
			}
			return null;
		};

		$run = function (string $cmd): ?string {
			// Some hosts disable shell_exec; handle gracefully.
			if (!function_exists('shell_exec')) return null;
			$out = @shell_exec($cmd);
			if (!is_string($out)) return null;
			$out = trim($out);
			return $out === '' ? null : $out;
		};

		/**
		 * Try to load COM extension on Windows if COM class is missing.
		 * - Prefer com_dotnet (typical on Windows).
		 * - Gracefully do nothing if dl() is unavailable or disabled.
		 */
		$ensureWindowsCom = function (): bool {
			if (PHP_OS_FAMILY !== 'Windows') return false;

			// If COM already available, done.
			if (class_exists('COM', false)) return true;

			// If extension is loaded, COM class should exist (but check anyway).
			if (extension_loaded('com_dotnet') || extension_loaded('com')) {
				return class_exists('COM', false);
			}

			// Try dl() if available (often disabled / unavailable)
			if (!function_exists('dl')) return false;

			// dl() may be disabled via disable_functions
			$disabled = ini_get('disable_functions');
			if (is_string($disabled) && $disabled !== '') {
				$list = array_map('trim', explode(',', $disabled));
				if (in_array('dl', $list, true)) return false;
			}

			// Candidates (Windows usually wants dll name)
			$candidates = [
				'php_com_dotnet.dll',
				'com_dotnet',
				'php_com.dll',
				'com',
			];

			foreach ($candidates as $ext) {
				try {
					@dl($ext);
					if (class_exists('COM', false)) return true;
				} catch (\Throwable $e) {
					// ignore
				}
			}

			return class_exists('COM', false);
		};

		// 1) TZ env var (si tu le veux prioritaire)
		$envTZ = getenv('TZ');
		if ($res = $apply(is_string($envTZ) ? $envTZ : '', 'env TZ')) return $res;

		// 2) PHP ini timezone (MAIS: ignore si placeholder UTC/GMT)
		$iniTz = (string)ini_get('date.timezone');
		if (!$isPlaceholderUTC($iniTz)) {
			if ($res = $apply($iniTz, 'php.ini (date.timezone)')) return $res;
		}
		// sinon: on continue vers l’OS (Option B)

		// OS-specific
		if (PHP_OS_FAMILY === 'Windows') {

			// Windows -> IANA mapping (common zones; extend as needed)
			$winToIana = [
				'UTC' => 'UTC',
				'Dateline Standard Time' => 'Etc/GMT+12',
				'UTC-11' => 'Etc/GMT+11',
				'Hawaiian Standard Time' => 'Pacific/Honolulu',
				'Alaskan Standard Time' => 'America/Anchorage',
				'Pacific Standard Time' => 'America/Los_Angeles',
				'Mountain Standard Time' => 'America/Denver',
				'US Mountain Standard Time' => 'America/Phoenix',
				'Central Standard Time' => 'America/Chicago',
				'Canada Central Standard Time' => 'America/Regina',
				'Eastern Standard Time' => 'America/Toronto',
				'Atlantic Standard Time' => 'America/Halifax',
				'Newfoundland Standard Time' => 'America/St_Johns',
				'Greenwich Standard Time' => 'Europe/London',
				'GMT Standard Time' => 'Europe/London',
				'W. Europe Standard Time' => 'Europe/Berlin',
				'Romance Standard Time' => 'Europe/Paris',
				'Central Europe Standard Time' => 'Europe/Budapest',
				'Central European Standard Time' => 'Europe/Warsaw',
				'E. Europe Standard Time' => 'Europe/Bucharest',
				'Turkey Standard Time' => 'Europe/Istanbul',
				'Israel Standard Time' => 'Asia/Jerusalem',
				'Egypt Standard Time' => 'Africa/Cairo',
				'South Africa Standard Time' => 'Africa/Johannesburg',
				'Russian Standard Time' => 'Europe/Moscow',
				'Arab Standard Time' => 'Asia/Riyadh',
				'Iran Standard Time' => 'Asia/Tehran',
				'India Standard Time' => 'Asia/Kolkata',
				'China Standard Time' => 'Asia/Shanghai',
				'Tokyo Standard Time' => 'Asia/Tokyo',
				'Korea Standard Time' => 'Asia/Seoul',
				'AUS Eastern Standard Time' => 'Australia/Sydney',
				'E. Australia Standard Time' => 'Australia/Brisbane',
				'AUS Central Standard Time' => 'Australia/Adelaide',
				'W. Australia Standard Time' => 'Australia/Perth',
				'New Zealand Standard Time' => 'Pacific/Auckland',
			];

			$mapWin = function (?string $winId) use ($winToIana): ?string {
				if (!$winId) return null;
				$winId = trim($winId);
				return $winToIana[$winId] ?? null;
			};

			$guessFromOffset = function (int $offsetSeconds, bool $isDst): ?string {
				$tz = @timezone_name_from_abbr('', $offsetSeconds, $isDst ? 1 : 0);
				return is_string($tz) && $tz !== '' ? $tz : null;
			};

			// 3) Windows COM/WMI (best on Windows when enabled)
			$winId = null;
			$biasMinutes = null; // minutes WEST of UTC
			$supportsDst = null;

			$hasCom = $ensureWindowsCom();

			if ($hasCom && class_exists('COM', false)) {
				try {
					$wmi = new COM('WbemScripting.SWbemLocator');
					$svc = $wmi->ConnectServer('.', 'root\\cimv2');
					$items = $svc->ExecQuery('SELECT * FROM Win32_TimeZone');
					foreach ($items as $tz) {
						if (!empty($tz->TimeZoneKeyName)) $winId = (string)$tz->TimeZoneKeyName;
						elseif (!empty($tz->StandardName)) $winId = (string)$tz->StandardName;

						if (isset($tz->Bias)) $biasMinutes = (int)$tz->Bias;
						$supportsDst = !empty($tz->DaylightName);
						break;
					}
				} catch (\Throwable $e) {
					// ignore and continue
				}
			}

			if ($iana = $mapWin($winId)) {
				if ($res = $apply($iana, 'windows COM/WMI (Win32_TimeZone) + map')) return $res;
			}

			// 4) If mapping failed, try offset-based guess
			if ($biasMinutes !== null) {
				$isDstNow = (bool)date('I'); // hint only (may be wrong if default tz is still UTC)
				$offsetSeconds = -($biasMinutes * 60);
				if ($tzGuess = $guessFromOffset($offsetSeconds, $supportsDst ? $isDstNow : false)) {
					if ($res = $apply($tzGuess, 'windows COM/WMI bias -> timezone_name_from_abbr')) return $res;
				}
			}

			// 5) PowerShell (gets Windows ID; still needs mapping)
			$psId = $run('powershell -NoProfile -Command "[System.TimeZoneInfo]::Local.Id"');
			if ($iana = $mapWin($psId)) {
				if ($res = $apply($iana, 'powershell TimeZoneInfo.Local.Id + map')) return $res;
			}

			// 6) tzutil (Windows ID)
			$tzutil = $run('tzutil /g');
			if ($iana = $mapWin($tzutil)) {
				if ($res = $apply($iana, 'tzutil /g + map')) return $res;
			}

			// 7) wmic (older systems)
			$wmic = $run('wmic timezone get StandardName /value');
			if ($wmic) {
				if (preg_match('/StandardName\s*=\s*(.+)\s*$/mi', $wmic, $m)) {
					$wmicId = trim($m[1]);
					if ($iana = $mapWin($wmicId)) {
						if ($res = $apply($iana, 'wmic timezone StandardName + map')) return $res;
					}
				}
			}

			// Last resort on Windows
			if ($res = $apply('UTC', 'fallback UTC (windows)')) return $res;
			return ['timezone' => 'UTC', 'source' => 'fallback UTC (windows)'];

		} else {

			// 3) Linux/macOS: /etc/timezone
			$etcTz = '/etc/timezone';
			if (is_file($etcTz)) {
				$tz = trim((string)@file_get_contents($etcTz));
				if ($res = $apply($tz, '/etc/timezone')) return $res;
			}

			// 4) /etc/localtime symlink -> /usr/share/zoneinfo/...
			$localtime = '/etc/localtime';
			if (is_link($localtime)) {
				$target = @readlink($localtime);
				if (is_string($target) && $target !== '' && str_contains($target, 'zoneinfo/')) {
					$tz = substr($target, strpos($target, 'zoneinfo/') + 9);
					if ($res = $apply($tz, '/etc/localtime symlink -> zoneinfo')) return $res;
				}
			}

			// 5) systemd timedatectl
			$td = $run('timedatectl show -p Timezone --value 2>/dev/null');
			if ($res = $apply($td ?? '', 'timedatectl')) return $res;

			// 6) macOS fallback: systemsetup (requires sudo sometimes; attempt anyway)
			$mac = $run('systemsetup -gettimezone 2>/dev/null');
			if ($mac && preg_match('/Time Zone:\s*(.+)\s*$/i', $mac, $m)) {
				if ($res = $apply(trim($m[1]), 'systemsetup -gettimezone')) return $res;
			}

			// Last resort
			if ($res = $apply('UTC', 'fallback UTC (unix)')) return $res;
			return ['timezone' => 'UTC', 'source' => 'fallback UTC (unix)'];
		}
	}
}
