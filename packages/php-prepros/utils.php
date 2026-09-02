<?php

const BR = '<br>';
const RN = "\r\n";
const S = '/';


define('IMAGICK_SUPPORT', extension_loaded('imagick'));
define('GD_SUPPORT', extension_loaded('gd'));
define('WEBP_SUPPORT', IMAGICK_SUPPORT || function_exists('imagewebp'));
define('IMG_EXT', WEBP_SUPPORT ? '.webp' : '.jpg');


// function where($file)
// {
//     static $isWin = null;
//     static $execs = [];

//     if ($isWin === null) $isWin = strtoupper(substr(PHP_OS, 0, 3)) == 'WIN' ? true : false;
//     if ($isWin && strtolower(pathinfo($file, PATHINFO_EXTENSION)) != 'exe') $file = pathinfo($file, PATHINFO_FILENAME) . '.exe';
//     if (isset($execs[$file])) return $execs[$file];

//     if ($isWin) $results = shell_exec('where ' . $file . ' 2>&1');
//     else $results = shell_exec('which ' . $file);
//     if (!$exec = trim(current(explode("\n", trim($results))))) return false;
//     if (!$exec = realpath($exec)) return false;

//     $execs[$file] = $exec;
//     return $exec;
// }


// function find_root($path)
// {
//     if (is_file($path)) $path = pathinfo(realpath($path), PATHINFO_DIRNAME);
//     elseif (!$path = realpath($path)) return false;
//     do {
//         $file = $path . S . '_pxpros.json';
//         if (is_file($file)) return realpath($file);
//         $path = pathinfo($path, PATHINFO_DIRNAME);
//     } while ($path != pathinfo($path, PATHINFO_DIRNAME));
//     return false;
// }



// function err($str)
// {
//     echo 'Error: ' . $str . RN;
//     exit(1);
// }


// function find_colors()
// {
//     static $colors = null;

//     if ($colors === null) {
//         if (!$root = find_root(__FILE__)) return false;
//         if (!$config = json_decode(file_get_contents($root))) return false;
//         if (!$cssfiles[0] = realpath(pathinfo($root, PATHINFO_DIRNAME) . '/pxdoc/styles/styles.min.css')) return false;

//         if (!empty($config->styles)) {
//             if (is_string($config->styles)) $config->styles = [$config->styles];
//             foreach ($config->styles as $cssfile) {
//                 if (!$cssfile = realpath(pathinfo($root, PATHINFO_DIRNAME) . S . $cssfile)) continue;
//                 else $cssfiles[] = $cssfile;
//             }
//         }

//         $colors = new stdClass;
//         foreach ($cssfiles as $cssfile) {
//             if (!$css = @file_get_contents($cssfile)) continue;
//             if (preg_match("/--main-color:[^#]*#([0-9a-f]{6})/i", $css, $m)) $colors->main = strtolower($m[1]) . 'ff';
//             if (preg_match("/--second-color:[^#]*#([0-9a-f]{6})/i", $css, $m)) $colors->second = strtolower($m[1]) . 'ff';
//             if (preg_match("/--color-black:[^#]*#([0-9a-f]{6})/i", $css, $m)) $colors->black = strtolower($m[1]) . 'ff';
//             if (preg_match("/--color-white:[^#]*#([0-9a-f]{6})/i", $css, $m)) $colors->white = strtolower($m[1]) . 'ff';
//         }
//     }

//     return $colors;
// }


function gcd(float $a, float $b = 0)
{
    return is_array($a) ? array_reduce($a, 'gcd') : ($b ? gcd($b, $a % $b) : $a);
}


function gcd_reduce(float $a, float $b)
{
    $f = gcd($a, $b);
    return [$a / $f, $b / $f];
}



/**
 * get_relative_path
 *
 * @param  mixed $from
 * @param  mixed $to
 * @return void
 */
function get_relative_path($from, $to)
{
    $from = is_dir($from) ? rtrim($from, '\/') . '/' : $from;
    $to   = is_dir($to)   ? rtrim($to, '\/') . '/'   : $to;
    $from = str_replace('\\', '/', $from);
    $to   = str_replace('\\', '/', $to);
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
    return implode('/', $relPath);
}


// /**
//  * replace_tags
//  *
//  * @param  mixed $tag
//  * @param  mixed $contents
//  * @param  mixed $clb
//  * @return void
//  */
// function replace_tags($tag, $contents, $clb)
// {
//     $contents = preg_replace_callback('#<' . preg_quote($tag, '#') . '([^>]*)>(.*?)</' . preg_quote($tag, '#') . '>#msi', function ($m) use ($clb) {
//         return call_user_func($clb, $m[0], parse_html_attributes($m[1]), $m[2]);
//     }, $contents);
//     return $contents;
// }


// /**
//  * parse_html_attributes
//  *
//  * @param  mixed $attributes
//  * @return void
//  */
// function parse_html_attributes($attributes)
// {
//     if (preg_match_all('#(\\w+)\s*=\\s*("[^"]*"|\'[^\']*\'|[^"\'\\s>]*)#i', $attributes, $m)) {
//         foreach ($m[1] as $k => $key) {
//             $attrs[strtolower($key)] = stripslashes(substr($m[2][$k], 1, -1));;
//         }
//     }
//     return isset($attrs) ? $attrs : [];
// }


// /**
//  * Parse the first DOCKBLOCK of a file and return attributes as an object
//  *
//  * @param  mixed $file PHP File to be parse
//  * @return void
//  */
// function php_file_info($file)
// {
//     static $files = [];
//     if (!$file = realpath($file)) return false;
//     if (!isset($files[$file])) {
//         $tokens = token_get_all(file_get_contents($file));
//         foreach ($tokens as $tok) {
//             if (!is_array($tok)) continue;
//             if ($tok[0] == T_DOC_COMMENT) {
//                 $block = $tok[1];
//                 break;
//             }
//         }
//         if (empty($block)) return new stdClass;
//         if (!preg_match_all('#@([a-z0-9]+)[\s\t]+([^\n]+)#msi', $block, $m)) $files[$file] = new stdClass;
//         else {
//             foreach ($m[1] as $k => $v) $info[trim($v)] = trim($m[2][$k]);
//             $files[$file] = (object)$info;
//         }
//     }
//     return $files[$file];
// }


// /**
//  * Recursevly walk a folder and yield files corresponding to the pattern
//  *
//  * @param  mixed $path Path and pattern to walk through
//  * @return void
//  */
// function dig($path)
// {
//     $patt = pathinfo($path, PATHINFO_BASENAME);
//     $path = pathinfo($path, PATHINFO_DIRNAME);
//     if (!$path = realpath($path)) return;
//     else $path .= S;
//     foreach (glob($path . $patt) as $file) {
//         if (is_dir($file)) continue;
//         else yield $file;
//     }
//     foreach (glob($path . '*', GLOB_ONLYDIR) as $dir) {
//         foreach (call_user_func(__FUNCTION__, $dir . S . $patt) as $file) yield $file;
//     }
// }


// function is_url($str)
// {
//     if (!$sheme = strtolower(@parse_url($str, PHP_URL_SCHEME))) return false;
//     return in_array($sheme, ['http', 'https', 'itunes', 'ftp', 'ftps', 'ssh', 'ssl', 'sftp']);
// }



// /**
//  * Fetch and returns the content of a URL. Replace file_get_contents for URL.
//  *
//  * @param  string $file File URL
//  * @param  string $dest (optional) Fullpath of the file destination
//  * @param  callable $clb (optional) Callback for progress
//  * @return mixed Returns the contents of the fetched file. Will returns TRUE or FALSE if you specified a destination.
//  */
// function curl_get_contents($file, $dest = null, $clb = null)
// {
//     if(!is_file(($cookie = pathinfo(find_root(__FILE__), PATHINFO_DIRNAME) . '/.cookie.txt'))) touch($cookie);
//     $chnd = curl_init($file);
//     curl_setopt_array($chnd, [
//         CURLOPT_AUTOREFERER    => true,
//         CURLOPT_FOLLOWLOCATION => true,
//         CURLOPT_SSL_VERIFYHOST => false,
//         CURLOPT_SSL_VERIFYPEER => false,
//         CURLOPT_TIMEOUT        => 60,
//         CURLOPT_CONNECTTIMEOUT => 10,
//         CURLOPT_ENCODING       => 'gzip,deflate',
//         CURLOPT_NOPROGRESS     => ($clb ? false : true),
//         CURLOPT_RETURNTRANSFER => ($dest ? false : true),
//         CURLOPT_COOKIEFILE     => $cookie,
//         CURLOPT_COOKIEJAR      => $cookie,
//         CURLOPT_HTTPHEADER     => [
//             'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
//             'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
//             'Accept-Language: fr-CA,fr;q=0.9,en-US;q=0.8,en;q=0.7',
//             'Sec-Ch-Ua: "Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
//             'Sec-Ch-Ua-Mobile: ?0',
//             'Sec-Ch-Ua-Platform: "Windows"',
//             'Sec-Fetch-Dest: document',
//             'Sec-Fetch-Mode: navigate',
//             'Sec-Fetch-Site: none',
//             'Sec-Fetch-User: ?1',
//             'Upgrade-Insecure-Requests: 1',
//         ],
//     ]);
//     if ($clb) {
//         $lastprog = -1;
//         curl_setopt($chnd, CURLOPT_PROGRESSFUNCTION, function ($chnd, $totalbytes, $downbytes, $expupbytes, $upbytes) use (&$lastprog, $clb) {
//             if ($totalbytes > 0) {
//                 $prog = $downbytes / $totalbytes;
//             } else $prog = 0;
//             $prog = round($prog, 5);
//             if ($prog != $lastprog) {
//                 $lastprog = $prog;
//                 call_user_func($clb, $prog);
//             }
//         });
//     }
//     if ($dest) {
//         if (!$fhnd = fopen($dest, "wb")) return false;
//         curl_setopt($chnd, CURLOPT_WRITEFUNCTION, function ($chnd, $data) use (&$fhnd) {
//             return fwrite($fhnd, $data);
//         });
//     }
//     $results = curl_exec($chnd);
//     $info = curl_getinfo($chnd);
//     // print_r($info);
//     curl_close($chnd);
//     if (!empty($fhnd)) fclose($fhnd);
//     if (!in_array($info['http_code'], [200, 201])) $results = false;
//     return $dest ? ($results !== false) : $results;
// }


// function shorthash($str)
// {
//     return substr(hash('sha256', $str), 0, 12);
// }


// function cropimage($img, $w, $h)
// {
//     $height = ceil(($width = min(imagesx($img), imagesy($img) * $w / $h)) * $h / $w);
//     $width = ceil($width);
//     $offx = round((imagesx($img) - $width) / 2);
//     $offy = round((imagesy($img) - $height) / 2);
//     $tmp = imagecreatetruecolor($w, $h);
//     imagecopyresampled($tmp, $img, 0, 0, $offx, $offy, $w, $h, $width, $height);
//     return $tmp;
// }


// function html_entities_decode($str) {
//     // $str = html_entity_decode(trim($str), ENT_QUOTES, 'UTF-8');
//     // $str = htmlentities($str, ENT_QUOTES, 'UTF-8');
//     // $str = mb_convert_encoding($str, 'HTML-ENTITIES', 'UTF-8');
//     $str = html_entity_decode(trim($str), ENT_QUOTES, 'UTF-8');
//     // $str = htmlentities($str, ENT_QUOTES, 'UTF-8');
//     return $str;
// }


function get_absolute_url(string $baseUrl, string $relativePath): string {
    // Vérifier si l'URL de base pointe vers un fichier et retirer le fichier du chemin

    if(parse_url($relativePath, PHP_URL_SCHEME)) return $relativePath;

    $baseParts = parse_url($baseUrl);
    $basePath = $baseParts['path'] ?? '';
    if (pathinfo($basePath, PATHINFO_EXTENSION)) {
        $basePath = dirname($basePath);
    }
    
    // S'assurer que le chemin de base a un slash à la fin
    $basePath = rtrim($basePath, '/') . '/';
    
    // Si le chemin relatif commence par '/', l'interpréter comme un chemin absolu sur le domaine
    if (strpos($relativePath, '/') === 0) {
        return $baseParts['scheme'] . '://' . $baseParts['host'] . $relativePath;
    }
    
    // Convertir en un chemin absolu en résolvant les '..' et '.'
    $absoluteParts = explode('/', $basePath . $relativePath);
    $resolvedParts = [];
    
    foreach ($absoluteParts as $part) {
        if ($part === "..") {
            array_pop($resolvedParts);
        } elseif ($part !== "." && $part !== "") {
            $resolvedParts[] = $part;
        }
    }
    
    $newPath = implode('/', $resolvedParts);
    return $baseParts['scheme'] . '://' . $baseParts['host'] . '/' . ltrim($newPath, '/');
}


// function getRepresentativeColors($imagePath, $numColors = 5, $tolerance = 30) {
//     $imagick = new Imagick($imagePath);
//     $imagick->quantizeImage($numColors + 2, Imagick::COLORSPACE_RGB, 0, false, false);
//     $histogram = $imagick->getImageHistogram();
    
//     $colors = [];
//     foreach ($histogram as $pixel) {
//         $color = $pixel->getColor();
//         $r = $color['r'];
//         $g = $color['g'];
//         $b = $color['b'];
        
//         // Exclure le blanc et le noir
//         if (!($r > 255 - $tolerance && $g > 255 - $tolerance && $b > 255 - $tolerance) && // Pas du blanc
//             !($r < $tolerance && $g < $tolerance && $b < $tolerance)) { // Pas du noir
//             $colors[] = [
//                 'color' => sprintf("#%02x%02x%02x", $r, $g, $b),
//                 'count' => $pixel->getColorCount()
//             ];
//         }
//     }
    
//     // Trier par fréquence d'apparition
//     usort($colors, function($a, $b) {
//         return $b['count'] - $a['count'];
//     });
    
//     return array_slice(array_column($colors, 'color'), 0, $numColors);
// }


function getRepresentativeColorsGD($imagePath, $numColors = 5, $tolerance = 30) {
    $image = imagecreatefromjpeg($imagePath);
    if (!$image) return [];

    $width = imagesx($image);
    $height = imagesy($image);
    
    $colorCounts = [];
    
    // Scanner chaque pixel
    for ($x = 0; $x < $width; $x++) {
        for ($y = 0; $y < $height; $y++) {
            $rgb = imagecolorat($image, $x, $y);
            $r = ($rgb >> 16) & 0xFF;
            $g = ($rgb >> 8) & 0xFF;
            $b = $rgb & 0xFF;
            
            // Exclure le blanc et le noir
            if (!($r > 255 - $tolerance && $g > 255 - $tolerance && $b > 255 - $tolerance) && 
                !($r < $tolerance && $g < $tolerance && $b < $tolerance)) {
                
                $colorHex = sprintf("#%02x%02x%02x", $r, $g, $b);
                
                if (!isset($colorCounts[$colorHex])) {
                    $colorCounts[$colorHex] = 0;
                }
                $colorCounts[$colorHex]++;
            }
        }
    }
    imagedestroy($image);
    
    // Trier les couleurs par fréquence d'apparition
    arsort($colorCounts);
    
    return array_slice(array_keys($colorCounts), 0, $numColors);
}


// // Exemple d'utilisation
// $imagePath = 'chemin/vers/image.jpg';
// print_r(getRepresentativeColors($imagePath));




// function find_key($data, $key) {
//     if (is_object($data)) {
//         $data = (array) $data;
//     }
    
//     if (is_array($data)) {
//         foreach ($data as $k => $value) {
//             if ($k === $key) {
//                 return $value;
//             }
            
//             if (is_array($value) || is_object($value)) {
//                 $found = find_key($value, $key);
//                 if ($found !== null) {
//                     return $found;
//                 }
//             }
//         }
//     }
    
//     return null;
// }



// function url_exists($url, $mimereg = null) {
//     if(!is_url($url)) return false;
//     if(!$info = curl_get_info($url)) return false;
//     // print_r($info);
//     // if($mimereg && !empty($info['content_type']) && !preg_match('#' . $mimereg . '#i', $info['content_type'])) return false;
//     return ($info['http_code'] >= 200 && $info['http_code'] < 400);
// }



// function curl_get_info($url) {
//     if(!is_url($url)) return false;
//     if(($info = Cache::get(($key = 'curlinfo_' . shorthash($url)))) === null) {
//         if(!is_file(($cookie = pathinfo(find_root(__FILE__), PATHINFO_DIRNAME) . '/.cookie.txt'))) touch($cookie);
//         $ch = curl_init($url);
//         curl_setopt_array($ch,[
//             CURLOPT_NOBODY         => true,
//             CURLOPT_FOLLOWLOCATION => true,
//             CURLOPT_TIMEOUT        => 15,
//             CURLOPT_SSL_VERIFYPEER => false,
//             CURLOPT_SSL_VERIFYHOST => false,
//             CURLOPT_ENCODING       => 'gzip, deflate',
//             CURLOPT_COOKIEFILE     => $cookie,
//             CURLOPT_COOKIEJAR      => $cookie,
//             CURLOPT_HTTPHEADER     => [
//                 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
//                 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
//                 'Accept-Language: fr-CA,fr;q=0.9,en-US;q=0.8,en;q=0.7',
//                 'Sec-Ch-Ua: "Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
//                 'Sec-Ch-Ua-Mobile: ?0',
//                 'Sec-Ch-Ua-Platform: "Windows"',
//                 'Sec-Fetch-Dest: document',
//                 'Sec-Fetch-Mode: navigate',
//                 'Sec-Fetch-Site: none',
//                 'Sec-Fetch-User: ?1',
//                 'Upgrade-Insecure-Requests: 1',
//         ]]);
//         curl_exec($ch);
//         $info = curl_getinfo($ch);
//         curl_close($ch);
//         Cache::set($key, $info);
//     }
//     return $info;
// }



// /**
//  * register_tag
//  *
//  * @param  mixed $tag
//  * @param  mixed $clb
//  * @return void
//  */
// function register_tag($tag, $clb)
// {
//     global $PAGE;
//     return $PAGE->registerTag($tag, $clb);
// }


// /**
//  * register_hook
//  *
//  * @param  mixed $name
//  * @param  mixed $clb
//  * @return void
//  */
// function register_hook($name, $clb)
// {
//     global $PAGE;
//     return $PAGE->registerHook($name, $clb);
// }



// spl_autoload_register(function ($class) {
//     static $catalog = [
//         'Cache'   => 'cache.class.php',
//         'Media'   => 'media.class.php',
//         'PXPros'  => 'pxpros.class.php',
//         'Scraper' => 'scraper.class.php',
//     ];
//     if (isset($catalog[$class])) require_once(__DIR__ . '/libraries/' . $catalog[$class]);
// }, true, true);
