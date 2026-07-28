import React,{useState,useEffect,useRef} from 'react'

interfaceProps{
onDone:()=>void
}

constInstallGate:React.FC<Props>=({onDone})=>{
const[deferredPrompt,setDeferredPrompt]=useState<any>(null)

const[isIOS,setIsIOS]=useState(false)

const[installing,setInstalling]=useState(false)
constpromptRef=useRef<any>(null)

useEffect(()=>{
//CheckifalreadyinstalledasPWA
constisStandalone=window.matchMedia('(display-mode:standalone)').matches
||(window.navigatorasany).standalone===true
if(isStandalone){
onDone()

return
}

//Checkifalreadydismissedthissession
if(sessionStorage.getItem('install-gate-dismissed')){
onDone()

return
}

//DetectiOS
constua=navigator.userAgent
constisiOS=/iPad|iPhone|iPod/.test(ua)&&!(windowasany).MSStream
setIsIOS(isiOS)

//Listenforbeforeinstallprompt(Android/Chrome/Edge)
consthandler=(e:Event)=>{
e.preventDefault()
promptRef.current=e
setDeferredPrompt(e)
}
window.addEventListener('beforeinstallprompt',handler)


return()=>window.removeEventListener('beforeinstallprompt',handler)
},[onDone])

consthandleInstall=async()=>{
if(promptRef.current){
setInstalling(true)
promptRef.current.prompt()
constresult=awaitpromptRef.current.userChoice
if(result.outcome==='accepted'){
sessionStorage.setItem('install-gate-dismissed','1')
onDone()
}
setInstalling(false)
}
}

consthandleSkip=()=>{
sessionStorage.setItem('install-gate-dismissed','1')
onDone()
}


return(
<divclassName="fixedinset-0z-[9998]bg-[#1a3d2b]flexflex-colitems-centerjustify-centerpx-6text-center">
{/*Logo*/}
<img
src="/splash.png"
alt="YUTAKA"
className="w-40h-40object-containmb-6rounded-2xl"
/>

<h1className="text-whitetext-xlfont-boldmb-2">YUTAKABonsai</h1>
<pclassName="text-white/70text-smmb-8max-w-xs">
התקןאתהאפליקציהלמסךהביתלגישהמהירהוחוויהמלאה
</p>

{isIOS?(
/*iOSinstructions*/
<divclassName="bg-white/10backdrop-blurrounded-xlp-5max-w-xsw-fullmb-6">
<pclassName="text-whitetext-smmb-3font-medium">להתקנהב-iPhone:</p>
<divclassName="space-y-2text-white/80text-xstext-right">
<p>1.לחץעלכפתורהשיתוף<spanclassName="inline-blockpx-1.5py-0.5bg-white/20rounded">⬆️</span></p>
<p>2.גלולובחר<strong>"AddtoHomeScreen"</strong></p>
<p>3.לחץ<strong>"Add"</strong></p>
</div>
</div>
):deferredPrompt?(
/*Android/Chromeinstallbutton*/
<button
onClick={handleInstall}
disabled={installing}
className="bg-whitetext-[#2d6a4f]font-boldtext-basepx-8py-3.5rounded-xlshadow-lghover:bg-gray-100transition-colorsdisabled:opacity-60mb-6"
>
{installing?'...':'📲התקןעכשיו'}
</button>
):(
/*Fallback-nopromptavailableyet*/
<divclassName="bg-white/10backdrop-blurrounded-xlp-5max-w-xsw-fullmb-6">
<pclassName="text-white/80text-sm">
פתחבדפדפןChromeולחץעלתפריט⋮→"AddtoHomescreen"
</p>
</div>
)}

{/*Skipbutton*/}
<button
onClick={handleSkip}
className="text-white/40text-xshover:text-white/70transition-colors"
>
דלגוהמשךלאפליקציה→
</button>
</div>
)
}

exportdefaultInstallGate
