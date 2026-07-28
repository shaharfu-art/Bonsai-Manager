import React,{useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useCommunityPost} from '../hooks/useCommunity'
import type{Photo} from '../lib/photo-utils'

interfaceShareToCommunityDialogProps{
treeId:string
treeName:string
photos:Photo[]
onClose:()=>void
onSuccess?:()=>void
}

constShareToCommunityDialog:React.FC<ShareToCommunityDialogProps>=({treeId,treeName,photos,onClose,onSuccess})=>{
const{i18n}=useTranslation()
constisRtl=i18n.language==='he'
const{createPost,submitting}=useCommunityPost()

const[selectedPhotoId,setSelectedPhotoId]=useState<string|null>(photos[0]?.id??null)

const[text,setText]=useState('')

const[error,setError]=useState<string|null>(null)

const[success,setSuccess]=useState(false)

constphotosWithUrl=photos.filter(p=>p.public_url)

consthandleSubmit=async()=>{
setError(null)
try{
awaitcreatePost({
treeId,
photoId:selectedPhotoId??undefined,
text:text.trim()||undefined,
})
setSuccess(true)
setTimeout(()=>{
onSuccess?.()
onClose()
},1500)
}catch(err){
setError(errinstanceofError?err.message:(isRtl?'שגיאהבפרסום':'Failedtopublish'))
}
}


return(
<divclassName="fixedinset-0z-50flexitems-centerjustify-centerbg-black/40px-4"onClick={onClose}>
<divclassName="bg-whiterounded-2xlshadow-xlp-5max-w-mdw-fullmax-h-[85vh]overflow-y-auto"onClick={e=>e.stopPropagation()}>
{/*Header*/}
<divclassName="flexitems-centerjustify-betweenmb-4">
<h3className="text-basefont-semiboldtext-[#2d6a4f]">
📢{isRtl?'שתףלקהילה':'SharetoCommunity'}
</h3>
<buttononClick={onClose}className="text-gray-400hover:text-gray-600text-xl">×</button>
</div>

{success?(
<divclassName="text-centerpy-8">
<spanclassName="text-5xlblockmb-3">🎉</span>
<pclassName="text-smfont-mediumtext-green-700">
{isRtl?'פורסםבהצלחה!':'Publishedsuccessfully!'}
</p>
</div>
):(
<divclassName="space-y-4">
{/*Treeinfo*/}
<divclassName="bg-green-50rounded-lgp-3text-smtext-[#2d6a4f]font-medium">
🌳{treeName}
</div>

{/*Photoselection*/}
{photosWithUrl.length>0&&(
<div>
<labelclassName="text-xstext-gray-500mb-2block">
{isRtl?'בחרתמונה':'Chooseaphoto'}
</label>
<divclassName="gridgrid-cols-4gap-2">
{photosWithUrl.map(photo=>(
<button
key={photo.id}
onClick={()=>setSelectedPhotoId(photo.id===selectedPhotoId?null:photo.id)}
className={`aspect-squarerounded-lgoverflow-hiddenborder-2transition-colors${
photo.id===selectedPhotoId
?'border-[#2d6a4f]ring-2ring-[#2d6a4f]/30'
:'border-transparenthover:border-gray-300'
}`}
>
<imgsrc={photo.public_url!}alt=""className="w-fullh-fullobject-cover"/>
</button>
))}
</div>
</div>
)}

{/*Textinput*/}
<div>
<labelclassName="text-xstext-gray-500mb-1block">
{isRtl?'טקסט(אופציונלי)':'Text(optional)'}
</label>
<textarea
value={text}
onChange={e=>setText(e.target.value)}
placeholder={isRtl?'ספרעלהעץשלך...':'Tellaboutyourtree...'}
className="w-fullborderborder-gray-300rounded-lgpx-3py-2text-smresize-noneh-20focus:ring-2focus:ring-[#2d6a4f]/30focus:border-[#2d6a4f]outline-none"
maxLength={500}
/>
<pclassName="text-[10px]text-gray-400mt-0.5text-end">{text.length}/500</p>
</div>

{/*Noteaboutpublic*/}
<pclassName="text-[11px]text-gray-400text-center">
{isRtl
?'📌שיתוףיסמןאתהעץכציבורי'
:'📌Sharingwillmarkthistreeaspublic'}
</p>

{/*Error*/}
{error&&(
<pclassName="text-xstext-red-600text-center">{error}</p>
)}

{/*Actions*/}
<divclassName="flexgap-3pt-1">
<button
onClick={handleSubmit}
disabled={submitting}
className="flex-1bg-[#2d6a4f]hover:bg-[#245a42]text-whitefont-mediumtext-smpy-2.5rounded-lgtransition-colorsdisabled:opacity-60"
>
{submitting
?(isRtl?'מפרסם...':'Publishing...')
:(isRtl?'פרסם🚀':'Publish🚀')
}
</button>
<button
onClick={onClose}
disabled={submitting}
className="flex-1borderborder-gray-300text-gray-600text-smpy-2.5rounded-lghover:bg-gray-50transition-colors"
>
{isRtl?'ביטול':'Cancel'}
</button>
</div>
</div>
)}
</div>
</div>
)
}

exportdefaultShareToCommunityDialog
