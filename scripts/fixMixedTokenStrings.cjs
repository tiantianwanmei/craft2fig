/**
 * Fix mixed token strings like '10px SEMANTIC_TOKENS.spacing['3']'
 * Should be template literals: `10px ${SEMANTIC_TOKENS.spacing['3']}`
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let count = 0;

  // Pattern 1: '...SEMANTIC_TOKENS.xxx...' -> `...${SEMANTIC_TOKENS.xxx}...`
  // Match strings that contain SEMANTIC_TOKENS or BASE_TOKENS
  const pattern1 = /'([^']*)(SEMANTIC_TOKENS\.[a-zA-Z.[\]'0-9]+)([^']*)'/g;
  let match;
  const replacements = [];

  while ((match = pattern1.exec(content)) !== null) {
    const fullMatch = match[0];
    const before = match[1];
    const token = match[2];
    const after = match[3];

    // Convert to template literal
    const replacement = `\`${before}\${${token}}${after}\``;
    replacements.push({ from: fullMatch, to: replacement });
  }

  // Pattern 2: Same for BASE_TOKENS
  const pattern2 = /'([^']*)(BASE_TOKENS\.[a-zA-Z.[\]'0-9]+)([^']*)'/g;
  while ((match = pattern2.exec(content)) !== null) {
    const fullMatch = match[0];
    const before = match[1];
    const token = match[2];
    const after = match[3];

    const replacement = `\`${before}\${${token}}${after}\``;
    replacements.push({ from: fullMatch, to: replacement });
  }

  // Apply replacements
  replacements.forEach(r => {
    if (content.includes(r.from)) {
      content = content.replace(r.from, r.to);
      count++;
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${path.basename(filePath)}: ${count} fixes`);
  }

  return count;
}

console.log('🔧 Fixing mixed token strings...\n');

const srcDir = path.join(__dirname, '../src');
const files = glob.sync(`${srcDir}/**/*.{ts,tsx}`, {
  ignore: ['**/node_modules/**', '**/*.test.{ts,tsx}', '**/*.old.{ts,tsx}']
});

let totalFixes = 0;
let filesFixed = 0;

files.forEach(file => {
  const count = fixFile(file);
  if (count > 0) {
    totalFixes += count;
    filesFixed++;
  }
});

console.log(`\n✨ Done! Fixed ${totalFixes} mixed strings in ${filesFixed} files.`);
