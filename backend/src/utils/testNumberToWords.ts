// Test Number to Words Conversion
import { amountToWordsEnglish, amountToWordsArabic } from './numberToWords';

console.log('=== Testing Number to Words ===\n');

// Test case 1: 100.50 SAR
console.log('Test 1: 100.50 SAR');
console.log('English:', amountToWordsEnglish(100.50, 'SAR'));
console.log('Arabic:', amountToWordsArabic(100.50, 'SAR'));
console.log('');

// Test case 2: 1250.75 USD
console.log('Test 2: 1250.75 USD');
console.log('English:', amountToWordsEnglish(1250.75, 'USD'));
console.log('Arabic:', amountToWordsArabic(1250.75, 'USD'));
console.log('');

// Test case 3: 5000.00 AED
console.log('Test 3: 5000.00 AED');
console.log('English:', amountToWordsEnglish(5000, 'AED'));
console.log('Arabic:', amountToWordsArabic(5000, 'AED'));
console.log('');

// Test case 4: 999.99 EUR
console.log('Test 4: 999.99 EUR');
console.log('English:', amountToWordsEnglish(999.99, 'EUR'));
console.log('Arabic:', amountToWordsArabic(999.99, 'EUR'));
console.log('');

// Test case 5: 0.25 KWD (with 1000 subunits)
console.log('Test 5: 0.250 KWD');
console.log('English:', amountToWordsEnglish(0.250, 'KWD'));
console.log('Arabic:', amountToWordsArabic(0.250, 'KWD'));
