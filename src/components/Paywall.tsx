import Reactfrom 'react'
import {useTranslation} from 'react-i18next'
import {useAuth} from '../contexts/AuthContext'
import {getCheckoutUrl} from '../lib/payment'
import {PLAN_PRICING} from '../hooks/usePlan'

interfaceProps{
reason:'trees'|'ai'
onClose:()=>void
}

constPaywall:React.FC<Props>=({reason,onClose})=>{
const{i18n}=useTranslation()

const{user}=useAuth()
constisRtl=i18n.language==='he'

consthandleUpgrade=(plan:'premium'|'pro',billing:'monthly'|'yearly')=>{
if(!user?.email||!user?.id){
alert(isRtl?'ישלהתחברתחילה':'Pleasesigninfirst')

return
}

consturl=getCheckoutUrl({
plan:`${plan}_${billing}`as'premium_monthly'|'premium_yearly'|'pro_monthly'|'pro_yearly',
userEmail:user.email,
userId:user.id,
})

if(url){
window.open(url,'_blank')
}else{
alert(isRtl?'מערכתהתשלוםתחוברבקרוב!':'Paymentsystemcomingsoon!')
}
}


return(
<divclassName="fixedinset-0z-50flexitems-centerjustify-centerbg-black/50px-4"onClick={onClose}>
<divclassName="bg-whiterounded-2xlshadow-2xlw-fullmax-w-mdoverflow-hiddenmax-h-[90vh]overflow-y-auto"onClick={e=>e.stopPropagation()}>
{/*Header*/}
<divclassName="bg-gradient-to-brfrom-[#2d6a4f]to-[#52b788]px-6py-6text-centertext-white">
<spanclassName="text-4xlblockmb-2">{reason==='trees'?'🌳':'🤖'}</span>
<h2className="text-lgfont-boldmb-1">
{reason==='trees'
?(isRtl?'הגעתלמגבלתהעצים':'Treelimitreached')
:(isRtl?'ניצלתאתהשאילתותהיומיות':'DailyAIqueriesusedup')
}
</h2>
<pclassName="text-smtext-white/80">
{isRtl?'שדרגכדילהמשיךלגדול🌱':'Upgradetokeepgrowing🌱'}
</p>
</div>

{/*Planscomparison*/}
<divclassName="px-5py-5space-y-4">

{/*PremiumPlan*/}
<divclassName="border-2border-[#52b788]rounded-xlp-4relative">
<spanclassName="absolute-top-2.5right-4bg-[#52b788]text-whitetext-[10px]font-boldpx-2py-0.5rounded-full">
{isRtl?'מומלץ':'POPULAR'}
</span>
<divclassName="flexitems-baselinegap-2mb-2">
<h3className="text-basefont-boldtext-[#2d6a4f]">Premium</h3>
<spanclassName="text-lgfont-boldtext-gray-900">₪{PLAN_PRICING.premium.monthly}</span>
<spanclassName="text-xstext-gray-500">/{isRtl?'חודש':'mo'}</span>
</div>
<ulclassName="space-y-1mb-3">
<liclassName="text-xstext-gray-600">✓{isRtl?'15עצים':'15trees'}</li>
<liclassName="text-xstext-gray-600">✓{isRtl?'AIללאהגבלה':'UnlimitedAI'}</li>
</ul>
<divclassName="flexgap-2">
<button
onClick={()=>handleUpgrade('premium','monthly')}
className="flex-1bg-[#2d6a4f]hover:bg-[#245a42]text-whitefont-semiboldpy-2rounded-lgtransition-colorstext-sm"
>
{isRtl?'חודשי':'Monthly'}
</button>
<button
onClick={()=>handleUpgrade('premium','yearly')}
className="flex-1borderborder-[#2d6a4f]text-[#2d6a4f]font-mediumpy-2rounded-lghover:bg-green-50transition-colorstext-xs"
>
₪{PLAN_PRICING.premium.yearly}/{isRtl?'שנה':'yr'}💰
</button>
</div>
</div>

{/*ProPlan*/}
<divclassName="borderborder-gray-200rounded-xlp-4">
<divclassName="flexitems-baselinegap-2mb-2">
<h3className="text-basefont-boldtext-gray-800">Pro</h3>
<spanclassName="text-lgfont-boldtext-gray-900">₪{PLAN_PRICING.pro.monthly}</span>
<spanclassName="text-xstext-gray-500">/{isRtl?'חודש':'mo'}</span>
</div>
<ulclassName="space-y-1mb-3">
<liclassName="text-xstext-gray-600">✓{isRtl?'עציםללאהגבלה':'Unlimitedtrees'}</li>
<liclassName="text-xstext-gray-600">✓{isRtl?'AIללאהגבלה':'UnlimitedAI'}</li>
<liclassName="text-xstext-gray-600">✓{isRtl?'למשתלותומאמנים':'Fornurseries&trainers'}</li>
</ul>
<divclassName="flexgap-2">
<button
onClick={()=>handleUpgrade('pro','monthly')}
className="flex-1bg-gray-800hover:bg-gray-900text-whitefont-semiboldpy-2rounded-lgtransition-colorstext-sm"
>
{isRtl?'חודשי':'Monthly'}
</button>
<button
onClick={()=>handleUpgrade('pro','yearly')}
className="flex-1borderborder-gray-300text-gray-700font-mediumpy-2rounded-lghover:bg-gray-50transition-colorstext-xs"
>
₪{PLAN_PRICING.pro.yearly}/{isRtl?'שנה':'yr'}💰
</button>
</div>
</div>

{/*Close*/}
<button
onClick={onClose}
className="w-fulltext-gray-400text-xspy-2hover:text-gray-600"
>
{isRtl?'לאעכשיו':'Notnow'}
</button>
</div>
</div>
</div>
)
}

exportdefaultPaywall
