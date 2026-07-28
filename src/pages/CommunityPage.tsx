import React,{useState,useEffect,useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom'
import Layoutfrom '../components/Layout'
import UsernameDialogfrom '../components/UsernameDialog'
import {useAuth} from '../contexts/AuthContext'
import {supabase} from '../lib/supabase-client'
import {useFriends,usePeopleYouMayKnow} from '../hooks/useFriends'
import type{SuggestedUser} from '../hooks/useFriends'

const CommunityPage:React.FC=()=>{
const{i18n}=useTranslation()
const isRtl=i18n.language==='he'
const{friends,pendingReceived,acceptRequest,rejectRequest,sendRequest}=useFriends()

const{suggestions:peopleYouMayKnow,loading:suggestionsLoading}=usePeopleYouMayKnow()

const{user}=useAuth()

const[inviteCopied,setInviteCopied]=useState(false)

const[showUsernameDialog,setShowUsernameDialog]=useState(false)

const[hasUsername,setHasUsername]=useState<boolean|null>(null)

//Checkifuserhasausername
useEffect(()=>{
if(!user)
return
supabase.from('user_profiles').select('username').eq('id',user.id).single()
.then(({data})=>{
const has=!!(data?.username)
setHasUsername(has)
if(!has)setShowUsernameDialog(true)
})
},[user])

const handleInvite=async()=>{
const inviteUrl=`${window.location.origin}/invite/${user?.id??''}`
const shareData={
title:isRtl?'הצטרףלקהילתבונסאיYUTAKA':'JoinYUTAKABonsaiCommunity',
text:isRtl?'בואלשתףולגלותעציבונסאי!':'Comeshareanddiscoverbonsaitrees!',
url:inviteUrl,
}

if(navigator.share){
try{
awaitnavigator.share(shareData)
}catch{
//Usercancelledshare
}
}else{
awaitnavigator.clipboard.writeText(inviteUrl)
setInviteCopied(true)
setTimeout(()=>setInviteCopied(false),2000)
}
}


return(
<Layout>
{/*Usernamedialog(showsifnousernameset)*/}
{showUsernameDialog&&(
<UsernameDialogonComplete={()=>{setHasUsername(true);setShowUsernameDialog(false)}}/>
)}

<divclassName="w-fullspace-y-4">
{/*Header*/}
<divclassName="flexitems-centerjustify-between">
<h1className="text-xlfont-boldtext-[#2d6a4f]">🌿{isRtl?'קהילה':'Community'}</h1>
<button
onClick={handleInvite}
className="text-xsbg-[#2d6a4f]hover:bg-[#245a42]text-whitepx-3py-1.5rounded-lgtransition-colorsflexitems-centergap-1"
>
{inviteCopied
?(isRtl?'✓הועתק!':'✓Copied!')
:(isRtl?'הזמןחבר🔗':'Invite🔗')
}
</button>
</div>

{/*Search*/}
<div>
<h2className="text-smfont-semiboldtext-gray-700mb-2">🔍{isRtl?'חפשחבר':'FindaFriend'}</h2>
<UserSearchisRtl={isRtl}/>
</div>

{/*Pendingfriendrequests*/}
{pendingReceived.length>0&&(
<divclassName="space-y-2">
<h2className="text-smfont-semiboldtext-gray-700">🤝{isRtl?'בקשותחברות':'FriendRequests'}</h2>
{pendingReceived.map(req=>(
<divkey={req.id}className="bg-amber-50borderborder-amber-200rounded-xlp-3flexitems-centergap-3">
<divclassName="w-10h-10rounded-fullbg-[#2d6a4f]flexitems-centerjustify-centertext-whitetext-smfont-boldflex-shrink-0">
{req.from_avatar_url?(
<imgsrc={req.from_avatar_url}alt=""className="w-fullh-fullrounded-fullobject-cover"/>
):(
(req.from_display_name??'?').charAt(0).toUpperCase()
)}
</div>
<divclassName="flex-1min-w-0">
<pclassName="text-smfont-mediumtext-gray-900truncate">
{req.from_display_name??(isRtl?'משתמש':'User')}
</p>
{req.from_username&&<pclassName="text-xstext-gray-400">@{req.from_username}</p>}
<pclassName="text-[10px]text-amber-600mt-0.5">{isRtl?'מבקשחברות':'Wantstobefriends'}</p>
</div>
<button
onClick={()=>acceptRequest(req.id,req.from_user_id)}
className="bg-[#2d6a4f]hover:bg-[#245a42]text-whitetext-xsfont-mediumpx-3py-1.5rounded-lgtransition-colors"
>
{isRtl?'אשר✓':'Accept'}
</button>
<button
onClick={()=>rejectRequest(req.id)}
className="text-gray-400hover:text-red-500transition-colorstext-lg"
>
×
</button>
</div>
))}
</div>
)}

{/*Friendslist*/}
<div>
<h2className="text-smfont-semiboldtext-gray-700mb-2">👥{isRtl?'חברים':'Friends'}({friends.length})</h2>
<FriendsListfriends={friends}isRtl={isRtl}/>
</div>

{/*PeopleYouMayKnow*/}
<PeopleYouMayKnowsuggestions={peopleYouMayKnow}loading={suggestionsLoading}isRtl={isRtl}onSendRequest={sendRequest}/>
</div>
</Layout>
)
}

//───FriendsList───────────────────────────────────────────
const FriendsList:React.FC<{friends:string[];isRtl:boolean}>=({friends,isRtl})=>{
const[profiles,setProfiles]=useState<Array<{id:string;display_name:string|null;username:string|null;avatar_url:string|null}>>([])

const[loadingProfiles,setLoadingProfiles]=useState(true)
const navigate=useNavigate()

useEffect(()=>{
if(friends.length===0){setLoadingProfiles(false);return}
supabase.from('user_profiles').select('id,display_name,username,avatar_url').in('id',friends)
.then(({data})=>{setProfiles(data??[]);setLoadingProfiles(false)})
},[friends])

if(loadingProfiles){
return<divclassName="space-y-2animate-pulse">{[0,1,2].map(i=><divkey={i}className="h-14bg-gray-100rounded-xl"/>)}</div>
}

if(friends.length===0){
return(
<divclassName="text-centerpy-12">
<spanclassName="text-5xlblockmb-3">👥</span>
<pclassName="text-smtext-gray-500">{isRtl?'עדייןאיןחברים.חפשוגלהאנשים!':'Nofriendsyet.Searchanddiscoverpeople!'}</p>
</div>
)
}


return(
<divclassName="space-y-2">
{profiles.map(friend=>(
<button
key={friend.id}
onClick={()=>navigate(`/user/${friend.id}`)}
className="bg-whiterounded-xlshadowp-3flexitems-centergap-3w-fulltext-lefthover:bg-green-50transition-colors"
>
<divclassName="w-10h-10rounded-fullbg-[#2d6a4f]flexitems-centerjustify-centertext-whitetext-smfont-boldflex-shrink-0">
{friend.avatar_url?(
<imgsrc={friend.avatar_url}alt=""className="w-fullh-fullrounded-fullobject-cover"/>
):(
(friend.display_name??'?').charAt(0).toUpperCase()
)}
</div>
<divclassName="min-w-0">
<pclassName="text-smfont-mediumtext-gray-900truncate">{friend.display_name??(isRtl?'חבר':'Friend')}</p>
{friend.username&&<pclassName="text-xstext-gray-400">@{friend.username}</p>}
</div>
<spanclassName="text-xstext-green-600flex-shrink-0mr-auto">✓{isRtl?'חברים':'Friends'}</span>
</button>
))}
</div>
)
}

//───UserSearch────────────────────────────────────────────
const UserSearch:React.FC<{isRtl:boolean}>=({isRtl})=>{
const[query,setQuery]=useState('')

const[results,setResults]=useState<Array<{id:string;username:string|null;display_name:string|null;avatar_url:string|null;email?:string|null}>>([])

const[searching,setSearching]=useState(false)
const navigate=useNavigate()
const debounceRef=useRef<ReturnType<typeofsetTimeout>|null>(null)

useEffect(()=>{
if(query.length<2){setResults([]);return}

setSearching(true)
if(debounceRef.current)clearTimeout(debounceRef.current)
debounceRef.current=setTimeout(async()=>{
const searchTerm=query.replace('@','').toLowerCase()

const{data}=awaitsupabase
.from('user_profiles')
.select('id,username,display_name,avatar_url,email')
.or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
.limit(8)

setResults(data??[])
setSearching(false)
},300)


return()=>{if(debounceRef.current)clearTimeout(debounceRef.current)}
},[query])


return(
<divclassName="relative">
<divclassName="relative">
<svgclassName={`absolutetop-2.5left-3w-4h-4text-gray-400`}fill="none"stroke="currentColor"viewBox="002424">
<pathstrokeLinecap="round"strokeLinejoin="round"strokeWidth={2}d="M2121l-6-6m2-5a77011-14077001140z"/>
</svg>
<input
type="text"
value={query}
onChange={e=>setQuery(e.target.value)}
placeholder={isRtl?'חפשלפי@usernameאושם...':'Searchby@usernameorname...'}
className={`w-fullborderborder-gray-300rounded-xlpy-2text-smfocus:outline-nonefocus:ring-2focus:ring-[#52b788]pl-9pr-3`}
dir="ltr"
/>
</div>

{/*Resultsdropdown*/}
{results.length>0&&(
<divclassName="absolutez-20w-fullmt-1bg-whiteborderborder-gray-200rounded-xlshadow-lgoverflow-hidden">
{results.map(user=>(
<button
key={user.id}
onClick={()=>{navigate(`/user/${user.id}`);setQuery('');setResults([])}}
className="flexitems-centergap-3px-4py-2.5w-fulltext-lefthover:bg-green-50transition-colors"
>
<divclassName="w-8h-8rounded-fullbg-[#2d6a4f]flexitems-centerjustify-centertext-whitetext-xsfont-boldflex-shrink-0">
{user.avatar_url?(
<imgsrc={user.avatar_url}alt=""className="w-fullh-fullrounded-fullobject-cover"/>
):(
(user.display_name??user.username??user.email??'?').charAt(0).toUpperCase()
)}
</div>
<divclassName="min-w-0">
<pclassName="text-smfont-mediumtext-gray-800truncate">{user.display_name??user.username??user.email??'—'}</p>
{user.username&&<pclassName="text-xstext-gray-400">@{user.username}</p>}
</div>
</button>
))}
</div>
)}

{searching&&query.length>=2&&(
<divclassName="absolutez-20w-fullmt-1bg-whiteborderborder-gray-200rounded-xlshadow-lgp-3text-center">
<spanclassName="text-xstext-gray-400">{isRtl?'מחפש...':'Searching...'}</span>
</div>
)}

{!searching&&query.length>=2&&results.length===0&&(
<divclassName="absolutez-20w-fullmt-1bg-whiteborderborder-gray-200rounded-xlshadow-lgp-3text-center">
<spanclassName="text-xstext-gray-400">{isRtl?'לאנמצאותוצאות':'Noresults'}</span>
</div>
)}
</div>
)
}

//───PeopleYouMayKnow────────────────────────────────────
interfacePeopleYouMayKnowProps{
suggestions:SuggestedUser[]
loading:boolean
isRtl:boolean
onSendRequest:(userId:string)=>void
}

const PeopleYouMayKnow:React.FC<PeopleYouMayKnowProps>=({suggestions,loading,isRtl,onSendRequest})=>{
const navigate=useNavigate()

const[sentIds,setSentIds]=useState<string[]>([])

if(loading)returnnull
if(suggestions.length===0)returnnull

const handleSendRequest=(userId:string)=>{
onSendRequest(userId)
setSentIds(prev=>[...prev,userId])
}


return(
<divclassName="space-y-2pt-4border-tborder-gray-100">
<h3className="text-smfont-semiboldtext-gray-700">
👥{isRtl?'אנשיםשאוליאתהמכיר':'Peopleyoumayknow'}
</h3>
<divclassName="flexgap-3overflow-x-autopb-2-mx-1px-1">
{suggestions.map(person=>(
<div
key={person.id}
className="flex-shrink-0w-28bg-whiterounded-xlshadowp-3flexflex-colitems-centergap-2text-center"
>
<button
onClick={()=>navigate(`/user/${person.id}`)}
className="w-12h-12rounded-fullbg-[#2d6a4f]flexitems-centerjustify-centertext-whitetext-smfont-boldflex-shrink-0hover:ring-2hover:ring-[#2d6a4f]/30transition-all"
>
{person.avatar_url?(
<imgsrc={person.avatar_url}alt=""className="w-fullh-fullrounded-fullobject-cover"/>
):(
(person.display_name??'?').charAt(0).toUpperCase()
)}
</button>
<pclassName="text-xsfont-mediumtext-gray-800truncatew-full">
{person.display_name??person.username??(isRtl?'משתמש':'User')}
</p>
{sentIds.includes(person.id)?(
<spanclassName="text-[10px]text-green-600font-medium">
{isRtl?'✓נשלח':'✓Sent'}
</span>
):(
<button
onClick={()=>handleSendRequest(person.id)}
className="text-[10px]bg-[#2d6a4f]hover:bg-[#245a42]text-whitepx-2py-1rounded-mdtransition-colorsfont-medium"
>
{isRtl?'הצעחברות':'AddFriend'}
</button>
)}
</div>
))}
</div>
</div>
)
}

exportdefaultCommunityPage
