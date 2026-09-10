<?php

class MD {

    // ========================================================================
    // PLUGIN SYSTEM
    //
    // INLINE SYNTAX (args on the same line):
    //   {% plugin_name arg1 arg2 "arg with spaces" %}
    //
    // BLOCK SYNTAX (multi-line content):
    //   {% plugin_name arg1 arg2
    //   content line 1
    //   content line 2
    //   %}
    //
    // The callback always receives (array $args, string $body):
    //   - $args  : array of the arguments passed on the opening line
    //   - $body  : multi-line content (empty "" for inline tags)
    //
    // Examples:
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
     * Registers a plugin by name.
     *
     * @param string   $name     Tag name, e.g. "codepen"
     * @param callable $callback function(array $args): string
     *                           $args[0] = first argument, $args[1] = second, etc.
     */
    public static function registerPlugin(string $name, callable $callback): void {
        self::$plugins[strtolower(trim($name))] = $callback;
    }

    /**
     * Removes a registered plugin.
     */
    public static function unregisterPlugin(string $name): void {
        unset(self::$plugins[strtolower(trim($name))]);
    }

    /**
     * Returns the list of registered plugins.
     *
     * @return string[]
     */
    public static function getRegisteredPlugins(): array {
        return array_keys(self::$plugins);
    }

    // ========================================================================
    // Generates a "slug"-style id for heading anchors (ATX and Setext).
    // ========================================================================
    private static function slugify(string $text): string {
        $id = strtolower(preg_replace('/[^\w\- ]/u', '', $text));
        return preg_replace('/\s+/', '-', trim($id));
    }

    // ========================================================================
    // Converts an indentation width (spaces/tabs) into a column count, a tab
    // counting as 4 spaces.
    // ========================================================================
    private static function indentWidth(string $whitespace): int {
        return strlen(str_replace("\t", '    ', $whitespace));
    }

    /**
     * Recursively builds a (nested) <ol>/<ul> list from a flat array of items
     * { indent, type, text }. $i is advanced as items are consumed.
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
    // EMOJIS (extended syntax): :shortcode: → unicode character.
    // Non-exhaustive table but covering the most common shortcuts; extensible
    // via registerEmoji().
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

        // -- Faces and emotions (continued) --------------------------------
        'smiling_face_with_three_hearts' => '🥰', 'kissing' => '😗', 'kissing_closed_eyes' => '😚',
        'kissing_smiling_eyes' => '😙', 'yum' => '😋', 'stuck_out_tongue' => '😛',
        'stuck_out_tongue_winking_eye' => '😜', 'stuck_out_tongue_closed_eyes' => '😝',
        'money_mouth_face' => '🤑', 'hugs' => '🤗', 'disappointed_relieved' => '😥',
        'dizzy_face' => '😵', 'astonished' => '😲', 'open_mouth' => '😮', 'hushed' => '😯',
        'fearful' => '😨', 'cold_sweat' => '😰', 'nauseated_face' => '🤢', 'vomiting_face' => '🤮',
        'sneezing_face' => '🤧', 'face_with_thermometer' => '🤒', 'face_with_head_bandage' => '🤕',
        'woozy_face' => '🥴', 'smiling_imp' => '😈', 'imp' => '👿', 'japanese_ogre' => '👹',
        'japanese_goblin' => '👺', 'skull' => '💀', 'skull_and_crossbones' => '☠️',
        'ghost' => '👻', 'alien' => '👽', 'space_invader' => '👾', 'robot' => '🤖',
        'poop' => '💩', 'clown_face' => '🤡', 'smiley_cat' => '😺', 'smile_cat' => '😸',
        'joy_cat' => '😹', 'heart_eyes_cat' => '😻', 'smirk_cat' => '😼', 'kissing_cat' => '😽',
        'pouting_cat' => '😾', 'crying_cat_face' => '😿',

        // -- Corps, gestes, personnages --------------------------------
        'raised_hand' => '✋', 'raised_back_of_hand' => '🤚', 'vulcan_salute' => '🖖',
        'pinching_hand' => '🤏', 'fist' => '✊', 'punch' => '👊', 'left_facing_fist' => '🤛',
        'right_facing_fist' => '🤜', 'open_hands' => '👐', 'palms_up_together' => '🤲',
        'nail_care' => '💅', 'selfie' => '🤳', 'ear' => '👂', 'nose' => '👃', 'brain' => '🧠',
        'tongue' => '👅', 'lips' => '👄', 'tooth' => '🦷', 'bone' => '🦴',
        'baby' => '👶', 'child' => '🧒', 'boy' => '👦', 'girl' => '👧', 'adult' => '🧑',
        'man' => '👨', 'woman' => '👩', 'older_adult' => '🧓', 'older_man' => '👴', 'older_woman' => '👵',
        'mage' => '🧙', 'superhero' => '🦸', 'supervillain' => '🦹', 'vampire' => '🧛',
        'zombie' => '🧟', 'genie' => '🧞', 'merperson' => '🧜', 'elf' => '🧝', 'fairy' => '🧚',

        // -- Animaux (suite) ---------------------------------------------
        'wolf' => '🐺', 'boar' => '🐗', 'racehorse' => '🐎', 'zebra' => '🦓', 'deer' => '🦌',
        'cow2' => '🐄', 'ox' => '🐂', 'water_buffalo' => '🐃', 'pig2' => '🐖', 'ram' => '🐏',
        'sheep' => '🐑', 'goat' => '🐐', 'camel' => '🐫', 'dromedary_camel' => '🐪',
        'llama' => '🦙', 'giraffe' => '🦒', 'elephant' => '🐘', 'rhinoceros' => '🦏',
        'hippopotamus' => '🦛', 'mouse2' => '🐁', 'rat' => '🐀', 'hamster' => '🐹',
        'chipmunk' => '🐿️', 'hedgehog' => '🦔', 'bat' => '🦇', 'duck' => '🦆', 'eagle' => '🦅',
        'flamingo' => '🦩', 'peacock' => '🦚', 'parrot' => '🦜', 'swan' => '🦢',
        'turkey' => '🦃', 'dove' => '🕊️', 'rooster' => '🐓', 'crocodile' => '🐊',
        'turtle' => '🐢', 'lizard' => '🦎', 'snake' => '🐍', 'dragon_face' => '🐲',
        'dragon' => '🐉', 'sauropod' => '🦕', 't-rex' => '🦖', 'whale2' => '🐋',
        'shark' => '🦈', 'seal' => '🦭', 'squid' => '🦑', 'shrimp' => '🦐', 'lobster' => '🦞',
        'crab' => '🦀', 'blowfish' => '🐡', 'tropical_fish' => '🐠', 'oyster' => '🦪',
        'ant' => '🐜', 'spider' => '🕷️', 'spider_web' => '🕸️', 'scorpion' => '🦂',
        'mosquito' => '🦟', 'microbe' => '🦠', 'paw_prints' => '🐾',

        // -- Nature, plants, weather (continued) --------------------------------
        'cherry_blossom' => '🌸', 'blossom' => '🌼', 'rose' => '🌹', 'wilted_flower' => '🥀',
        'hibiscus' => '🌺', 'sunflower' => '🌻', 'tulip' => '🌷', 'herb' => '🌿',
        'shamrock' => '☘️', 'fallen_leaf' => '🍂', 'leaves' => '🍃', 'mushroom' => '🍄',
        'chestnut' => '🌰', 'crescent_moon' => '🌙', 'full_moon' => '🌕', 'new_moon' => '🌑',
        'milky_way' => '🌌', 'stars' => '🌠', 'cyclone' => '🌀', 'fog' => '🌫️',
        'wind_face' => '🌬️', 'tornado' => '🌪️', 'thunder_cloud_and_rain' => '⛈️',
        'sweat_drops' => '💦', 'snowman' => '⛄', 'snowman_with_snow' => '☃️', 'comet' => '☄️',

        // -- Nourriture (suite) --------------------------------------------
        'tomato' => '🍅', 'eggplant' => '🍆', 'avocado' => '🥑', 'broccoli' => '🥦',
        'carrot' => '🥕', 'corn' => '🌽', 'hot_pepper' => '🌶️', 'cucumber' => '🥒',
        'potato' => '🥔', 'sweet_potato' => '🍠', 'peanuts' => '🥜', 'honey_pot' => '🍯',
        'croissant' => '🥐', 'bagel' => '🥯', 'pretzel' => '🥨', 'pancakes' => '🥞',
        'waffle' => '🧇', 'meat_on_bone' => '🍖', 'poultry_leg' => '🍗', 'bacon' => '🥓',
        'sandwich' => '🥪', 'stuffed_flatbread' => '🥙', 'burrito' => '🌯', 'salad' => '🥗',
        'shallow_pan_of_food' => '🥘', 'canned_food' => '🥫', 'bento' => '🍱',
        'rice_ball' => '🍙', 'rice' => '🍚', 'curry' => '🍛', 'stew' => '🍲', 'oden' => '🍢',
        'dango' => '🍡', 'shaved_ice' => '🍧', 'ice_cream' => '🍨', 'pie' => '🥧',
        'cupcake' => '🧁', 'moon_cake' => '🥮', 'lollipop' => '🍭', 'custard' => '🍮',
        'milk_glass' => '🥛', 'baby_bottle' => '🍼', 'mate' => '🧉', 'ice_cube' => '🧊',
        'tumbler_glass' => '🥃', 'cup_with_straw' => '🥤', 'chopsticks' => '🥢',
        'fork_and_knife' => '🍴', 'spoon' => '🥄', 'plate_with_cutlery' => '🍽️',

        // -- Activities, sport, leisure --------------------------------------
        'running' => '🏃', 'walking' => '🚶', 'swimming' => '🏊', 'surfing' => '🏄',
        'skateboard' => '🛹', 'snowboarder' => '🏂', 'weight_lifting' => '🏋️',
        'cyclist' => '🚴', 'medal_military' => '🎖️', 'ticket' => '🎫', 'circus_tent' => '🎪',
        'performing_arts' => '🎭', 'art' => '🎨', 'clapper' => '🎬', 'microphone' => '🎤',
        'headphones' => '🎧', 'musical_note' => '🎵', 'musical_score' => '🎼', 'guitar' => '🎸',
        'violin' => '🎻', 'drum' => '🥁', 'trumpet' => '🎺', 'saxophone' => '🎷',
        'musical_keyboard' => '🎹', 'chess_pawn' => '♟️', 'bowling' => '🎳',
        'ice_skate' => '⛸️', 'ski' => '🎿', 'fishing_pole_and_fish' => '🎣',
        'boxing_glove' => '🥊', 'martial_arts_uniform' => '🥋', 'goal_net' => '🥅',
        'flying_disc' => '🥏', 'yo_yo' => '🪀', 'kite' => '🪁',

        // -- Voyages et lieux (suite) ----------------------------------------
        'airplane_departure' => '🛫', 'airplane_arriving' => '🛬', 'flying_saucer' => '🛸',
        'motorcycle' => '🏍️', 'scooter' => '🛴', 'tractor' => '🚜', 'truck' => '🚚',
        'articulated_lorry' => '🚛', 'trolleybus' => '🚎', 'minibus' => '🚐', 'metro' => '🚇',
        'station' => '🚉', 'monorail' => '🚝', 'bullettrain_front' => '🚄',
        'steam_locomotive' => '🚂', 'anchor' => '⚓', 'sailboat' => '⛵', 'canoe' => '🛶',
        'speedboat' => '🚤', 'ferry' => '⛴️', 'passport_control' => '🛂', 'customs' => '🛃',
        'baggage_claim' => '🛄', 'left_luggage' => '🛅', 'vertical_traffic_light' => '🚦',
        'construction' => '🚧', 'fuelpump' => '⛽', 'busstop' => '🚏', 'moyai' => '🗿',
        'statue_of_liberty' => '🗽', 'tokyo_tower' => '🗼', 'fountain' => '⛲',
        'stadium' => '🏟️', 'ferris_wheel' => '🎡', 'roller_coaster' => '🎢',
        'carousel_horse' => '🎠', 'beach_umbrella' => '🏖️', 'desert' => '🏜️',
        'desert_island' => '🏝️', 'national_park' => '🏞️', 'sunrise' => '🌅',
        'sunrise_over_mountains' => '🌄', 'sparkler' => '🎇', 'fireworks' => '🎆',
        'city_sunset' => '🌇', 'bridge_at_night' => '🌉', 'houses' => '🏘️',
        'derelict_house' => '🏚️', 'classical_building' => '🏛️', 'department_store' => '🏬',
        'post_office' => '🏣', 'hotel' => '🏨', 'convenience_store' => '🏪', 'bank' => '🏦',
        'factory' => '🏭',

        // -- Objets (suite) ---------------------------------------------------
        'watch' => '⌚', 'stopwatch' => '⏱️', 'timer_clock' => '⏲️', 'joystick' => '🕹️',
        'floppy_disk' => '💾', 'cd' => '💿', 'dvd' => '📀', 'movie_camera' => '🎥',
        'projector' => '📽️', 'telephone' => '☎️', 'pager' => '📟', 'fax' => '📠',
        'candle' => '🕯️', 'fire_extinguisher' => '🧯', 'oil_drum' => '🛢️',
        'money_with_wings' => '💸', 'credit_card' => '💳', 'yen' => '💴', 'euro' => '💶',
        'pound' => '💷', 'briefcase' => '💼', 'balance_scale' => '⚖️', 'compass' => '🧭',
        'triangular_ruler' => '📐', 'straight_ruler' => '📏', 'round_pushpin' => '📍',
        'scissors' => '✂️', 'thread' => '🧵', 'yarn' => '🧶', 'safety_pin' => '🧷',
        'basket' => '🧺', 'hourglass_flowing_sand' => '⏳', 'notebook' => '📓',
        'notebook_with_decorative_cover' => '📔', 'page_facing_up' => '📄',
        'page_with_curl' => '📃', 'bookmark_tabs' => '📑', 'bookmark' => '🔖',
        'label' => '🏷️', 'receipt' => '🧾', 'card_index' => '📇', 'wastebasket' => '🗑️',
        'old_key' => '🗝️', 'hammer_and_wrench' => '🛠️', 'pick' => '⛏️', 'shield' => '🛡️',
        'syringe' => '💉', 'pill' => '💊', 'thermometer' => '🌡️', 'soap' => '🧼',
        'broom' => '🧹',

        // -- Symboles (suite) -----------------------------------------------
        'heavy_multiplication_x' => '✖️', 'heavy_plus_sign' => '➕', 'heavy_minus_sign' => '➖',
        'heavy_division_sign' => '➗', 'infinity' => '♾️', 'recycle' => '♻️', 'trident' => '🔱',
        'atom_symbol' => '⚛️', 'om' => '🕉️', 'peace_symbol' => '☮️', 'yin_yang' => '☯️',
        'wheel_of_dharma' => '☸️', 'star_of_david' => '✡️', 'star_and_crescent' => '☪️',
        'cross' => '✝️', 'menorah' => '🕎', 'radioactive' => '☢️', 'biohazard' => '☣️',
        'arrow_up' => '⬆️', 'arrow_down' => '⬇️', 'arrow_left' => '⬅️', 'arrow_right' => '➡️',
        'arrow_upper_right' => '↗️', 'arrow_lower_right' => '↘️', 'arrow_lower_left' => '↙️',
        'arrow_upper_left' => '↖️', 'arrows_clockwise' => '🔃', 'arrows_counterclockwise' => '🔄',
        'back' => '🔙', 'end' => '🔚', 'on' => '🔛', 'soon' => '🔜', 'top' => '🔝',
        'radio_button' => '🔘', 'red_circle' => '🔴', 'orange_circle' => '🟠',
        'yellow_circle' => '🟡', 'green_circle' => '🟢', 'blue_circle' => '🔵',
        'purple_circle' => '🟣', 'brown_circle' => '🟤', 'white_circle' => '⚪',
        'black_circle' => '⚫',

        // -- Drapeaux (suite) -------------------------------------------------
        'triangular_flag_on_post' => '🚩', 'crossed_flags' => '🎌',
        'us' => '🇺🇸', 'gb' => '🇬🇧', 'fr' => '🇫🇷', 'de' => '🇩🇪', 'es' => '🇪🇸',
        'it' => '🇮🇹', 'jp' => '🇯🇵', 'cn' => '🇨🇳', 'kr' => '🇰🇷', 'ca' => '🇨🇦',
        'au' => '🇦🇺', 'br' => '🇧🇷', 'in' => '🇮🇳', 'ru' => '🇷🇺', 'eu' => '🇪🇺',
    ];

    /**
     * Registers (or replaces) a custom emoji shortcut.
     */
    public static function registerEmoji(string $shortcode, string $char): void {
        self::$extraEmoji[strtolower(trim($shortcode, ':'))] = $char;
    }

    private static function emojiFor(string $shortcode): ?string {
        $key = strtolower($shortcode);
        return self::$extraEmoji[$key] ?? self::$emojiMap[$key] ?? null;
    }

    // ========================================================================
    // DEFINITION LISTS (extended syntax)
    //   Term
    //   : Definition
    // Procedural line-by-line analysis (safer than a single big regex for
    // grouping several term/definition pairs into one <dl>, separated by a
    // blank line or not).
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

                // A single blank line between two groups stays in the same <dl>
                // if the next group really is a new term.
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
    // RAW HTML (safe subset, GitHub README style)
    //
    // Writing HTML tags directly (e.g. <div align="center">, <img>, <sub>,
    // <br>, HTML tables...) is allowed ONLY if:
    //   - the tag is part of the HTML_ALLOWED_TAGS whitelist;
    //   - every attribute is part of the whitelist for that tag (or of the
    //     global HTML_GLOBAL_ATTRS attributes);
    //   - no attribute starts with "on" (onclick, onerror, ...);
    //   - URLs (href/src) use a safe scheme (isSafeUrl).
    //
    // Any unknown or dangerous tag (script/style/iframe/...), or any
    // non-whitelisted attribute, is silently stripped. The text content
    // between the tags is NOT swallowed: it keeps being processed as normal
    // markdown (that's what lets you have markdown headings, badges and images
    // inside a <div align="center">...</div>).
    // ========================================================================

    private const HTML_ALLOWED_TAGS = [
        'div', 'span', 'p', 'br', 'hr', 'wbr',
        'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ins',
        'mark', 'small', 'sub', 'sup', 'kbd', 'code', 'pre', 'abbr', 'q', 'cite',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
        'blockquote',
        'a', 'img', 'picture', 'source', 'figure', 'figcaption',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'details', 'summary', 'center',
    ];

    /** Attributes allowed on any whitelisted tag. */
    private const HTML_GLOBAL_ATTRS = ['id', 'class', 'title', 'align', 'valign', 'width', 'height', 'dir', 'lang'];

    /** Extra attributes allowed, per tag. */
    private const HTML_TAG_ATTRS = [
        'a'       => ['href', 'name', 'target', 'rel'],
        'img'     => ['src', 'alt', 'loading', 'srcset', 'sizes'],
        'source'  => ['src', 'srcset', 'type', 'media'],
        'td'      => ['colspan', 'rowspan'],
        'th'      => ['colspan', 'rowspan', 'scope'],
        'col'     => ['span'],
        'ol'      => ['start', 'type'],
        'details' => ['open'],
    ];

    /** Self-closing tags (no closing tag expected). */
    private const HTML_VOID_TAGS = ['img', 'br', 'hr', 'wbr', 'source', 'col'];

    /**
     * Checks that a URL (href/src) uses a safe scheme: relative links, anchors,
     * http(s), mailto, tel, or base64-encoded images (png/gif/jpeg/webp only —
     * not svg+xml, which can embed a <script>).
     * Notably rejects javascript:, vbscript:, data:text/html.
     */
    private static function isSafeUrl(string $url): bool {
        $url = trim($url);
        if ($url === '') return true;
        // A path with no explicit scheme ("assets/x.png", "../x", "#anchor",
        // "/x", "x") is a relative link or an anchor: always safe.
        if (!preg_match('~^([a-zA-Z][a-zA-Z0-9+.\-]*):~', $url, $m)) return true;
        $scheme = strtolower($m[1]);
        if (in_array($scheme, ['http', 'https', 'mailto', 'tel'], true)) return true;
        if ($scheme === 'data') {
            // Base64-encoded images only — no data:image/svg+xml, which can
            // embed a <script>, and no data:text/html.
            return (bool) preg_match('~^data:image/(png|gif|jpe?g|webp);base64,~i', $url);
        }
        return false; // javascript:, vbscript:, file:, etc. → rejected
    }

    /**
     * Sanitizes a single raw HTML tag (e.g. '<div align="center">', '</div>',
     * '<img src="..." onerror="...">').
     *
     * @return string|null The cleaned tag to keep, an empty string to strip it
     *                     silently, or null if it doesn't look like a valid
     *                     HTML tag (in which case the caller strips it too, to
     *                     be safe).
     */
    private static function sanitizeHtmlTag(string $tag): ?string {
        if (!preg_match(
            '/^<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z_:][a-zA-Z0-9_:.-]*(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s"\'>]+))?)*)\s*(\/)?>$/s',
            $tag,
            $m
        )) {
            return null;
        }

        $closing  = $m[1] === '/';
        $tagName  = strtolower($m[2]);
        $attrsRaw = $m[3];

        if (!in_array($tagName, self::HTML_ALLOWED_TAGS, true)) {
            return null;
        }

        if ($closing) {
            return "</{$tagName}>";
        }

        $allowedAttrs = array_merge(self::HTML_GLOBAL_ATTRS, self::HTML_TAG_ATTRS[$tagName] ?? []);
        $safeAttrs    = '';

        if (preg_match_all(
            '/([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s"\'>]+)))?/',
            $attrsRaw,
            $am,
            PREG_SET_ORDER
        )) {
            foreach ($am as $a) {
                $attrName = strtolower($a[1]);
                if ($attrName === '') continue;
                if (str_starts_with($attrName, 'on')) continue; // safety net against JS handlers
                if (!in_array($attrName, $allowedAttrs, true)) continue;

                if ($tagName === 'details' && $attrName === 'open') {
                    $safeAttrs .= ' open';
                    continue;
                }

                $attrVal = $a[3] ?? ($a[4] ?? ($a[5] ?? ''));

                if (in_array($attrName, ['href', 'src'], true) && !self::isSafeUrl($attrVal)) {
                    continue;
                }

                $safeAttrs .= ' ' . $attrName . '="' . htmlspecialchars($attrVal, ENT_QUOTES, 'UTF-8') . '"';
            }
        }

        $close = in_array($tagName, self::HTML_VOID_TAGS, true) ? ' /' : '';
        return "<{$tagName}{$safeAttrs}{$close}>";
    }

    // ========================================================================

    public static function toHtml(string $markdown): string {

        // ====================================================================
        // STEP 1: Line-ending normalization
        // ====================================================================
        $html = str_replace(["\r\n", "\r"], "\n", $markdown);


        // ====================================================================
        // STEP 2: PLUGINS
        // Two forms supported:
        //
        //   INLINE: {% name arg1 "arg 2" %}
        //     → $args = ['arg1', 'arg 2'], $body = ''
        //
        //   BLOCK : {% name arg1\ncontent\nover\nseveral lines\n%}
        //     → $args = ['arg1'], $body = "content\nover\nseveral lines"
        //
        // Both are captured by a single regex that tells apart the presence of
        // a newline after the args (block) or not (inline).
        // Processed before XSS encoding — re-injected as the very last step.
        // ====================================================================
        $pluginBlocks = [];
        // Literal, XSS-escaped source of each captured tag, keyed by the same
        // placeholder. Used to restore a `{% tag %}` that turns out to sit
        // inside a code span / code block as verbatim text instead of expanding it.
        $pluginLiterals = [];

        /**
         * Parses an argument string into an array.
         * Supports bare words, "double quotes" and 'single quotes'.
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
            // Group 1: plugin name
            // Group 2: inline args (everything on the first line after the name)
            // Group 3: multi-line body (present only for block tags)
            '/\{%\s*([a-zA-Z0-9_-]+)([^\n%]*?)(?:\n([\s\S]*?))?\s*%\}/m',
            function ($matches) use (&$pluginBlocks, &$pluginLiterals, $parseArgs): string {
                $name    = strtolower(trim($matches[1]));
                $args    = $parseArgs(trim($matches[2] ?? ''));
                // $matches[3] exists only if the tag is multi-line
                $body    = isset($matches[3]) ? trim($matches[3]) : '';

                if (!isset(self::$plugins[$name])) {
                    // Unknown plugin: kept encoded rather than silently removed
                    return htmlspecialchars($matches[0], ENT_QUOTES, 'UTF-8');
                }

                $output      = (self::$plugins[$name])($args, $body);
                $placeholder = "\x02PLG" . count($pluginBlocks) . "\x03";
                $pluginBlocks[$placeholder]   = $output;
                $pluginLiterals[$placeholder] = htmlspecialchars($matches[0], ENT_QUOTES, 'UTF-8');
                return $placeholder;
            },
            $html
        );


        // ====================================================================
        // STEP 2a: FOOTNOTE DEFINITIONS
        //   [^1]: Note text.
        //   [^bignote]: First line.
        //
        //       Following paragraph, indented by 4 spaces or 1 tab.
        //
        //       `{ some code }`
        // Extracted (and removed from the text) BEFORE reference link
        // definitions, since [^label]: would otherwise match their regex too.
        // Each note's content is rendered via a recursive call to toHtml() to
        // support multiple paragraphs, code, etc.
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
        // STEP 2b: REFERENCE LINK DEFINITIONS
        //   [label]: https://example.com "Optional title"
        //   [label]: <https://example.com> 'Optional title'
        //   [label]: https://example.com (Optional title)
        // Extracted (and removed from the text) before everything else; used
        // later by the [text][label] / [text][] links.
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
        // STEP 3: CODE BLOCKS (```lang ... ```)
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
        // STEP 3a: INDENTED CODE BLOCKS (4 spaces or 1 tab)
        // Recognized only when preceded by a blank line (or the start of the
        // document) and followed by a blank line (or the end of the document),
        // to avoid conflicts with the indentation of nested lists.
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

        // Inline code with double backticks (lets you include a literal backtick)
        $inlineCodes = [];
        $html = preg_replace_callback('/``(.+?)``/s', function ($matches) use (&$inlineCodes) {
            $content = $matches[1];
            // Standard convention: if the content starts and ends with a space
            // (and isn't only spaces), strip one space on each side — handy for
            // wrapping a ` at the edge.
            if (preg_match('/^ (.*[^ ]) $/s', $content, $trim)) {
                $content = $trim[1];
            }
            $code        = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');
            $placeholder = "\x02IC" . count($inlineCodes) . "\x03";
            $inlineCodes[$placeholder] = "<code>{$code}</code>";
            return $placeholder;
        }, $html);

        // Inline code (`...`)
        $html = preg_replace_callback('/`([^`\n]+)`/', function ($matches) use (&$inlineCodes) {
            $code        = htmlspecialchars($matches[1], ENT_QUOTES, 'UTF-8');
            $placeholder = "\x02IC" . count($inlineCodes) . "\x03";
            $inlineCodes[$placeholder] = "<code>{$code}</code>";
            return $placeholder;
        }, $html);

        // A `{% tag %}` sitting inside a code span or code block was captured
        // by STEP 2 and is now a plugin placeholder embedded in the stored
        // code. Swap those back for the literal (escaped) tag source so code
        // shows `{% tag %}` verbatim instead of its rendered output — or a
        // stray control-char placeholder that never gets restored.
        if ($pluginLiterals) {
            foreach ($codeBlocks as $k => $v)  $codeBlocks[$k]  = strtr($v, $pluginLiterals);
            foreach ($inlineCodes as $k => $v) $inlineCodes[$k] = strtr($v, $pluginLiterals);
        }


        // ====================================================================
        // STEP 3b: CHARACTER ESCAPING (\* \_ \# etc.)
        // Processed after code extraction (code stays literal) and before
        // everything else, so that \* doesn't open emphasis, \# doesn't create
        // a heading, \- doesn't create a list, etc.
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
        // &#124; is the documented convention (Markdown Extra / PHP Markdown)
        // for showing a literal pipe in a table cell without it being
        // interpreted as a column separator.
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
        // STEP 3d: AUTOMATIC LINKS <https://...> and <email@example.com>
        // Processed before XSS encoding because the < > characters would be
        // encoded to &lt; &gt; and the regex would no longer match.
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
        // STEP 3e: GFM ALERTS AND BLOCKQUOTES
        // Processed before XSS encoding because the > character would be
        // encoded to &gt; and the regexes would no longer match.
        // ====================================================================
        $blockquotes = [];

        // GFM alerts (> [!NOTE], etc.) — more specific, processed first
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
                // The trailing \n consumed by the regex is re-injected after
                // the placeholder so the following blank line doesn't merge
                // with the placeholder's line (which would break, for example,
                // detecting a Setext heading right after).
                return $placeholder . (str_ends_with($matches[1], "\n") ? "\n" : '');
            },
            $html
        );

        // Standard blockquotes (nesting handled by recursion through toHtml,
        // which re-applies this same rule to the content already stripped of
        // one ">" level)
        $html = preg_replace_callback('/^((?:>[ \t]?[^\n]*\n?)+)/m', function ($matches) use (&$blockquotes): string {
            $content = preg_replace('/^>[ \t]?/m', '', $matches[1]);
            // The two trailing spaces are left as-is: toHtml() handles them itself
            $inner   = self::toHtml(trim($content));
            $placeholder = "\x02BQ" . count($blockquotes) . "\x03";
            $blockquotes[$placeholder] = "<blockquote>{$inner}</blockquote>";
            // See the comment above: preserve the trailing \n that was consumed.
            return $placeholder . (str_ends_with($matches[1], "\n") ? "\n" : '');
        }, $html);


        // ====================================================================
        // STEP 3f: RAW HTML (safe subset, GitHub README style)
        // Processed before XSS encoding because the < > characters would be
        // encoded to &lt; &gt; and no longer recognized as tags.
        // The content between the tags is not swallowed: it stays in the
        // stream and keeps being processed as normal markdown.
        // ====================================================================

        // Intrinsically dangerous elements: removed along with their content
        // (script/style/iframe can embed JS or load a third-party page;
        // form/button/textarea/select/option have no place in markdown
        // content).
        $html = preg_replace(
            '/<(script|style|iframe|object|embed|noscript|template|form|button|textarea|select|option)\b[^>]*>[\s\S]*?<\/\1>/i',
            '',
            $html
        );

        $rawHtml = [];
        $html = preg_replace_callback(
            '/<!--[\s\S]*?-->|<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[a-zA-Z_:][a-zA-Z0-9_:.-]*(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s"\'>]+))?)*\s*\/?>/',
            function ($m) use (&$rawHtml): string {
                $tag = $m[0];
                // HTML comment: invisible, safe to remove.
                if (str_starts_with($tag, '<!--')) return '';

                $sanitized = self::sanitizeHtmlTag($tag);
                if ($sanitized === null || $sanitized === '') return '';

                $placeholder = "\x02HT" . count($rawHtml) . "\x03";
                $rawHtml[$placeholder] = $sanitized;
                return $placeholder;
            },
            $html
        );


        // ====================================================================
        // STEP 4: Global XSS encoding
        // ====================================================================
        $html = htmlspecialchars($html, ENT_NOQUOTES, 'UTF-8');


        // ====================================================================
        // STEP 5: GFM TABLES
        // Supports rows with or without a trailing pipe (| col | or | col)
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
        // STEP 6: (GFM alerts and blockquotes handled in step 3e)
        // ====================================================================


        // ====================================================================
        // STEP 7: TASK LISTS (GFM checkboxes)
        // ====================================================================
        $html = preg_replace('/^[ \t]*[-*+] \[ \] (.+)$/m',    '<li class="task-item"><input type="checkbox" disabled /> $1</li>', $html);
        $html = preg_replace('/^[ \t]*[-*+] \[[xX]\] (.+)$/m', '<li class="task-item"><input type="checkbox" checked disabled /> $1</li>', $html);


        // ====================================================================
        // STEP 7b: SETEXT HEADINGS (alternative == / -- syntax)
        //   Title
        //   =====   → <h1>
        //
        //   Title
        //   -----   → <h2>
        // Processed before ATX headings and before horizontal rules (a line of
        // dashes right after a line of text is a heading, not an <hr>).
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
        // STEP 8: HEADINGS (ATX: # to ######)
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
        // STEP 9: LISTS (bullets and ordered, with nesting)
        // A single pass detects a contiguous block of lines that are either a
        // bullet (-,*,+) or a numbered item, whatever their indentation level;
        // the block is then rebuilt recursively into nested <ol>/<ul>
        // according to the relative indentation depth.
        // Task items (already converted to <li class="task-item">) no longer
        // match this pattern and are therefore not re-wrapped here.
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
                // Normalize the lowest indentation level to 0
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
        // STEP 9b: DEFINITION LISTS (extended syntax)
        //   Term
        //   : Definition
        // ====================================================================
        $html = self::extractDefinitionLists($html);


        // ====================================================================
        // STEP 9c: FOOTNOTE REFERENCES [^label]
        // Converted BEFORE emphasis so they don't collide with the new
        // superscript ^text^ (a [^1] followed later by a [^2] on the same line
        // could otherwise be read as ^1] ... [^2^).
        // Numbering is sequential, in order of first appearance in the text
        // (as documented).
        // ====================================================================
        $footnoteOrder = [];
        $html = preg_replace_callback('/\[\^([^\]\s]+)\]/', function ($m) use (&$footnoteOrder, &$footnoteDefs): string {
            $label = strtolower(trim($m[1]));
            if (!isset($footnoteDefs[$label])) {
                // Reference to an undefined note: left as-is.
                return $m[0];
            }
            if (!isset($footnoteOrder[$label])) {
                $footnoteOrder[$label] = count($footnoteOrder) + 1;
            }
            $num = $footnoteOrder[$label];
            return "<sup id=\"fnref:{$label}\"><a href=\"#fn:{$label}\">{$num}</a></sup>";
        }, $html);


        // ====================================================================
        // STEP 10: INLINE TEXT (Bold, Italic, Strikethrough, Highlight,
        // Subscript/Superscript, Emoji)
        // ====================================================================
        $html = preg_replace('/\*\*\*(.+?)\*\*\*/s', '<strong><em>$1</em></strong>', $html);
        $html = preg_replace('/___(.+?)___/s',        '<strong><em>$1</em></strong>', $html);
        $html = preg_replace('/\*\*(.+?)\*\*/s',      '<strong>$1</strong>',          $html);
        $html = preg_replace('/__(.+?)__/s',           '<strong>$1</strong>',          $html);
        $html = preg_replace('/\*(.+?)\*/s',                          '<em>$1</em>',                  $html);
        // Italic _ must only match at word boundaries so it doesn't capture
        // snake_case, package names (@php-wasm/node), etc.
        $html = preg_replace('/(?<!\w)_([^_\n]+)_(?!\w)/',           '<em>$1</em>',                  $html);
        // Highlight ==text== (extended syntax)
        $html = preg_replace('/==(.+?)==/s',           '<mark>$1</mark>',              $html);
        // Strikethrough ~~text~~ — processed BEFORE subscript (single ~) so the
        // latter doesn't match half of a double-tilde pair.
        $html = preg_replace('/~~(.+?)~~/s',           '<del>$1</del>',                $html);
        // Superscript ^text^ (extended syntax) — placing it before the note
        // reference escaping ([^label]) is not a problem: those are wrapped in
        // brackets and so don't form an isolated ^...^ pair.
        $html = preg_replace('/\^([^\^\n]+)\^/',       '<sup>$1</sup>',                $html);
        // Subscript ~text~ (a single tilde; the ~~ were already consumed just
        // above by strikethrough).
        $html = preg_replace('/~([^~\n]+)~/',          '<sub>$1</sub>',                $html);

        // Emojis :shortcode: (extended syntax) — unknown shortcuts are left
        // as-is rather than silently removed.
        $html = preg_replace_callback('/:([a-zA-Z0-9_+\-]+):/', function ($m): string {
            $emoji = self::emojiFor($m[1]);
            return $emoji ?? $m[0];
        }, $html);


        // ====================================================================
        // STEP 11: LINKS & IMAGES
        // External links (https?://) get target="_blank" + rel="noopener noreferrer".
        // Internal links (/page, #anchor, ../thing) don't.
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

        // Reference links [text][label] and [text][] (shortcut = label = text)
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

        // Markdown links [text](url "optional title")
        $html = preg_replace_callback(
            '/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/',
            function ($m) use ($buildLink): string {
                return $buildLink($m[1], $m[2], $m[3] ?? '');
            },
            $html
        );

        // Bare URLs https://... (extended syntax: auto-link without brackets).
        // Excludes those already inside quotes/attributes (href="...") or
        // already turned into a link, so they don't get doubled.
        $html = preg_replace(
            '/(?<!["\'=>])\b(https?:\/\/[^\s<>"\')\]]+)/',
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
            $html
        );


        // ====================================================================
        // STEP 12: HORIZONTAL RULES
        // ====================================================================
        $html = preg_replace('/^(?:[-*_][ \t]*){3,}$/m', '<hr />', $html);


        // ====================================================================
        // STEP 13: PARAGRAPHS
        // Strategy: process line by line. Lines that start with a block-level
        // tag or a placeholder are left as-is. Consecutive raw-text lines are
        // accumulated then wrapped in a <p> when a block line or a blank line
        // is reached.
        // ====================================================================
        $blockStartTags = ['<h', '<pre', '<ul', '<ol', '<li', '<table', '<thead', '<tbody',
                           '<tr', '<td', '<th', '<blockquote', '<div', '<hr', '<img',
                           '<dl', '<dt', '<dd',
                           "\x02CB", "\x02PLG", "\x02BQ", "\x02HT"];

        $isBlockLine = static function (string $line) use ($blockStartTags): bool {
            $t = ltrim($line);
            if ($t === '') return false;
            // Any closing tag (</...>) is always treated as a "block" line:
            // this keeps a closing </table>, </thead>, </tr>, etc. from being
            // absorbed into a surrounding <p>.
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
                // Two trailing spaces → <br> (standard markdown convention)
                $content = preg_replace('/  $/m', '<br>', $content);
                // Single line break → space (GitHub behavior)
                // Unless already converted to <br> above
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
                // Blank line = paragraph separator
                $flushBuffer();
            } else {
                $textBuffer[] = $line;
            }
        }
        $flushBuffer();

        $html = implode("\n", $output);


        // ====================================================================
        // STEP 14: Re-inject the placeholders
        // ====================================================================
        $html = strtr($html, $pluginBlocks);
        $html = strtr($html, $blockquotes);
        $html = strtr($html, $rawHtml);
        $html = strtr($html, $codeBlocks);
        $html = strtr($html, $inlineCodes);
        $html = strtr($html, $autolinks);
        // The escapes are re-injected last, once no Markdown regex can
        // interpret them anymore.
        $html = strtr($html, $escapes);


        // ====================================================================
        // STEP 15: FOOTNOTES BLOCK
        // Appended at the end of the document, only if at least one note was
        // referenced (notes that are defined but never referenced are
        // silently ignored).
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


// Default Markdown plugins ({% codepen %}, {% youtube %}, {% checklist %},
// {% callout %}) — "registered out of the box" per the README. Loaded here so
// every entrypoint (prepros.php, runenv.php, imagebatch.php) gets them without
// an explicit include. A project can still MD::unregisterPlugin() any of them,
// or MD::registerPlugin() its own with the same name to override.
include_once(__DIR__ . '/md.plugins.php');