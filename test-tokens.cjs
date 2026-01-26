const { SEMANTIC_TOKENS } = require('../packages/shared-theme/dist/index.js');

console.log('=== Testing SEMANTIC_TOKENS ===');
console.log('glassFallback exists:', SEMANTIC_TOKENS.glassFallback !== undefined);
console.log('color exists:', SEMANTIC_TOKENS.color !== undefined);
console.log('color.bg exists:', SEMANTIC_TOKENS.color?.bg !== undefined);
console.log('color.text exists:', SEMANTIC_TOKENS.color?.text !== undefined);
console.log('color.bg.primary:', SEMANTIC_TOKENS.color?.bg?.primary);
console.log('color.text.primary:', SEMANTIC_TOKENS.color?.text?.primary);
