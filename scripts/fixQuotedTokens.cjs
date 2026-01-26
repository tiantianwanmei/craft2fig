/**
 * Fix quoted SEMANTIC_TOKENS and BASE_TOKENS references
 * Converts 'SEMANTIC_TOKENS.foo' to SEMANTIC_TOKENS.foo
 */
const fs = require('fs');
const path = require('path');

const files = [
  'src/components/craft/CraftParamPanel.tsx',
  'src/components/canvas/SpatialCanvas.tsx',
  'src/components/craft/CraftLargePreview.tsx',
  'src/components/craft/CraftPreviewCanvas.tsx',
  'src/components/craft/CraftThumbnails.tsx',
  'src/components/panels/CustomSelect.tsx',
  'src/components/panels/FoldTab.tsx',
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  let modified = false;
  let count = 0;

  // Pattern 1: 'SEMANTIC_TOKENS.xxx' -> SEMANTIC_TOKENS.xxx
  const pattern1 = /'SEMANTIC_TOKENS\.([^']+)'/g;
  const matches1 = content.match(pattern1);
  if (matches1) {
    content = content.replace(pattern1, 'SEMANTIC_TOKENS.$1');
    count += matches1.length;
    modified = true;
  }

  // Pattern 2: 'BASE_TOKENS.xxx' -> BASE_TOKENS.xxx
  const pattern2 = /'BASE_TOKENS\.([^']+)'/g;
  const matches2 = content.match(pattern2);
  if (matches2) {
    content = content.replace(pattern2, 'BASE_TOKENS.$1');
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

console.log('🔧 Fixing quoted token references...\n');

let totalFixes = 0;
files.forEach(file => {
  totalFixes += fixFile(file);
});

console.log(`\n✨ Done! Fixed ${totalFixes} quoted token references.`);
