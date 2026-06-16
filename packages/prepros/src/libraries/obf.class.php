<?php

class OBF {
	

	public static function encode($obj) {
		$json = json_encode($obj);
		$base64 = base64_encode($json);
		$rot13 = str_rot13($base64);
		$deflate = gzencode($rot13);
		return substr($deflate, 2);
	}


	public static function decode($str) {
		$inflate = gzdecode("\x1f\x8b" . $str);
		$base64 = str_rot13($inflate);
		$json = base64_decode($base64);
		$data = json_decode($json);
		return $data;
	}

}