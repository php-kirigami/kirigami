<?php

class STD {

	const RESULT_PATH = '/internal/prepros_result.json';

	public static function succeed($props = []): void
	{
		$return = new stdClass;
		$return->success = true;
		if(is_string($props)) $return->message = $props;
		else foreach($props as $k => $v) $return->{$k} = $v;
		
		if(!is_dir(pathinfo(self::RESULT_PATH, PATHINFO_DIRNAME))) mkdir(pathinfo(self::RESULT_PATH, PATHINFO_DIRNAME), true, 0777);
		file_put_contents(self::RESULT_PATH, json_encode($return, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), FILE_APPEND);
		exit(0);
	}


	public static function error($props = []): void
	{
		$return = new stdClass;
		$return->success = false;
		if(is_string($props)) $return->error = $props;
		else foreach($props as $k => $v) $return->{$k} = $v;
		file_put_contents(self::RESULT_PATH, json_encode($return, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), FILE_APPEND);
		exit(1);
	}


}