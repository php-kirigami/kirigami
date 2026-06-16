<?php

class STD {


	public static function succeed($props = [])
	{
		$return = new stdClass;
		$return->success = true;
		if(is_string($props)) $return->message = $props;
		else foreach($props as $k => $v) $return->{$k} = $v;
		file_put_contents('php://stdout', json_encode($return, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), FILE_APPEND);
		exit(0);
	}


	public static function error($props = [])
	{
		$return = new stdClass;
		$return->success = false;
		if(is_string($props)) $return->error = $props;
		else foreach($props as $k => $v) $return->{$k} = $v;
		file_put_contents('php://stderr', json_encode($return, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), FILE_APPEND);
		exit(1);
	}


}