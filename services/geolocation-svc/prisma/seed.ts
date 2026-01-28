import 'dotenv/config';
import { PrismaClient } from '../generated/prisma-client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding geolocation data...');
  
  // Seed currencies
  await seedCurrencies();
  
  // Seed languages
  await seedLanguages();
  
  // Seed countries
  await seedCountries();
  
  // Seed regions (states/provinces)
  await seedRegions();
  
  // Seed curriculum frameworks
  await seedCurriculumFrameworks();
  
  // Seed payment provider regions
  await seedPaymentProviderRegions();
  
  // Seed compliance requirements
  await seedComplianceRequirements();
  
  console.log('Seeding complete!');
}

async function seedCurrencies() {
  console.log('Seeding currencies...');
  
  const currencies = [
    // Major currencies
    { code: 'USD', numericCode: '840', name: 'US Dollar', namePlural: 'US dollars', symbol: '$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'EUR', numericCode: '978', name: 'Euro', namePlural: 'euros', symbol: '€', symbolNative: '€', decimalDigits: 2, symbolPosition: 'AFTER' as const, spaceBetween: true },
    { code: 'GBP', numericCode: '826', name: 'British Pound', namePlural: 'British pounds', symbol: '£', symbolNative: '£', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'JPY', numericCode: '392', name: 'Japanese Yen', namePlural: 'Japanese yen', symbol: '¥', symbolNative: '¥', decimalDigits: 0, symbolPosition: 'BEFORE' as const },
    { code: 'CNY', numericCode: '156', name: 'Chinese Yuan', namePlural: 'Chinese yuan', symbol: 'CN¥', symbolNative: '¥', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'CAD', numericCode: '124', name: 'Canadian Dollar', namePlural: 'Canadian dollars', symbol: 'CA$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'AUD', numericCode: '036', name: 'Australian Dollar', namePlural: 'Australian dollars', symbol: 'AU$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'CHF', numericCode: '756', name: 'Swiss Franc', namePlural: 'Swiss francs', symbol: 'CHF', symbolNative: 'CHF', decimalDigits: 2, symbolPosition: 'BEFORE' as const, spaceBetween: true },
    
    // India
    { code: 'INR', numericCode: '356', name: 'Indian Rupee', namePlural: 'Indian rupees', symbol: '₹', symbolNative: '₹', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    
    // Africa
    { code: 'ZAR', numericCode: '710', name: 'South African Rand', namePlural: 'South African rand', symbol: 'R', symbolNative: 'R', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'NGN', numericCode: '566', name: 'Nigerian Naira', namePlural: 'Nigerian nairas', symbol: '₦', symbolNative: '₦', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'KES', numericCode: '404', name: 'Kenyan Shilling', namePlural: 'Kenyan shillings', symbol: 'Ksh', symbolNative: 'Ksh', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'GHS', numericCode: '936', name: 'Ghanaian Cedi', namePlural: 'Ghanaian cedis', symbol: 'GH₵', symbolNative: '₵', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'EGP', numericCode: '818', name: 'Egyptian Pound', namePlural: 'Egyptian pounds', symbol: 'E£', symbolNative: 'ج.م', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    
    // Middle East
    { code: 'AED', numericCode: '784', name: 'UAE Dirham', namePlural: 'UAE dirhams', symbol: 'AED', symbolNative: 'د.إ', decimalDigits: 2, symbolPosition: 'BEFORE' as const, spaceBetween: true },
    { code: 'SAR', numericCode: '682', name: 'Saudi Riyal', namePlural: 'Saudi riyals', symbol: 'SAR', symbolNative: 'ر.س', decimalDigits: 2, symbolPosition: 'BEFORE' as const, spaceBetween: true },
    { code: 'QAR', numericCode: '634', name: 'Qatari Riyal', namePlural: 'Qatari riyals', symbol: 'QAR', symbolNative: 'ر.ق', decimalDigits: 2, symbolPosition: 'BEFORE' as const, spaceBetween: true },
    { code: 'KWD', numericCode: '414', name: 'Kuwaiti Dinar', namePlural: 'Kuwaiti dinars', symbol: 'KD', symbolNative: 'د.ك', decimalDigits: 3, symbolPosition: 'BEFORE' as const, spaceBetween: true },
    { code: 'ILS', numericCode: '376', name: 'Israeli Shekel', namePlural: 'Israeli shekels', symbol: '₪', symbolNative: '₪', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    
    // Asia Pacific
    { code: 'SGD', numericCode: '702', name: 'Singapore Dollar', namePlural: 'Singapore dollars', symbol: 'S$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'HKD', numericCode: '344', name: 'Hong Kong Dollar', namePlural: 'Hong Kong dollars', symbol: 'HK$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'KRW', numericCode: '410', name: 'South Korean Won', namePlural: 'South Korean won', symbol: '₩', symbolNative: '₩', decimalDigits: 0, symbolPosition: 'BEFORE' as const },
    { code: 'TWD', numericCode: '901', name: 'Taiwan Dollar', namePlural: 'Taiwan dollars', symbol: 'NT$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'MYR', numericCode: '458', name: 'Malaysian Ringgit', namePlural: 'Malaysian ringgits', symbol: 'RM', symbolNative: 'RM', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'THB', numericCode: '764', name: 'Thai Baht', namePlural: 'Thai baht', symbol: '฿', symbolNative: '฿', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'IDR', numericCode: '360', name: 'Indonesian Rupiah', namePlural: 'Indonesian rupiahs', symbol: 'Rp', symbolNative: 'Rp', decimalDigits: 0, symbolPosition: 'BEFORE' as const },
    { code: 'PHP', numericCode: '608', name: 'Philippine Peso', namePlural: 'Philippine pesos', symbol: '₱', symbolNative: '₱', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'VND', numericCode: '704', name: 'Vietnamese Dong', namePlural: 'Vietnamese dong', symbol: '₫', symbolNative: '₫', decimalDigits: 0, symbolPosition: 'AFTER' as const },
    { code: 'NZD', numericCode: '554', name: 'New Zealand Dollar', namePlural: 'New Zealand dollars', symbol: 'NZ$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    
    // Latin America
    { code: 'BRL', numericCode: '986', name: 'Brazilian Real', namePlural: 'Brazilian reais', symbol: 'R$', symbolNative: 'R$', decimalDigits: 2, symbolPosition: 'BEFORE' as const, thousandsSeparator: '.', decimalSeparator: ',' },
    { code: 'MXN', numericCode: '484', name: 'Mexican Peso', namePlural: 'Mexican pesos', symbol: 'MX$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'ARS', numericCode: '032', name: 'Argentine Peso', namePlural: 'Argentine pesos', symbol: 'AR$', symbolNative: '$', decimalDigits: 2, symbolPosition: 'BEFORE' as const, thousandsSeparator: '.', decimalSeparator: ',' },
    { code: 'CLP', numericCode: '152', name: 'Chilean Peso', namePlural: 'Chilean pesos', symbol: 'CL$', symbolNative: '$', decimalDigits: 0, symbolPosition: 'BEFORE' as const },
    { code: 'COP', numericCode: '170', name: 'Colombian Peso', namePlural: 'Colombian pesos', symbol: 'CO$', symbolNative: '$', decimalDigits: 0, symbolPosition: 'BEFORE' as const, thousandsSeparator: '.', decimalSeparator: ',' },
    
    // Europe (non-EUR)
    { code: 'SEK', numericCode: '752', name: 'Swedish Krona', namePlural: 'Swedish kronor', symbol: 'kr', symbolNative: 'kr', decimalDigits: 2, symbolPosition: 'AFTER' as const, spaceBetween: true, thousandsSeparator: ' ', decimalSeparator: ',' },
    { code: 'NOK', numericCode: '578', name: 'Norwegian Krone', namePlural: 'Norwegian kroner', symbol: 'kr', symbolNative: 'kr', decimalDigits: 2, symbolPosition: 'AFTER' as const, spaceBetween: true, thousandsSeparator: ' ', decimalSeparator: ',' },
    { code: 'DKK', numericCode: '208', name: 'Danish Krone', namePlural: 'Danish kroner', symbol: 'kr', symbolNative: 'kr.', decimalDigits: 2, symbolPosition: 'AFTER' as const, spaceBetween: true, thousandsSeparator: '.', decimalSeparator: ',' },
    { code: 'PLN', numericCode: '985', name: 'Polish Zloty', namePlural: 'Polish zlotys', symbol: 'zł', symbolNative: 'zł', decimalDigits: 2, symbolPosition: 'AFTER' as const, spaceBetween: true, thousandsSeparator: ' ', decimalSeparator: ',' },
    { code: 'CZK', numericCode: '203', name: 'Czech Koruna', namePlural: 'Czech koruny', symbol: 'Kč', symbolNative: 'Kč', decimalDigits: 2, symbolPosition: 'AFTER' as const, spaceBetween: true, thousandsSeparator: ' ', decimalSeparator: ',' },
    { code: 'HUF', numericCode: '348', name: 'Hungarian Forint', namePlural: 'Hungarian forints', symbol: 'Ft', symbolNative: 'Ft', decimalDigits: 0, symbolPosition: 'AFTER' as const, spaceBetween: true, thousandsSeparator: ' ', decimalSeparator: ',' },
    { code: 'RON', numericCode: '946', name: 'Romanian Leu', namePlural: 'Romanian lei', symbol: 'lei', symbolNative: 'lei', decimalDigits: 2, symbolPosition: 'AFTER' as const, spaceBetween: true, thousandsSeparator: '.', decimalSeparator: ',' },
    { code: 'TRY', numericCode: '949', name: 'Turkish Lira', namePlural: 'Turkish liras', symbol: '₺', symbolNative: '₺', decimalDigits: 2, symbolPosition: 'BEFORE' as const },
    { code: 'RUB', numericCode: '643', name: 'Russian Ruble', namePlural: 'Russian rubles', symbol: '₽', symbolNative: '₽', decimalDigits: 2, symbolPosition: 'AFTER' as const, spaceBetween: true, thousandsSeparator: ' ', decimalSeparator: ',' },
  ];
  
  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: currency,
      create: {
        ...currency,
        exchangeRateToUSD: 1.0, // Default, should be updated by exchange rate service
        exchangeRateUpdatedAt: new Date(),
      },
    });
  }
  
  console.log(`Seeded ${currencies.length} currencies`);
}

async function seedLanguages() {
  console.log('Seeding languages...');
  
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', direction: 'LTR' as const, pluralCategories: ['one', 'other'] },
    { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', direction: 'LTR' as const, baseLanguage: 'en', pluralCategories: ['one', 'other'] },
    { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', direction: 'LTR' as const, baseLanguage: 'en', pluralCategories: ['one', 'other'] },
    { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', direction: 'LTR' as const, baseLanguage: 'en', pluralCategories: ['one', 'other'] },
    { code: 'en-CA', name: 'English (Canada)', nativeName: 'English (Canada)', direction: 'LTR' as const, baseLanguage: 'en', pluralCategories: ['one', 'other'] },
    { code: 'en-ZA', name: 'English (South Africa)', nativeName: 'English (South Africa)', direction: 'LTR' as const, baseLanguage: 'en', pluralCategories: ['one', 'other'] },
    
    { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'LTR' as const, pluralCategories: ['one', 'many', 'other'] },
    { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', direction: 'LTR' as const, baseLanguage: 'es', pluralCategories: ['one', 'many', 'other'] },
    { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', direction: 'LTR' as const, baseLanguage: 'es', pluralCategories: ['one', 'many', 'other'] },
    { code: 'es-AR', name: 'Spanish (Argentina)', nativeName: 'Español (Argentina)', direction: 'LTR' as const, baseLanguage: 'es', pluralCategories: ['one', 'many', 'other'] },
    
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'LTR' as const, pluralCategories: ['one', 'many', 'other'] },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', direction: 'LTR' as const, baseLanguage: 'pt', pluralCategories: ['one', 'many', 'other'] },
    { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', direction: 'LTR' as const, baseLanguage: 'pt', pluralCategories: ['one', 'many', 'other'] },
    
    { code: 'fr', name: 'French', nativeName: 'Français', direction: 'LTR' as const, pluralCategories: ['one', 'many', 'other'] },
    { code: 'fr-FR', name: 'French (France)', nativeName: 'Français (France)', direction: 'LTR' as const, baseLanguage: 'fr', pluralCategories: ['one', 'many', 'other'] },
    { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', direction: 'LTR' as const, baseLanguage: 'fr', pluralCategories: ['one', 'many', 'other'] },
    
    { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'LTR' as const, pluralCategories: ['one', 'other'] },
    { code: 'de-DE', name: 'German (Germany)', nativeName: 'Deutsch (Deutschland)', direction: 'LTR' as const, baseLanguage: 'de', pluralCategories: ['one', 'other'] },
    { code: 'de-AT', name: 'German (Austria)', nativeName: 'Deutsch (Österreich)', direction: 'LTR' as const, baseLanguage: 'de', pluralCategories: ['one', 'other'] },
    { code: 'de-CH', name: 'German (Switzerland)', nativeName: 'Deutsch (Schweiz)', direction: 'LTR' as const, baseLanguage: 'de', pluralCategories: ['one', 'other'] },
    
    { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'LTR' as const, pluralCategories: ['one', 'many', 'other'] },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'LTR' as const, pluralCategories: ['one', 'other'] },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'LTR' as const, pluralCategories: ['one', 'few', 'many', 'other'] },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'LTR' as const, script: 'Cyrillic', pluralCategories: ['one', 'few', 'many', 'other'] },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', direction: 'LTR' as const, script: 'Cyrillic', pluralCategories: ['one', 'few', 'many', 'other'] },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'LTR' as const, pluralCategories: ['one', 'other'] },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', direction: 'LTR' as const, script: 'Greek', pluralCategories: ['one', 'other'] },
    
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'RTL' as const, script: 'Arabic', pluralCategories: ['zero', 'one', 'two', 'few', 'many', 'other'] },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية (السعودية)', direction: 'RTL' as const, script: 'Arabic', baseLanguage: 'ar', pluralCategories: ['zero', 'one', 'two', 'few', 'many', 'other'] },
    { code: 'ar-AE', name: 'Arabic (UAE)', nativeName: 'العربية (الإمارات)', direction: 'RTL' as const, script: 'Arabic', baseLanguage: 'ar', pluralCategories: ['zero', 'one', 'two', 'few', 'many', 'other'] },
    { code: 'ar-EG', name: 'Arabic (Egypt)', nativeName: 'العربية (مصر)', direction: 'RTL' as const, script: 'Arabic', baseLanguage: 'ar', pluralCategories: ['zero', 'one', 'two', 'few', 'many', 'other'] },
    
    { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'RTL' as const, script: 'Hebrew', pluralCategories: ['one', 'two', 'many', 'other'] },
    { code: 'fa', name: 'Persian', nativeName: 'فارسی', direction: 'RTL' as const, script: 'Arabic', pluralCategories: ['one', 'other'] },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'RTL' as const, script: 'Arabic', pluralCategories: ['one', 'other'] },
    
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'LTR' as const, script: 'Devanagari', pluralCategories: ['one', 'other'] },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', direction: 'LTR' as const, script: 'Bengali', pluralCategories: ['one', 'other'] },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', direction: 'LTR' as const, script: 'Tamil', pluralCategories: ['one', 'other'] },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', direction: 'LTR' as const, script: 'Telugu', pluralCategories: ['one', 'other'] },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', direction: 'LTR' as const, script: 'Devanagari', pluralCategories: ['one', 'other'] },
    
    { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'LTR' as const, script: 'Han', pluralCategories: ['other'] },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'LTR' as const, script: 'Han', baseLanguage: 'zh', pluralCategories: ['other'] },
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'LTR' as const, script: 'Han', baseLanguage: 'zh', pluralCategories: ['other'] },
    { code: 'zh-HK', name: 'Chinese (Hong Kong)', nativeName: '中文（香港）', direction: 'LTR' as const, script: 'Han', baseLanguage: 'zh', pluralCategories: ['other'] },
    
    { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'LTR' as const, script: 'Japanese', pluralCategories: ['other'] },
    { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'LTR' as const, script: 'Korean', pluralCategories: ['other'] },
    
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'LTR' as const, pluralCategories: ['other'] },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'LTR' as const, script: 'Thai', pluralCategories: ['other'] },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'LTR' as const, pluralCategories: ['other'] },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', direction: 'LTR' as const, pluralCategories: ['other'] },
    { code: 'tl', name: 'Filipino', nativeName: 'Filipino', direction: 'LTR' as const, pluralCategories: ['one', 'other'] },
    
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', direction: 'LTR' as const, pluralCategories: ['one', 'other'] },
    { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', direction: 'LTR' as const, pluralCategories: ['one', 'other'] },
    { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', direction: 'LTR' as const, pluralCategories: ['one', 'other'] },
  ];
  
  for (const language of languages) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: language,
      create: language,
    });
  }
  
  console.log(`Seeded ${languages.length} languages`);
}

async function seedCountries() {
  console.log('Seeding countries...');
  
  const countries = [
    // North America
    {
      code: 'US', code3: 'USA', numericCode: '840', name: 'United States', nativeName: 'United States',
      region: 'Americas', subregion: 'Northern America',
      defaultLanguage: 'en-US', defaultCurrency: 'USD', defaultCurriculum: 'COMMON_CORE',
      supportedLanguages: ['en-US', 'es-MX'], supportedCurrencies: ['USD'], supportedCurricula: ['COMMON_CORE', 'NGSS', 'C3', 'TEKS'],
      timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'],
      primaryTimezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+1', hasLocalPayment: true, requiresCompliance: ['COPPA', 'FERPA']
    },
    {
      code: 'CA', code3: 'CAN', numericCode: '124', name: 'Canada', nativeName: 'Canada',
      region: 'Americas', subregion: 'Northern America',
      defaultLanguage: 'en-CA', defaultCurrency: 'CAD', defaultCurriculum: 'ONTARIO_CURRICULUM',
      supportedLanguages: ['en-CA', 'fr-CA'], supportedCurrencies: ['CAD'], supportedCurricula: ['ONTARIO_CURRICULUM', 'ALBERTA_PROGRAM', 'BC_CURRICULUM', 'QUEBEC_QEP'],
      timezones: ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax'],
      primaryTimezone: 'America/Toronto',
      dateFormat: 'YYYY-MM-DD', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+1', hasLocalPayment: true, requiresCompliance: ['PIPEDA']
    },
    {
      code: 'MX', code3: 'MEX', numericCode: '484', name: 'Mexico', nativeName: 'México',
      region: 'Americas', subregion: 'Central America',
      defaultLanguage: 'es-MX', defaultCurrency: 'MXN', defaultCurriculum: null,
      supportedLanguages: ['es-MX', 'en'], supportedCurrencies: ['MXN', 'USD'], supportedCurricula: [],
      timezones: ['America/Mexico_City', 'America/Tijuana', 'America/Cancun'],
      primaryTimezone: 'America/Mexico_City',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+52', hasLocalPayment: true, requiresCompliance: []
    },
    
    // Europe
    {
      code: 'GB', code3: 'GBR', numericCode: '826', name: 'United Kingdom', nativeName: 'United Kingdom',
      region: 'Europe', subregion: 'Northern Europe',
      defaultLanguage: 'en-GB', defaultCurrency: 'GBP', defaultCurriculum: 'UK_NATIONAL_CURRICULUM',
      supportedLanguages: ['en-GB', 'cy', 'gd'], supportedCurrencies: ['GBP'], supportedCurricula: ['UK_NATIONAL_CURRICULUM', 'CURRICULUM_FOR_EXCELLENCE', 'CURRICULUM_WALES', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY', 'IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['Europe/London'],
      primaryTimezone: 'Europe/London',
      dateFormat: 'DD/MM/YYYY', timeFormat: '24h', firstDayOfWeek: 1,
      dialCode: '+44', hasLocalPayment: true, requiresCompliance: ['UK_GDPR']
    },
    {
      code: 'DE', code3: 'DEU', numericCode: '276', name: 'Germany', nativeName: 'Deutschland',
      region: 'Europe', subregion: 'Western Europe',
      defaultLanguage: 'de-DE', defaultCurrency: 'EUR', defaultCurriculum: null,
      supportedLanguages: ['de-DE', 'en'], supportedCurrencies: ['EUR'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Europe/Berlin'],
      primaryTimezone: 'Europe/Berlin',
      dateFormat: 'DD.MM.YYYY', timeFormat: '24h', firstDayOfWeek: 1,
      dialCode: '+49', hasLocalPayment: true, requiresCompliance: ['GDPR']
    },
    {
      code: 'FR', code3: 'FRA', numericCode: '250', name: 'France', nativeName: 'France',
      region: 'Europe', subregion: 'Western Europe',
      defaultLanguage: 'fr-FR', defaultCurrency: 'EUR', defaultCurriculum: null,
      supportedLanguages: ['fr-FR', 'en'], supportedCurrencies: ['EUR'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['Europe/Paris'],
      primaryTimezone: 'Europe/Paris',
      dateFormat: 'DD/MM/YYYY', timeFormat: '24h', firstDayOfWeek: 1,
      dialCode: '+33', hasLocalPayment: true, requiresCompliance: ['GDPR']
    },
    {
      code: 'NL', code3: 'NLD', numericCode: '528', name: 'Netherlands', nativeName: 'Nederland',
      region: 'Europe', subregion: 'Western Europe',
      defaultLanguage: 'nl', defaultCurrency: 'EUR', defaultCurriculum: null,
      supportedLanguages: ['nl', 'en'], supportedCurrencies: ['EUR'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['Europe/Amsterdam'],
      primaryTimezone: 'Europe/Amsterdam',
      dateFormat: 'DD-MM-YYYY', timeFormat: '24h', firstDayOfWeek: 1,
      dialCode: '+31', hasLocalPayment: true, requiresCompliance: ['GDPR']
    },
    
    // Middle East
    {
      code: 'AE', code3: 'ARE', numericCode: '784', name: 'United Arab Emirates', nativeName: 'الإمارات العربية المتحدة',
      region: 'Asia', subregion: 'Western Asia',
      defaultLanguage: 'ar-AE', defaultCurrency: 'AED', defaultCurriculum: 'UAE_MOE',
      supportedLanguages: ['ar-AE', 'en'], supportedCurrencies: ['AED', 'USD'], supportedCurricula: ['UAE_MOE', 'ADEK', 'UK_NATIONAL_CURRICULUM', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY', 'CBSE', 'COMMON_CORE'],
      timezones: ['Asia/Dubai'],
      primaryTimezone: 'Asia/Dubai',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+971', hasLocalPayment: true, requiresCompliance: ['UAE_PDPL']
    },
    {
      code: 'SA', code3: 'SAU', numericCode: '682', name: 'Saudi Arabia', nativeName: 'المملكة العربية السعودية',
      region: 'Asia', subregion: 'Western Asia',
      defaultLanguage: 'ar-SA', defaultCurrency: 'SAR', defaultCurriculum: 'SAUDI_MOE',
      supportedLanguages: ['ar-SA', 'en'], supportedCurrencies: ['SAR', 'USD'], supportedCurricula: ['SAUDI_MOE', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Asia/Riyadh'],
      primaryTimezone: 'Asia/Riyadh',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+966', hasLocalPayment: true, requiresCompliance: []
    },
    {
      code: 'IL', code3: 'ISR', numericCode: '376', name: 'Israel', nativeName: 'ישראל',
      region: 'Asia', subregion: 'Western Asia',
      defaultLanguage: 'he', defaultCurrency: 'ILS', defaultCurriculum: null,
      supportedLanguages: ['he', 'ar', 'en'], supportedCurrencies: ['ILS', 'USD'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['Asia/Jerusalem'],
      primaryTimezone: 'Asia/Jerusalem',
      dateFormat: 'DD/MM/YYYY', timeFormat: '24h', firstDayOfWeek: 0,
      dialCode: '+972', hasLocalPayment: true, requiresCompliance: []
    },
    
    // Asia
    {
      code: 'IN', code3: 'IND', numericCode: '356', name: 'India', nativeName: 'भारत',
      region: 'Asia', subregion: 'Southern Asia',
      defaultLanguage: 'en', defaultCurrency: 'INR', defaultCurriculum: 'CBSE',
      supportedLanguages: ['en', 'hi', 'bn', 'ta', 'te', 'mr'], supportedCurrencies: ['INR'], supportedCurricula: ['CBSE', 'ICSE', 'STATE_BOARD_INDIA', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Asia/Kolkata'],
      primaryTimezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+91', hasLocalPayment: true, requiresCompliance: ['DPDP']
    },
    {
      code: 'CN', code3: 'CHN', numericCode: '156', name: 'China', nativeName: '中国',
      region: 'Asia', subregion: 'Eastern Asia',
      defaultLanguage: 'zh-CN', defaultCurrency: 'CNY', defaultCurriculum: 'CHINA_NATIONAL_CURRICULUM',
      supportedLanguages: ['zh-CN', 'en'], supportedCurrencies: ['CNY'], supportedCurricula: ['CHINA_NATIONAL_CURRICULUM', 'IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['Asia/Shanghai'],
      primaryTimezone: 'Asia/Shanghai',
      dateFormat: 'YYYY/MM/DD', timeFormat: '24h', firstDayOfWeek: 1,
      dialCode: '+86', hasLocalPayment: true, requiresCompliance: ['PIPL']
    },
    {
      code: 'JP', code3: 'JPN', numericCode: '392', name: 'Japan', nativeName: '日本',
      region: 'Asia', subregion: 'Eastern Asia',
      defaultLanguage: 'ja', defaultCurrency: 'JPY', defaultCurriculum: null,
      supportedLanguages: ['ja', 'en'], supportedCurrencies: ['JPY'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['Asia/Tokyo'],
      primaryTimezone: 'Asia/Tokyo',
      dateFormat: 'YYYY/MM/DD', timeFormat: '24h', firstDayOfWeek: 0,
      dialCode: '+81', hasLocalPayment: true, requiresCompliance: ['APPI']
    },
    {
      code: 'KR', code3: 'KOR', numericCode: '410', name: 'South Korea', nativeName: '대한민국',
      region: 'Asia', subregion: 'Eastern Asia',
      defaultLanguage: 'ko', defaultCurrency: 'KRW', defaultCurriculum: null,
      supportedLanguages: ['ko', 'en'], supportedCurrencies: ['KRW'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['Asia/Seoul'],
      primaryTimezone: 'Asia/Seoul',
      dateFormat: 'YYYY.MM.DD', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+82', hasLocalPayment: true, requiresCompliance: ['PIPA']
    },
    {
      code: 'SG', code3: 'SGP', numericCode: '702', name: 'Singapore', nativeName: 'Singapore',
      region: 'Asia', subregion: 'South-Eastern Asia',
      defaultLanguage: 'en', defaultCurrency: 'SGD', defaultCurriculum: null,
      supportedLanguages: ['en', 'zh-CN', 'ms', 'ta'], supportedCurrencies: ['SGD'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Asia/Singapore'],
      primaryTimezone: 'Asia/Singapore',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+65', hasLocalPayment: true, requiresCompliance: ['PDPA']
    },
    {
      code: 'ID', code3: 'IDN', numericCode: '360', name: 'Indonesia', nativeName: 'Indonesia',
      region: 'Asia', subregion: 'South-Eastern Asia',
      defaultLanguage: 'id', defaultCurrency: 'IDR', defaultCurriculum: null,
      supportedLanguages: ['id', 'en'], supportedCurrencies: ['IDR'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'],
      primaryTimezone: 'Asia/Jakarta',
      dateFormat: 'DD/MM/YYYY', timeFormat: '24h', firstDayOfWeek: 0,
      dialCode: '+62', hasLocalPayment: true, requiresCompliance: ['PDP_LAW']
    },
    
    // Africa
    {
      code: 'ZA', code3: 'ZAF', numericCode: '710', name: 'South Africa', nativeName: 'South Africa',
      region: 'Africa', subregion: 'Southern Africa',
      defaultLanguage: 'en-ZA', defaultCurrency: 'ZAR', defaultCurriculum: 'CAPS',
      supportedLanguages: ['en-ZA', 'af', 'zu'], supportedCurrencies: ['ZAR'], supportedCurricula: ['CAPS', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Africa/Johannesburg'],
      primaryTimezone: 'Africa/Johannesburg',
      dateFormat: 'YYYY/MM/DD', timeFormat: '24h', firstDayOfWeek: 0,
      dialCode: '+27', hasLocalPayment: true, requiresCompliance: ['POPIA']
    },
    {
      code: 'NG', code3: 'NGA', numericCode: '566', name: 'Nigeria', nativeName: 'Nigeria',
      region: 'Africa', subregion: 'Western Africa',
      defaultLanguage: 'en', defaultCurrency: 'NGN', defaultCurriculum: null,
      supportedLanguages: ['en'], supportedCurrencies: ['NGN', 'USD'], supportedCurricula: ['UK_NATIONAL_CURRICULUM', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Africa/Lagos'],
      primaryTimezone: 'Africa/Lagos',
      dateFormat: 'DD/MM/YYYY', timeFormat: '24h', firstDayOfWeek: 1,
      dialCode: '+234', hasLocalPayment: true, requiresCompliance: ['NDPR']
    },
    {
      code: 'KE', code3: 'KEN', numericCode: '404', name: 'Kenya', nativeName: 'Kenya',
      region: 'Africa', subregion: 'Eastern Africa',
      defaultLanguage: 'en', defaultCurrency: 'KES', defaultCurriculum: null,
      supportedLanguages: ['en', 'sw'], supportedCurrencies: ['KES'], supportedCurricula: ['UK_NATIONAL_CURRICULUM', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Africa/Nairobi'],
      primaryTimezone: 'Africa/Nairobi',
      dateFormat: 'DD/MM/YYYY', timeFormat: '24h', firstDayOfWeek: 0,
      dialCode: '+254', hasLocalPayment: true, requiresCompliance: ['DPA']
    },
    {
      code: 'GH', code3: 'GHA', numericCode: '288', name: 'Ghana', nativeName: 'Ghana',
      region: 'Africa', subregion: 'Western Africa',
      defaultLanguage: 'en', defaultCurrency: 'GHS', defaultCurriculum: null,
      supportedLanguages: ['en'], supportedCurrencies: ['GHS'], supportedCurricula: ['UK_NATIONAL_CURRICULUM', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Africa/Accra'],
      primaryTimezone: 'Africa/Accra',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 1,
      dialCode: '+233', hasLocalPayment: true, requiresCompliance: ['DPA']
    },
    {
      code: 'EG', code3: 'EGY', numericCode: '818', name: 'Egypt', nativeName: 'مصر',
      region: 'Africa', subregion: 'Northern Africa',
      defaultLanguage: 'ar-EG', defaultCurrency: 'EGP', defaultCurriculum: null,
      supportedLanguages: ['ar-EG', 'en'], supportedCurrencies: ['EGP', 'USD'], supportedCurricula: ['UK_NATIONAL_CURRICULUM', 'IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['Africa/Cairo'],
      primaryTimezone: 'Africa/Cairo',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+20', hasLocalPayment: false, requiresCompliance: []
    },
    
    // Oceania
    {
      code: 'AU', code3: 'AUS', numericCode: '036', name: 'Australia', nativeName: 'Australia',
      region: 'Oceania', subregion: 'Australia and New Zealand',
      defaultLanguage: 'en-AU', defaultCurrency: 'AUD', defaultCurriculum: 'AUSTRALIAN_CURRICULUM',
      supportedLanguages: ['en-AU'], supportedCurrencies: ['AUD'], supportedCurricula: ['AUSTRALIAN_CURRICULUM', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide'],
      primaryTimezone: 'Australia/Sydney',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 0,
      dialCode: '+61', hasLocalPayment: true, requiresCompliance: ['AUSTRALIAN_PRIVACY_ACT']
    },
    {
      code: 'NZ', code3: 'NZL', numericCode: '554', name: 'New Zealand', nativeName: 'New Zealand',
      region: 'Oceania', subregion: 'Australia and New Zealand',
      defaultLanguage: 'en', defaultCurrency: 'NZD', defaultCurriculum: 'NEW_ZEALAND_CURRICULUM',
      supportedLanguages: ['en', 'mi'], supportedCurrencies: ['NZD'], supportedCurricula: ['NEW_ZEALAND_CURRICULUM', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'],
      timezones: ['Pacific/Auckland'],
      primaryTimezone: 'Pacific/Auckland',
      dateFormat: 'DD/MM/YYYY', timeFormat: '12h', firstDayOfWeek: 1,
      dialCode: '+64', hasLocalPayment: true, requiresCompliance: ['PRIVACY_ACT_2020']
    },
    
    // South America
    {
      code: 'BR', code3: 'BRA', numericCode: '076', name: 'Brazil', nativeName: 'Brasil',
      region: 'Americas', subregion: 'South America',
      defaultLanguage: 'pt-BR', defaultCurrency: 'BRL', defaultCurriculum: null,
      supportedLanguages: ['pt-BR', 'en'], supportedCurrencies: ['BRL'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['America/Sao_Paulo', 'America/Manaus', 'America/Fortaleza'],
      primaryTimezone: 'America/Sao_Paulo',
      dateFormat: 'DD/MM/YYYY', timeFormat: '24h', firstDayOfWeek: 0,
      dialCode: '+55', hasLocalPayment: true, requiresCompliance: ['LGPD']
    },
    {
      code: 'AR', code3: 'ARG', numericCode: '032', name: 'Argentina', nativeName: 'Argentina',
      region: 'Americas', subregion: 'South America',
      defaultLanguage: 'es-AR', defaultCurrency: 'ARS', defaultCurriculum: null,
      supportedLanguages: ['es-AR', 'en'], supportedCurrencies: ['ARS', 'USD'], supportedCurricula: ['IB_PYP', 'IB_MYP', 'IB_DP'],
      timezones: ['America/Argentina/Buenos_Aires'],
      primaryTimezone: 'America/Argentina/Buenos_Aires',
      dateFormat: 'DD/MM/YYYY', timeFormat: '24h', firstDayOfWeek: 1,
      dialCode: '+54', hasLocalPayment: false, requiresCompliance: ['PDPL']
    },
  ];
  
  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: country,
      create: country,
    });
  }
  
  console.log(`Seeded ${countries.length} countries`);
}

async function seedRegions() {
  console.log('Seeding regions...');
  
  const regions = [
    // US States with specific curricula
    { countryCode: 'US', code: 'TX', name: 'Texas', defaultCurriculum: 'TEKS' },
    { countryCode: 'US', code: 'CA', name: 'California', defaultCurriculum: 'COMMON_CORE' },
    { countryCode: 'US', code: 'NY', name: 'New York', defaultCurriculum: 'COMMON_CORE' },
    { countryCode: 'US', code: 'FL', name: 'Florida', defaultCurriculum: 'COMMON_CORE' },
    
    // Canadian Provinces
    { countryCode: 'CA', code: 'ON', name: 'Ontario', nativeName: 'Ontario', defaultLanguage: 'en-CA', defaultCurriculum: 'ONTARIO_CURRICULUM' },
    { countryCode: 'CA', code: 'QC', name: 'Quebec', nativeName: 'Québec', defaultLanguage: 'fr-CA', defaultCurriculum: 'QUEBEC_QEP' },
    { countryCode: 'CA', code: 'BC', name: 'British Columbia', defaultCurriculum: 'BC_CURRICULUM' },
    { countryCode: 'CA', code: 'AB', name: 'Alberta', defaultCurriculum: 'ALBERTA_PROGRAM' },
    
    // UK Nations
    { countryCode: 'GB', code: 'ENG', name: 'England', defaultCurriculum: 'UK_NATIONAL_CURRICULUM' },
    { countryCode: 'GB', code: 'SCT', name: 'Scotland', defaultCurriculum: 'CURRICULUM_FOR_EXCELLENCE' },
    { countryCode: 'GB', code: 'WLS', name: 'Wales', defaultCurriculum: 'CURRICULUM_WALES' },
    { countryCode: 'GB', code: 'NIR', name: 'Northern Ireland', defaultCurriculum: 'NI_CURRICULUM' },
    
    // UAE Emirates
    { countryCode: 'AE', code: 'AUH', name: 'Abu Dhabi', nativeName: 'أبو ظبي', defaultCurriculum: 'ADEK' },
    { countryCode: 'AE', code: 'DXB', name: 'Dubai', nativeName: 'دبي', defaultCurriculum: 'UAE_MOE' },
    
    // Indian States
    { countryCode: 'IN', code: 'MH', name: 'Maharashtra', defaultCurriculum: 'STATE_BOARD_INDIA' },
    { countryCode: 'IN', code: 'KA', name: 'Karnataka', defaultCurriculum: 'STATE_BOARD_INDIA' },
    { countryCode: 'IN', code: 'TN', name: 'Tamil Nadu', defaultLanguage: 'ta', defaultCurriculum: 'STATE_BOARD_INDIA' },
    { countryCode: 'IN', code: 'DL', name: 'Delhi', defaultCurriculum: 'CBSE' },
    
    // Australian States
    { countryCode: 'AU', code: 'NSW', name: 'New South Wales', defaultCurriculum: 'AUSTRALIAN_CURRICULUM', timezone: 'Australia/Sydney' },
    { countryCode: 'AU', code: 'VIC', name: 'Victoria', defaultCurriculum: 'AUSTRALIAN_CURRICULUM', timezone: 'Australia/Melbourne' },
    { countryCode: 'AU', code: 'QLD', name: 'Queensland', defaultCurriculum: 'AUSTRALIAN_CURRICULUM', timezone: 'Australia/Brisbane' },
    { countryCode: 'AU', code: 'WA', name: 'Western Australia', defaultCurriculum: 'AUSTRALIAN_CURRICULUM', timezone: 'Australia/Perth' },
  ];
  
  for (const region of regions) {
    await prisma.region.upsert({
      where: { 
        countryCode_code: { 
          countryCode: region.countryCode, 
          code: region.code 
        } 
      },
      update: region,
      create: region,
    });
  }
  
  console.log(`Seeded ${regions.length} regions`);
}

async function seedCurriculumFrameworks() {
  console.log('Seeding curriculum frameworks...');
  
  const frameworks = [
    // United States
    {
      code: 'COMMON_CORE',
      name: 'Common Core State Standards',
      shortName: 'CCSS',
      countries: ['US'],
      type: 'NATIONAL' as const,
      governingBody: 'Common Core State Standards Initiative',
      website: 'http://www.corestandards.org/',
      ageRangeStart: 5,
      ageRangeEnd: 18,
      academicYearStart: 'August',
      academicYearEnd: 'May',
      gradeLevels: JSON.stringify([
        { level: 'K', name: 'Kindergarten', ageStart: 5, ageEnd: 6 },
        { level: '1', name: 'Grade 1', ageStart: 6, ageEnd: 7 },
        { level: '2', name: 'Grade 2', ageStart: 7, ageEnd: 8 },
        { level: '3', name: 'Grade 3', ageStart: 8, ageEnd: 9 },
        { level: '4', name: 'Grade 4', ageStart: 9, ageEnd: 10 },
        { level: '5', name: 'Grade 5', ageStart: 10, ageEnd: 11 },
        { level: '6', name: 'Grade 6', ageStart: 11, ageEnd: 12 },
        { level: '7', name: 'Grade 7', ageStart: 12, ageEnd: 13 },
        { level: '8', name: 'Grade 8', ageStart: 13, ageEnd: 14 },
        { level: '9', name: 'Grade 9', ageStart: 14, ageEnd: 15 },
        { level: '10', name: 'Grade 10', ageStart: 15, ageEnd: 16 },
        { level: '11', name: 'Grade 11', ageStart: 16, ageEnd: 17 },
        { level: '12', name: 'Grade 12', ageStart: 17, ageEnd: 18 },
      ]),
    },
    {
      code: 'NGSS',
      name: 'Next Generation Science Standards',
      shortName: 'NGSS',
      countries: ['US'],
      type: 'NATIONAL' as const,
      governingBody: 'Achieve, Inc.',
      website: 'https://www.nextgenscience.org/',
      ageRangeStart: 5,
      ageRangeEnd: 18,
      academicYearStart: 'August',
      academicYearEnd: 'May',
      gradeLevels: JSON.stringify([
        { level: 'K', name: 'Kindergarten', ageStart: 5, ageEnd: 6 },
        { level: '1', name: 'Grade 1', ageStart: 6, ageEnd: 7 },
        { level: '2', name: 'Grade 2', ageStart: 7, ageEnd: 8 },
        { level: '3', name: 'Grade 3', ageStart: 8, ageEnd: 9 },
        { level: '4', name: 'Grade 4', ageStart: 9, ageEnd: 10 },
        { level: '5', name: 'Grade 5', ageStart: 10, ageEnd: 11 },
        { level: 'MS', name: 'Middle School', ageStart: 11, ageEnd: 14 },
        { level: 'HS', name: 'High School', ageStart: 14, ageEnd: 18 },
      ]),
    },
    {
      code: 'TEKS',
      name: 'Texas Essential Knowledge and Skills',
      shortName: 'TEKS',
      countries: ['US'],
      regions: ['TX'],
      type: 'STATE_PROVINCIAL' as const,
      governingBody: 'Texas Education Agency',
      website: 'https://tea.texas.gov/academics/curriculum-standards/teks',
      ageRangeStart: 5,
      ageRangeEnd: 18,
      academicYearStart: 'August',
      academicYearEnd: 'May',
      gradeLevels: JSON.stringify([]),
    },
    
    // United Kingdom
    {
      code: 'UK_NATIONAL_CURRICULUM',
      name: 'National Curriculum for England',
      shortName: 'NC',
      countries: ['GB', 'NG', 'KE', 'GH', 'EG'],
      regions: ['ENG'],
      type: 'NATIONAL' as const,
      governingBody: 'Department for Education',
      website: 'https://www.gov.uk/government/collections/national-curriculum',
      ageRangeStart: 5,
      ageRangeEnd: 16,
      academicYearStart: 'September',
      academicYearEnd: 'July',
      gradeLevels: JSON.stringify([
        { level: 'R', name: 'Reception', ageStart: 4, ageEnd: 5 },
        { level: 'Y1', name: 'Year 1', ageStart: 5, ageEnd: 6, keyStage: 'KS1' },
        { level: 'Y2', name: 'Year 2', ageStart: 6, ageEnd: 7, keyStage: 'KS1' },
        { level: 'Y3', name: 'Year 3', ageStart: 7, ageEnd: 8, keyStage: 'KS2' },
        { level: 'Y4', name: 'Year 4', ageStart: 8, ageEnd: 9, keyStage: 'KS2' },
        { level: 'Y5', name: 'Year 5', ageStart: 9, ageEnd: 10, keyStage: 'KS2' },
        { level: 'Y6', name: 'Year 6', ageStart: 10, ageEnd: 11, keyStage: 'KS2' },
        { level: 'Y7', name: 'Year 7', ageStart: 11, ageEnd: 12, keyStage: 'KS3' },
        { level: 'Y8', name: 'Year 8', ageStart: 12, ageEnd: 13, keyStage: 'KS3' },
        { level: 'Y9', name: 'Year 9', ageStart: 13, ageEnd: 14, keyStage: 'KS3' },
        { level: 'Y10', name: 'Year 10', ageStart: 14, ageEnd: 15, keyStage: 'KS4' },
        { level: 'Y11', name: 'Year 11', ageStart: 15, ageEnd: 16, keyStage: 'KS4' },
      ]),
    },
    {
      code: 'CURRICULUM_FOR_EXCELLENCE',
      name: 'Curriculum for Excellence',
      shortName: 'CfE',
      countries: ['GB'],
      regions: ['SCT'],
      type: 'NATIONAL' as const,
      governingBody: 'Education Scotland',
      website: 'https://education.gov.scot/curriculum-for-excellence/',
      ageRangeStart: 3,
      ageRangeEnd: 18,
      academicYearStart: 'August',
      academicYearEnd: 'June',
      gradeLevels: JSON.stringify([]),
    },
    
    // India
    {
      code: 'CBSE',
      name: 'Central Board of Secondary Education',
      shortName: 'CBSE',
      countries: ['IN', 'AE'],
      type: 'NATIONAL' as const,
      governingBody: 'Central Board of Secondary Education, India',
      website: 'https://www.cbse.gov.in/',
      ageRangeStart: 6,
      ageRangeEnd: 18,
      academicYearStart: 'April',
      academicYearEnd: 'March',
      gradeLevels: JSON.stringify([
        { level: '1', name: 'Class 1', ageStart: 6, ageEnd: 7 },
        { level: '2', name: 'Class 2', ageStart: 7, ageEnd: 8 },
        { level: '3', name: 'Class 3', ageStart: 8, ageEnd: 9 },
        { level: '4', name: 'Class 4', ageStart: 9, ageEnd: 10 },
        { level: '5', name: 'Class 5', ageStart: 10, ageEnd: 11 },
        { level: '6', name: 'Class 6', ageStart: 11, ageEnd: 12 },
        { level: '7', name: 'Class 7', ageStart: 12, ageEnd: 13 },
        { level: '8', name: 'Class 8', ageStart: 13, ageEnd: 14 },
        { level: '9', name: 'Class 9', ageStart: 14, ageEnd: 15 },
        { level: '10', name: 'Class 10', ageStart: 15, ageEnd: 16 },
        { level: '11', name: 'Class 11', ageStart: 16, ageEnd: 17 },
        { level: '12', name: 'Class 12', ageStart: 17, ageEnd: 18 },
      ]),
    },
    {
      code: 'ICSE',
      name: 'Indian Certificate of Secondary Education',
      shortName: 'ICSE',
      countries: ['IN'],
      type: 'NATIONAL' as const,
      governingBody: 'Council for the Indian School Certificate Examinations',
      website: 'https://cisce.org/',
      ageRangeStart: 6,
      ageRangeEnd: 18,
      academicYearStart: 'April',
      academicYearEnd: 'March',
      gradeLevels: JSON.stringify([]),
    },
    
    // Canada
    {
      code: 'ONTARIO_CURRICULUM',
      name: 'Ontario Curriculum',
      shortName: 'ON',
      countries: ['CA'],
      regions: ['ON'],
      type: 'STATE_PROVINCIAL' as const,
      governingBody: 'Ontario Ministry of Education',
      website: 'https://www.ontario.ca/page/ontario-curriculum',
      ageRangeStart: 4,
      ageRangeEnd: 18,
      academicYearStart: 'September',
      academicYearEnd: 'June',
      gradeLevels: JSON.stringify([
        { level: 'JK', name: 'Junior Kindergarten', ageStart: 4, ageEnd: 5 },
        { level: 'SK', name: 'Senior Kindergarten', ageStart: 5, ageEnd: 6 },
        { level: '1', name: 'Grade 1', ageStart: 6, ageEnd: 7 },
        { level: '2', name: 'Grade 2', ageStart: 7, ageEnd: 8 },
        { level: '3', name: 'Grade 3', ageStart: 8, ageEnd: 9 },
        { level: '4', name: 'Grade 4', ageStart: 9, ageEnd: 10 },
        { level: '5', name: 'Grade 5', ageStart: 10, ageEnd: 11 },
        { level: '6', name: 'Grade 6', ageStart: 11, ageEnd: 12 },
        { level: '7', name: 'Grade 7', ageStart: 12, ageEnd: 13 },
        { level: '8', name: 'Grade 8', ageStart: 13, ageEnd: 14 },
        { level: '9', name: 'Grade 9', ageStart: 14, ageEnd: 15 },
        { level: '10', name: 'Grade 10', ageStart: 15, ageEnd: 16 },
        { level: '11', name: 'Grade 11', ageStart: 16, ageEnd: 17 },
        { level: '12', name: 'Grade 12', ageStart: 17, ageEnd: 18 },
      ]),
    },
    
    // UAE
    {
      code: 'UAE_MOE',
      name: 'UAE Ministry of Education Curriculum',
      shortName: 'MOE',
      countries: ['AE'],
      type: 'NATIONAL' as const,
      governingBody: 'UAE Ministry of Education',
      website: 'https://www.moe.gov.ae/',
      ageRangeStart: 4,
      ageRangeEnd: 18,
      academicYearStart: 'September',
      academicYearEnd: 'June',
      gradeLevels: JSON.stringify([]),
    },
    {
      code: 'ADEK',
      name: 'Abu Dhabi Education Curriculum',
      shortName: 'ADEK',
      countries: ['AE'],
      regions: ['AUH'],
      type: 'STATE_PROVINCIAL' as const,
      governingBody: 'Abu Dhabi Department of Education and Knowledge',
      website: 'https://www.adek.gov.ae/',
      ageRangeStart: 4,
      ageRangeEnd: 18,
      academicYearStart: 'September',
      academicYearEnd: 'June',
      gradeLevels: JSON.stringify([]),
    },
    
    // South Africa
    {
      code: 'CAPS',
      name: 'Curriculum and Assessment Policy Statement',
      shortName: 'CAPS',
      countries: ['ZA'],
      type: 'NATIONAL' as const,
      governingBody: 'South African Department of Basic Education',
      website: 'https://www.education.gov.za/',
      ageRangeStart: 5,
      ageRangeEnd: 18,
      academicYearStart: 'January',
      academicYearEnd: 'December',
      gradeLevels: JSON.stringify([
        { level: 'R', name: 'Grade R', ageStart: 5, ageEnd: 6, phase: 'Foundation' },
        { level: '1', name: 'Grade 1', ageStart: 6, ageEnd: 7, phase: 'Foundation' },
        { level: '2', name: 'Grade 2', ageStart: 7, ageEnd: 8, phase: 'Foundation' },
        { level: '3', name: 'Grade 3', ageStart: 8, ageEnd: 9, phase: 'Foundation' },
        { level: '4', name: 'Grade 4', ageStart: 9, ageEnd: 10, phase: 'Intermediate' },
        { level: '5', name: 'Grade 5', ageStart: 10, ageEnd: 11, phase: 'Intermediate' },
        { level: '6', name: 'Grade 6', ageStart: 11, ageEnd: 12, phase: 'Intermediate' },
        { level: '7', name: 'Grade 7', ageStart: 12, ageEnd: 13, phase: 'Senior' },
        { level: '8', name: 'Grade 8', ageStart: 13, ageEnd: 14, phase: 'Senior' },
        { level: '9', name: 'Grade 9', ageStart: 14, ageEnd: 15, phase: 'Senior' },
        { level: '10', name: 'Grade 10', ageStart: 15, ageEnd: 16, phase: 'FET' },
        { level: '11', name: 'Grade 11', ageStart: 16, ageEnd: 17, phase: 'FET' },
        { level: '12', name: 'Grade 12', ageStart: 17, ageEnd: 18, phase: 'FET' },
      ]),
    },
    
    // Australia
    {
      code: 'AUSTRALIAN_CURRICULUM',
      name: 'Australian Curriculum',
      shortName: 'AC',
      countries: ['AU'],
      type: 'NATIONAL' as const,
      governingBody: 'Australian Curriculum, Assessment and Reporting Authority (ACARA)',
      website: 'https://www.australiancurriculum.edu.au/',
      ageRangeStart: 5,
      ageRangeEnd: 18,
      academicYearStart: 'February',
      academicYearEnd: 'December',
      gradeLevels: JSON.stringify([
        { level: 'F', name: 'Foundation', ageStart: 5, ageEnd: 6 },
        { level: '1', name: 'Year 1', ageStart: 6, ageEnd: 7 },
        { level: '2', name: 'Year 2', ageStart: 7, ageEnd: 8 },
        { level: '3', name: 'Year 3', ageStart: 8, ageEnd: 9 },
        { level: '4', name: 'Year 4', ageStart: 9, ageEnd: 10 },
        { level: '5', name: 'Year 5', ageStart: 10, ageEnd: 11 },
        { level: '6', name: 'Year 6', ageStart: 11, ageEnd: 12 },
        { level: '7', name: 'Year 7', ageStart: 12, ageEnd: 13 },
        { level: '8', name: 'Year 8', ageStart: 13, ageEnd: 14 },
        { level: '9', name: 'Year 9', ageStart: 14, ageEnd: 15 },
        { level: '10', name: 'Year 10', ageStart: 15, ageEnd: 16 },
        { level: '11', name: 'Year 11', ageStart: 16, ageEnd: 17 },
        { level: '12', name: 'Year 12', ageStart: 17, ageEnd: 18 },
      ]),
    },
    
    // International
    {
      code: 'IB_PYP',
      name: 'International Baccalaureate Primary Years Programme',
      shortName: 'IB PYP',
      countries: ['US', 'GB', 'AE', 'SA', 'IN', 'CN', 'SG', 'AU', 'NZ', 'ZA', 'NG', 'KE', 'BR', 'DE', 'FR', 'NL', 'JP', 'KR'],
      type: 'INTERNATIONAL' as const,
      governingBody: 'International Baccalaureate Organization',
      website: 'https://www.ibo.org/programmes/primary-years-programme/',
      ageRangeStart: 3,
      ageRangeEnd: 12,
      academicYearStart: 'August',
      academicYearEnd: 'June',
      gradeLevels: JSON.stringify([]),
    },
    {
      code: 'IB_MYP',
      name: 'International Baccalaureate Middle Years Programme',
      shortName: 'IB MYP',
      countries: ['US', 'GB', 'AE', 'SA', 'IN', 'CN', 'SG', 'AU', 'NZ', 'ZA', 'NG', 'KE', 'BR', 'DE', 'FR', 'NL', 'JP', 'KR'],
      type: 'INTERNATIONAL' as const,
      governingBody: 'International Baccalaureate Organization',
      website: 'https://www.ibo.org/programmes/middle-years-programme/',
      ageRangeStart: 11,
      ageRangeEnd: 16,
      academicYearStart: 'August',
      academicYearEnd: 'June',
      gradeLevels: JSON.stringify([]),
    },
    {
      code: 'IB_DP',
      name: 'International Baccalaureate Diploma Programme',
      shortName: 'IB DP',
      countries: ['US', 'GB', 'AE', 'SA', 'IN', 'CN', 'SG', 'AU', 'NZ', 'ZA', 'NG', 'KE', 'BR', 'DE', 'FR', 'NL', 'JP', 'KR'],
      type: 'INTERNATIONAL' as const,
      governingBody: 'International Baccalaureate Organization',
      website: 'https://www.ibo.org/programmes/diploma-programme/',
      ageRangeStart: 16,
      ageRangeEnd: 19,
      academicYearStart: 'August',
      academicYearEnd: 'May',
      gradeLevels: JSON.stringify([]),
    },
    {
      code: 'CAMBRIDGE_PRIMARY',
      name: 'Cambridge Primary',
      shortName: 'CP',
      countries: ['GB', 'AE', 'SA', 'IN', 'SG', 'AU', 'NZ', 'ZA', 'NG', 'KE', 'GH', 'ID'],
      type: 'INTERNATIONAL' as const,
      governingBody: 'Cambridge Assessment International Education',
      website: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-primary/',
      ageRangeStart: 5,
      ageRangeEnd: 11,
      academicYearStart: 'September',
      academicYearEnd: 'July',
      gradeLevels: JSON.stringify([]),
    },
    {
      code: 'CAMBRIDGE_SECONDARY',
      name: 'Cambridge Lower Secondary & IGCSE',
      shortName: 'IGCSE',
      countries: ['GB', 'AE', 'SA', 'IN', 'SG', 'AU', 'NZ', 'ZA', 'NG', 'KE', 'GH', 'ID'],
      type: 'INTERNATIONAL' as const,
      governingBody: 'Cambridge Assessment International Education',
      website: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse/',
      ageRangeStart: 11,
      ageRangeEnd: 16,
      academicYearStart: 'September',
      academicYearEnd: 'July',
      gradeLevels: JSON.stringify([]),
    },
  ];
  
  for (const framework of frameworks) {
    await prisma.curriculumFramework.upsert({
      where: { code: framework.code },
      update: framework,
      create: framework,
    });
  }
  
  console.log(`Seeded ${frameworks.length} curriculum frameworks`);
}

async function seedPaymentProviderRegions() {
  console.log('Seeding payment provider regions...');
  
  const providerRegions = [
    // Stripe (Global)
    { providerCode: 'STRIPE', countryCode: 'US', supportedCurrencies: ['USD'], supportedMethods: ['card', 'ach_debit', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'CA', supportedCurrencies: ['CAD', 'USD'], supportedMethods: ['card', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'GB', supportedCurrencies: ['GBP', 'EUR', 'USD'], supportedMethods: ['card', 'bacs_debit', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'DE', supportedCurrencies: ['EUR'], supportedMethods: ['card', 'sepa_debit', 'giropay', 'sofort', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'FR', supportedCurrencies: ['EUR'], supportedMethods: ['card', 'sepa_debit', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'NL', supportedCurrencies: ['EUR'], supportedMethods: ['card', 'sepa_debit', 'ideal', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'AU', supportedCurrencies: ['AUD'], supportedMethods: ['card', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'NZ', supportedCurrencies: ['NZD'], supportedMethods: ['card', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'SG', supportedCurrencies: ['SGD', 'USD'], supportedMethods: ['card', 'paynow', 'grabpay', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'JP', supportedCurrencies: ['JPY'], supportedMethods: ['card', 'konbini', 'apple_pay', 'google_pay'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'BR', supportedCurrencies: ['BRL'], supportedMethods: ['card', 'boleto', 'pix'], priority: 2 },
    { providerCode: 'STRIPE', countryCode: 'MX', supportedCurrencies: ['MXN'], supportedMethods: ['card', 'oxxo'], priority: 1 },
    { providerCode: 'STRIPE', countryCode: 'AE', supportedCurrencies: ['AED', 'USD'], supportedMethods: ['card', 'apple_pay', 'google_pay'], priority: 2 },
    { providerCode: 'STRIPE', countryCode: 'IN', supportedCurrencies: ['INR'], supportedMethods: ['card'], priority: 2 },
    
    // Paystack (Africa)
    { providerCode: 'PAYSTACK', countryCode: 'ZA', supportedCurrencies: ['ZAR'], supportedMethods: ['card', 'eft', 'bank_transfer'], priority: 1 },
    { providerCode: 'PAYSTACK', countryCode: 'NG', supportedCurrencies: ['NGN'], supportedMethods: ['card', 'bank_transfer', 'ussd'], priority: 1 },
    { providerCode: 'PAYSTACK', countryCode: 'GH', supportedCurrencies: ['GHS'], supportedMethods: ['card', 'mobile_money', 'bank_transfer'], priority: 1 },
    { providerCode: 'PAYSTACK', countryCode: 'KE', supportedCurrencies: ['KES'], supportedMethods: ['card', 'mpesa', 'bank_transfer'], priority: 1 },
    
    // Razorpay (India)
    { providerCode: 'RAZORPAY', countryCode: 'IN', supportedCurrencies: ['INR'], supportedMethods: ['card', 'upi', 'netbanking', 'wallet'], priority: 1 },
    
    // Tap (Middle East)
    { providerCode: 'TAP', countryCode: 'AE', supportedCurrencies: ['AED', 'USD'], supportedMethods: ['card', 'apple_pay', 'mada'], priority: 1 },
    { providerCode: 'TAP', countryCode: 'SA', supportedCurrencies: ['SAR'], supportedMethods: ['card', 'mada', 'apple_pay'], priority: 1 },
    
    // Midtrans (Indonesia)
    { providerCode: 'MIDTRANS', countryCode: 'ID', supportedCurrencies: ['IDR'], supportedMethods: ['card', 'gopay', 'ovo', 'dana', 'bank_transfer'], priority: 1 },
    
    // PagSeguro (Brazil)
    { providerCode: 'PAGSEGURO', countryCode: 'BR', supportedCurrencies: ['BRL'], supportedMethods: ['card', 'pix', 'boleto'], priority: 1 },
    
    // Alipay & WeChat Pay (China)
    { providerCode: 'ALIPAY', countryCode: 'CN', supportedCurrencies: ['CNY'], supportedMethods: ['alipay'], priority: 1 },
    { providerCode: 'WECHAT_PAY', countryCode: 'CN', supportedCurrencies: ['CNY'], supportedMethods: ['wechat_pay'], priority: 2 },
  ];
  
  for (const region of providerRegions) {
    await prisma.paymentProviderRegion.upsert({
      where: { 
        providerCode_countryCode: { 
          providerCode: region.providerCode, 
          countryCode: region.countryCode 
        } 
      },
      update: region,
      create: region,
    });
  }
  
  console.log(`Seeded ${providerRegions.length} payment provider regions`);
}

async function seedComplianceRequirements() {
  console.log('Seeding compliance requirements...');
  
  const requirements = [
    {
      code: 'GDPR',
      name: 'General Data Protection Regulation',
      description: 'EU regulation on data protection and privacy',
      countries: ['DE', 'FR', 'NL', 'IT', 'ES', 'PT', 'BE', 'AT', 'IE', 'PL', 'SE', 'DK', 'FI', 'NO', 'CZ', 'HU', 'RO', 'BG', 'GR'],
      dataResidencyRequired: false,
      consentRequired: true,
      deletionRequired: true,
      portabilityRequired: true,
      dpoRequired: true,
      minConsentAge: 16,
      parentalConsentAge: 18,
      effectiveDate: new Date('2018-05-25'),
    },
    {
      code: 'UK_GDPR',
      name: 'UK General Data Protection Regulation',
      description: 'UK version of GDPR post-Brexit',
      countries: ['GB'],
      dataResidencyRequired: false,
      consentRequired: true,
      deletionRequired: true,
      portabilityRequired: true,
      dpoRequired: true,
      minConsentAge: 13,
      parentalConsentAge: 18,
      effectiveDate: new Date('2021-01-01'),
    },
    {
      code: 'POPIA',
      name: 'Protection of Personal Information Act',
      description: 'South African data protection law',
      countries: ['ZA'],
      dataResidencyRequired: false,
      consentRequired: true,
      deletionRequired: true,
      portabilityRequired: true,
      dpoRequired: true,
      minConsentAge: 18,
      parentalConsentAge: 18,
      effectiveDate: new Date('2021-07-01'),
    },
    {
      code: 'LGPD',
      name: 'Lei Geral de Proteção de Dados',
      description: 'Brazilian data protection law',
      countries: ['BR'],
      dataResidencyRequired: false,
      consentRequired: true,
      deletionRequired: true,
      portabilityRequired: true,
      dpoRequired: true,
      minConsentAge: 12,
      parentalConsentAge: 18,
      effectiveDate: new Date('2020-09-18'),
    },
    {
      code: 'DPDP',
      name: 'Digital Personal Data Protection Act',
      description: 'Indian data protection law',
      countries: ['IN'],
      dataResidencyRequired: true,
      consentRequired: true,
      deletionRequired: true,
      portabilityRequired: false,
      dpoRequired: true,
      minConsentAge: 18,
      parentalConsentAge: 18,
      effectiveDate: new Date('2023-08-11'),
    },
    {
      code: 'PIPL',
      name: 'Personal Information Protection Law',
      description: 'Chinese data protection law',
      countries: ['CN'],
      dataResidencyRequired: true,
      consentRequired: true,
      deletionRequired: true,
      portabilityRequired: true,
      dpoRequired: true,
      minConsentAge: 14,
      parentalConsentAge: 18,
      effectiveDate: new Date('2021-11-01'),
    },
    {
      code: 'COPPA',
      name: "Children's Online Privacy Protection Act",
      description: 'US law protecting children under 13 online',
      countries: ['US'],
      dataResidencyRequired: false,
      consentRequired: true,
      deletionRequired: true,
      portabilityRequired: false,
      dpoRequired: false,
      minConsentAge: 13,
      parentalConsentAge: 13,
      effectiveDate: new Date('2000-04-21'),
    },
    {
      code: 'FERPA',
      name: 'Family Educational Rights and Privacy Act',
      description: 'US law protecting student education records',
      countries: ['US'],
      dataResidencyRequired: false,
      consentRequired: true,
      deletionRequired: false,
      portabilityRequired: true,
      dpoRequired: false,
      minConsentAge: 18,
      parentalConsentAge: 18,
      effectiveDate: new Date('1974-08-21'),
    },
    {
      code: 'PIPEDA',
      name: 'Personal Information Protection and Electronic Documents Act',
      description: 'Canadian federal privacy law',
      countries: ['CA'],
      dataResidencyRequired: false,
      consentRequired: true,
      deletionRequired: true,
      portabilityRequired: false,
      dpoRequired: false,
      minConsentAge: 13,
      parentalConsentAge: 18,
      effectiveDate: new Date('2001-01-01'),
    },
  ];
  
  for (const req of requirements) {
    await prisma.complianceRequirement.upsert({
      where: { code: req.code },
      update: req,
      create: req,
    });
  }
  
  console.log(`Seeded ${requirements.length} compliance requirements`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
