<?php

class CURL {

	const HEADERS = [
		'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
		'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
		'Accept-Language: fr-CA,fr;q=0.9,en-US;q=0.8,en;q=0.7',
		'Sec-Ch-Ua: "Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
		'Sec-Ch-Ua-Mobile: ?0',
		'Sec-Ch-Ua-Platform: "Windows"',
		'Sec-Fetch-Dest: document',
		'Sec-Fetch-Mode: navigate',
		'Sec-Fetch-Site: none',
		'Sec-Fetch-User: ?1',
		'Upgrade-Insecure-Requests: 1',
	];

    
	private static function getCookiePath() {
		return '/project/.cookie.txt';
    }

	
	public static function urlExists(string $url, $mimereg = null)
	{
		if(!$url) return false;
		if(!STR::is_url($url)) return false;
		if(!$info = self::getInfo($url)) return false;
		// print_r($info);
		// if($mimereg && !empty($info['content_type']) && !preg_match('#' . $mimereg . '#i', $info['content_type'])) return false;
		return ($info['http_code'] >= 200 && $info['http_code'] < 400);
	}


	public static function getInfo(string $url) {
		if(!STR::is_url($url)) return false;
		$cookiePath = self::getCookiePath();
		if(!is_file($cookiePath)) touch($cookiePath);
		$ch = curl_init($url);
		curl_setopt_array($ch,[
			CURLOPT_NOBODY         => true,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_TIMEOUT        => 15,
			CURLOPT_SSL_VERIFYPEER => false,
			CURLOPT_SSL_VERIFYHOST => false,
			CURLOPT_ENCODING       => 'gzip, deflate',
			CURLOPT_COOKIEFILE     => $cookiePath,
			CURLOPT_COOKIEJAR      => $cookiePath,
			CURLOPT_HTTPHEADER     => self::HEADERS,
		]);
		curl_exec($ch);
		$info = curl_getinfo($ch);
		PREPROS::exportFile($cookiePath);
		return $info;
	}


	public static function getContents(string $file, $dest = null, $clb = null)
	{
		$cookiePath = self::getCookiePath();
		if(!is_file($cookiePath)) touch($cookiePath);
		$chnd = curl_init($file);
		curl_setopt_array($chnd, [
			CURLOPT_AUTOREFERER    => true,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_SSL_VERIFYHOST => false,
			CURLOPT_SSL_VERIFYPEER => false,
			CURLOPT_TIMEOUT        => 60,
			CURLOPT_CONNECTTIMEOUT => 10,
			CURLOPT_ENCODING       => 'gzip,deflate',
			CURLOPT_NOPROGRESS     => ($clb ? false : true),
			CURLOPT_RETURNTRANSFER => ($dest ? false : true),
			CURLOPT_COOKIEFILE     => $cookiePath,
			CURLOPT_COOKIEJAR      => $cookiePath,
			CURLOPT_HTTPHEADER     => self::HEADERS,
		]);
		if ($clb) {
			$lastprog = -1;
			curl_setopt($chnd, CURLOPT_PROGRESSFUNCTION, function ($chnd, $totalbytes, $downbytes, $expupbytes, $upbytes) use (&$lastprog, $clb) {
				if ($totalbytes > 0) {
					$prog = $downbytes / $totalbytes;
				} else $prog = 0;
				$prog = round($prog, 5);
				if ($prog != $lastprog) {
					$lastprog = $prog;
					call_user_func($clb, $prog);
				}
			});
		}
		if ($dest) {
			if (!$fhnd = fopen($dest, "wb")) return false;
			curl_setopt($chnd, CURLOPT_WRITEFUNCTION, function ($chnd, $data) use (&$fhnd) {
				return fwrite($fhnd, $data);
			});
		}
		$results = curl_exec($chnd);
		$info = curl_getinfo($chnd);
		if (!empty($fhnd)) fclose($fhnd);
		if (!in_array($info['http_code'], [200, 201])) $results = false;
		PREPROS::exportFile($cookiePath);
		return $dest ? ($results !== false) : $results;
	}


}