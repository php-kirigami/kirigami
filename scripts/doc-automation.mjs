#!/usr/bin/env node
// Script: doc-automation.mjs
// Purpose: Rebuild MCP doc index, run smoke searches, and check for duplicates
// between docs/STATUS.md and docs/BUGS.md. Meant to be run from the repo root.
// Comments and strings below are English (repo convention). Run with: node scripts/doc-automation.mjs

import fs from 'fs';
import path from 'path';
import { buildDocIndex, loadDocIndex, searchDocIndex } from '../packages/mcp/index.js';

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ }
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function extractBullets(text) {
  if (!text) return [];
  return text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim())
    .filter(Boolean);
}

function normalizeForCompare(s) {
  return (s || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const projectDir = process.cwd();
  console.log('Project dir:', projectDir);

  // 1) Build doc index
  const cachePath = path.join(projectDir, '.kirigami', 'mcp-doc-index.json');
  ensureDir(path.dirname(cachePath));
  console.log('Building doc index ->', cachePath);
  const index = buildDocIndex(projectDir, { cachePath });
  console.log(`Index built: ${index.files?.length ?? 0} files`);

  // 2) Smoke searches
  const queries = ['kirigami mcp', 'prepros', 'page types'];
  console.log('\nSmoke search results:');
  for (const q of queries) {
    const hits = searchDocIndex(index, q, 'all', 5);
    console.log(`\nQuery: "${q}" -> ${hits.length} hits`);
    for (const h of hits) {
      console.log(` - ${h.path} (score ${h.score})`);
    }
  }

  // 3) Check STATUS.md vs BUGS.md for overlapping bullet items
  const statusPath = path.join(projectDir, 'docs', 'STATUS.md');
  const bugsPath = path.join(projectDir, 'docs', 'BUGS.md');
  const statusText = readFileSafe(statusPath);
  const bugsText = readFileSafe(bugsPath);

  if (!statusText) console.warn('Warning: docs/STATUS.md not found');
  if (!bugsText) console.warn('Warning: docs/BUGS.md not found');

  const statusBullets = extractBullets(statusText);
  const bugsBullets = extractBullets(bugsText);

  // Fallback: if either file has no bullet points, also try short lines as candidates
  const fallbackShortLines = (text) => {
    if (!text) return [];
    return text.split(/\r?\n/).map(l => l.trim()).filter(l => l && l.length < 120 && !l.startsWith('#') && !l.startsWith('>'));
  };

  const statusCandidates = statusBullets.length ? statusBullets : fallbackShortLines(statusText);
  const bugsCandidates = bugsBullets.length ? bugsBullets : fallbackShortLines(bugsText);

  const matches = [];
  const normBugs = bugsCandidates.map(b => ({ raw: b, norm: normalizeForCompare(b) }));

  for (const s of statusCandidates) {
    const sNorm = normalizeForCompare(s);
    for (const b of normBugs) {
      if (!sNorm || !b.norm) continue;
      // consider a match if one string contains the other (loose heuristic)
      if (b.norm.includes(sNorm) || sNorm.includes(b.norm)) {
        matches.push({ status: s, bug: b.raw });
      }
    }
  }

  console.log('\nSTATUS vs BUGS overlap check:');
  if (matches.length === 0) {
    console.log('No obvious overlaps found between docs/STATUS.md and docs/BUGS.md bullets.');
  } else {
    console.log(`Found ${matches.length} possible overlap(s):`);
    for (const m of matches) {
      console.log(` - STATUS: "${m.status}"`);
      console.log(`   appears in BUGS: "${m.bug}"`);
    }
  }

  // 4) Report summary file
  const report = {
    generatedAt: new Date().toISOString(),
    projectDir,
    indexFileCount: index.files?.length ?? 0,
    smokeQueries: queries,
    overlapCount: matches.length,
    overlaps: matches,
  };
  const reportPath = path.join(projectDir, '.kirigami', 'doc-automation-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('\nWrote report to', reportPath);
  } catch (e) {
    console.warn('Failed to write report:', e?.message || e);
  }

  console.log('\nDone. Exit code 0.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err?.stack || err);
  process.exit(2);
});
