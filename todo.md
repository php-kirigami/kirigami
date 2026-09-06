# Todo

## kirigami
- [ ] Config pour exclure des paths wildcard à l'export



https://purge.jsdelivr.net/npm/@kirigami/kirigami/package.json


robots.txt


shortcuts.php

kiri cache purge

block html extlink qui call scraper (plugin)


<!-- change cwd on render, juste dans le prepros.php OU le faire dans la fonction render de php -->
faire le get_children avec backtrace pis un système de position


vérifier si network = true avant de loader la classe curl


remplacer le file_get_contents par une vérification si c'est un fichier ou un url et utiliser curl_get_contents();

mettre à jour le user-agent pis les headers

section dans kirigami.yaml

prepros:
  image:
    format: webp | avif (default: webp) 
	source: (default: ./assets/images/)
	dest: (default: <kirigami:src>/images/)

si image local, prendre elle avant de passer à aux assets



- faire un vrai test pour l'action kiribuild