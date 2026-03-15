#!/usr/bin/env node

/**
 * One-time migration: splits the monolithic saved_analyses.json (389 MB) into
 * individual per-analysis files under data/analyses/.
 *
 * Output:
 *   data/analyses/index.json         — lightweight array (no mask/biomassData)
 *   data/analyses/{id}.json          — full analysis per entry
 *   data/saved_analyses.json.bak     — backup of the original file
 *
 * Usage:  node scripts/migrate-analyses.js
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'saved_analyses.json');
const DEST_DIR = path.join(__dirname, '..', 'data', 'analyses');
const BACKUP = SRC + '.bak';

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Source file not found:', SRC);
    process.exit(1);
  }

  console.log('Reading source file…');
  const raw = fs.readFileSync(SRC, 'utf-8');
  const analyses = JSON.parse(raw);
  console.log(`Parsed ${analyses.length} analyses.`);

  fs.mkdirSync(DEST_DIR, { recursive: true });

  const index = [];

  for (const analysis of analyses) {
    const { id } = analysis;
    if (!id) {
      console.warn('Skipping entry without id:', Object.keys(analysis));
      continue;
    }

    const filePath = path.join(DEST_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(analysis));
    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`  ✓ ${id}.json  (${sizeMB} MB)  — ${analysis.name || '(unnamed)'}`);

    const { biomassData, mask, ...lightweight } = analysis;
    index.push(lightweight);
  }

  const indexPath = path.join(DEST_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n✓ index.json written (${index.length} entries)`);

  console.log('Backing up original file…');
  fs.renameSync(SRC, BACKUP);
  console.log(`✓ Original renamed to saved_analyses.json.bak`);

  console.log('\nMigration complete.');
}

main();
