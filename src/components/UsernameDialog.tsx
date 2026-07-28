import React,{useState,useEffect,useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {supabase} from '../lib/supabase-client'
import {useAuth} from '../contexts/AuthContext'

interfaceUsernameDialogProps{
onComplete:(username:string)=>void
}

const UsernameDialog:React.FC<UsernameDialogProps>=({onComplete})=>{
const{i18n}=useTranslation()

const{user}=useAuth()
const isRtl=i18n.language==='he'
const[username,setUsername]=useState('')

const[checking,setChecking]=useState(false)

const[available,setAvailable]=useState<boolean|null>(null)

const[error,setError]=useState('')

const[saving,setSaving]=useState(false)
const debounceRef=useRef<ReturnType<typeofsetTimeout>|null>(null)

//Validateandcheckavailabilityasusertypes
useEffect(()=>{
if(!username.trim()){
setAvailable(null)
setError('')

return
}

//Validateformat:3-20chars,lowercaseletters,numbers,underscores
const isValid=/^[a-z0-9_]{3,20}$/.test(username)
if(!isValid){
setAvailable(null)
setError(isRtl
?'שםמשתמש:3-20תווים,אותיותבאנגליתקטנות,מספריםאו_'
:'Username:3-20chars,lowercaseletters,numbersor_')

return
}

setError('')
setChecking(true)

//Debouncethecheck
if(debounceRef.current)clearTimeout(debounceRef.current)
debounceRef.current=setTimeout(async()=>{
const{data}=awaitsupabase
.from('user_profiles')
.select('id')
.eq('username',username)
.maybeSingle()

setAvailable(!data)
setChecking(false)
},400)


return()=>{
if(debounceRef.current)clearTimeout(debounceRef.current)
}
},[username,isRtl])

const handleSubmit=async(e:React.FormEvent)=>{
e.preventDefault()
if(!available||!user)
return

setSaving(true)
setError('')


const{error:updateErr}=awaitsupabase
.from('user_profiles')
.update({username})
.eq('id',user.id)

if(updateErr){
if(updateErr.message.includes('unique')||updateErr.message.includes('duplicate')){
setError(isRtl?'שםמשתמשתפוס,נסהאחר':'Usernametaken,tryanother')
setAvailable(false)
}else{
setError(updateErr.message)
}
setSaving(false)

return
}

onComplete(username)
}


return(
<divclassName="fixedinset-0z-[60]flexitems-centerjustify-centerbg-black/50px-4">
<divclassName="bg-whiterounded-2xlshadow-2xlw-fullmax-w-smp-6">
<divclassName="text-centermb-5">
<spanclassName="text-4xlblockmb-2">👤</span>
<h2className="text-lgfont-boldtext-gray-900">
{isRtl?'בחרשםמשתמש':'Chooseausername'}
</h2>
<pclassName="text-smtext-gray-500mt-1">
{isRtl?'ככהחבריםימצאואותךבקהילה':'Thisishowfriendswillfindyou'}
</p>
</div>

<formonSubmit={handleSubmit}className="space-y-4">
<divclassName="relative">
<spanclassName="absolutetop-2.5left-3text-gray-400text-sm">@</span>
<input
type="text"
value={username}
onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))}
placeholder="your_name"
maxLength={20}
className={`w-fullborderrounded-xlpx-3py-2.5text-smpl-8focus:outline-nonefocus:ring-2${
available===true?'border-green-400focus:ring-green-300':
available===false?'border-red-400focus:ring-red-300':
'border-gray-300focus:ring-[#52b788]'
}`}
dir="ltr"
autoFocus
/>
{/*Statusindicator*/}
<divclassName="absolutetop-2.5right-3">
{checking&&<spanclassName="text-xstext-gray-400">...</span>}
{!checking&&available===true&&<spanclassName="text-green-500">✓</span>}
{!checking&&available===false&&<spanclassName="text-red-500">✗</span>}
</div>
</div>

{/*Feedback*/}
{error&&<pclassName="text-xstext-red-500">{error}</p>}
{available===true&&!error&&(
<pclassName="text-xstext-green-600">
{isRtl?'✓זמין!':'✓Available!'}
</p>
)}
{available===false&&!error&&(
<pclassName="text-xstext-red-500">
{isRtl?'✗תפוס,נסהשםאחר':'✗Taken,tryanother'}
</p>
)}

<button
type="submit"
disabled={!available||saving}
className="w-fullbg-[#2d6a4f]hover:bg-[#245a42]text-whitefont-semiboldpy-3rounded-xltransition-colorsdisabled:opacity-40"
>
{saving
?(isRtl?'שומר...':'Saving...')
:(isRtl?'אישור':'Confirm')
}
</button>
</form>
</div>
</div>
)
}

exportdefaultUsernameDialog
