import React,{useState,useEffect} from 'react'
import {useParams,useNavigate} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import Layoutfrom '../components/Layout'
import {supabase} from '../lib/supabase-client'
import {useAuth} from '../contexts/AuthContext'
import {useFriends} from '../hooks/useFriends'
import {useUserLevel} from '../hooks/useUserLevel'
import AvatarPicker,{renderAvatar} from '../components/AvatarPicker'

interfaceUserProfile{
id:string
display_name:string|null
username:string|null
bio:string|null
avatar_url:string|null
is_public:boolean
}

interfacePublicTree{
id:string
custom_name:string
species_free_text:string|null
cover_photo_url:string|null
age_years:number|null
style:string|null
location:string|null
likes_count:number
}

const UserProfilePage:React.FC=()=>{
const{id}=useParams<{id:string}>()

const{i18n}=useTranslation()
const isRtl=i18n.language==='he'
const navigate=useNavigate()

const{user}=useAuth()

const{isFriend,hasPendingSent,sendRequest,removeFriend,cancelRequest}=useFriends()

const{level}=useUserLevel(id)

const[showAvatarPicker,setShowAvatarPicker]=useState(false)


const[profile,setProfile]=useState<UserProfile|null>(null)

const[trees,setTrees]=useState<PublicTree[]>([])

const[followersCount,setFollowersCount]=useState(0)

const[totalTreesCount,setTotalTreesCount]=useState(0)

const[loading,setLoading]=useState(true)

const[error,setError]=useState<string|null>(null)

const isOwnProfile=user?.id===id

useEffect(()=>{
if(!id)
return
setLoading(true)
setError(null)

const fetchProfile=async()=>{
try{
//Fetchuserprofile
const{data:profileData,error:profileError}=awaitsupabase
.from('user_profiles')
.select('id,display_name,bio,avatar_url,is_public')
.eq('id',id)
.single()

if(profileError)throwprofileError
setProfile(profileData)

//Fetchtrees(allforownprofileorfriends,publiconlyforothers)
lettreesQuery=supabase
.from('trees')
.select('id,custom_name,species_free_text,cover_photo_id,age_years,style,location,likes_count')
.eq('user_id',id)
if(id!==user?.id){
//Checkifwe'refriends—ifsoshowall,otherwisepubliconly
const{data:friendCheck}=awaitsupabase
.from('friend_requests')
.select('id')
.eq('status','accepted')
.or(`and(from_user_id.eq.${user?.id},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${user?.id})`)
.limit(1)

if(!friendCheck||friendCheck.length===0){
treesQuery=treesQuery.eq('is_public',true)
}
}

const{data:treesData}=awaittreesQuery

//CountALLtreesforstats(regardlessofpublic/friendstatus)

const{count:allTreesCount}=awaitsupabase
.from('trees')
.select('*',{count:'exact',head:true})
.eq('user_id',id)
setTotalTreesCount(allTreesCount??0)

//GetcoverphotoURLsfortrees
const treesWithPhotos:PublicTree[]=[]
for (const treeoftreesData??[]){
letcoverUrl:string|null=null
if(tree.cover_photo_id){
const{data:photo}=awaitsupabase
.from('photos')
.select('storage_path')
.eq('id',tree.cover_photo_id)
.single()
if(photo){
const{data:signed}=awaitsupabase.storage
.from('bonsai-photos')
.createSignedUrl(photo.storage_path,86400)
if(signed?.signedUrl)coverUrl=signed.signedUrl
}
}
//Ifnocover_photo_id,trytogetthefirstphotomarkedascover
if(!coverUrl){
const{data:coverPhotos}=awaitsupabase
.from('photos')
.select('storage_path')
.eq('tree_id',tree.id)
.eq('is_cover',true)
.limit(1)
if(coverPhotos&&coverPhotos.length>0){
const{data:signed}=awaitsupabase.storage
.from('bonsai-photos')
.createSignedUrl(coverPhotos[0].storage_path,86400)
if(signed?.signedUrl)coverUrl=signed.signedUrl
}
}
treesWithPhotos.push({
id:tree.id,
custom_name:tree.custom_name,
species_free_text:tree.species_free_text,
cover_photo_url:coverUrl,
age_years:tree.age_years??null,
style:tree.style??null,
location:tree.location??null,
likes_count:tree.likes_count??0,
})
}
setTrees(treesWithPhotos)

//Fetchfriendscount(acceptedrequestsinbothdirections)

const{count:friendsCount}=awaitsupabase
.from('friend_requests')
.select('*',{count:'exact',head:true})
.eq('status','accepted')
.or(`from_user_id.eq.${id},to_user_id.eq.${id}`)
setFollowersCount(friendsCount??0)
}catch(err){
setError(errinstanceofError?err.message:(isRtl?'שגיאהבטעינה':'Failedtoload'))
}finally{
setLoading(false)
}
}

fetchProfile()
},[id,isRtl])

const handleFriendAction=async()=>{
if(!id)
return
if(isFriend(id)){
awaitremoveFriend(id)
setFollowersCount(prev=>Math.max(0,prev-1))
}elseif(hasPendingSent(id)){
//Cancelpendingrequest
awaitcancelRequest(id)
}else{
awaitsendRequest(id)
}
}

if(loading){
return(
<Layout>
<divclassName="max-w-2xlmx-autospace-y-4animate-pulse">
<divclassName="flexitems-centergap-4p-6bg-whiterounded-2xl">
<divclassName="w-16h-16rounded-fullbg-gray-200"/>
<divclassName="space-y-2flex-1">
<divclassName="h-5bg-gray-200roundedw-32"/>
<divclassName="h-3bg-gray-100roundedw-48"/>
</div>
</div>
<divclassName="gridgrid-cols-2gap-3">
<divclassName="h-32bg-gray-100rounded-xl"/>
<divclassName="h-32bg-gray-100rounded-xl"/>
</div>
</div>
</Layout>
)
}

if(error||!profile){
return(
<Layout>
<divclassName="max-w-2xlmx-autotext-centerpy-20">
<pclassName="text-red-600text-smmb-4">{error||(isRtl?'משתמשלאנמצא':'Usernotfound')}</p>
<buttononClick={()=>navigate('/community')}className="text-[#2d6a4f]hover:underlinetext-sm">
←{isRtl?'חזרהלקהילה':'BacktoCommunity'}
</button>
</div>
</Layout>
)
}


return(
<Layout>
<divclassName="max-w-2xlmx-autospace-y-4">
{/*Profileheader*/}
<divclassName="bg-whiterounded-2xlshadowp-5">
<divclassName="flexitems-centergap-4">
{/*Avatar*/}
<divclassName="relative">
{isOwnProfile?(
<buttononClick={()=>setShowAvatarPicker(true)}className="w-16h-16rounded-fullflex-shrink-0relativegroup">
{renderAvatar(profile.avatar_url,profile.display_name,'w-16h-16','text-xl')}
<divclassName="absoluteinset-0rounded-fullbg-black/30flexitems-centerjustify-centeropacity-0group-hover:opacity-100transition-opacity">
<spanclassName="text-whitetext-sm">📷</span>
</div>
</button>
):(
<divclassName="w-16h-16rounded-fullbg-[#2d6a4f]flexitems-centerjustify-centertext-whitetext-xlfont-boldflex-shrink-0">
{profile.avatar_url?(
<imgsrc={profile.avatar_url}alt=""className="w-fullh-fullrounded-fullobject-cover"/>
):(
(profile.display_name??'?').charAt(0).toUpperCase()
)}
</div>
)}
</div>

{/*Info*/}
<divclassName="flex-1min-w-0">
<h1className="text-lgfont-boldtext-gray-900truncate">
{level&&<spanclassName="mr-1">{level.icon}</span>}
{profile.display_name??(isRtl?'משתמש':'User')}
</h1>
{profile.username&&(
<pclassName="text-xstext-gray-400">@{profile.username}</p>
)}
{profile.bio&&(
<pclassName="text-smtext-gray-600mt-0.5">{profile.bio}</p>
)}
</div>
</div>

{/*Stats*/}
<divclassName="flexitems-centergap-6mt-4pt-4border-tborder-gray-100">
<divclassName="text-center">
<pclassName="text-lgfont-boldtext-[#2d6a4f]">{totalTreesCount}</p>
<pclassName="text-[11px]text-gray-500">{isRtl?'עצים':'Trees'}</p>
</div>
<divclassName="text-center">
<pclassName="text-lgfont-boldtext-[#2d6a4f]">{followersCount}</p>
<pclassName="text-[11px]text-gray-500">{isRtl?'חברים':'Friends'}</p>
</div>
{/*Friendactionbutton*/}
{!isOwnProfile&&(
<divclassName="flex-1flexjustify-end">
<button
onClick={handleFriendAction}
className={`px-4py-2rounded-lgtext-smfont-mediumtransition-colors${
isFriend(id!)
?'bg-gray-100text-gray-700hover:bg-red-50hover:text-red-600'
:hasPendingSent(id!)
?'bg-amber-50text-amber-600hover:bg-red-50hover:text-red-500'
:'bg-[#2d6a4f]text-whitehover:bg-[#245a42]'
}`}
>
{isFriend(id!)
?(isRtl?'חברים✓':'Friends✓')
:hasPendingSent(id!)
?(isRtl?'ממתיןלאישור⏳':'Pending⏳')
:(isRtl?'הצעחברות🤝':'AddFriend🤝')
}
</button>
</div>
)}
</div>
</div>

{/*Trees—onlyvisibletofriendsorself*/}
{(isOwnProfile||isFriend(id!))?(
<div>
<h2className="text-smfont-semiboldtext-gray-700mb-3">
🌳{isRtl?'העצים':'Trees'}({trees.length})
</h2>
{trees.length===0?(
<divclassName="bg-whiterounded-xlp-6text-center">
<pclassName="text-smtext-gray-400">
{isRtl?'איןעציםעדיין':'Notreesyet'}
</p>
</div>
):(
<divclassName="space-y-4">
{trees.map(tree=>(
<FriendTreeCardkey={tree.id}tree={tree}isRtl={isRtl}userId={user?.id??null}treeOwnerId={id!}/>
))}
</div>
)}
</div>
):(
<divclassName="bg-gray-50rounded-xlp-6text-center">
<spanclassName="text-3xlblockmb-2">🔒</span>
<pclassName="text-smtext-gray-500">
{isRtl?'הוסףכחברכדילראותאתהעצים':'Addasfriendtoseetheirtrees'}
</p>
</div>
)}

{/*Backbutton*/}
<button
onClick={()=>navigate('/community')}
className="text-smtext-[#2d6a4f]hover:underline"
>
←{isRtl?'חזרהלקהילה':'BacktoCommunity'}
</button>

{/*Avatarpicker(ownprofileonly)*/}
{showAvatarPicker&&isOwnProfile&&(
<AvatarPicker
currentAvatarUrl={profile.avatar_url}
onUpdate={(url)=>{setProfile(prev=>prev?{...prev,avatar_url:url}:prev);setShowAvatarPicker(false)}}
onClose={()=>setShowAvatarPicker(false)}
/>
)}
</div>
</Layout>
)
}

//───FriendTreeCard(withIDcardinfo+likes/comments+lightbox)───
const FriendTreeCard:React.FC<{tree:PublicTree;isRtl:boolean;userId:string|null;treeOwnerId:string}>=({tree,isRtl,userId,treeOwnerId})=>{
const{t}=useTranslation()

const[likes,setLikes]=useState(tree.likes_count)

const[likedByMe,setLikedByMe]=useState(false)

const[showComments,setShowComments]=useState(false)

const[commentsCount,setCommentsCount]=useState(0)

const[lightboxOpen,setLightboxOpen]=useState(false)

useEffect(()=>{
if(!userId)
return
supabase.from('tree_likes').select('tree_id').eq('tree_id',tree.id).eq('user_id',userId).maybeSingle()
.then(({data})=>setLikedByMe(!!data))
supabase.from('tree_comments').select('*',{count:'exact',head:true}).eq('tree_id',tree.id)
.then(({count})=>setCommentsCount(count??0))
},[tree.id,userId])

const handleToggleLike=async()=>{
if(!userId)
return
if(likedByMe){
awaitsupabase.from('tree_likes').delete().eq('tree_id',tree.id).eq('user_id',userId)
awaitsupabase.from('trees').update({likes_count:Math.max(0,likes-1)}).eq('id',tree.id)
setLikes(prev=>Math.max(0,prev-1))
setLikedByMe(false)
}else{
awaitsupabase.from('tree_likes').insert({tree_id:tree.id,user_id:userId})
awaitsupabase.from('trees').update({likes_count:likes+1}).eq('id',tree.id)
setLikes(prev=>prev+1)
setLikedByMe(true)
if(treeOwnerId!==userId){
supabase.from('notifications').insert({user_id:treeOwnerId,type:'like',from_user_id:userId,tree_id:tree.id}).then(()=>{})
}
}
}


return(
<>
<divclassName="bg-whiterounded-2xlshadowoverflow-hidden">
{/*Photo*/}
<div
className="aspect-[4/3]bg-gray-100relativecursor-pointer"
onDoubleClick={()=>tree.cover_photo_url&&setLightboxOpen(true)}
>
{tree.cover_photo_url?(
<imgsrc={tree.cover_photo_url}alt={tree.custom_name}className="w-fullh-fullobject-cover"/>
):(
<divclassName="w-fullh-fullflexitems-centerjustify-centertext-5xltext-gray-300">🌳</div>
)}
</div>

{/*Treeinfo(IDcard)*/}
<divclassName="p-4space-y-2">
<h3className="text-basefont-boldtext-[#2d6a4f]">🪪{tree.custom_name}</h3>
<divclassName="flexflex-wrapgap-x-4gap-y-1">
{tree.species_free_text&&<spanclassName="text-xstext-gray-600">🌳{tree.species_free_text}</span>}
{tree.age_years&&<spanclassName="text-xstext-gray-600">🗓️{tree.age_years}{isRtl?'שנים':'yrs'}</span>}
{tree.style&&<spanclassName="text-xstext-gray-600">✨{tree.style}</span>}
{tree.location&&<spanclassName="text-xstext-gray-600">📍{tree.location}</span>}
</div>

{/*Likes+Comments*/}
<divclassName="flexitems-centergap-4pt-2border-tborder-gray-100">
<button
onClick={handleToggleLike}
className={`flexitems-centergap-1text-smfont-mediumtransition-colors${likedByMe?'text-red-500':'text-gray-400hover:text-red-400'}`}
>
{likedByMe?'❤️':'🤍'}{likes>0&&likes}
</button>
<button
onClick={()=>setShowComments(true)}
className="flexitems-centergap-1text-smfont-mediumtext-gray-400hover:text-[#2d6a4f]transition-colors"
>
💬{commentsCount>0&&commentsCount}
</button>
</div>
</div>
</div>

{/*Commentspopup*/}
{showComments&&(
<divclassName="fixedinset-0z-50flexitems-endsm:items-centerjustify-centerbg-black/40px-4pb-4"onClick={()=>setShowComments(false)}>
<divclassName="bg-whiterounded-2xlshadow-2xlw-fullmax-w-mdmax-h-[70vh]overflow-hiddenflexflex-col"onClick={e=>e.stopPropagation()}>
<divclassName="flexitems-centerjustify-betweenpx-5py-3border-bborder-gray-100">
<h3className="text-smfont-semiboldtext-gray-900">💬{isRtl?'תגובות':'Comments'}—{tree.custom_name}</h3>
<buttononClick={()=>setShowComments(false)}className="text-gray-400hover:text-gray-600text-xl">×</button>
</div>
<divclassName="flex-1overflow-y-autop-4">
<InlineCommentstreeId={tree.id}isRtl={isRtl}onCountChange={setCommentsCount}treeOwnerId={treeOwnerId}/>
</div>
</div>
</div>
)}

{/*Lightbox*/}
{lightboxOpen&&tree.cover_photo_url&&(
<divclassName="fixedinset-0z-50bg-black/90flexitems-centerjustify-center"onClick={()=>setLightboxOpen(false)}>
<imgsrc={tree.cover_photo_url}alt={tree.custom_name}className="max-w-fullmax-h-fullobject-contain"/>
<buttononClick={()=>setLightboxOpen(false)}className="absolutetop-4right-4text-whitetext-2xlbg-black/50w-10h-10rounded-fullflexitems-centerjustify-center">×</button>
</div>
)}
</>
)
}

//───InlineComments(forfriendtreecardpopup)──────────
const InlineComments:React.FC<{treeId:string;isRtl:boolean;onCountChange?:(c:number)=>void;treeOwnerId?:string}>=({treeId,isRtl,onCountChange,treeOwnerId})=>{
const[comments,setComments]=useState<Array<{id:string;user_id:string;text:string;created_at:string;name:string|null;avatar:string|null}>>([])

const[loading,setLoading]=useState(true)

const[newComment,setNewComment]=useState('')

const[submitting,setSubmitting]=useState(false)

const[longPressId,setLongPressId]=useState<string|null>(null)
const longPressTimer=React.useRef<ReturnType<typeofsetTimeout>|null>(null)
const navigate=useNavigate()

const{user}=useAuth()

useEffect(()=>{
supabase.from('tree_comments').select('*').eq('tree_id',treeId).order('created_at',{ascending:true})
.then(async({data})=>{
if(!data||data.length===0){setComments([]);setLoading(false);return}
const userIds=[...newSet(data.map(c=>c.user_id))]
const{data:profiles}=awaitsupabase.from('user_profiles').select('id,display_name,username,avatar_url').in('id',userIds)
setComments(data.map(c=>{
const p=(profiles??[]).find(pr=>pr.id===c.user_id)

return{...c,name:p?.display_name??p?.username??null,avatar:p?.avatar_url??null}
}))
setLoading(false)
})
},[treeId])

useEffect(()=>{if(onCountChange)onCountChange(comments.length)},[comments.length])

const handleSubmit=async(e:React.FormEvent)=>{
e.preventDefault()
if(!newComment.trim()||submitting)
return
setSubmitting(true)

const{data:userData}=awaitsupabase.auth.getUser()
if(!userData.user){setSubmitting(false);return}

const{data}=awaitsupabase.from('tree_comments').insert({tree_id:treeId,user_id:userData.user.id,text:newComment.trim()}).select().single()
if(data){
const{data:myProfile}=awaitsupabase.from('user_profiles').select('display_name,username,avatar_url').eq('id',userData.user.id).single()
setComments(prev=>[...prev,{...data,name:myProfile?.display_name??myProfile?.username??null,avatar:myProfile?.avatar_url??null}])
}
setNewComment('')
setSubmitting(false)
}

const handleLongPressStart=(commentId:string,commentUserId:string)=>{
if(user?.id!==commentUserId&&user?.id!==treeOwnerId)
return
longPressTimer.current=setTimeout(()=>setLongPressId(commentId),500)
}

const handleLongPressEnd=()=>{
if(longPressTimer.current){clearTimeout(longPressTimer.current);longPressTimer.current=null}
}

const handleDelete=async(commentId:string)=>{
awaitsupabase.from('tree_comments').delete().eq('id',commentId)
setComments(prev=>prev.filter(c=>c.id!==commentId))
setLongPressId(null)
}

if(loading)
return<divclassName="animate-pulseh-10bg-gray-100rounded"/>

return(
<divclassName="space-y-3">
{comments.length===0&&<pclassName="text-xstext-gray-400text-center">{isRtl?'איןתגובות':'Nocomments'}</p>}
{comments.map(c=>(
<div
key={c.id}
className="flexitems-startgap-2relative"
onTouchStart={()=>handleLongPressStart(c.id,c.user_id)}
onTouchEnd={handleLongPressEnd}
onTouchCancel={handleLongPressEnd}
onContextMenu={(e)=>{if(user?.id===c.user_id||user?.id===treeOwnerId){e.preventDefault();setLongPressId(c.id)}}}
>
<button
onClick={()=>navigate(`/user/${c.user_id}`)}
className="w-6h-6rounded-fullbg-[#2d6a4f]flexitems-centerjustify-centertext-whitetext-[10px]font-boldflex-shrink-0"
>
{c.avatar?<imgsrc={c.avatar}alt=""className="w-fullh-fullrounded-fullobject-cover"/>:(c.name??'?').charAt(0).toUpperCase()}
</button>
<divclassName="flex-1min-w-0">
<pclassName="text-xs"><spanclassName="font-mediumtext-gray-800">{c.name??(isRtl?'משתמש':'User')}</span></p>
<pclassName="text-xstext-gray-600">{c.text}</p>
</div>
{/*Deletepopup*/}
{longPressId===c.id&&(
<divclassName="absolutetop-0right-0z-10bg-whiteborderborder-gray-200rounded-lgshadow-lgpy-1px-1">
<buttononClick={()=>handleDelete(c.id)}className="flexitems-centergap-1.5px-3py-1.5text-xstext-red-600hover:bg-red-50roundedtransition-colors">
🗑️{isRtl?'מחק':'Delete'}
</button>
<buttononClick={()=>setLongPressId(null)}className="flexitems-centergap-1.5px-3py-1.5text-xstext-gray-500hover:bg-gray-50roundedtransition-colors">
✕{isRtl?'ביטול':'Cancel'}
</button>
</div>
)}
</div>
))}
<formonSubmit={handleSubmit}className="flexitems-centergap-2">
<input type="text"value={newComment}onChange={e=>setNewComment(e.target.value)}placeholder={isRtl?'הוסףתגובה...':'Addcomment...'}className="flex-1borderborder-gray-200rounded-fullpx-3py-1.5text-smoutline-nonefocus:ring-1focus:ring-[#2d6a4f]/30"maxLength={300}/>
<button type="submit"disabled={!newComment.trim()||submitting}className="bg-[#2d6a4f]text-whitetext-xspx-3py-1.5rounded-fulldisabled:opacity-40">{isRtl?'שלח':'Send'}</button>
</form>
</div>
)
}

exportdefaultUserProfilePage
