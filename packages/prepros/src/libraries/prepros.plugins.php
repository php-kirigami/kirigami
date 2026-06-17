<?php

PREPROS::registerTag('markdown', function ($tag, $attrs, $body) {
	$body = STR::trimIndent($body);
    return MD::toHtml($body);
});



