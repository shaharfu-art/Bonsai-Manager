import React,{useState,useEffect} from 'react'
import {useTranslation} from 'react-i18next'
import OnboardingWizardfrom '../components/OnboardingWizard'

const INSTALL_DONE_KEY='install-completed'

const InstallPage:React.FC=()=>{
const{i18n}=useTranslation()
const isRtl=i18n.language==='he'
const[done,setDone]=useState(()=>!!localStorage.getItem(INSTALL_DONE_KEY))

const[isIOS,setIsIOS]=useState(false)

useEffect(()=>{
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!(windowasany).MSStream
||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
setIsIOS(ios)
//iOS:redirecttomainapp(installisdonefromthereviabanner)
if(ios){
window.location.href='/'
}
},[])

const handleDone=()=>{
localStorage.setItem(INSTALL_DONE_KEY,'1')
setDone(true)
}

//WhilecheckingorredirectingiOS
if(isIOS){
return(
<divclassName="min-h-screenbg-[#1a3d2b]flexitems-centerjustify-center">
<divclassName="w-8h-8border-3border-whiteborder-t-transparentrounded-fullanimate-spin"/>
</div>
)
}

if(done){
return(
<divclassName="min-h-screenbg-[#1a3d2b]flexflex-colitems-centerjustify-centerpx-6text-center">
<spanclassName="text-6xlmb-4">✅</span>
<h1className="text-2xlfont-boldtext-whitemb-2">
{isRtl?'ההתקנההושלמה!':'InstallationComplete!'}
</h1>
<pclassName="text-white/70text-smmb-6max-w-xs">
{isRtl
?'חפשאתYUTAKAברשימתהאפליקציותשלךופתחמהאייקון'
:'FindYUTAKAinyourapplistandopenfromtheicon'}
</p>
<divclassName="bg-white/10rounded-xlp-4max-w-xsw-full">
<pclassName="text-white/60text-xs">
{isRtl
?'אוגלושישירותל:'
:'Orbrowsedirectlyto:'}
</p>
<ahref="/"className="text-whitefont-mediumtext-smunderlinemt-1block">
yutakabonsai.com
</a>
</div>
</div>
)
}


return(
<divclassName="min-h-screenbg-[#1a3d2b]flexitems-centerjustify-center">
<OnboardingWizardforceShowonComplete={handleDone}/>
</div>
)
}

exportdefaultInstallPage
