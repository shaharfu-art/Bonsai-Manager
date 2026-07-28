# פיצ'ר קהילה — "הגינה" 🌿

## סקירה כללית

אזור חברתי באפליקציה שבו משתמשים יכולים לראות עצים של אחרים, לתת לייקים, להגיב, ולהתחבר לקהילת בונסאי.

---

## 1. מיקום ב-UI

### ניווט ראשי (Bottom Nav / Header)
```
[ דשבורד 🏠 ]  [ קהילה 🌿 ]  [ הגדרות ⚙️ ]
```

**הקהילה תהיה טאב ראשי** — לא מוסתרת בתפריט. נגישה בקליק אחד מכל מקום.

### מבנה דף הקהילה:
```
┌─────────────────────────────┐
│  🌿 הקהילה         [חיפוש]  │
├─────────────────────────────┤
│  [Feed] [Explore] [החברים]  │  ← טאבים
├─────────────────────────────┤
│  ... תוכן לפי טאב ...       │
└─────────────────────────────┘
```

---

## 2. טאבים בדף הקהילה

### טאב 1: Feed (ברירת מחדל)
- פוסטים של אנשים שאני **עוקב** אחריהם
- אם לא עוקב אף אחד → מציג "Explore" כברירת מחדל + הזמנה לעקוב

### טאב 2: Explore
- כל הפוסטים הציבוריים (מכל המשתמשים)
- ממוין לפי פופולריות / חדש

### טאב 3: החברים שלי
- רשימת אנשים שאני עוקב אחריהם
- כפתור "הזמן חבר"

---

## 3. מה נראה בפוסט (כרטיס)

```
┌─────────────────────────────┐
│  [אווטאר] שחר · לפני 3 שעות │
│                              │
│  [תמונת העץ - גדולה]        │
│                              │
│  ערער כחול — "גיזום ענפים    │
│  ראשון של העונה! 🌿"         │
│                              │
│  ❤️ 4    💬 2    📤 שתף      │
└─────────────────────────────┘
```

**רכיבים:**
- אווטאר + שם תצוגה + זמן יחסי
- תמונה (מתוך הגלריה של העץ)
- שם העץ + מין
- טקסט חופשי (אופציונלי)
- לייק / תגובה / שיתוף

---

## 4. איך מפרסמים

### אפשרות א: מתוך דף העץ
- כפתור "📤 שתף לקהילה" ב-TreeProfile (ליד כפתור Share הקיים)
- בוחר תמונה + כותב טקסט → מפורסם

### אפשרות ב: כפתור FAB בדף קהילה
- "+" → בוחר עץ → בוחר תמונה → כותב טקסט → מפורסם

### אפשרות ג: אוטומטי בזמן טיפול
- Checkbox "שתף לקהילה" בטופס טיפול (opt-in)

---

## 5. זיהוי משתמשים — כינוי וגילוי

### שם תצוגה (Display Name)
- **Google users**: מגיע אוטומטית (full_name)
- **Email users**: בהרשמה/onboarding — שדה "איך לקרוא לך?"
- **אפשר לשנות** בהגדרות בכל זמן
- **ברירת מחדל** אם אין שם: "משתמש" + 4 תווים אחרונים של ID

### אווטאר
- **Google users**: תמונת פרופיל מגוגל
- **אחרים**: אות ראשונה של השם (כמו עכשיו בהגדרות)
- **בעתיד**: אפשרות להעלות תמונה

### פרופיל ציבורי
- שם תצוגה
- כמה עצים (מספר בלבד)
- מתי הצטרף
- עצים שבחר לחשוף (opt-in per tree)
- **אין**: email, טלפון, מיקום מדויק

---

## 6. איך מגלים ומוסיפים חברים

### 1. Explore (דפדוף)
- רואה פוסטים מעניינים → לוחץ על שם → פרופיל → "עקוב"

### 2. חיפוש
- חיפוש לפי שם תצוגה
- חיפוש לפי מין עץ ("מי מגדל ערער?")

### 3. הזמנה בלינק
- כפתור "הזמן חבר" → מייצר לינק ייחודי
- `yutakabonsai.com/u/shahar` (או ID)
- השולח מקבל follow אוטומטי כשהמוזמן נרשם

### 4. QR Code (בעתיד)
- מדבקה על עץ בתערוכה → סורקים → מגיעים לפרופיל

---

## 7. פרטיות ושליטה

| הגדרה | ברירת מחדל | אפשרויות |
|--------|-----------|----------|
| פרופיל ציבורי | כן (שם + מספר עצים) | כן / לא |
| עצים גלויים | אף אחד | בחירה ידנית per tree |
| מי יכול להגיב | כולם | כולם / עוקבים / אף אחד |
| מי יכול לראות מי עוקב | כולם | כולם / רק אני |
| חסימת משתמש | — | כפתור חסימה |

---

## 8. DB Schema

```sql
-- פרופיל ציבורי (הרחבה של user_profiles)
ALTER TABLE user_profiles ADD COLUMN is_public boolean DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN bio text;
ALTER TABLE user_profiles ADD COLUMN avatar_url text;

-- פוסטים
CREATE TABLE community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tree_id uuid REFERENCES trees(id) ON DELETE SET NULL,
  photo_id uuid REFERENCES photos(id) ON DELETE SET NULL,
  text text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- לייקים
CREATE TABLE community_likes (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- תגובות
CREATE TABLE community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- מעקב (Follow)
CREATE TABLE community_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- חסימה
CREATE TABLE community_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (blocker_id, blocked_id)
);

-- עצים ציבוריים (opt-in)
ALTER TABLE trees ADD COLUMN is_public boolean DEFAULT false;
```

---

## 9. שלבי מימוש מומלצים

| שלב | תיאור | מורכבות | תלות |
|------|--------|---------|-------|
| **1** | DB + פיד Explore בסיסי (read-only) | 4h | — |
| **2** | פרסום פוסט מדף העץ | 3h | שלב 1 |
| **3** | לייקים | 2h | שלב 1 |
| **4** | תגובות | 2h | שלב 1 |
| **5** | Follow + Feed אישי | 3h | שלב 1 |
| **6** | פרופיל ציבורי + חיפוש | 3h | שלב 5 |
| **7** | הזמנת חברים (לינק) | 2h | שלב 5 |
| **8** | חסימה + הגדרות פרטיות | 2h | שלב 5 |
| **9** | Notifications על לייק/תגובה/follow | 3h | שלב 3-5 |

**סה"כ: ~24 שעות פיתוח**

---

## 10. שאלות פתוחות

1. **מודרציה**: מי מפקח על תוכן פוגעני? (בהתחלה — אתה ידנית, בהמשך — דיווח)
2. **Premium only?**: האם הקהילה פתוחה לכולם או רק למשלמים?
3. **עץ ציבורי**: כל עץ שמפרסמים עליו הופך ציבורי, או רק אם מאשרים?
4. **גלריה ציבורית**: האם לייצר "גלריה" של כל העצים הציבוריים (ללא feed)?

---

## 11. השוואה ל-Strava/Garmin

| מושג ב-Strava | מקבילה אצלנו |
|--------------|--------------|
| Activity | פוסט (טיפול/תמונה) |
| Kudos | ❤️ לייק |
| Comments | 💬 תגובות |
| Follow | 👥 עקוב |
| Club | — (בעתיד: קבוצות/מועדון) |
| Segment | — (בעתיד: אתגר חודשי) |
| Leaderboard | — (בעתיד: "מטפל השבוע") |
