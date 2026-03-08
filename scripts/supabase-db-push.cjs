#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');

function readTargetFromEnv(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^SUPABASE_DB_TARGET\s*=\s*(.+)$/);
    if (!match) continue;
    return match[1].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  }
  return null;
}

const target = readTargetFromEnv(envPath) || 'local';
const restArgs = process.argv.slice(2).join(' ');

let flag;
if (target === 'linked' || target === 'remote' || target === 'online') {
  flag = '--linked';
} else if (target === 'local') {
  flag = '--local';
} else {
  console.error(
    `Invalid SUPABASE_DB_TARGET="${target}". Use "local" or "linked".`
  );
  process.exit(1);
}

const cmd = `npx supabase db push ${flag}${restArgs ? ` ${restArgs}` : ''}`;
console.log(`[supabase-db-push] target=${target} -> ${cmd}`);
execSync(cmd, { stdio: 'inherit' });
