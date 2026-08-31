<?php
/**
 * mbstring
 * curl
 * dom
 */


class SCRAPER
{

    private static function scrape(string $url) {
        if(!STR::is_url($url)) throw new Exception("Url is not valid.");
        if(!$contents = self::getContents($url)) throw new Exception("Url crawling seems to have been block.");
        if(!$xpath = self::loadHTML($contents)) throw new Exception("Can't parse server response.");

        // echo $contents.RN;

        $metas = new stdClass;
        $metas->url = $url;
        $metas->title = '';
        $metas->description = '';
        $metas->image = '';
        $metas->label = '';

        if(($results = $xpath->query('//script[@type="application/ld+json"]')) && $results->length) {
            $graphs = [];
            foreach($results as $item) {
                if($ld = json_decode(trim($item->textContent))) {
                    if(empty($ld->{'@graph'})) $graphs[] = $ld;
                    else foreach($ld->{'@graph'} as $item) $graphs[] = $item;
                }
            }
            // print_r($graphs);

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'imageobject') continue;
                if(!empty($graph->url)) $metas->image = STR::html_entities_decode($graph->url);
            }

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'website') continue;
                if(!empty($graph->name)) $metas->label = STR::html_entities_decode($graph->name);
            }

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'organization') continue;
                if(!empty($graph->name)) $metas->label = STR::html_entities_decode($graph->name);
            }

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'newsmediaorganization') continue;
                if(!empty($graph->name)) $metas->label = STR::html_entities_decode($graph->name);
            }

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'webpage') continue;
                if(!empty($graph->name)) $metas->title = STR::html_entities_decode($graph->name);
                if(!empty($graph->description)) $metas->description = STR::html_entities_decode($graph->description);
                if(!empty($graph->image->url)) $metas->image = STR::html_entities_decode($graph->image->url);
                if(!empty($graph->thumbnailUrl)) $metas->image = STR::html_entities_decode($graph->thumbnailUrl);
                if(!empty($graph->publisher->name)) $metas->label = STR::html_entities_decode($graph->publisher->name);
                if(!empty($graph->mainEntity->name)) $metas->title = STR::html_entities_decode($graph->mainEntity->name);
                if(!empty($graph->mainEntity->image->url)) $metas->image = STR::html_entities_decode($graph->mainEntity->image->url);
            }

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'article') continue;
                if(!empty($graph->headline)) $metas->title = STR::html_entities_decode($graph->headline);
                if(!empty($graph->description)) $metas->description = STR::html_entities_decode($graph->description);
                if(!empty($graph->publisher->name)) $metas->label = STR::html_entities_decode($graph->publisher->name);
            }
            
            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'newsarticle') continue;
                if(!empty($graph->headline)) $metas->title = STR::html_entities_decode($graph->headline);
                if(!empty($graph->description)) $metas->description = STR::html_entities_decode($graph->description);
                if(!empty($graph->publisher->name)) $metas->label = STR::html_entities_decode($graph->publisher->name);
                if(!empty($graph->thumbnailUrl)) $metas->image = STR::html_entities_decode($graph->thumbnailUrl);
                if(!empty($graph->image->url)) $metas->image = STR::html_entities_decode($graph->image->url);
            }

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'opinionnewsarticle') continue;
                if(!empty($graph->headline)) $metas->title = STR::html_entities_decode($graph->headline);
                if(!empty($graph->description)) $metas->description = STR::html_entities_decode($graph->description);
                if(!empty($graph->publisher->name)) $metas->label = STR::html_entities_decode($graph->publisher->name);
                if(!empty($graph->thumbnailUrl)) $metas->image = STR::html_entities_decode($graph->thumbnailUrl);
                if(!empty($graph->image->url)) $metas->image = STR::html_entities_decode($graph->image->url);
            }

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'radioepisode') continue;
                if(!empty($graph->name)) $metas->title = STR::html_entities_decode($graph->name);
                if(!empty($graph->description)) $metas->description = STR::html_entities_decode($graph->description);
                if(!empty($graph->productionCompany->name)) $metas->label = STR::html_entities_decode($graph->productionCompany->name);
                if(!empty($graph->thumbnailUrl)) $metas->image = STR::html_entities_decode($graph->thumbnailUrl);
                if(!empty($graph->image->url)) $metas->image = STR::html_entities_decode($graph->image->url);
            }

            foreach($graphs as $graph) {
                if(empty($graph->{'@type'})) continue;
                if(is_array($graph->{'@type'}) || strtolower($graph->{'@type'}) != 'videogame') continue;
                if(!empty($graph->name)) $metas->title = STR::html_entities_decode($graph->name);
                if(!empty($graph->description)) $metas->description = STR::html_entities_decode($graph->description);
                if(!empty($graph->image)) $metas->image = STR::html_entities_decode($graph->image);

            }

        }
// print_r($metas);
        if(($results = $xpath->query('//meta[@name="dc.title"]')) && $results->length) $metas->title = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@name="dcterms.title"]')) && $results->length) $metas->title = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@name="twitter:title"]')) && $results->length) $metas->title = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@property="og:title"]')) && $results->length) $metas->title = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//shreddit-title')) && $results->length) $metas->title = $results->item(0)->getAttribute('title');
        
        if(($results = $xpath->query('//meta[@name="dc.description"]')) && $results->length) $metas->description = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@name="dcterms.description"]')) && $results->length) $metas->description = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@name="twitter:description"]')) && $results->length) $metas->description = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@property="og:description"]')) && $results->length) $metas->description = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@name="description"]')) && $results->length) $metas->description = $results->item(0)->getAttribute('content');
        
        if(($results = $xpath->query('//meta[@name="twitter:image"]')) && $results->length) $metas->image = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@property="og:image"]')) && $results->length) $metas->image = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@name="og:image"]')) && $results->length) $metas->image = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//img[@rel="og:image rdfs:seeAlso"]')) && $results->length) $metas->image = $results->item(0)->getAttribute('src');
        
        if(($results = $xpath->query('//link[@rel="canonical"]')) && $results->length) $metas->url = $results->item(0)->getAttribute('href');
        if(($results = $xpath->query('//meta[@name="twitter:url"]')) && $results->length) $metas->url = $results->item(0)->getAttribute('content');
        if(($results = $xpath->query('//meta[@property="og:url"]')) && $results->length) $metas->url = $results->item(0)->getAttribute('content');
        
        

        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="twitter:app:name:iphone"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="twitter:app:name:googleplay"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="og:site_name"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@property="og:site_name"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="dc.publisher"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="DC.Publisher"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="publisher"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');

        if(empty($metas->label) && ($results = $xpath->query('//meta[@property="article:author"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="author"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="twitter:creator"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="dcterms.creator"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@property="al:ios:app_name"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@property="al:android:app_name"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="DC.publisher"]')) && $results->length) $metas->label = $results->item(0)->getAttribute('content');
        if(empty($metas->label) && ($results = $xpath->query('//span[@class="footer__signature"]')) && $results->length) $metas->label = $results->item(0)->textContent;
        if(empty($metas->label) && ($results = $xpath->query('//p[@class="site-title"]')) && $results->length) $metas->label = trim($results->item(0)->textContent);
        if(empty($metas->label) && ($results = $xpath->query('//meta[@name="copyright"]')) && $results->length) $metas->label = trim($results->item(0)->getAttribute('content'), '© ');
        if(empty($metas->label) && preg_match("#\{'blogId': '[0-9]+', 'title': '([^']+)'#i", $contents, $m)) $metas->label = $m[1];

        // print_r($metas);

        
        if(($results = $xpath->query('//link[@rel="alternate" and @type="application/json+oembed" and @href]')) && $results->length) {
            if(STR::is_url(($oembedurl = $results->item(0)->getAttribute('href')))) {
                if($json = self::getContents($oembedurl)) {
                    if($oem = json_decode($json)) {
                        if(empty($metas->title) && !empty($oem->title)) $metas->title = $oem->title;
                        if(empty($metas->description) && !empty($oem->summary)) $metas->description = $oem->summary;
                        if(empty($metas->label) && !empty($oem->provider_name)) $metas->label = $oem->provider_name;
                        if(empty($metas->image) && !empty($oem->thumbnail_url)) $metas->image = $oem->thumbnail_url;
                        if(empty($metas->image) && !empty($oem->url)) $metas->image = $oem->url;
                    }
                }
            }
        }
        // print_r($metas);
        if(($results = $xpath->query('//script[@id="__UNIVERSAL_DATA_FOR_REHYDRATION__" and @type="application/json"]')) && $results->length) {
            if($data = json_decode($results->item(0)->textContent)) {
                if(!empty($data->{'__DEFAULT_SCOPE__'}->{'webapp.video-detail'}->itemInfo->itemStruct)) {
                    $data = $data->{'__DEFAULT_SCOPE__'}->{'webapp.video-detail'}->itemInfo->itemStruct;
                    if(!empty($data->desc)) $metas->description = $data->desc;
                    if(!empty($data->author->nickname)) $metas->title = $data->author->nickname;
                    if(!empty($data->video->cover)) $metas->image = $data->video->cover;
                }
            }
        }

        // print_r($metas);

        if(($results = $xpath->query('//script[@type="application/json" and @data-sjs]')) && $results->length) {
            foreach($results as $item) {
                if(!$data = @json_decode($item->textContent)) continue;
                if($owner = ARR::find_key($data, 'owner_as_page'))  {
                    if(!empty($owner->name)) $metas->label = $owner->name;
                }
                if($route = ARR::find_key($data, 'route')) {
                    if(!empty($route->meta->title)) $metas->title = $route->meta->title;
                }
            }
        }
        // print_r($metas);
        if(empty($metas->label)) {
            if(($results = $xpath->query('//link[@rel="manifest" and @href]')) && $results->length) {
                if($manifesturl = get_absolute_url($url, $results->item(0)->getAttribute('href'))) {
                    if($json = self::getContents($manifesturl)) {
                        if($manifest = json_decode($json)) {
                            if(!empty($manifest->name)) $metas->label = $manifest->name;
                        }
                    }
                }
            }
        }
        // print_r($metas);
        if(empty($metas->label) && (($results = $xpath->query('//meta[@property="fb:page_id"]')) && $results->length)) {
            // echo "patate".RN;
            if($_contents = self::getContents('https://facebook.com/' . $results->item(0)->getAttribute('content'))) {
                // echo $contents.RN;
                if($xp = self::loadHTML($_contents)) {
                    if(($results = $xp->query('//meta[@property="og:title"]')) && $results->length) {
                        $metas->label = $results->item(0)->getAttribute('content');
                    }
                }
            }
        }
        
        if(empty($metas->label) && preg_match('#Drupal\.settings,(\{.*?\})\);#i', $contents, $m))
            if($data = json_decode($m[1]))
                if(!empty($data->jquery_ajax_load->site_name))
                    $metas->label = $data->jquery_ajax_load->site_name;
        
        
        // print_r($metas);

        // if(strtolower(pathinfo(parse_url($metas->image, PHP_URL_PATH), PATHINFO_EXTENSION)) == 'svg') $metas->image = '';

        if(empty($metas->image) && ($results = $xpath->query('//span[@class="background-image not-mobile"]')) && $results->length)
            if(preg_match('#url\(\'(.*?)\'\)#i', $results->item(0)->getAttribute('style'), $m))
                $metas->image = $m[1];

        if(empty($metas->image) && ($results = $xpath->query('//link[@rel="icon" and @type="image/jpeg"]')) && $results->length) $metas->image = $results->item(0)->getAttribute('href');
        if(empty($metas->image) && ($results = $xpath->query('//link[@rel="icon" and @type="image/png"]')) && $results->length) $metas->image = $results->item(0)->getAttribute('href');
        if(empty($metas->image) && ($results = $xpath->query('//article//img')) && $results->length) $metas->image = $results->item(0)->getAttribute('src');
        if(empty($metas->image) && ($results = $xpath->query('//div[@id="image_box"]//img')) && $results->length) $metas->image = $results->item(0)->getAttribute('src');
        if(empty($metas->image) && ($results = $xpath->query('//link[@rel="shortcut icon" and @type="image/jpeg" and @href]')) && $results->length) $metas->image = $results->item(0)->getAttribute('href');

        if(empty($metas->image) && ($results = $xpath->query('//link[@rel="apple-touch-icon" and @sizes]')) && $results->length) {
            $size = 0;
            foreach($results as $item) {
                /** @var DOMElement $item */
                $nsize = current(explode('x', $item->getAttribute('sizes')));
                if($nsize > $size) {
                    $metas->image = $item->getAttribute('href');
                    $size = $nsize;
                }
            }
        }
        if(empty($metas->image) && ($results = $xpath->query('//link[@rel="apple-touch-icon"]')) && $results->length) $metas->image = $results->item(0)->getAttribute('href');
        if(empty($metas->title) && ($results = $xpath->query('//title')) && $results->length) $metas->title = $results->item(0)->textContent;


        // print_r($metas);


        if(empty($metas->label)) { $parts = explode('|', $metas->title); if(count($parts) > 1) $metas->label = trim(array_pop($parts)); }
        if(empty($metas->label)) { $parts = explode(' - ', $metas->title); if(count($parts) > 1) $metas->label = trim(array_pop($parts)); }
        if(strpos($metas->label, '@') === 0) $metas->label = ucwords(preg_replace('#^@#i', '', $metas->label));

        if(empty($metas->label) && ($results = $xpath->query('//div[@id="elevate-global" and @data-elevate-global]')) && $results->length)
            if($data = json_decode($results->item(0)->getAttribute('data-elevate-global')))
                if(!empty($data->content_organization))
                    $metas->label = $data->content_organization;

        if(empty($metas->label) && preg_match('#_spPageContextInfo=(\{.*?\});#i', $contents, $m))
            if($data = json_decode($m[1]))
                if(!empty($data->webTitle))
                    $metas->label = $data->webTitle;

        

        if(empty($metas->description) && ($results = $xpath->query('//p')) && $results->length){
            foreach($results as $item) {
                if(!($desc = trim($item->textContent))) continue;
                if(count(explode(' ', $desc)) < 5) continue;
                $metas->description = $desc;
                break;
            }
        }
        
        
        // print_r($metas);
        
        
        if(strpos($metas->image, '//') === 0) $metas->image = 'https:' . $metas->image;
        if(!empty($metas->image) && !parse_url($metas->image, PHP_URL_SCHEME)) $metas->image = get_absolute_url($url, $metas->image);
        
        if(parse_url($metas->image, PHP_URL_HOST) == 'lookaside.fbsbx.com')
            if($_contents = self::getContents($metas->image))
                if(preg_match('#location\.href = "(.*?)";#i', $_contents, $m))
                    if($_contents = self::getContents(str_replace('\\/', '/', $m[1])))
                        if($xp = self::loadHTML($_contents))
                            if(($results = $xp->query('//link[@rel="preload" and @as="image" and contains(@href, ".jpg")]')) && $results->length)
                                $metas->image = $results->item(0)->getAttribute('href');

        // $metas->image = trim($metas->image);
                                // print_r($metas);
        if(!url_exists($metas->image, '^image/') && ($results = $xpath->query('//img[@src]')) && $results->length) {
            foreach($results as $item) {
                if(in_array(pathinfo(parse_url($item->getAttribute('src'), PHP_URL_PATH), PATHINFO_EXTENSION), ['jpg', 'jpeg', 'png', 'webp'])) {
                    $metas->image = $item->getAttribute('src');
                    if(strpos($metas->image, '//') === 0) $metas->image = 'https:' . $metas->image;
                    if(!empty($metas->image) && !parse_url($metas->image, PHP_URL_SCHEME)) $metas->image = get_absolute_url($url, $metas->image);
                    break;
                }
            }
        }
        
        // print_r($metas);
        // print_r(curl_get_info($metas->image));

        // if(empty($metas->label)) $metas->label = parse_url($url, PHP_URL_HOST);

        $metas->url = urldecode($metas->url);
        $metas->title = trim(current(explode(' | ', $metas->title)));
        $metas->label = preg_replace('#^www\.#i', '', trim(current(explode(', ', current(explode(' — ', current(explode(' - ', current(explode(' | ', $metas->label))))))))));
        $metas->description = trim(strip_tags($metas->description));
        return $metas;
        return empty($metas->title) ? false : $metas;
    }


    private static function getContents($url) {
        if(($contents = Cache::get(($key = 'scraper_' . STR::shorthash($url)))) !== null) return $contents;
        $contents = curl_get_contents($url);
        Cache::set($key, $contents);
        return $contents;
    }


	private static function loadHTML($contents) {
		$contents = mb_convert_encoding($contents, 'HTML-ENTITIES', 'UTF-8');
		$dom = new DomDocument('1.0', 'UTF-8');
		$dom->preserveWhiteSpace = false;
		@$dom->loadHTML($contents);
		return new DOMXpath($dom);
	}


    public static function get($url) {
        // if(($metas = Cache::get(($key = 'metas_' . STR::shorthash($url)))) !== null) return $metas;
        if(!$metas = self::scrape($url)) throw new Exception("Can't crawl Url.");
        $key = 'metas_' . STR::shorthash($url);
        Cache::set($key, $metas);
        // print_r($metas);
        // phpinfo();
        return $metas;
    }

}