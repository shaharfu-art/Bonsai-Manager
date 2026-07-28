import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import he from './locales/he.json'
import en from './locales/en.json'

// Determine language: saved preference > browser language > default 'en'
function detectLanguage(): string {
  const saved = localStorage.getItem('language')
  if (saved) return saved

  // Detect from browser
  const browserLang = navigator.language?.split('-')[0] ?? 'en'
  if (browserLang === 'he') return 'he'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: he },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
