import React,{useEffect,useState} from 'react'

interfaceProps{
onDone:()=>void
}

const SplashScreen:React.FC<Props>=({onDone})=>{
const[phase,setPhase]=useState<'visible'|'out'>('visible')

useEffect(()=>{
const outTimer=setTimeout(()=>setPhase('out'),3500)
const doneTimer=setTimeout(()=>onDone(),4200)

return()=>{
clearTimeout(outTimer)
clearTimeout(doneTimer)
}
},[onDone])


return(
<div
onClick={onDone}
className="fixedinset-0z-[9999]cursor-pointeroverflow-hiddenbg-[#2d3d2b]"
style={{
opacity:phase==='out'?0:1,
transition:phase==='out'?'opacity0.7sease-out':'none',
}}
>
{/*Fullscreenimage*/}
<img
src="/splash.png"
alt="YUTAKA"
className="absoluteinset-0w-fullh-fullobject-cover"
style={{objectPosition:'50%55%'}}
draggable={false}
/>
</div>
)
}

exportdefaultSplashScreen
