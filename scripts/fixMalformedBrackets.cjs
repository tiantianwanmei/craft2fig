/**
 * Fix malformed bracket notation like SEMANTIC_TOKENS.spacing[1.5']'
 * Should be SEMANTIC_TOKENS.spacing['1.5']
 */
const fs = require('fs');
const path = require('path');

const files = [
  'src/components/craft/CraftThumbnails.tsx',
  'src/components/craft/CraftLargePreview.tsx',
  'src/components/craft/CraftParamPanel.tsx',
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  let modified = false;
  let count = 0;

  // Fix pattern: SEMANTIC_TOKENS.xxx[1.5']' -> SEMANTIC_TOKENS.xxx['1.5']
  const pattern1 = /(SEMANTIC_TOKENS\.[a-zA-Z]+)\[([0-9.]+)'\]'/g;
  const matches1 = content.match(pattern1);
  if (matches1) {
    content = content.replace(pattern1, "$1['$2']");
    count += matches1.length;
    modified = true;
  }

  // Fix pattern: BASE_TOKENS.xxx[1.5']' -> BASE_TOKENS.xxx['1.5']
  const pattern2 = /(BASE_TOKENS\.[a-zA-Z]+)\[([0-9.]+)'\]'/g;
  const matches2 = content.match(pattern2);
  if (matches2) {
    content = content.replace(pattern2, "$1['$2']");
    count += matches2.length;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ ${path.basename(filePath)}: ${count} fixes`);
  } else {
    console.log(`⏭️  ${path.basename(filePath)}: no issues`);
  }

  return count;
}

console.log('🔧 Fixing malformed bracket notation...\n');

let totalFixes = 0;
files.forEach(file => {
  totalFixes += fixFile(file);
});

console.log(`\n✨ Done! Fixed ${totalFixes} malformed brackets.`);
