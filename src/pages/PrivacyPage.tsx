import Reactfrom 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom'

constPrivacyPage:React.FC=()=>{
const{i18n}=useTranslation()
constnavigate=useNavigate()
constisRtl=i18n.language==='he'

return(
<divclassName="min-h-screenbg-[#f0f7f4]p-4">
<divclassName="max-w-2xlmx-autobg-whiterounded-2xlshadowp-6">
<buttononClick={()=>navigate(-1)}className="text-[#2d6a4f]text-smmb-4hover:underline">
←{isRtl?'חזרה':'Back'}
</button>

{isRtl?(
<divclassName="proseprose-smmax-w-nonetext-gray-700"dir="rtl">
<h1className="text-xlfont-boldtext-[#2d6a4f]">מדיניותפרטיות-YUTAKATreeManager</h1>
<pclassName="text-xstext-gray-400">עדכוןאחרון:יולי2026</p>

<h2>1.מידעשאנואוספים</h2>
<p>כתובתאימייל,מיקוםגיאוגרפי(באישור),תמונות,נתוניעצים,ונתונישימוש.</p>

<h2>2.שימושבמידע</h2>
<p>מתןהשירות,שיפורהאפליקציה,שליחתתזכורות,ותקשורתעםהמשתמש.</p>

<h2>3.שיתוףמידע</h2>
<p>אנו<strong>לא</strong>מוכריםמידעאישי.שיתוףרקעםספקישירותטכנייםהנדרשיםלתפעול,ומודלAI(ללאפרטיםמזהים).</p>

<h2>4.אבטחה</h2>
<p>תקשורתמוצפנת(HTTPS),גישהמוגבלתלמשתמשעצמו(RowLevelSecurity).</p>

<h2>5.זכויותהמשתמש</h2>
<p>גישהלמידע,מחיקתחשבון,תיקוןמידעשגוי,וניודנתונים.</p>

<h2>6.עוגיות</h2>
<p>שימושב-localStorageלשמירתsession,העדפות,ו-cache.</p>

<pclassName="text-xstext-gray-400mt-8">לשאלות:WhatsApp050-7388838</p>
</div>
):(
<divclassName="proseprose-smmax-w-nonetext-gray-700">
<h1className="text-xlfont-boldtext-[#2d6a4f]">PrivacyPolicy-YUTAKATreeManager</h1>
<pclassName="text-xstext-gray-400">Lastupdated:July2026</p>

<h2>1.InformationWeCollect</h2>
<p>Emailaddress,geographiclocation(withpermission),photos,treedata,andusagedata.</p>

<h2>2.HowWeUseInformation</h2>
<p>Providingtheservice,improvingtheapp,sendingreminders,andcommunicatingwithusers.</p>

<h2>3.InformationSharing</h2>
<p>We<strong>donot</strong>sellpersonalinformation.SharedonlywithtechnicalserviceprovidersandAImodel(withoutidentifyinginfo).</p>

<h2>4.Security</h2>
<p>Encryptedcommunication(HTTPS),accesslimitedtouserthemselves(RowLevelSecurity).</p>

<h2>5.UserRights</h2>
<p>Access,deletion,correction,anddataportability.</p>

<h2>6.Cookies</h2>
<p>UseslocalStorageforsession,preferences,andcaching.</p>

<pclassName="text-xstext-gray-400mt-8">Questions:WhatsApp+972-50-7388838</p>
</div>
)}
</div>
</div>
)
}

exportdefaultPrivacyPage
