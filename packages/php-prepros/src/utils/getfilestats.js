import { stat } from 'node:fs/promises';

/**
 * Récupère les informations d'un fichier.
 * @param {string} filePath - Chemin du fichier
 * @returns {Promise<object>} Objet contenant les infos du fichier
 */
async function getFileStats(filePath) {
	try {
		const stats = await stat(filePath);

		return {
			exists: true,
			isFile: stats.isFile(),
			isDirectory: stats.isDirectory(),
			size: stats.size, // en octets
			createdAt: stats.birthtime,
			modifiedAt: stats.mtime,
			accessedAt: stats.atime,
			changedAt: stats.ctime, // dernier changement des métadonnées
		};
	} catch (error) {
		if (error.code === 'ENOENT') {
			return { exists: false };
		}
		throw error; // autres erreurs (permissions, etc.)
	}
}

export default getFileStats;