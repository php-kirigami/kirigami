import fs from 'node:fs';

/**
 * PHPInfoParser
 * -------------
 * Parse exhaustivement la sortie HTML de la fonction PHP phpinfo()
 * sans dépendance externe (aucune librairie npm requise, uniquement
 * le module natif "fs" pour la lecture de fichier optionnelle).
 *
 * Usage:
 *   const parser = new PHPInfoParser(html);
 *   const obj  = parser.toObject();
 *   const md   = parser.toMarkdown();
 *
 *   // ou directement depuis un fichier :
 *   const parser2 = PHPInfoParser.fromFile('./phpinfo.html');
 */
class PHPInfoParser {
	/**
	 * @param {string} html Le HTML complet généré par phpinfo()
	 */
	constructor(html) {
		if (typeof html !== 'string' || !html.trim()) {
			throw new TypeError('PHPInfoParser: le HTML fourni est vide ou invalide.');
		}
		this.html = html;
		this._parsed = null; // cache
	}

	/** Instancie le parser directement depuis un fichier sur disque. */
	static fromFile(path, encoding = 'utf8') {
		const html = fs.readFileSync(path, encoding);
		return new PHPInfoParser(html);
	}

	/**
	 * Instancie le parser depuis une chaîne HTML déjà en mémoire
	 * (ex: récupérée via fetch(), une requête HTTP, un buffer converti, etc.).
	 * Strictement équivalent à `new PHPInfoParser(html)`, fourni pour la
	 * symétrie avec `fromFile()`.
	 */
	static fromString(html) {
		return new PHPInfoParser(html);
	}

	// ------------------------------------------------------------------
	// Utilitaires bas niveau : décodage HTML / extraction de balises
	// ------------------------------------------------------------------

	/** Décode les entités HTML les plus courantes. */
	static decodeEntities(str) {
		if (!str) return '';
		return str
			.replace(/&nbsp;/gi, ' ')
			.replace(/&amp;/gi, '&')
			.replace(/&lt;/gi, '<')
			.replace(/&gt;/gi, '>')
			.replace(/&quot;/gi, '"')
			.replace(/&#0?39;/gi, "'")
			.replace(/&apos;/gi, "'")
			.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
			.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
	}

	/**
	 * Retire toutes les balises HTML d'un fragment et renvoie le texte propre.
	 * <br> est converti en saut de ligne, <i>no value</i> est normalisé à null
	 * en amont (voir extractCells), le reste est simplement dépouillé.
	 */
	static stripTags(fragment) {
		if (!fragment) return '';
		const withBreaks = fragment
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(p|div|li)>/gi, '\n')
			.replace(/<[^>]+>/g, '');
		return PHPInfoParser.decodeEntities(withBreaks)
			.replace(/[ \t]+/g, ' ')
			.replace(/\n\s+/g, '\n')
			.replace(/\s+\n/g, '\n')
			.trim();
	}

	/** Extrait la valeur d'un attribut (ex: class="e") dans une chaîne d'ouverture de balise. */
	static getAttr(tagOpenAttrs, name) {
		const m = new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i').exec(tagOpenAttrs);
		return m ? m[1] : null;
	}

	// ------------------------------------------------------------------
	// Étape 1 : découpage du document en blocs de haut niveau
	//           (h1, h2, table) dans l'ordre d'apparition
	// ------------------------------------------------------------------

	static extractTopLevelBlocks(html) {
		const blockRe = /<h1[^>]*>[\s\S]*?<\/h1>|<h2[^>]*>[\s\S]*?<\/h2>|<table[^>]*>[\s\S]*?<\/table>/gi;
		const blocks = [];
		let m;
		while ((m = blockRe.exec(html)) !== null) {
			const raw = m[0];
			let type;
			if (/^<h1/i.test(raw)) type = 'h1';
			else if (/^<h2/i.test(raw)) type = 'h2';
			else type = 'table';
			blocks.push({ type, raw });
		}
		return blocks;
	}

	// ------------------------------------------------------------------
	// Étape 2 : extraction des lignes (tr) et cellules (td/th) d'une table
	// ------------------------------------------------------------------

	static extractRows(tableHtml) {
		const rowRe = /<tr([^>]*)>([\s\S]*?)<\/tr>/gi;
		const rows = [];
		let m;
		while ((m = rowRe.exec(tableHtml)) !== null) {
			const trAttrs = m[1];
			const trClass = PHPInfoParser.getAttr(trAttrs, 'class') || '';
			rows.push({
				isHeader: /\bh\b/.test(trClass),
				cssClass: trClass,
				cells: PHPInfoParser.extractCells(m[2]),
			});
		}
		return rows;
	}

	static extractCells(rowHtml) {
		const cellRe = /<(t[hd])([^>]*)>([\s\S]*?)<\/t[hd]>/gi;
		const cells = [];
		let m;
		while ((m = cellRe.exec(rowHtml)) !== null) {
			const tag = m[1].toLowerCase();
			const attrs = m[2];
			const inner = m[3];
			const cls = PHPInfoParser.getAttr(attrs, 'class');
			const colspan = PHPInfoParser.getAttr(attrs, 'colspan');
			let text = PHPInfoParser.stripTags(inner);
			// phpinfo affiche <i>no value</i> pour une valeur vide -> normalisation
			if (/^<i>\s*no value\s*<\/i>$/i.test(inner.trim())) text = null;
			cells.push({ tag, cls, colspan: colspan ? parseInt(colspan, 10) : 1, text });
		}
		return cells;
	}

	static parseTable(tableHtml) {
		const rows = PHPInfoParser.extractRows(tableHtml);
		const headerRows = rows.filter((r) => r.isHeader);
		const dataRows = rows.filter((r) => !r.isHeader);
		return { headerRows, dataRows };
	}

	// ------------------------------------------------------------------
	// Étape 3 : interprétation "haut niveau" d'une table pour construire
	//           un objet ergonomique (caption / columns / rows / note)
	// ------------------------------------------------------------------

	static interpretTable(rawTable) {
		const { headerRows, dataRows } = rawTable;

		const result = {
			caption: null,   // titre de la table, ex: "PHP Group", "Features"
			columns: null,   // en-têtes de colonnes, ex: ["Directive","Local Value","Master Value"]
			entries: null,   // données interprétées (voir ci-dessous)
			note: null,       // table composée uniquement d'un texte (pas de données)
			raw: rawTable,    // conservation intégrale pour un accès exhaustif
		};

		// Aucune ligne d'en-tête -> table "brute" de données (cas le plus fréquent)
		if (headerRows.length === 0) {
			result.entries = PHPInfoParser._rowsToEntries(dataRows);
			return result;
		}

		// Une ou deux lignes d'en-tête. On isole une éventuelle "légende"
		// (ligne d'en-tête à une seule cellule, souvent avec colspan) des
		// véritables en-têtes de colonnes (ligne à 2 cellules ou plus).
		let captionRow = null;
		let columnRow = null;
		for (const hr of headerRows) {
			if (hr.cells.length <= 1) {
				if (!captionRow) captionRow = hr;
			} else if (!columnRow) {
				columnRow = hr;
			}
		}

		if (captionRow) {
			result.caption = captionRow.cells.map((c) => c.text).join(' ').trim() || null;
		}
		if (columnRow) {
			result.columns = columnRow.cells.map((c) => c.text);
		}

		// Ligne(s) d'en-tête uniquement, aucune donnée -> simple bloc de texte (note)
		if (dataRows.length === 0) {
			result.note = result.caption || (result.columns ? result.columns.join(' | ') : null);
			return result;
		}

		if (result.columns) {
			// Table à colonnes nommées (ex: directives php.ini, tableaux de crédits)
			result.entries = dataRows.map((row) => {
				const obj = {};
				row.cells.forEach((cell, i) => {
					const key = result.columns[i] !== undefined ? result.columns[i] : `col${i}`;
					obj[key] = cell.text;
				});
				return obj;
			});
		} else {
			// Table simple clé/valeur (ou liste) éventuellement sous une légende
			result.entries = PHPInfoParser._rowsToEntries(dataRows);
		}

		return result;
	}

	/** Transforme des lignes de données brutes en liste ordonnée {label, value}. */
	static _rowsToEntries(dataRows) {
		return dataRows.map((row) => {
			const texts = row.cells.map((c) => c.text);
			if (texts.length === 1) {
				return { label: texts[0], value: null };
			}
			if (texts.length === 2) {
				return { label: texts[0], value: texts[1] };
			}
			// Plus de 2 colonnes sans en-tête nommé (rare) -> on garde tout.
			return { label: texts[0], value: texts.slice(1) };
		});
	}

	// ------------------------------------------------------------------
	// Étape 4 : découpage en sections (Général + un h2 par module) et
	//           construction de l'objet final
	// ------------------------------------------------------------------

	parse() {
		if (this._parsed) return this._parsed;

		const html = this.html;

		// Titre / version
		const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(html);
		const title = titleMatch ? PHPInfoParser.stripTags(titleMatch[1]) : null;
		const versionMatch = title && /PHP\s+([\d.]+(?:-\S+)?)/i.exec(title);
		const version = versionMatch ? versionMatch[1] : null;

		const blocks = PHPInfoParser.extractTopLevelBlocks(html);

		const sections = [];
		let current = { name: 'General', tables: [] };
		sections.push(current);

		for (const block of blocks) {
			if (block.type === 'h1' || block.type === 'h2') {
				const name = PHPInfoParser.stripTags(block.raw.replace(/^<h[12][^>]*>|<\/h[12]>$/gi, ''));
				if (!name) continue; // en-tête vide, ignoré
				current = { name, tables: [] };
				sections.push(current);
			} else if (block.type === 'table') {
				const raw = PHPInfoParser.parseTable(block.raw);
				const interpreted = PHPInfoParser.interpretTable(raw);
				current.tables.push(interpreted);
			}
		}

		// On retire les sections purement décoratives (titres sans aucune table,
		// ex: le <h1>Configuration</h1> qui ne fait qu'introduire les modules).
		const cleanedSections = sections.filter((s) => s.tables.length > 0);

		this._parsed = { title, version, sections: cleanedSections };
		return this._parsed;
	}

	// ------------------------------------------------------------------
	// API publique
	// ------------------------------------------------------------------

	/** Retourne la structure complète sous forme d'objet JavaScript. */
	toObject() {
		return this.parse();
	}

	/**
	 * Retourne une structure "index" aplatie (section -> clé -> valeur),
	 * pensée pour retrouver une info rapidement, pas pour reconstruire le HTML.
	 * Contrairement à toObject(), les tables sont réduites à de simples
	 * paires clé/valeur : plus de columns/entries/raw imbriqués.
	 *
	 * - Table clé/valeur simple (ex: "PHP Version" -> "8.2.1")
	 * - Table à colonnes (ex: directives php.ini) -> objet par ligne, avec
	 *   simplification automatique si une seule colonne reste après la clé
	 *   (ex: { allow_url_fopen: { local: "On", master: "On" } })
	 * - Table "note" (texte seul, pas de données) -> chaîne directement
	 * - Une "caption" (légende de table) crée un sous-objet dans la section
	 *   pour éviter les collisions de clés entre tables voisines.
	 */
	toKeyValue() {
		const { title, version, sections } = this.parse();
		const out = { title, version, sections: {} };

		for (const section of sections) {
			const sectionObj = {};

			for (const table of section.tables) {
				const target = table.caption
					? (sectionObj[table.caption] ??= {})
					: sectionObj;

				if (table.note) {
					if (table.caption) sectionObj[table.caption] = table.note;
					else sectionObj.note = table.note;
					continue;
				}

				if (table.columns) {
					const [keyCol, ...restCols] = table.columns;
					for (const entry of table.entries ?? []) {
						const key = entry[keyCol];
						if (key === null || key === undefined || key === '') continue;
						if (restCols.length === 1) {
							target[key] = entry[restCols[0]] ?? null;
						} else {
							const rest = {};
							for (const col of restCols) rest[col] = entry[col] ?? null;
							target[key] = rest;
						}
					}
				} else if (Array.isArray(table.entries)) {
					for (const entry of table.entries) {
						if (entry.label === null || entry.label === undefined) continue;
						target[entry.label] = entry.value;
					}
				}
			}

			out.sections[section.name] = sectionObj;
		}

		return out;
	}

	/** Raccourci pour récupérer une section (module) par son nom (insensible à la casse). */
	getSection(name) {
		const { sections } = this.parse();
		const needle = name.toLowerCase();
		return sections.find((s) => s.name.toLowerCase() === needle) || null;
	}

	/** Liste les noms de toutes les sections/modules détectés. */
	listSections() {
		return this.parse().sections.map((s) => s.name);
	}

	/**
	 * Recherche une directive php.ini par son nom exact dans toutes les
	 * sections. Retourne { section, local, master } ou null.
	 */
	findDirective(directiveName) {
		const { sections } = this.parse();
		for (const section of sections) {
			for (const table of section.tables) {
				if (!table.columns || !Array.isArray(table.entries)) continue;
				const directiveKey = table.columns.find((c) => /directive/i.test(c));
				if (!directiveKey) continue;
				const found = table.entries.find((e) => e[directiveKey] === directiveName);
				if (found) {
					return {
						section: section.name,
						directive: found[directiveKey],
						local: found['Local Value'] !== undefined ? found['Local Value'] : null,
						master: found['Master Value'] !== undefined ? found['Master Value'] : null,
					};
				}
			}
		}
		return null;
	}

	/** Génère un rendu Markdown exhaustif et lisible du phpinfo() parsé. */
	toMarkdown() {
		const { title, version, sections } = this.parse();
		const lines = [];

		lines.push(`# ${title || 'phpinfo()'}`);
		if (version) lines.push(`\n**Version PHP :** ${version}`);
		lines.push('');

		for (const section of sections) {
			lines.push(`## ${section.name}`);
			lines.push('');

			for (const table of section.tables) {
				if (table.caption) {
					lines.push(`**${table.caption}**`);
					lines.push('');
				}

				if (table.note) {
					lines.push(`> ${table.note}`);
					lines.push('');
					continue;
				}

				if (table.columns) {
					// Table à colonnes nommées (directives php.ini, tableaux de crédits...)
					lines.push(`| ${table.columns.join(' | ')} |`);
					lines.push(`| ${table.columns.map(() => '---').join(' | ')} |`);
					for (const entry of table.entries) {
						const row = table.columns.map((c) => {
							const v = entry[c];
							return v === null || v === undefined ? '_no value_' : String(v).replace(/\n/g, '<br>').replace(/\|/g, '\\|');
						});
						lines.push(`| ${row.join(' | ')} |`);
					}
					lines.push('');
				} else if (Array.isArray(table.entries)) {
					// Table sans en-têtes nommés (clé/valeur) : on la rend quand même
					// sous forme de tableau Markdown à 2 colonnes, pas une liste.
					lines.push('| Key | Value |');
					lines.push('| --- | --- |');
					for (const entry of table.entries) {
						const label = String(entry.label).replace(/\n/g, '<br>').replace(/\|/g, '\\|');
						let val;
						if (entry.value === null || entry.value === undefined) val = '_no value_';
						else if (Array.isArray(entry.value)) val = entry.value.join(', ');
						else val = String(entry.value).replace(/\n/g, '<br>');
						val = String(val).replace(/\|/g, '\\|');
						lines.push(`| ${label} | ${val} |`);
					}
					lines.push('');
				}
			}
		}

		return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
	}
}

export default PHPInfoParser;
