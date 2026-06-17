<?php



// =============================================================================
// PLUGINS FOURNIS PAR DÉFAUT (optionnels, décommentez ce dont vous avez besoin)
// =============================================================================

// --- CodePen (inline) ---
// {% codepen PENid %}
// {% codepen PENid user height %}
MD::registerPlugin('codepen', function (array $args, string $body): string {
    $id     = htmlspecialchars($args[0] ?? '', ENT_QUOTES, 'UTF-8');
    $user   = htmlspecialchars($args[1] ?? 'anonymous', ENT_QUOTES, 'UTF-8');
    $height = intval($args[2] ?? 400);
    if ($id === '') return '<!-- codepen: id manquant -->';
    return "<iframe height=\"{$height}\" style=\"width:100%\" "
         . "scrolling=\"no\" "
         . "src=\"https://codepen.io/{$user}/embed/{$id}?default-tab=result\" "
         . "frameborder=\"no\" loading=\"lazy\" allowfullscreen>"
         . "</iframe>";
});

// --- YouTube (inline) ---
// {% youtube VIDEO_ID %}
// {% youtube VIDEO_ID 560 315 %}
MD::registerPlugin('youtube', function (array $args, string $body): string {
    $id     = htmlspecialchars($args[0] ?? '', ENT_QUOTES, 'UTF-8');
    $width  = intval($args[1] ?? 560);
    $height = intval($args[2] ?? 315);
    if ($id === '') return '<!-- youtube: id manquant -->';
    return "<iframe width=\"{$width}\" height=\"{$height}\" "
         . "src=\"https://www.youtube.com/embed/{$id}\" "
         . "title=\"YouTube video player\" frameborder=\"0\" loading=\"lazy\" "
         . "allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" "
         . "allowfullscreen></iframe>";
});

// --- Checklist (bloc multi-ligne) ---
// {% checklist
// Faire la vaisselle
// Promener le chien
// Lire un livre
// %}
//
// Optionnellement avec un titre :
// {% checklist "Mes tâches du jour"
// Tâche 1
// Tâche 2
// %}
MD::registerPlugin('checklist', function (array $args, string $body): string {
    $title = !empty($args[0]) ? '<p class="checklist-title"><strong>' . htmlspecialchars($args[0], ENT_QUOTES, 'UTF-8') . '</strong></p>' : '';
    $items = array_filter(array_map('trim', explode("\n", $body)));
    if (empty($items)) return '<!-- checklist: aucun élément -->';
    $html = "<div class=\"checklist\">{$title}<ul>\n";
    foreach ($items as $item) {
        $html .= '  <li><label><input type="checkbox" /> ' . htmlspecialchars($item, ENT_QUOTES, 'UTF-8') . '</label></li>' . "\n";
    }
    return $html . "</ul></div>";
});

// --- Avertissement personnalisé (inline ou bloc) ---
// Inline :  {% callout warning "Attention !" Contenu sur une ligne %}
// Bloc   :  {% callout danger "Titre"
//            Paragraphe 1
//
//            Paragraphe 2
//            %}
MD::registerPlugin('callout', function (array $args, string $body): string {
    $validTypes = ['info', 'success', 'warning', 'danger'];
    $type  = in_array($args[0] ?? '', $validTypes, true) ? $args[0] : 'info';
    $title = !empty($args[1]) ? htmlspecialchars($args[1], ENT_QUOTES, 'UTF-8') : '';

    // Contenu : $body si tag bloc, sinon les args restants sur la ligne d'ouverture
    if ($body !== '') {
        $content = htmlspecialchars($body, ENT_QUOTES, 'UTF-8');
        // Remplace les doubles sauts de ligne par des <br><br> pour préserver les paragraphes
        $content = str_replace("\n\n", '<br><br>', $content);
        $content = str_replace("\n", '<br>', $content);
    } else {
        $content = htmlspecialchars(implode(' ', array_slice($args, $title ? 2 : 1)), ENT_QUOTES, 'UTF-8');
    }

    $titleHtml = $title ? "<strong>{$title}</strong><br>" : '';
    return "<div class=\"callout callout-{$type}\">{$titleHtml}{$content}</div>";
});