import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const PrivacyPage: React.FC = () => {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const isRtl = i18n.language === 'he'

  return (
    <div className="min-h-screen bg-[#f0f7f4] p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6">
        <button onClick={() => navigate(-1 as any)} className="text-[#2d6a4f] text-sm mb-4 hover:underline">
          ← {isRtl ? 'חזרה' : 'Back'}
        </button>

        {isRtl ? (
          <div className="prose prose-sm max-w-none text-gray-700" dir="rtl">
            <h1 className="text-xl font-bold text-[#2d6a4f]">מדיניות פרטיות - YUTAKA Tree Manager</h1>
            <p className="text-xs text-gray-400">עדכון אחרון: יולי 2026</p>

            <h2>1. מידע שאנו אוספים</h2>
            <p>כתובת אימייל, מיקום גיאוגרפי (באישור), תמונות, נתוני עצים, ונתוני שימוש.</p>

            <h2>2. שימוש במידע</h2>
            <p>מתן השירות, שיפור האפליקציה, שליחת תזכורות, ותקשורת עם המשתמש.</p>

            <h2>3. שיתוף מידע</h2>
            <p>אנו <strong>לא</strong> מוכרים מידע אישי. שיתוף רק עם ספקי שירות טכניים הנדרשים לתפעול, ומודל AI (ללא פרטים מזהים).</p>

            <h2>4. אבטחה</h2>
            <p>תקשורת מוצפנת (HTTPS), גישה מוגבלת למשתמש עצמו (Row Level Security).</p>

            <h2>5. זכויות המשתמש</h2>
            <p>גישה למידע, מחיקת חשבון, תיקון מידע שגוי, וניוד נתונים.</p>

            <h2>6. עוגיות</h2>
            <p>שימוש ב-localStorage לשמירת session, העדפות, ו-cache.</p>

            <p className="text-xs text-gray-400 mt-8">לשאלות: WhatsApp 050-7388838</p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-gray-700">
            <h1 className="text-xl font-bold text-[#2d6a4f]">Privacy Policy - YUTAKA Tree Manager</h1>
            <p className="text-xs text-gray-400">Last updated: July 2026</p>

            <h2>1. Information We Collect</h2>
            <p>Email address, geographic location (with permission), photos, tree data, and usage data.</p>

            <h2>2. How We Use Information</h2>
            <p>Providing the service, improving the app, sending reminders, and communicating with users.</p>

            <h2>3. Information Sharing</h2>
            <p>We <strong>do not</strong> sell personal information. Shared only with technical service providers and AI model (without identifying info).</p>

            <h2>4. Security</h2>
            <p>Encrypted communication (HTTPS), access limited to user themselves (Row Level Security).</p>

            <h2>5. User Rights</h2>
            <p>Access, deletion, correction, and data portability.</p>

            <h2>6. Cookies</h2>
            <p>Uses localStorage for session, preferences, and caching.</p>

            <p className="text-xs text-gray-400 mt-8">Questions: WhatsApp +972-50-7388838</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PrivacyPage
