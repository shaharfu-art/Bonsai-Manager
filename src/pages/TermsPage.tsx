import Reactfrom 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom'

const TermsPage:React.FC=()=>{
const{i18n}=useTranslation()
const navigate=useNavigate()
const isRtl=i18n.language==='he'

return(
<divclassName="min-h-screenbg-[#f0f7f4]p-4">
<divclassName="max-w-2xlmx-autobg-whiterounded-2xlshadowp-6">
<buttononClick={()=>navigate(-1)}className="text-[#2d6a4f]text-smmb-4hover:underline">
←{isRtl?'חזרה':'Back'}
</button>

{isRtl?(
<divclassName="proseprose-smmax-w-nonetext-gray-700"dir="rtl">
<h1className="text-xlfont-boldtext-[#2d6a4f]">תנאישימוש-YUTAKATreeManager</h1>
<pclassName="text-xstext-gray-400">עדכוןאחרון:יולי2026</p>

<h2>1.כללי</h2>
<p>השימושבאפליקציהמהווההסכמהלתנאיםאלה.החברהשומרתלעצמהאתהזכותלשנותתנאיםאלהבכלעת.</p>

<h2>2.השירות</h2>
<p>השירותמסופק"כמותשהוא"(ASIS).האפליקציהכוללתכליAIשמספקהמלצותכלליותבלבד-<strong>אינןמחליפותייעוץמקצועי.</strong></p>

<h2>3.הגבלתאחריות</h2>
<p>החברהאינהאחראיתלנזקישיראועקיףהנובעמשימוש,כוללנזקלצמחים,אובדןנתונים,אוהמלצותAIשגויות.</p>

<h2>4.תשלומים</h2>
<p>החברהשומרתלעצמהאתהזכותלשנותמחיריםבכלעתעםהודעהשל14יוםמראש.ביטולמנויאפשריבכלעת.</p>

<h2>5.תוכןמשתמש</h2>
<p>המשתמשאחראיעלכלתוכןשהואמעלה.החברהלאתשתמשבתוכןלמטרותאחרותללאהסכמה.</p>

<h2>6.זמינות</h2>
<p>החברהאינהמתחייבתלזמינותרציפהורשאיתלהפסיקאתהשירותעםהודעהשל30יום.</p>

<h2>7.דיןחל</h2>
<p>תנאיםאלהכפופיםלדיןהישראלי.סמכותשיפוטבלעדיתלבתיהמשפטבישראל.</p>

<pclassName="text-xstext-gray-400mt-8">לשאלות:WhatsApp050-7388838</p>
</div>
):(
<divclassName="proseprose-smmax-w-nonetext-gray-700">
<h1className="text-xlfont-boldtext-[#2d6a4f]">TermsofService-YUTAKATreeManager</h1>
<pclassName="text-xstext-gray-400">Lastupdated:July2026</p>

<h2>1.General</h2>
<p>ByusingtheApp,youagreetotheseterms.TheCompanyreservestherighttomodifythesetermsatanytime.</p>

<h2>2.TheService</h2>
<p>Theserviceisprovided"ASIS".TheAItoolprovidesgeneralrecommendationsonly-<strong>doesnotreplaceprofessionaladvice.</strong></p>

<h2>3.LimitationofLiability</h2>
<p>TheCompanyisnotresponsibleforanydirectorindirectdamages,includingdamagetoplants,dataloss,orincorrectAIrecommendations.</p>

<h2>4.Payments</h2>
<p>TheCompanyreservestherighttochangepricesatanytimewith14daysnotice.Cancellationispossibleatanytime.</p>

<h2>5.UserContent</h2>
<p>Theuserisresponsibleforalluploadedcontent.TheCompanywillnotusecontentforotherpurposeswithoutconsent.</p>

<h2>6.Availability</h2>
<p>TheCompanydoesnotguaranteecontinuousavailabilityandmaydiscontinueservicewith30daysnotice.</p>

<h2>7.GoverningLaw</h2>
<p>ThesetermsaregovernedbyIsraelilaw.ExclusivejurisdictionisgrantedtocourtsinIsrael.</p>

<pclassName="text-xstext-gray-400mt-8">Questions:WhatsApp+972-50-7388838</p>
</div>
)}
</div>
</div>
)
}

exportdefaultTermsPage
