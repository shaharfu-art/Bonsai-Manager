import Reactfrom 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom'
import {PLAN_PRICING} from '../hooks/usePlan'

const PricingPage:React.FC=()=>{
const{i18n}=useTranslation()
const navigate=useNavigate()
const isRtl=i18n.language==='he'

return(
<divclassName="min-h-screenbg-gradient-to-bfrom-[#f0f7f4]to-white">
{/*Header*/}
<divclassName="text-centerpt-12pb-8px-6">
<spanclassName="text-5xlblockmb-3">🌳</span>
<h1className="text-3xlfont-boldtext-[#2d6a4f]mb-2">YUTAKATreeManager</h1>
<pclassName="text-gray-600text-smmax-w-mdmx-auto">
{isRtl
?'נהלאתאוסףהבונסאישלךבקלות—תיעוד,תזכורות,תחזיתמזגאווירויועץAI'
:'Manageyourbonsaicollectionwithease—documentation,reminders,weatherforecasts&AIadvisor'}
</p>
</div>

{/*Plans*/}
<divclassName="max-w-4xlmx-autopx-4pb-16">
<divclassName="gridgrid-cols-1md:grid-cols-3gap-6">

{/*Free*/}
<divclassName="bg-whiterounded-2xlshadow-mdp-6borderborder-gray-100flexflex-col">
<h3className="text-lgfont-boldtext-gray-800mb-1">Free</h3>
<pclassName="text-3xlfont-boldtext-gray-900mb-1">₪0</p>
<pclassName="text-xstext-gray-500mb-5">{isRtl?'לתמיד':'forever'}</p>
<ulclassName="space-y-2flex-1">
<PlanFeaturetext={isRtl?'3עצים':'3trees'}/>
<PlanFeaturetext={isRtl?'2שאילתותAIביום':'2AIqueries/day'}/>
<PlanFeaturetext={isRtl?'תיעודטיפוליםותמונות':'Treatment&photolog'}/>
<PlanFeaturetext={isRtl?'תזכורותטיפולים':'Carereminders'}/>
<PlanFeaturetext={isRtl?'תחזיתמזגאוויר':'Weatherforecast'}/>
</ul>
<button
onClick={()=>navigate('/login')}
className="mt-6w-fullborder-2border-[#2d6a4f]text-[#2d6a4f]font-semiboldpy-3rounded-xlhover:bg-green-50transition-colors"
>
{isRtl?'התחלבחינם':'StartFree'}
</button>
</div>

{/*Premium*/}
<divclassName="bg-whiterounded-2xlshadow-lgp-6border-2border-[#52b788]relativeflexflex-col">
<spanclassName="absolute-top-3left-1/2-translate-x-1/2bg-[#52b788]text-whitetext-xsfont-boldpx-3py-1rounded-full">
{isRtl?'מומלץ':'POPULAR'}
</span>
<h3className="text-lgfont-boldtext-[#2d6a4f]mb-1">Premium</h3>
<pclassName="text-3xlfont-boldtext-gray-900mb-1">₪{PLAN_PRICING.premium.monthly}<spanclassName="text-smfont-normaltext-gray-500">/{isRtl?'חודש':'mo'}</span></p>
<pclassName="text-xstext-gray-500mb-5">{isRtl?`או₪${PLAN_PRICING.premium.yearly}/שנה`:`or₪${PLAN_PRICING.premium.yearly}/year`}</p>
<ulclassName="space-y-2flex-1">
<PlanFeaturetext={isRtl?'15עצים':'15trees'}highlight/>
<PlanFeaturetext={isRtl?'AIללאהגבלה':'UnlimitedAI'}highlight/>
<PlanFeaturetext={isRtl?'תיעודטיפוליםותמונות':'Treatment&photolog'}/>
<PlanFeaturetext={isRtl?'תזכורותטיפולים':'Carereminders'}/>
<PlanFeaturetext={isRtl?'תחזיתמזגאוויר':'Weatherforecast'}/>
<PlanFeaturetext={isRtl?'שיתוףתמונות':'Photosharing'}/>
</ul>
<button
onClick={()=>navigate('/login')}
className="mt-6w-fullbg-[#2d6a4f]hover:bg-[#245a42]text-whitefont-semiboldpy-3rounded-xltransition-colors"
>
{isRtl?'התחלעכשיו':'GetStarted'}
</button>
</div>

{/*Pro*/}
<divclassName="bg-whiterounded-2xlshadow-mdp-6borderborder-gray-100flexflex-col">
<h3className="text-lgfont-boldtext-gray-800mb-1">Pro</h3>
<pclassName="text-3xlfont-boldtext-gray-900mb-1">₪{PLAN_PRICING.pro.monthly}<spanclassName="text-smfont-normaltext-gray-500">/{isRtl?'חודש':'mo'}</span></p>
<pclassName="text-xstext-gray-500mb-5">{isRtl?`או₪${PLAN_PRICING.pro.yearly}/שנה`:`or₪${PLAN_PRICING.pro.yearly}/year`}</p>
<ulclassName="space-y-2flex-1">
<PlanFeaturetext={isRtl?'עציםללאהגבלה':'Unlimitedtrees'}highlight/>
<PlanFeaturetext={isRtl?'AIללאהגבלה':'UnlimitedAI'}highlight/>
<PlanFeaturetext={isRtl?'תיעודטיפוליםותמונות':'Treatment&photolog'}/>
<PlanFeaturetext={isRtl?'תזכורותטיפולים':'Carereminders'}/>
<PlanFeaturetext={isRtl?'תחזיתמזגאוויר':'Weatherforecast'}/>
<PlanFeaturetext={isRtl?'שיתוףתמונות':'Photosharing'}/>
<PlanFeaturetext={isRtl?'למשתלותומאמנים':'Fornurseries&trainers'}/>
</ul>
<button
onClick={()=>navigate('/login')}
className="mt-6w-fullborder-2border-gray-800text-gray-800font-semiboldpy-3rounded-xlhover:bg-gray-50transition-colors"
>
{isRtl?'התחלעכשיו':'GetStarted'}
</button>
</div>
</div>

{/*Footernote*/}
<pclassName="text-centertext-xstext-gray-400mt-8">
{isRtl
?'ניתןלבטלבכלעת.ללאהתחייבות.'
:'Cancelanytime.Nocommitment.'}
</p>
</div>
</div>
)
}

const PlanFeature:React.FC<{text:string;highlight?:boolean}>=({text,highlight})=>(
<liclassName={`flexitems-centergap-2text-sm${highlight?'text-[#2d6a4f]font-medium':'text-gray-600'}`}>
<spanclassName="text-green-500flex-shrink-0">✓</span>
{text}
</li>
)

exportdefaultPricingPage
