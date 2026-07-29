import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const TermsPage: React.FC = () => {
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
            <h1 className="text-xl font-bold text-[#2d6a4f]">תנאי שימוש - YUTAKA Tree Manager</h1>
            <p className="text-xs text-gray-400">עדכון אחרון: יולי 2026</p>

            <h2>1. כללי</h2>
            <p>השימוש באפליקציה מהווה הסכמה לתנאים אלה. החברה שומרת לעצמה את הזכות לשנות תנאים אלה בכל עת.</p>

            <h2>2. השירות</h2>
            <p>השירות מסופק "כמות שהוא" (AS IS). האפליקציה כוללת כלי AI שמספק המלצות כלליות בלבד - <strong>אינן מחליפות ייעוץ מקצועי.</strong></p>

            <h2>3. הגבלת אחריות</h2>
            <p>החברה אינה אחראית לנזק ישיר או עקיף הנובע משימוש, כולל נזק לצמחים, אובדן נתונים, או המלצות AI שגויות.</p>

            <h2>4. תשלומים</h2>
            <p>החברה שומרת לעצמה את הזכות לשנות מחירים בכל עת עם הודעה של 14 יום מראש. ביטול מנוי אפשרי בכל עת.</p>

            <h2>5. תוכן משתמש</h2>
            <p>המשתמש אחראי על כל תוכן שהוא מעלה. החברה לא תשתמש בתוכן למטרות אחרות ללא הסכמה.</p>

            <h2>6. זמינות</h2>
            <p>החברה אינה מתחייבת לזמינות רציפה ורשאית להפסיק את השירות עם הודעה של 30 יום.</p>

            <h2>7. דין חל</h2>
            <p>תנאים אלה כפופים לדין הישראלי. סמכות שיפוט בלעדית לבתי המשפט בישראל.</p>

            <p className="text-xs text-gray-400 mt-8">לשאלות: WhatsApp 050-7388838</p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-gray-700">
            <h1 className="text-xl font-bold text-[#2d6a4f]">Terms of Service - YUTAKA Tree Manager</h1>
            <p className="text-xs text-gray-400">Last updated: July 2026</p>

            <h2>1. General</h2>
            <p>By using the App, you agree to these terms. The Company reserves the right to modify these terms at any time.</p>

            <h2>2. The Service</h2>
            <p>The service is provided "AS IS". The AI tool provides general recommendations only - <strong>does not replace professional advice.</strong></p>

            <h2>3. Limitation of Liability</h2>
            <p>The Company is not responsible for any direct or indirect damages, including damage to plants, data loss, or incorrect AI recommendations.</p>

            <h2>4. Payments</h2>
            <p>The Company reserves the right to change prices at any time with 14 days notice. Cancellation is possible at any time.</p>

            <h2>5. User Content</h2>
            <p>The user is responsible for all uploaded content. The Company will not use content for other purposes without consent.</p>

            <h2>6. Availability</h2>
            <p>The Company does not guarantee continuous availability and may discontinue service with 30 days notice.</p>

            <h2>7. Governing Law</h2>
            <p>These terms are governed by Israeli law. Exclusive jurisdiction is granted to courts in Israel.</p>

            <p className="text-xs text-gray-400 mt-8">Questions: WhatsApp +972-50-7388838</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TermsPage
