/**
 * Advanced Internationalization Configuration
 * Student Pass System - Global Edition
 */

import i18next from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Supported languages with full localization
const SUPPORTED_LANGUAGES = {
  en: {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US',
    region: 'US',
    compliance: ['FERPA', 'COPPA']
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'es-ES',
    region: 'ES',
    compliance: ['GDPR', 'LOPD']
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'fr-FR',
    region: 'FR',
    compliance: ['GDPR', 'CNIL']
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'de-DE',
    region: 'DE',
    compliance: ['GDPR', 'BDSG']
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    currency: 'SAR',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'ar-SA',
    region: 'SA',
    compliance: ['SDAIA', 'PDL']
  },
  he: {
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    currency: 'ILS',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'he-IL',
    region: 'IL',
    compliance: ['PPL']
  },
  zh: {
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    currency: 'CNY',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: 'zh-CN',
    region: 'CN',
    compliance: ['PIPL', 'CSL']
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    currency: 'JPY',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: 'ja-JP',
    region: 'JP',
    compliance: ['APPI']
  },
  pt: {
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'pt-BR',
    region: 'BR',
    compliance: ['LGPD']
  },
  ru: {
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    currency: 'RUB',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'ru-RU',
    region: 'RU',
    compliance: ['FZ-152']
  },
  hi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'hi-IN',
    region: 'IN',
    compliance: ['DPDPA', 'IT-Act']
  }
};

// Regional compliance mapping
const COMPLIANCE_REQUIREMENTS = {
  GDPR: {
    region: 'EU',
    cookieConsent: true,
    dataRetention: 7 * 365, // 7 years
    rightToForgotten: true,
    dataPortability: true,
    consentAge: 16
  },
  FERPA: {
    region: 'US',
    educationalRecords: true,
    parentalConsent: true,
    directoryInfo: true,
    dataRetention: null,
    consentAge: 18
  },
  COPPA: {
    region: 'US',
    childrenUnder13: true,
    parentalConsent: true,
    limitedCollection: true,
    dataRetention: null,
    consentAge: 13
  },
  CCPA: {
    region: 'California',
    rightToKnow: true,
    rightToDelete: true,
    rightToOptOut: true,
    nonDiscrimination: true,
    consentAge: 16
  }
};

// Initialize i18next
i18next
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    
    // Language detection options
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage', 'cookie']
    },

    // Backend options
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/add/{{lng}}/{{ns}}',
      allowMultiLoading: true,
      crossDomain: false,
      withCredentials: false,
      requestOptions: {
        cache: 'default'
      }
    },

    // Translation options
    interpolation: {
      escapeValue: false,
      format: function(value, format, lng) {
        const config = SUPPORTED_LANGUAGES[lng];
        
        if (format === 'currency') {
          return new Intl.NumberFormat(config.numberFormat, {
            style: 'currency',
            currency: config.currency
          }).format(value);
        }
        
        if (format === 'date') {
          return new Intl.DateTimeFormat(config.numberFormat, {
            dateStyle: 'medium'
          }).format(new Date(value));
        }
        
        if (format === 'number') {
          return new Intl.NumberFormat(config.numberFormat).format(value);
        }
        
        return value;
      }
    },

    // Namespaces
    ns: [
      'common',
      'auth',
      'dashboard',
      'students',
      'passes',
      'analytics',
      'settings',
      'compliance',
      'mobile',
      'api',
      'errors',
      'validation'
    ],
    defaultNS: 'common',

    // React i18next options
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p']
    },

    // Debug mode
    debug: process.env.NODE_ENV === 'development',

    // Load timeout
    partialBundledLanguages: true,
    load: 'languageOnly',

    // Custom parser
    parseMissingKeyHandler: (key, defaultValue) => {
      console.warn(`Missing translation key: ${key}`);
      return defaultValue || key;
    }
  });

// Language utilities
export const getLanguageConfig = (lng) => {
  return SUPPORTED_LANGUAGES[lng] || SUPPORTED_LANGUAGES.en;
};

export const getComplianceRequirements = (lng) => {
  const config = getLanguageConfig(lng);
  return config.compliance.map(comp => COMPLIANCE_REQUIREMENTS[comp]);
};

export const isRTL = (lng) => {
  return getLanguageConfig(lng).direction === 'rtl';
};

export const formatCurrency = (amount, lng) => {
  const config = getLanguageConfig(lng);
  return new Intl.NumberFormat(config.numberFormat, {
    style: 'currency',
    currency: config.currency
  }).format(amount);
};

export const formatDate = (date, lng) => {
  const config = getLanguageConfig(lng);
  return new Intl.DateTimeFormat(config.numberFormat, {
    dateStyle: 'medium'
  }).format(new Date(date));
};

export const formatNumber = (number, lng) => {
  const config = getLanguageConfig(lng);
  return new Intl.NumberFormat(config.numberFormat).format(number);
};

export const getSupportedLanguages = () => SUPPORTED_LANGUAGES;
export const getCurrentLanguage = () => i18next.language;
export const changeLanguage = (lng) => i18next.changeLanguage(lng);

export default i18next;