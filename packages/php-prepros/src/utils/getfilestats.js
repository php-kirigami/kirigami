import { stat } from 'node:fs/promises';

/**
 * Gets a file's information.
 * @param {string} filePath - the file path
 * @returns {Promise<object>} object holding the file's info
 */
async function getFileStats(filePath) {
	try {
		const stats = await stat(filePath);

		return {
			exists: true,
			isFile: stats.isFile(),
			isDirectory: stats.isDirectory(),
			size: stats.size, // in bytes
			createdAt: stats.birthtime,
			modifiedAt: stats.mtime,
			accessedAt: stats.atime,
			changedAt: stats.ctime, // last metadata change
		};
	} catch (error) {
		if (error.code === 'ENOENT') {
			return { exists: false };
		}
		throw error; // other errors (permissions, etc.)
	}
}

export default getFileStats;