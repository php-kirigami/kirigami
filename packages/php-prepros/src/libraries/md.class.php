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
            '/^(?![ \t]*(?:#{1,6}[ \t]|>|```|\||[-*+][ \t]|\d+\.[ \t]))[ \t]*(\S.*?)[ \t]*\n[ \t]*=+[ \t]*$/m',
            function ($matches) {
                $text = trim($matches[1]);
                $id   = self::slugify($text);
                return "<h1 id=\"{$id}\">{$text}</h1>";
            },
            $html
        );
        $html = preg_replace_callback(
            '/^(?![ \t]*(?:#{1,6}[ \t]|>|```|\||[-*+][ \t]|\d+\.[ \t]))[ \t]*(\S.*?)[ \t]*\n[ \t]*-+[ \t]*$/m',
            function ($matches) {
                $text = trim($matches[1]);
                $id   = self::slugify($text);
                return "<h2 id=\"{$id}\">{$text}</h2>";
            },
            $html
        );


        // ====================================================================
        // ÉTAPE 8 : TITRES (ATX : # à ######)
        // ====================================================================
        $html = preg_replace_callback('/^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?$/m', function ($matches) {
            $level = strlen($matches[1]);
            $text  = trim($matches[2]);
            $id    = self::slugify($text);
            return "<h{$level} id=\"{$id}\">{$text}</h{$level}>";
        }, $html);


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
        // ÉTAPE 10 : TEXTE EN LIGNE (Gras, Italique, Barré)
        // ====================================================================
        $html = preg_replace('/\*\*\*(.+?)\*\*\*/s', '<strong><em>$1</em></strong>', $html);
        $html = preg_replace('/___(.+?)___/s',        '<strong><em>$1</em></strong>', $html);
        $html = preg_replace('/\*\*(.+?)\*\*/s',      '<strong>$1</strong>',          $html);
        $html = preg_replace('/__(.+?)__/s',           '<strong>$1</strong>',          $html);
        $html = preg_replace('/\*(.+?)\*/s',                          '<em>$1</em>',                  $html);
        // Le _ italique ne doit matcher qu'aux frontières de mots pour ne pas
        // capturer les snake_case, noms de packages (@php-wasm/node), etc.
        $html = preg_replace('/(?<!\w)_([^_\n]+)_(?!\w)/',           '<em>$1</em>',                  $html);
        $html = preg_replace('/~~(.+?)~~/s',           '<del>$1</del>',                $html);


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

        return $html;
    }
}