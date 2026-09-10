# Todo

## kirigami
- [ ] Config pour exclure des paths wildcard à l'export



https://purge.jsdelivr.net/npm/@kirigami/kirigami/package.json







version de kirigami minimale dans le kirigami.yaml

<!-- change cwd on render, juste dans le prepros.php OU le faire dans la fonction render de php -->
<!-- FAIT: FS::getChildren() / fs_get_children(), backtrace + tri @position -->



<!-- FAIT: mettre à jour le user-agent pis les headers (CURL::HEADERS = Chrome 131 / Win 11) -->
block html extlink qui call scraper
<!-- FAIT: hooks boot + pre_before/post_before/pre_after/post_after dans prepros -->


- Plugins settés dans kirigami.yaml
- faire un vrai test pour l'action kiribuild
- pour plugin, vérifier le package.json (ou pas)

<!-- FAIT: LD class (php-prepros 1.3.0) — génère les schemas json+ld. Auto-inject <script application/ld+json> dans le <head>, OPT-IN: seulement si bloc jsonld: présent à la RACINE de kirigami.yaml (frère de kirigami:, pas dessous — jsonld: {} suffit), sinon rien. Clés libres du bloc kirigami: lues en plus. BreadcrumbList auto (trail des _index.php parents, pas besoin de @breadcrumb). Tags page: @ld false, @ld_type, @ld_title, @ld_description, @ld_image, @ld_published, @ld_modified, @ld_breadcrumb false. Opt-out global: jsonld: false / {auto: false} -->
<!-- système pour créer des schemas json+ld -->


<!-- FAIT: FS::getBreadcrumb() / fs_get_breadcrumb(), backtrace des parents, opt-in @breadcrumb true|1, coupe au root ou au premier _index.php sans @breadcrumb -->
<!-- @breadcrumb true|1 signifi qu'il sera calculé dans le breadcrumb -->