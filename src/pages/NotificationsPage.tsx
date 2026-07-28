import Reactfrom 'react'
import {useNavigate} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import Layoutfrom '../components/Layout'
import {useNotifications,typeNotification} from '../hooks/useNotifications'
import {renderAvatar} from '../components/AvatarPicker'

functiontimeAgo(dateStr:string,isRtl:boolean):string{
const now=Date.now()
const date=newDate(dateStr).getTime()
const diffMs=now-date
const diffMin=Math.floor(diffMs/60000)
const diffHours=Math.floor(diffMs/3600000)
const diffDays=Math.floor(diffMs/86400000)

if(diffMin<1)returnisRtl?'עכשיו':'now'
if(diffMin<60)returnisRtl?`לפני${diffMin}דק׳`:`${diffMin}mago`
if(diffHours<24)returnisRtl?`לפני${diffHours}שע׳`:`${diffHours}hago`
if(diffDays<7)returnisRtl?`לפני${diffDays}ימים`:`${diffDays}dago`
returnnewDate(dateStr).toLocaleDateString()
}

functiongetNotificationText(n:Notification,isRtl:boolean):string{
const name=n.from_display_name??(isRtl?'משתמש':'User')
const treeName=n.tree_name??(isRtl?'עץ':'tree')

switch(n.type){
case'like':
returnisRtl?`${name}אהב/האת${treeName}`:`${name}liked${treeName}`
case'comment':
returnisRtl
?`${name}הגיב/העל${treeName}${n.text?':'+n.text:''}`
:`${name}commentedon${treeName}${n.text?':'+n.text:''}`
case'friend_request':
returnisRtl?`${name}שלח/הלךבקשתחברות`:`${name}sentyouafriendrequest`
case'friend_accepted':
returnisRtl?`${name}אישר/האתבקשתהחברות`:`${name}acceptedyourfriendrequest`
default:
return''
}
}

const NotificationsPage:React.FC=()=>{
const{i18n}=useTranslation()
const navigate=useNavigate()
const isRtl=i18n.language==='he'
const{notifications,unreadCount,markAsRead,markAllRead,loading}=useNotifications()

const handleClick=(n:Notification)=>{
markAsRead(n.id)
switch(n.type){
case'like':
case'comment':
if(n.tree_id){
navigate(`/trees/${n.tree_id}`)
}else{
navigate('/community')
}
break
case'friend_request':
navigate('/community')
break
case'friend_accepted':
if(n.from_user_id)navigate(`/user/${n.from_user_id}`)
break
}
}


return(
<Layout>
<divclassName="max-w-lgmx-auto">
{/*Header*/}
<divclassName="flexitems-centerjustify-betweenmb-4">
<h1className="text-xlfont-boldtext-gray-800">
🔔{isRtl?'הודעות':'Notifications'}
</h1>
{unreadCount>0&&(
<button
onClick={markAllRead}
className="text-smtext-green-700hover:text-green-900font-medium"
>
{isRtl?'סמןהכלכנקרא':'Markallasread'}
</button>
)}
</div>

{/*Loading*/}
{loading&&(
<divclassName="flexjustify-centerpy-8">
<divclassName="w-8h-8border-4border-green-600border-t-transparentrounded-fullanimate-spin"/>
</div>
)}

{/*Emptystate*/}
{!loading&&notifications.length===0&&(
<divclassName="text-centerpy-12text-gray-500">
<divclassName="text-4xlmb-3">🔔</div>
<p>{isRtl?'איןהודעותעדיין':'Nonotificationsyet'}</p>
</div>
)}

{/*Notificationlist*/}
{!loading&&notifications.length>0&&(
<divclassName="space-y-1">
{notifications.map(n=>(
<button
key={n.id}
onClick={()=>handleClick(n)}
className={`w-fullflexitems-startgap-3p-3rounded-lgtext-${isRtl?'right':'left'}transition-colors${
n.read?'bg-whitehover:bg-gray-50':'bg-green-50hover:bg-green-100'
}`}
>
{/*Unreadindicator*/}
<divclassName="flex-shrink-0pt-2">
{!n.read&&(
<divclassName="w-2.5h-2.5rounded-fullbg-blue-500"/>
)}
{n.read&&<divclassName="w-2.5h-2.5"/>}
</div>

{/*Avatar*/}
<divclassName="flex-shrink-0">
{renderAvatar(n.from_avatar_url,n.from_display_name,'w-10h-10','text-sm')}
</div>

{/*Content*/}
<divclassName="flex-1min-w-0">
<pclassName="text-smtext-gray-800leading-snug">
{getNotificationText(n,isRtl)}
</p>
<pclassName="text-xstext-gray-500mt-1">
{timeAgo(n.created_at,isRtl)}
</p>
</div>
</button>
))}
</div>
)}
</div>
</Layout>
)
}

exportdefaultNotificationsPage
