const text = 'When cast, it does not drain Energy but consumes 200 Energy per sec.';

// Current pattern with negative lookahead
const pattern1 = /\b(drains?|steals?)\b[\s\S]{0,40}\benergy\b(?!\s+but\s+(?:consumes?|loses?))/i;

// Alternative: negative lookbehind for "does not"
const pattern2 = /(?<!does\s+not\s)\b(drains?|steals?)\b[\s\S]{0,40}\benergy\b/i;

// Better: exclude sentences with "does not"
const pattern3 = /\b(?<!\w\s+not\s)(drains?|steals?)\b[\s\S]{0,40}\benergy\b/i;

console.log('Text:', text);
console.log('\nPattern1 (negative lookahead for "but"):', pattern1.test(text), '->', text.match(pattern1)?.[0]);
console.log('Pattern2 (negative lookbehind):', pattern2.test(text), '->', text.match(pattern2)?.[0]);
console.log('Pattern3 (negative lookbehind v2):', pattern3.test(text), '->', text.match(pattern3)?.[0]);

// Test with legitimate drain
const legitText = 'Hela steals Energy from enemies';
console.log('\n--- Legitimate case: ---');
console.log('Text:', legitText);
console.log('Pattern1:', pattern1.test(legitText), '->', legitText.match(pattern1)?.[0]);
console.log('Pattern2:', pattern2.test(legitText), '->', legitText.match(pattern2)?.[0]);
console.log('Pattern3:', pattern3.test(legitText), '->', legitText.match(pattern3)?.[0]);
