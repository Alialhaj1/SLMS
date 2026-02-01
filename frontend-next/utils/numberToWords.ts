/**
 * Number to Words Converter (Arabic & English) - Frontend
 * Converts numbers to written words with currency support
 */

// Currency configurations with main unit and subunit
export const CURRENCY_CONFIG: Record<string, { 
  main: { en: string; ar: string; enPlural: string; arPlural: string };
  sub: { en: string; ar: string; enPlural: string; arPlural: string };
  subunitPerMain: number;
}> = {
  'SAR': {
    main: { en: 'Riyal', ar: 'ريال', enPlural: 'Riyals', arPlural: 'ريالات' },
    sub: { en: 'Halala', ar: 'هللة', enPlural: 'Halalas', arPlural: 'هللات' },
    subunitPerMain: 100
  },
  'USD': {
    main: { en: 'Dollar', ar: 'دولار', enPlural: 'Dollars', arPlural: 'دولارات' },
    sub: { en: 'Cent', ar: 'سنت', enPlural: 'Cents', arPlural: 'سنتات' },
    subunitPerMain: 100
  },
  'EUR': {
    main: { en: 'Euro', ar: 'يورو', enPlural: 'Euros', arPlural: 'يوروهات' },
    sub: { en: 'Cent', ar: 'سنت', enPlural: 'Cents', arPlural: 'سنتات' },
    subunitPerMain: 100
  },
  'GBP': {
    main: { en: 'Pound', ar: 'جنيه', enPlural: 'Pounds', arPlural: 'جنيهات' },
    sub: { en: 'Penny', ar: 'بنس', enPlural: 'Pence', arPlural: 'بنسات' },
    subunitPerMain: 100
  },
  'AED': {
    main: { en: 'Dirham', ar: 'درهم', enPlural: 'Dirhams', arPlural: 'دراهم' },
    sub: { en: 'Fils', ar: 'فلس', enPlural: 'Fils', arPlural: 'فلوس' },
    subunitPerMain: 100
  },
  'KWD': {
    main: { en: 'Dinar', ar: 'دينار', enPlural: 'Dinars', arPlural: 'دنانير' },
    sub: { en: 'Fils', ar: 'فلس', enPlural: 'Fils', arPlural: 'فلوس' },
    subunitPerMain: 1000
  },
  'BHD': {
    main: { en: 'Dinar', ar: 'دينار', enPlural: 'Dinars', arPlural: 'دنانير' },
    sub: { en: 'Fils', ar: 'فلس', enPlural: 'Fils', arPlural: 'فلوس' },
    subunitPerMain: 1000
  },
  'OMR': {
    main: { en: 'Rial', ar: 'ريال', enPlural: 'Rials', arPlural: 'ريالات' },
    sub: { en: 'Baisa', ar: 'بيسة', enPlural: 'Baisa', arPlural: 'بيسات' },
    subunitPerMain: 1000
  },
  'QAR': {
    main: { en: 'Riyal', ar: 'ريال', enPlural: 'Riyals', arPlural: 'ريالات' },
    sub: { en: 'Dirham', ar: 'درهم', enPlural: 'Dirhams', arPlural: 'دراهم' },
    subunitPerMain: 100
  },
  'JOD': {
    main: { en: 'Dinar', ar: 'دينار', enPlural: 'Dinars', arPlural: 'دنانير' },
    sub: { en: 'Fils', ar: 'فلس', enPlural: 'Fils', arPlural: 'فلوس' },
    subunitPerMain: 1000
  }
};

// =====================================================
// ENGLISH NUMBER TO WORDS
// =====================================================
const ONES_EN = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TEENS_EN = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS_EN = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES_EN = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertGroupEN(num: number): string {
  if (num === 0) return '';
  
  let result = '';
  
  // Hundreds
  const hundreds = Math.floor(num / 100);
  if (hundreds > 0) {
    result += ONES_EN[hundreds] + ' Hundred';
    if (num % 100 !== 0) result += ' and ';
  }
  
  const remainder = num % 100;
  
  // Tens and ones
  if (remainder >= 10 && remainder < 20) {
    result += TEENS_EN[remainder - 10];
  } else {
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;
    
    if (tens > 0) result += TENS_EN[tens];
    if (tens > 0 && ones > 0) result += '-';
    if (ones > 0) result += ONES_EN[ones];
  }
  
  return result;
}

export function numberToEnglish(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToEnglish(-num);
  
  const groups: string[] = [];
  let scaleIndex = 0;
  
  while (num > 0) {
    const group = num % 1000;
    if (group !== 0) {
      const groupText = convertGroupEN(group);
      const scale = SCALES_EN[scaleIndex];
      groups.unshift(groupText + (scale ? ' ' + scale : ''));
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }
  
  return groups.join(', ');
}

// =====================================================
// ARABIC NUMBER TO WORDS
// =====================================================
const ONES_AR = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const ONES_AR_FEMININE = ['', 'واحدة', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع'];
const TEENS_AR = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS_AR = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS_AR = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertGroupAR(num: number, useFeminine: boolean = false): string {
  if (num === 0) return '';
  
  let result = '';
  const ones = useFeminine ? ONES_AR_FEMININE : ONES_AR;
  
  // Hundreds
  const hundreds = Math.floor(num / 100);
  if (hundreds > 0) {
    result += HUNDREDS_AR[hundreds];
  }
  
  const remainder = num % 100;
  
  if (remainder >= 10 && remainder < 20) {
    if (result) result += ' و';
    result += TEENS_AR[remainder - 10];
  } else {
    const tens = Math.floor(remainder / 10);
    const onesDigit = remainder % 10;
    
    if (tens > 0 || onesDigit > 0) {
      if (result) result += ' و';
    }
    
    if (onesDigit > 0) {
      result += ones[onesDigit];
      if (tens > 0) result += ' و';
    }
    
    if (tens > 0) {
      result += TENS_AR[tens];
    }
  }
  
  return result;
}

export function numberToArabic(num: number, useFeminine: boolean = false): string {
  if (num === 0) return 'صفر';
  if (num < 0) return 'سالب ' + numberToArabic(-num, useFeminine);
  
  if (num < 3) {
    return useFeminine ? ONES_AR_FEMININE[num] : ONES_AR[num];
  }
  
  if (num < 100) {
    return convertGroupAR(num, useFeminine);
  }
  
  if (num < 1000) {
    return convertGroupAR(num, useFeminine);
  }
  
  // Thousands
  if (num < 1000000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    
    let result = '';
    
    if (thousands === 1) {
      result = 'ألف';
    } else if (thousands === 2) {
      result = 'ألفان';
    } else if (thousands <= 10) {
      result = convertGroupAR(thousands, useFeminine) + ' آلاف';
    } else {
      result = convertGroupAR(thousands, useFeminine) + ' ألف';
    }
    
    if (remainder > 0) {
      result += ' و' + convertGroupAR(remainder, useFeminine);
    }
    
    return result;
  }
  
  // Millions
  if (num < 1000000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    
    let result = '';
    
    if (millions === 1) {
      result = 'مليون';
    } else if (millions === 2) {
      result = 'مليونان';
    } else if (millions <= 10) {
      result = convertGroupAR(millions, useFeminine) + ' ملايين';
    } else {
      result = convertGroupAR(millions, useFeminine) + ' مليون';
    }
    
    if (remainder > 0) {
      result += ' و' + numberToArabic(remainder, useFeminine);
    }
    
    return result;
  }
  
  return num.toString(); // Fallback for very large numbers
}

// =====================================================
// CURRENCY CONVERSION
// =====================================================
export function amountToWordsEnglish(amount: number, currencyCode: string): string {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG['SAR'];
  
  const mainAmount = Math.floor(amount);
  const subAmount = Math.round((amount - mainAmount) * config.subunitPerMain);
  
  let result = '';
  
  if (mainAmount > 0) {
    result += numberToEnglish(mainAmount);
    result += ' ' + (mainAmount === 1 ? config.main.en : config.main.enPlural);
  }
  
  if (subAmount > 0) {
    if (result) result += ' and ';
    result += numberToEnglish(subAmount);
    result += ' ' + (subAmount === 1 ? config.sub.en : config.sub.enPlural);
  }
  
  if (result === '') result = 'Zero ' + config.main.enPlural;
  
  return result;
}

export function amountToWordsArabic(amount: number, currencyCode: string): string {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG['SAR'];
  
  const mainAmount = Math.floor(amount);
  const subAmount = Math.round((amount - mainAmount) * config.subunitPerMain);
  
  let result = '';
  
  if (mainAmount > 0) {
    // Determine if currency is feminine (most Arabic currencies are masculine)
    const isFeminine = false;
    result += numberToArabic(mainAmount, isFeminine);
    
    // Handle currency name based on number
    if (mainAmount === 1) {
      result += ' ' + config.main.ar;
    } else if (mainAmount === 2) {
      result += ' ' + config.main.ar + 'ان';
    } else if (mainAmount >= 3 && mainAmount <= 10) {
      result += ' ' + config.main.arPlural;
    } else {
      result += ' ' + config.main.ar;
    }
  }
  
  if (subAmount > 0) {
    if (result) result += ' و';
    
    const isFeminine = config.sub.ar === 'هللة' || config.sub.ar === 'بيسة'; // Feminine subunits
    result += numberToArabic(subAmount, isFeminine);
    
    // Handle subunit name based on number
    if (subAmount === 1) {
      result += ' ' + config.sub.ar;
    } else if (subAmount === 2) {
      result += ' ' + config.sub.ar + (isFeminine ? 'تان' : 'ان');
    } else if (subAmount >= 3 && subAmount <= 10) {
      result += ' ' + config.sub.arPlural;
    } else {
      result += ' ' + config.sub.ar;
    }
  }
  
  if (result === '') result = 'صفر ' + config.main.ar;
  
  return result;
}

// Main export function
export function amountToWords(amount: number, currencyCode: string, language: 'en' | 'ar' = 'en'): string {
  if (language === 'ar') {
    return amountToWordsArabic(amount, currencyCode);
  }
  return amountToWordsEnglish(amount, currencyCode);
}
