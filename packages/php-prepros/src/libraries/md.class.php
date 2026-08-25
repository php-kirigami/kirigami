<?php

class MD {

    // ========================================================================
    // SYSTÈME DE PLUGINS
    //
    // SYNTAXE INLINE (args sur la même ligne) :
    //   {% nom_plugin arg1 arg2 "arg avec espaces" %}
    //
    // SYNTAXE BLOC (contenu multi-ligne) :
    //   {% nom_plugin arg1 arg2
    //   ligne de contenu 1
    //   ligne de contenu 2
    //   %}
    //
    // Le callback reçoit toujours (array $args, string $body) :
    //   - $args  : tableau des arguments passés sur la ligne d'ouverture
    //   - $body  : contenu multi-ligne (vide "" pour les tags inline)
    //
    // Exemples :
    //   GithubReadmeParser::registerPlugin('codepen', function(array $args, string $body): string {
    //       $id = htmlspecialchars($args[0] ?? '', ENT_QUOTES, 'UTF-8');
    //       return "<iframe src=\"https://codepen.io/embed/{$id}\"></iframe>";
    //   });
    //
    //   GithubReadmeParser::registerPlugin('checklist', function(array $args, string $body): string {
    //       $items = array_filter(explode("\n", trim($body)));
    //       $html  = '<ul class="checklist">';
    //       foreach ($items as $item) {
    //           $html .= '<li><input type="checkbox" /> ' . htmlspecialchars(trim($item), ENT_QUOTES, 'UTF-8') . '</li>';
    //       }
    //       return $html . '</ul>';
    //   });
    // ========================================================================

    /** @var array<string, callable(string[]): string> */
    private static array $plugins = [];

    /**
     * Enregistre un plugin par son nom.
     *
     * @param string   $name     Nom du tag, ex: "codepen"
     * @param callable $callback function(array $args): string
     *                           $args[0] = premier argument, $args[1] = second, etc.
     */
    public static function registerPlugin(string $name, callable $callback): void {
        self::$plugins[strtolower(trim($name))] = $callback;
    }

    /**
     * Supprime un plugin enregistré.
     */
    public static function unregisterPlugin(string $name): void {
        unset(self::$plugins[strtolower(trim($name))]);
    }

    /**
     * Retourne la liste des plugins enregistrés.
     *
     * @return string[]
     */
    public static function getRegisteredPlugins(): array {
        return array_keys(self::$plugins);
    }

    // ========================================================================
    // Génère un id de type "slug" pour les ancres de titres (ATX et Setext).
    // ========================================================================
    private static function slugify(string $text): string {
        $id = strtolower(preg_replace('/[^\w\- ]/u', '', $text));
        return preg_replace('/\s+/', '-', trim($id));
    }

    // ========================================================================
    // Convertit une largeur d'indentation (espaces/tabs) en nombre de colonnes,
    // une tabulation comptant pour 4 espaces.
    // ========================================================================
    private static function indentWidth(string $whitespace): int {
        return strlen(str_replace("\t", '    ', $whitespace));
    }

    /**
     * Construit récursivement une liste (imbriquée) <ol>/<ul> à partir d'un
     * tableau plat d'items { indent, type, text }. $i est avancé au fur et à
     * mesure de la consommation des items.
     *
     * @param array<int, array{indent:int, type:string, text:string}> $items
     */
    private static function buildListTree(array $items, int &$i, int $count): string {
        $type       = $items[$i]['type'];
        $baseIndent = $items[$i]['indent'];
        $out        = "<{$type}>\n";

        while ($i < $count && $items[$i]['indent'] === $baseIndent && $items[$i]['type'] === $type) {
            $text = $items[$i]['text'];
            $i++;

            $nested = '';
            if ($i < $count && $items[$i]['indent'] > $baseIndent) {
                $nested = "\n" . self::buildListTree($items, $i, $count);
            }

            $out .= "  <li>{$text}{$nested}</li>\n";
        }

        return $out . "</{$type}>";
    }

    // ========================================================================
    // ÉMOJIS (syntaxe étendue) : :shortcode: → caractère unicode.
    // Table non exhaustive mais couvrant les raccourcis les plus courants ;
    // extensible via registerEmoji().
    // ========================================================================
    /** @var array<string, string> */
    private static array $extraEmoji = [];

    private static array $emojiMap = [
        'smile' => '😄', 'smiley' => '😃', 'grin' => '😁', 'joy' => '😂', 'rofl' => '🤣',
        'blush' => '😊', 'wink' => '😉', 'relaxed' => '☺️', 'slight_smile' => '🙂',
        'upside_down_face' => '🙃', 'innocent' => '😇', 'heart_eyes' => '😍', 'kissing_heart' => '😘',
        'thinking' => '🤔', 'neutral_face' => '😐', 'expressionless' => '😑', 'no_mouth' => '😶',
        'roll_eyes' => '🙄', 'smirk' => '😏', 'unamused' => '😒', 'grimacing' => '😬',
        'lying_face' => '🤥', 'relieved' => '😌', 'pensive' => '😔', 'sleepy' => '😪',
        'drooling_face' => '🤤', 'sleeping' => '😴', 'mask' => '😷', 'sunglasses' => '😎',
        'star_struck' => '🤩', 'partying_face' => '🥳', 'worried' => '😟', 'frowning' => '☹️',
        'confused' => '😕', 'slightly_frowning_face' => '🙁', 'cry' => '😢', 'sob' => '😭',
        'scream' => '😱', 'confounded' => '😖', 'persevere' => '😣', 'disappointed' => '😞',
        'sweat' => '😓', 'weary' => '😩', 'tired_face' => '😫', 'yawning_face' => '🥱',
        'triumph' => '😤', 'rage' => '😡', 'angry' => '😠', 'cursing_face' => '🤬',
        'exploding_head' => '🤯', 'flushed' => '😳', 'hot_face' => '🥵', 'cold_face' => '🥶',
        'scream_cat' => '🙀', 'nerd_face' => '🤓', 'monocle_face' => '🧐', 'zany_face' => '🤪',
        'raised_eyebrow' => '🤨', 'shushing_face' => '🤫', 'zipper_mouth_face' => '🤐',
        'heart' => '❤️', 'orange_heart' => '🧡', 'yellow_heart' => '💛', 'green_heart' => '💚',
        'blue_heart' => '💙', 'purple_heart' => '💜', 'black_heart' => '🖤', 'white_heart' => '🤍',
        'broken_heart' => '💔', 'two_hearts' => '💕', 'sparkling_heart' => '💖', 'heartbeat' => '💓',
        'thumbsup' => '👍', '+1' => '👍', 'thumbsdown' => '👎', '-1' => '👎',
        'clap' => '👏', 'raised_hands' => '🙌', 'pray' => '🙏', 'wave' => '👋',
        'ok_hand' => '👌', 'v' => '✌️', 'crossed_fingers' => '🤞', 'muscle' => '💪',
        'point_up' => '☝️', 'point_down' => '👇', 'point_left' => '👈', 'point_right' => '👉',
        'handshake' => '🤝', 'writing_hand' => '✍️', 'fire' => '🔥', 'star' => '⭐',
        'star2' => '🌟', 'sparkles' => '✨', 'zap' => '⚡', 'boom' => '💥', 'collision' => '💥',
        'rocket' => '🚀', 'tada' => '🎉', 'confetti_ball' => '🎊', 'gift' => '🎁',
        'balloon' => '🎈', 'trophy' => '🏆', 'medal' => '🏅', 'crown' => '👑',
        'gem' => '💎', 'moneybag' => '💰', 'dollar' => '💵', '100' => '💯',
        'warning' => '⚠️', 'no_entry' => '⛔', 'stop_sign' => '🛑', 'checkered_flag' => '🏁',
        'white_check_mark' => '✅', 'heavy_check_mark' => '✔️', 'x' => '❌', 'negative_squared_cross_mark' => '❎',
        'question' => '❓', 'grey_question' => '❔', 'exclamation' => '❗', 'bangbang' => '‼️',
        'interrobang' => '⁉️', 'bulb' => '💡', 'bell' => '🔔', 'no_bell' => '🔕',
        'lock' => '🔒', 'unlock' => '🔓', 'key' => '🔑', 'mag' => '🔍', 'link' => '🔗',
        'pushpin' => '📌', 'paperclip' => '📎', 'calendar' => '📅', 'clock' => '🕐',
        'hourglass' => '⌛', 'alarm_clock' => '⏰', 'memo' => '📝', 'pencil2' => '✏️',
        'book' => '📖', 'books' => '📚', 'newspaper' => '📰', 'email' => '📧',
        'envelope' => '✉️', 'inbox_tray' => '📥', 'outbox_tray' => '📤', 'package' => '📦',
        'file_folder' => '📁', 'open_file_folder' => '📂', 'clipboard' => '📋',
        'chart_with_upwards_trend' => '📈', 'chart_with_downwards_trend' => '📉', 'bar_chart' => '📊',
        'computer' => '💻', 'desktop_computer' => '🖥️', 'keyboard' => '⌨️', 'printer' => '🖨️',
        'phone' => '📱', 'iphone' => '📱', 'camera' => '📷', 'video_camera' => '📹',
        'tv' => '📺', 'radio' => '📻', 'battery' => '🔋', 'electric_plug' => '🔌',
        'bug' => '🐛', 'beetle' => '🪲', 'gear' => '⚙️', 'wrench' => '🔧', 'hammer' => '🔨',
        'nut_and_bolt' => '🔩', 'toolbox' => '🧰', 'test_tube' => '🧪', 'microscope' => '🔬',
        'satellite' => '🛰️', 'globe_with_meridians' => '🌐', 'earth_americas' => '🌎',
        'sun' => '☀️', 'sunny' => '☀️', 'partly_sunny' => '⛅', 'cloud' => '☁️',
        'rainbow' => '🌈', 'umbrella' => '☂️', 'snowflake' => '❄️', 'droplet' => '💧',
        'ocean' => '🌊', 'tent' => '⛺', 'camping' => '🏕️', 'mountain' => '⛰️',
        'evergreen_tree' => '🌲', 'deciduous_tree' => '🌳', 'palm_tree' => '🌴',
        'cactus' => '🌵', 'seedling' => '🌱', 'four_leaf_clover' => '🍀', 'maple_leaf' => '🍁',
        'dog' => '🐶', 'cat' => '🐱', 'mouse' => '🐭', 'rabbit' => '🐰', 'fox_face' => '🦊',
        'bear' => '🐻', 'panda_face' => '🐼', 'koala' => '🐨', 'tiger' => '🐯', 'lion' => '🦁',
        'cow' => '🐮', 'pig' => '🐷', 'frog' => '🐸', 'monkey_face' => '🐵', 'chicken' => '🐔',
        'penguin' => '🐧', 'bird' => '🐦', 'baby_chick' => '🐤', 'owl' => '🦉',
        'horse' => '🐴', 'unicorn' => '🦄', 'bee' => '🐝', 'butterfly' => '🦋', 'snail' => '🐌',
        'octopus' => '🐙', 'fish' => '🐟', 'dolphin' => '🐬', 'whale' => '🐳',
        'pizza' => '🍕', 'hamburger' => '🍔', 'fries' => '🍟', 'hotdog' => '🌭',
        'taco' => '🌮', 'sushi' => '🍣', 'ramen' => '🍜', 'spaghetti' => '🍝',
        'bread' => '🍞', 'cheese' => '🧀', 'egg' => '🥚', 'popcorn' => '🍿',
        'cookie' => '🍪', 'doughnut' => '🍩', 'cake' => '🍰', 'birthday' => '🎂',
        'candy' => '🍬', 'chocolate_bar' => '🍫', 'icecream' => '🍦', 'apple' => '🍎',
        'banana' => '🍌', 'grapes' => '🍇', 'watermelon' => '🍉', 'strawberry' => '🍓',
        'lemon' => '🍋', 'peach' => '🍑', 'coffee' => '☕', 'tea' => '🍵', 'beer' => '🍺',
        'beers' => '🍻', 'wine_glass' => '🍷', 'cocktail' => '🍸', 'tropical_drink' => '🍹',
        'champagne' => '🍾', 'soccer' => '⚽', 'basketball' => '🏀', 'football' => '🏈',
        'baseball' => '⚾', 'tennis' => '🎾', 'volleyball' => '🏐', 'rugby_football' => '🏉',
        '8ball' => '🎱', 'golf' => '⛳', 'dart' => '🎯', 'video_game' => '🎮',
        'game_die' => '🎲', 'jigsaw' => '🧩', 'car' => '🚗', 'taxi' => '🚕', 'bus' => '🚌',
        'ambulance' => '🚑', 'fire_engine' => '🚒', 'police_car' => '🚓', 'bike' => '🚲',
        'airplane' => '✈️', 'helicopter' => '🚁', 'train' => '🚆', 'ship' => '🚢',
        'house' => '🏠', 'office' => '🏢', 'hospital' => '🏥', 'school' => '🏫',
        'church' => '⛪', 'castle' => '🏰', 'world_map' => '🗺️', 'flag_white' => '🏳️',
        'flag_black' => '🏴', 'checkered_flag2' => '🏁', 'eyes' => '👀', 'eye' => '👁️',
        'speech_balloon' => '💬', 'thought_balloon' => '💭', 'zzz' => '💤', 'boom2' => '💥',
        'sos' => '🆘', 'new' => '🆕', 'ok' => '🆗', 'up' => '🆙', 'cool' => '🆒',
        'free' => '🆓', 'id' => '🆔', 'ng' => '🆖',
    ];

    /**
     * Enregistre (ou remplace) un raccourci emoji personnalisé.
     */
    public static function registerEmoji(string $shortcode, string $char): void {
        self::$extraEmoji[strtolower(trim($shortcode, ':'))] = $char;
    }

    private static function emojiFor(string $shortcode): ?string {
        $key = strtolower($shortcode);
        return self::$extraEmoji[$key] ?? self::$emojiMap[$key] ?? null;
    }

    // ========================================================================
    // LISTES DE DÉFINITION (syntaxe étendue)
    //   Terme
    //   : Définition
    // Analyse procédurale ligne par ligne (plus sûre qu'une seule grosse
    // regex pour regrouper plusieurs paires terme/définitions dans un même
    // <dl>, séparées ou non par une ligne vide).
    // ========================================================================
    private static function isDefinitionColonLine(string $line): bool {
        return (bool) preg_match('/^[ \t]*:[ \t]+.+$/', $line);
    }

    private static function looksLikeOtherBlock(string $line): bool {
        $t = ltrim($line);
        if ($t === '') return true;
        if (str_starts_with($t, '<')) return true;
        return (bool) preg_match('/^(?:#{1,6}[ \t]|>|```|\||[-*+][ \t]|\d+\.[ \t])/', $t);
    }

    private static function extractDefinitionLists(string $html): string {
        $lines = explode("\n", $html);
        $n     = count($lines);
        $out   = [];
        $i     = 0;

        while ($i < $n) {
            $isTermStart = $i + 1 < $n
                && !self::looksLikeOtherBlock($lines[$i])
                && !self::isDefinitionColonLine($lines[$i])
                && self::isDefinitionColonLine($lines[$i + 1]);

            if (!$isTermStart) {
                $out[] = $lines[$i];
                $i++;
                continue;
            }

            $dl = "<dl>\n";
            while (true) {
                $term = trim($lines[$i]);
                $dl  .= "  <dt>{$term}</dt>\n";
                $i++;
                while ($i < $n && preg_match('/^[ \t]*:[ \t]+(.*)$/', $lines[$i], $m)) {
                    $dl .= "  <dd>{$m[1]}</dd>\n";
                    $i++;
                }

                // Une seule ligne vide entre deux groupes reste dans le même <dl>
                // si le groupe suivant est bien un nouveau terme.
                if ($i < $n && trim($lines[$i]) === '') {
                    $j = $i;
                    while ($j < $n && trim($lines[$j]) === '') $j++;
                    if ($j + 1 < $n
                        && !self::looksLikeOtherBlock($lines[$j])
                        && !self::isDefinitionColonLine($lines[$j])
                        && self::isDefinitionColonLine($lines[$j + 1])
                    ) {
                        $i = $j;
                        continue;
                    }
                }
                break;
            }
            $dl   .= "</dl>";
            $out[] = $dl;
        }

        return implode("\n", $out);
    }

    // ========================================================================

    public static function toHtml(string $markdown): string {

        // ====================================================================
        // ÉTAPE 1 : Normalisation des fins de ligne
        // ====================================================================
        $html = str_replace(["\r\n", "\r"], "\n", $markdown);


        // ====================================================================
        // ÉTAPE 2 : PLUGINS
        // Deux formes supportées :
        //
        //   INLINE : {% nom arg1 "arg 2" %}
        //     → $args = ['arg1', 'arg 2'], $body = ''
        //
        //   BLOC   : {% nom arg1\ncontenu\nsur\nplusieurs lignes\n%}
        //     → $args = ['arg1'], $body = "contenu\nsur\nplusieurs lignes"
        //
        // Les deux sont capturés par une seule regex qui distingue la présence
        // d'un saut de ligne après les args (bloc) ou non (inline).
        // Traités avant l'encodage XSS — réinjectés en toute dernière étape.
        // ====================================================================
        $pluginBlocks = [];

        /**
         * Parse une chaîne d'arguments en tableau.
         * Supporte les mots simples, "guillemets doubles" et 'simples'.
         */
        $parseArgs = static function (string $rawArgs): array {
            $args = [];
            if (trim($rawArgs) === '') return $args;
            preg_match_all(
                '/"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|\'([^\'\\\\]*(?:\\\\.[^\'\\\\]*)*)\'|(\S+)/',
                $rawArgs,
                $m
            );
            foreach ($m[0] as $i => $_) {
                $args[] = $m[1][$i] !== ''
                    ? stripslashes($m[1][$i])
                    : ($m[2][$i] !== ''
                        ? stripslashes($m[2][$i])
                        : $m[3][$i]);
            }
            return $args;
        };

        $html = preg_replace_callback(
            // Groupe 1 : nom du plugin
            // Groupe 2 : args inline (tout ce qui est sur la première ligne après le nom)
            // Groupe 3 : corps multi-ligne (présent seulement pour les tags blocs)
            '/\{%\s*([a-zA-Z0-9_-]+)([^\n%]*?)(?:\n([\s\S]*?))?\s*%\}/m',
            function ($matches) use (&$pluginBlocks, $parseArgs): string {
                $name    = strtolower(trim($matches[1]));
                $args    = $parseArgs(trim($matches[2] ?? ''));
                // $matches[3] existe uniquement si le tag est multi-ligne
                $body    = isset($matches[3]) ? trim($matches[3]) : '';

                if (!isset(self::$plugins[$name])) {
                    // Plugin inconnu : préservé encodé plutôt que silencieusement supprimé
                    return htmlspecialchars($matches[0], ENT_QUOTES, 'UTF-8');
                }

                $output      = (self::$plugins[$name])($args, $body);
                $placeholder = "\x02PLG" . count($pluginBlocks) . "\x03";
                $pluginBlocks[$placeholder] = $output;
                return $placeholder;
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 2a : DÉFINITIONS DE NOTES DE BAS DE PAGE (footnotes)
        //   [^1]: Texte de la note.
        //   [^bignote]: Première ligne.
        //
        //       Paragraphe suivant, indenté de 4 espaces ou 1 tabulation.
        //
        //       `{ du code }`
        // Extraites (et retirées du texte) AVANT les définitions de liens par
        // référence, car [^label]: matcherait aussi leur regex sinon.
        // Le contenu de chaque note est rendu via un appel récursif à
        // toHtml() pour supporter plusieurs paragraphes, du code, etc.
        // ====================================================================
        $footnoteDefs = [];
        $html = preg_replace_callback(
            '/^\[\^([^\]\s]+)\]:[ \t]?([^\n]*)((?:\n(?:[ \t]{4}[^\n]*|[ \t]*))*)/m',
            function ($m) use (&$footnoteDefs): string {
                $label = strtolower(trim($m[1]));
                $first = $m[2];
                $rest  = $m[3] ?? '';
                $restLines = $rest !== '' ? explode("\n", $rest) : [];
                $restLines = array_map(static function (string $l): string {
                    return preg_replace('/^(?:[ ]{4}|\t)/', '', $l);
                }, $restLines);
                $content = trim($first . "\n" . implode("\n", $restLines));
                $footnoteDefs[$label] = self::toHtml($content);
                return '';
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 2b : DÉFINITIONS DE LIENS PAR RÉFÉRENCE
        //   [label]: https://example.com "Titre optionnel"
        //   [label]: <https://example.com> 'Titre optionnel'
        //   [label]: https://example.com (Titre optionnel)
        // Extraites (et retirées du texte) avant tout le reste ; utilisées
        // plus loin par les liens [texte][label] / [texte][].
        // ====================================================================
        $refDefs = [];
        $html = preg_replace_callback(
            '/^[ \t]{0,3}\[([^\]]+)\]:[ \t]*<?([^\s>]+)>?(?:[ \t]+(?:"([^"]*)"|\'([^\']*)\'|\(([^)]*)\)))?[ \t]*$/m',
            function ($m) use (&$refDefs): string {
                $label = strtolower(trim($m[1]));
                $title = $m[3] !== '' ? $m[3] : ($m[4] !== '' ? $m[4] : ($m[5] ?? ''));
                $refDefs[$label] = ['url' => $m[2], 'title' => $title];
                return '';
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 3 : BLOCS DE CODE (```lang ... ```)
        // ====================================================================
        $codeBlocks = [];
        $html = preg_replace_callback('/^```([a-zA-Z0-9_+-]*)\n([\s\S]*?)\n^```/m', function ($matches) use (&$codeBlocks) {
            $lang        = !empty($matches[1]) ? ' class="language-' . htmlspecialchars($matches[1], ENT_QUOTES, 'UTF-8') . '"' : '';
            $code        = htmlspecialchars($matches[2], ENT_QUOTES, 'UTF-8');
            $placeholder = "\x02CB" . count($codeBlocks) . "\x03";
            $codeBlocks[$placeholder] = "<pre><code{$lang}>{$code}</code></pre>";
            return $placeholder;
        }, $html);

        // ====================================================================
        // ÉTAPE 3a : BLOCS DE CODE INDENTÉS (4 espaces ou 1 tabulation)
        // Reconnu seulement quand précédé d'une ligne vide (ou du début du
        // document) et suivi d'une ligne vide (ou de la fin du document), afin
        // d'éviter les conflits avec l'indentation des listes imbriquées.
        // ====================================================================
        $html = preg_replace_callback(
            '/(?<=\n\n|^)((?:[ ]{4}|\t)[^\n]*(?:\n(?:[ ]{4}|\t)[^\n]*)*)(?=\n\n|\n*$)/',
            function ($matches) use (&$codeBlocks) {
                $lines    = explode("\n", $matches[1]);
                $stripped = array_map(static function (string $l): string {
                    return preg_replace('/^(?:[ ]{4}|\t)/', '', $l);
                }, $lines);
                $code        = htmlspecialchars(implode("\n", $stripped), ENT_QUOTES, 'UTF-8');
                $placeholder = "\x02CB" . count($codeBlocks) . "\x03";
                $codeBlocks[$placeholder] = "<pre><code>{$code}</code></pre>";
                return $placeholder;
            },
            $html
        );

        // Code inline avec double backticks (permet d'inclure un backtick littéral)
        $inlineCodes = [];
        $html = preg_replace_callback('/``(.+?)``/s', function ($matches) use (&$inlineCodes) {
            $content = $matches[1];
            // Convention standard : si le contenu commence et finit par un
            // espace (et n'est pas uniquement des espaces), on retire un
            // espace de chaque côté — utile pour englober un ` en bordure.
            if (preg_match('/^ (.*[^ ]) $/s', $content, $trim)) {
                $content = $trim[1];
            }
            $code        = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');
            $placeholder = "\x02IC" . count($inlineCodes) . "\x03";
            $inlineCodes[$placeholder] = "<code>{$code}</code>";
            return $placeholder;
        }, $html);

        // Code inline (`...`)
        $html = preg_replace_callback('/`([^`\n]+)`/', function ($matches) use (&$inlineCodes) {
            $code        = htmlspecialchars($matches[1], ENT_QUOTES, 'UTF-8');
            $placeholder = "\x02IC" . count($inlineCodes) . "\x03";
            $inlineCodes[$placeholder] = "<code>{$code}</code>";
            return $placeholder;
        }, $html);


        // ====================================================================
        // ÉTAPE 3b : ÉCHAPPEMENT DES CARACTÈRES (\* \_ \# etc.)
        // Traité après l'extraction du code (le code reste littéral) et avant
        // tout le reste, pour que \* n'ouvre pas une emphase, \# ne crée pas
        // un titre, \- ne crée pas de liste, etc.
        // ====================================================================
        $escapes = [];
        $html = preg_replace_callback(
            '/\\\\([\\\\`*_{}\[\]<>()#+\-.!|])/',
            function ($m) use (&$escapes): string {
                $placeholder = "\x02ESC" . count($escapes) . "\x03";
                $escapes[$placeholder] = htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8');
                return $placeholder;
            },
            $html
        );
        // &#124; est la convention documentée (Markdown Extra / PHP Markdown)
        // pour afficher un pipe littéral dans une cellule de tableau sans
        // qu'il soit interprété comme séparateur de colonnes.
        $html = preg_replace_callback(
            '/&#124;/i',
            function () use (&$escapes): string {
                $placeholder = "\x02ESC" . count($escapes) . "\x03";
                $escapes[$placeholder] = '|';
                return $placeholder;
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 3d : LIENS AUTOMATIQUES <https://...> et <email@example.com>
        // Traités avant l'encodage XSS car les caractères < > seraient encodés
        // en &lt; &gt; et la regex ne matcherait plus.
        // ====================================================================
        $autolinks = [];
        $html = preg_replace_callback('/<(https?:\/\/[^\s<>]+)>/', function ($m) use (&$autolinks): string {
            $url         = htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8');
            $placeholder = "\x02AL" . count($autolinks) . "\x03";
            $autolinks[$placeholder] = "<a href=\"{$url}\" target=\"_blank\" rel=\"noopener noreferrer\">{$url}</a>";
            return $placeholder;
        }, $html);
        $html = preg_replace_callback('/<([^\s<>]+@[^\s<>]+\.[^\s<>]+)>/', function ($m) use (&$autolinks): string {
            $email       = htmlspecialchars($m[1], ENT_QUOTES, 'UTF-8');
            $placeholder = "\x02AL" . count($autolinks) . "\x03";
            $autolinks[$placeholder] = "<a href=\"mailto:{$email}\">{$email}</a>";
            return $placeholder;
        }, $html);


        // ====================================================================
        // ÉTAPE 3e : ALERTES GFM ET BLOCKQUOTES
        // Traités avant l'encodage XSS car le caractère > serait encodé en &gt;
        // et les regex ne matcheraient plus.
        // ====================================================================
        $blockquotes = [];

        // Alertes GFM (> [!NOTE], etc.) — plus spécifique, traité en premier
        $html = preg_replace_callback(
            '/^(>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n(?:>[ \t]?[^\n]*\n?)*)/m',
            function ($matches) use (&$blockquotes): string {
                $type    = strtolower($matches[2]);
                $label   = htmlspecialchars($matches[2], ENT_QUOTES, 'UTF-8');
                $content = preg_replace('/^>\s?\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n?/m', '', $matches[1]);
                $content = preg_replace('/^>[ \t]?/m', '', $content);
                $content = htmlspecialchars(trim($content), ENT_QUOTES, 'UTF-8');
                $placeholder = "\x02BQ" . count($blockquotes) . "\x03";
                $blockquotes[$placeholder] = "<div class=\"markdown-alert markdown-alert-{$type}\">"
                    . "<p class=\"markdown-alert-title\">{$label}</p>"
                    . "<p>{$content}</p></div>";
                // Le \n final consommé par la regex est réinjecté après le
                // placeholder pour ne pas fusionner la ligne vide suivante
                // avec celle du placeholder (ce qui fausserait par exemple
                // la détection d'un titre Setext juste après).
                return $placeholder . (str_ends_with($matches[1], "\n") ? "\n" : '');
            },
            $html
        );

        // Blockquotes standards (imbrication gérée par récursion sur toHtml,
        // qui ré-applique cette même règle sur le contenu déjà dé-préfixé
        // d'un niveau de ">")
        $html = preg_replace_callback('/^((?:>[ \t]?[^\n]*\n?)+)/m', function ($matches) use (&$blockquotes): string {
            $content = preg_replace('/^>[ \t]?/m', '', $matches[1]);
            // Les deux espaces trailing sont laissés tels quels : toHtml() les gère lui-même
            $inner   = self::toHtml(trim($content));
            $placeholder = "\x02BQ" . count($blockquotes) . "\x03";
            $blockquotes[$placeholder] = "<blockquote>{$inner}</blockquote>";
            // Voir commentaire ci-dessus : on préserve le \n final consommé.
            return $placeholder . (str_ends_with($matches[1], "\n") ? "\n" : '');
        }, $html);


        // ====================================================================
        // ÉTAPE 4 : Encodage XSS global
        // ====================================================================
        $html = htmlspecialchars($html, ENT_NOQUOTES, 'UTF-8');


        // ====================================================================
        // ÉTAPE 5 : TABLEAUX GFM
        // Supporte les lignes avec ou sans pipe final (| col | ou | col)
        // ====================================================================
        $html = preg_replace_callback(
            '/^(\|[^\n]+\|?\n)([ \t]*\|[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?\n)((?:\|[^\n]+\|?\n?)+)/m',
            function ($matches) {
                $parseRow = function (string $line): array {
                    return array_values(array_filter(
                        array_map('trim', explode('|', trim($line, "| \t\n")))
                    ));
                };

                $headers = $parseRow($matches[1]);
                $alignments = [];
                $sepCells = $parseRow($matches[2]);
                foreach ($sepCells as $sep) {
                    $left  = str_starts_with(trim($sep), ':');
                    $right = str_ends_with(trim($sep), ':');
                    if ($left && $right) $alignments[] = ' style="text-align:center"';
                    elseif ($right)      $alignments[] = ' style="text-align:right"';
                    elseif ($left)       $alignments[] = ' style="text-align:left"';
                    else                 $alignments[] = '';
                }

                $out = "<table>\n  <thead>\n    <tr>\n";
                foreach ($headers as $i => $header) {
                    $align = $alignments[$i] ?? '';
                    $out  .= "      <th{$align}>{$header}</th>\n";
                }
                $out .= "    </tr>\n  </thead>\n  <tbody>\n";

                $bodyLines = array_filter(explode("\n", trim($matches[3])));
                foreach ($bodyLines as $line) {
                    $cells = $parseRow($line);
                    $out  .= "    <tr>\n";
                    foreach ($cells as $i => $cell) {
                        $align = $alignments[$i] ?? '';
                        $out  .= "      <td{$align}>{$cell}</td>\n";
                    }
                    $out .= "    </tr>\n";
                }
                $out .= "  </tbody>\n</table>";
                return $out;
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 6 : (Alertes GFM et blockquotes traités à l'étape 3e)
        // ====================================================================


        // ====================================================================
        // ÉTAPE 7 : LISTES DE TÂCHES (GFM checkboxes)
        // ====================================================================
        $html = preg_replace('/^[ \t]*[-*+] \[ \] (.+)$/m',    '<li class="task-item"><input type="checkbox" disabled /> $1</li>', $html);
        $html = preg_replace('/^[ \t]*[-*+] \[[xX]\] (.+)$/m', '<li class="task-item"><input type="checkbox" checked disabled /> $1</li>', $html);


        // ====================================================================
        // ÉTAPE 7b : TITRES SETEXT (syntaxe alternative == / --)
        //   Titre
        //   =====   → <h1>
        //
        //   Titre
        //   -----   → <h2>
        // Traité avant les titres ATX et avant les lignes séparatrices (une
        // ligne de tirets juste après une ligne de texte est un titre, pas un <hr>).
        // ====================================================================
        $html = preg_replace_callback(
            '/^(?![ \t]*(?:#{1,6}[ \t]|>|```|\||[-*+][ \t]|\d+\.[ \t]))[ \t]*(\S.*?)[ \t]*(?:\{#([a-zA-Z0-9_\-:.]+)\}[ \t]*)?\n[ \t]*=+[ \t]*$/m',
            function ($matches) {
                $text = trim($matches[1]);
                $id   = !empty($matches[2]) ? $matches[2] : self::slugify($text);
                return "<h1 id=\"{$id}\">{$text}</h1>";
            },
            $html
        );
        $html = preg_replace_callback(
            '/^(?![ \t]*(?:#{1,6}[ \t]|>|```|\||[-*+][ \t]|\d+\.[ \t]))[ \t]*(\S.*?)[ \t]*(?:\{#([a-zA-Z0-9_\-:.]+)\}[ \t]*)?\n[ \t]*-+[ \t]*$/m',
            function ($matches) {
                $text = trim($matches[1]);
                $id   = !empty($matches[2]) ? $matches[2] : self::slugify($text);
                return "<h2 id=\"{$id}\">{$text}</h2>";
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 8 : TITRES (ATX : # à ######)
        // ====================================================================
        $html = preg_replace_callback(
            '/^(#{1,6})[ \t]+(.+?)[ \t]*(?:\{#([a-zA-Z0-9_\-:.]+)\}[ \t]*)?(?:[ \t]+#+)?$/m',
            function ($matches) {
                $level = strlen($matches[1]);
                $text  = trim($matches[2]);
                $id    = !empty($matches[3]) ? $matches[3] : self::slugify($text);
                return "<h{$level} id=\"{$id}\">{$text}</h{$level}>";
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 9 : LISTES (puces et ordonnées, avec imbrication)
        // Une seule passe détecte un bloc contigu de lignes qui sont soit une
        // puce (-,*,+) soit un item numéroté, quel que soit leur niveau
        // d'indentation ; le bloc est ensuite reconstruit récursivement en
        // <ol>/<ul> imbriqués selon la profondeur d'indentation relative.
        // Les items de tâches (déjà convertis en <li class="task-item">) ne
        // matchent plus ce motif et ne sont donc pas ré-englobés ici.
        // ====================================================================
        $html = preg_replace_callback(
            '/^([ \t]*(?:\d+\.|[-*+])[ \t]+.+(?:\n[ \t]*(?:\d+\.|[-*+])[ \t]+.+)*)/m',
            function ($matches) {
                $lines = explode("\n", $matches[1]);
                $items = [];
                foreach ($lines as $line) {
                    if (preg_match('/^([ \t]*)(\d+)\.[ \t]+(.*)$/', $line, $m)) {
                        $items[] = ['indent' => self::indentWidth($m[1]), 'type' => 'ol', 'text' => $m[3]];
                    } elseif (preg_match('/^([ \t]*)[-*+][ \t]+(.*)$/', $line, $m)) {
                        $items[] = ['indent' => self::indentWidth($m[1]), 'type' => 'ul', 'text' => $m[2]];
                    }
                }
                if (empty($items)) return $matches[1];
                // Normalise le niveau d'indentation le plus bas à 0
                $minIndent = min(array_column($items, 'indent'));
                foreach ($items as &$it) $it['indent'] -= $minIndent;
                unset($it);

                $i = 0;
                return self::buildListTree($items, $i, count($items));
            },
            $html
        );

        $html = preg_replace_callback(
            '/(?:<li class="task-item">.*<\/li>\n?)+/s',
            function ($matches) {
                return "<ul class=\"task-list\">\n" . $matches[0] . "</ul>\n";
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 9b : LISTES DE DÉFINITION (syntaxe étendue)
        //   Terme
        //   : Définition
        // ====================================================================
        $html = self::extractDefinitionLists($html);


        // ====================================================================
        // ÉTAPE 9c : RÉFÉRENCES DE NOTES DE BAS DE PAGE [^label]
        // Converties AVANT l'emphase pour ne pas entrer en collision avec le
        // nouvel exposant ^texte^ (un [^1] suivi plus loin d'un [^2] sur la
        // même ligne pourrait sinon être interprété comme ^1] ... [^2^).
        // La numérotation est séquentielle, dans l'ordre de première
        // apparition dans le texte (comme documenté).
        // ====================================================================
        $footnoteOrder = [];
        $html = preg_replace_callback('/\[\^([^\]\s]+)\]/', function ($m) use (&$footnoteOrder, &$footnoteDefs): string {
            $label = strtolower(trim($m[1]));
            if (!isset($footnoteDefs[$label])) {
                // Référence vers une note non définie : laissée telle quelle.
                return $m[0];
            }
            if (!isset($footnoteOrder[$label])) {
                $footnoteOrder[$label] = count($footnoteOrder) + 1;
            }
            $num = $footnoteOrder[$label];
            return "<sup id=\"fnref:{$label}\"><a href=\"#fn:{$label}\">{$num}</a></sup>";
        }, $html);


        // ====================================================================
        // ÉTAPE 10 : TEXTE EN LIGNE (Gras, Italique, Barré, Surlignage,
        // Indice/Exposant, Emoji)
        // ====================================================================
        $html = preg_replace('/\*\*\*(.+?)\*\*\*/s', '<strong><em>$1</em></strong>', $html);
        $html = preg_replace('/___(.+?)___/s',        '<strong><em>$1</em></strong>', $html);
        $html = preg_replace('/\*\*(.+?)\*\*/s',      '<strong>$1</strong>',          $html);
        $html = preg_replace('/__(.+?)__/s',           '<strong>$1</strong>',          $html);
        $html = preg_replace('/\*(.+?)\*/s',                          '<em>$1</em>',                  $html);
        // Le _ italique ne doit matcher qu'aux frontières de mots pour ne pas
        // capturer les snake_case, noms de packages (@php-wasm/node), etc.
        $html = preg_replace('/(?<!\w)_([^_\n]+)_(?!\w)/',           '<em>$1</em>',                  $html);
        // Surlignage ==texte== (syntaxe étendue)
        $html = preg_replace('/==(.+?)==/s',           '<mark>$1</mark>',              $html);
        // Barré ~~texte~~ — traité AVANT le sous-script (simple ~) pour que
        // celui-ci ne matche pas la moitié d'une paire de tildes doubles.
        $html = preg_replace('/~~(.+?)~~/s',           '<del>$1</del>',                $html);
        // Exposant ^texte^ (syntaxe étendue) — placé avant l'échappement des
        // références de notes ([^label]) n'est pas un souci : celles-ci sont
        // encadrées de crochets et ne forment donc pas de paire ^...^ isolée.
        $html = preg_replace('/\^([^\^\n]+)\^/',       '<sup>$1</sup>',                $html);
        // Sous-script ~texte~ (un seul tilde ; les ~~ ont déjà été consommés
        // juste au-dessus par le barré).
        $html = preg_replace('/~([^~\n]+)~/',          '<sub>$1</sub>',                $html);

        // Émojis :shortcode: (syntaxe étendue) — les raccourcis inconnus sont
        // laissés tels quels plutôt que silencieusement supprimés.
        $html = preg_replace_callback('/:([a-zA-Z0-9_+\-]+):/', function ($m): string {
            $emoji = self::emojiFor($m[1]);
            return $emoji ?? $m[0];
        }, $html);


        // ====================================================================
        // ÉTAPE 11 : LIENS & IMAGES
        // Les liens externes (https?://) reçoivent target="_blank" + rel="noopener noreferrer".
        // Les liens internes (/page, #anchor, ../truc) n'en reçoivent pas.
        // ====================================================================
        $html = preg_replace(
            '/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/',
            '<img src="$2" alt="$1" title="$3" loading="lazy" />',
            $html
        );

        $buildLink = static function (string $text, string $href, string $title): string {
            $titleAttr = $title !== '' ? ' title="' . $title . '"' : '';
            $extern    = preg_match('/^https?:\/\//i', $href)
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';
            return "<a href=\"{$href}\"{$titleAttr}{$extern}>{$text}</a>";
        };

        // Liens par référence [texte][label] et [texte][] (raccourci = label = texte)
        $html = preg_replace_callback(
            '/\[([^\]]+)\]\[([^\]]*)\]/',
            function ($m) use (&$refDefs, $buildLink): string {
                $text  = $m[1];
                $label = strtolower(trim($m[2] !== '' ? $m[2] : $m[1]));
                if (!isset($refDefs[$label])) return $m[0];
                $def = $refDefs[$label];
                return $buildLink($text, $def['url'], $def['title']);
            },
            $html
        );

        // Liens markdown [texte](url "titre optionnel")
        $html = preg_replace_callback(
            '/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/',
            function ($m) use ($buildLink): string {
                return $buildLink($m[1], $m[2], $m[3] ?? '');
            },
            $html
        );

        // URL nues https://... (syntaxe étendue : auto-link sans crochets).
        // Exclut celles déjà entre guillemets/attributs (href="...") ou déjà
        // transformées en lien pour ne pas les doubler.
        $html = preg_replace(
            '/(?<!["\'=>])\b(https?:\/\/[^\s<>"\')\]]+)/',
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
            $html
        );


        // ====================================================================
        // ÉTAPE 12 : LIGNES SÉPARATRICES
        // ====================================================================
        $html = preg_replace('/^(?:[-*_][ \t]*){3,}$/m', '<hr />', $html);


        // ====================================================================
        // ÉTAPE 13 : PARAGRAPHES
        // Stratégie : on traite ligne par ligne. Les lignes qui commencent par
        // une balise block-level ou un placeholder sont laissées telles quelles.
        // Les lignes de texte brut consécutives sont accumulées puis wrappées
        // dans un <p> quand on rencontre une ligne block ou une ligne vide.
        // ====================================================================
        $blockStartTags = ['<h', '<pre', '<ul', '<ol', '<li', '<table', '<thead', '<tbody',
                           '<tr', '<td', '<th', '<blockquote', '<div', '<hr', '<img',
                           '<dl', '<dt', '<dd',
                           "\x02CB", "\x02PLG", "\x02BQ"];

        $isBlockLine = static function (string $line) use ($blockStartTags): bool {
            $t = ltrim($line);
            if ($t === '') return false;
            // Toute balise fermante (</...>) est toujours considérée comme une
            // ligne "bloc" : ça évite qu'une fermeture de <table>, <thead>,
            // <tr>, etc. finisse absorbée dans un <p> environnant.
            if (str_starts_with($t, '</')) return true;
            foreach ($blockStartTags as $tag) {
                if (str_starts_with($t, $tag)) return true;
            }
            return false;
        };

        $lines      = explode("\n", $html);
        $output     = [];
        $textBuffer = [];

        $flushBuffer = static function () use (&$textBuffer, &$output): void {
            if (empty($textBuffer)) return;
            $content = implode("\n", $textBuffer);
            if (trim($content) !== '') {
                // Deux espaces en fin de ligne → <br> (convention markdown standard)
                $content = preg_replace('/  $/m', '<br>', $content);
                // Saut de ligne simple → espace (comportement GitHub)
                // Sauf si déjà converti en <br> ci-dessus
                $content = preg_replace('/(?<!r>)\n/', ' ', $content);
                $output[] = '<p>' . trim($content) . '</p>';
            }
            $textBuffer = [];
        };

        foreach ($lines as $line) {
            if ($isBlockLine($line)) {
                $flushBuffer();
                $output[] = $line;
            } elseif (trim($line) === '') {
                // Ligne vide = séparateur de paragraphe
                $flushBuffer();
            } else {
                $textBuffer[] = $line;
            }
        }
        $flushBuffer();

        $html = implode("\n", $output);


        // ====================================================================
        // ÉTAPE 14 : Réinjecter les placeholders
        // ====================================================================
        $html = strtr($html, $pluginBlocks);
        $html = strtr($html, $blockquotes);
        $html = strtr($html, $codeBlocks);
        $html = strtr($html, $inlineCodes);
        $html = strtr($html, $autolinks);
        // Les échappements sont réinjectés en tout dernier, une fois que plus
        // aucune regex Markdown ne peut les interpréter.
        $html = strtr($html, $escapes);


        // ====================================================================
        // ÉTAPE 15 : BLOC DES NOTES DE BAS DE PAGE
        // Ajouté en fin de document, uniquement si au moins une note a été
        // référencée (les notes définies mais jamais référencées sont
        // silencieusement ignorées).
        // ====================================================================
        if (!empty($footnoteOrder)) {
            $html .= "\n<div class=\"footnotes\">\n<ol>\n";
            foreach ($footnoteOrder as $label => $num) {
                $content = $footnoteDefs[$label];
                $html   .= "  <li id=\"fn:{$label}\">{$content} <a href=\"#fnref:{$label}\" class=\"footnote-backref\">↩</a></li>\n";
            }
            $html .= "</ol>\n</div>";
        }

        return $html;
    }
}