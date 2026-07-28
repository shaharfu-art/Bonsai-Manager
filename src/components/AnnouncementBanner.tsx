import React,{useState,useEffect} from 'react'
import {supabase} from '../lib/supabase-client'
import {useAuth} from '../contexts/AuthContext'

interfaceAnnouncement{
id:string
title:string
body:string
type:'info'|'warning'|'success'
target:'all'|'free'|'premium'|'specific'
target_users:string[]
created_at:string
}

const DISMISSED_KEY='dismissed-announcements'

const AnnouncementBanner:React.FC=()=>{
const{user}=useAuth()

const[announcement,setAnnouncement]=useState<Announcement|null>(null)

useEffect(()=>{
if(!user)
return

const fetchAnnouncement=async()=>{
const{data}=awaitsupabase
.from('announcements')
.select('*')
.eq('active',true)
.order('created_at',{ascending:false})
.limit(5)

if(!data||data.length===0)
return

//Filterbytarget
const dismissed=(()=>{
try{returnJSON.parse(localStorage.getItem(DISMISSED_KEY)||'[]')}
catch{return[]}
})()

//TODO:getuserrolefromprofilefor'free'/'premium'targeting
const applicable=data.find((a:Announcement)=>{
if(dismissed.includes(a.id))returnfalse
if(a.target==='all')returntrue
if(a.target==='specific')returna.target_users?.includes(user.id)
//Forfree/premium,showtoallfornow(untilsubscriptionisimplemented)
returntrue
})

if(applicable)setAnnouncement(applicableasAnnouncement)
}

fetchAnnouncement()
},[user])

const handleDismiss=()=>{
if(!announcement)
return
try{
const dismissed=JSON.parse(localStorage.getItem(DISMISSED_KEY)||'[]')
dismissed.push(announcement.id)
localStorage.setItem(DISMISSED_KEY,JSON.stringify(dismissed))
}catch{/*ignore*/}
setAnnouncement(null)
}

if(!announcement)returnnull

const colors={
info:'bg-blue-50border-blue-200text-blue-800',
warning:'bg-amber-50border-amber-200text-amber-800',
success:'bg-green-50border-green-200text-green-800',
}

const icons={info:'ℹ️',warning:'⚠️',success:'✅'}


return(
<divclassName={`${colors[announcement.type]}borderrounded-xlp-4relative`}>
<button
onClick={handleDismiss}
className="absolutetop-2left-2text-gray-400hover:text-gray-600text-lgleading-none"
aria-label="dismiss"
>
×
</button>
<divclassName="flexitems-startgap-2pr-2">
<spanclassName="text-lgflex-shrink-0">{icons[announcement.type]}</span>
<div>
<pclassName="text-smfont-semibold">{announcement.title}</p>
<pclassName="text-xsmt-0.5opacity-80">{announcement.body}</p>
</div>
</div>
</div>
)
}

exportdefaultAnnouncementBanner
