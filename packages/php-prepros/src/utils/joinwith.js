function joinWith(part1, part2, separator = '/', prefix = '') {
	let join = '';
	let separatorsFound = 0;
	if (part1.endsWith(separator)) { separatorsFound += 1; }
	if (part2.startsWith(separator)) { separatorsFound += 1; }
	if (separatorsFound === 0) { join = separator; }
	else if (separatorsFound === 2) { part1 = part1.substr(0, part1.length - separator.length); }
	if (part1.startsWith(prefix)) { prefix = ''; }
	return prefix + part1 + join + part2;
}

export { joinWith as default }