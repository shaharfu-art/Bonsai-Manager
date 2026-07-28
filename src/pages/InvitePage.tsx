import React,{useEffect} from 'react'
import {useParams,useNavigate} from 'react-router-dom'

const INVITE_KEY='inviter_user_id'

/**
*/invite/:userId—savestheinviter'sIDandredirectstoinstallflow
*Flow:invitelink→install(PWA)→signup→dashboardwith"Xinvitedyou!"banner
*/
const InvitePage:React.FC=()=>{
const{userId}=useParams<{userId:string}>()
const navigate=useNavigate()

useEffect(()=>{
if(userId){
localStorage.setItem(INVITE_KEY,userId)
}
//Clearinstall-completedsowizardshowsagainforthisnewuser
localStorage.removeItem('install-completed')
//Redirecttoinstallpage
navigate('/install',{replace:true})
},[userId,navigate])


return(
<divclassName="min-h-screenbg-[#1a3d2b]flexitems-centerjustify-center">
<divclassName="w-8h-8border-3border-whiteborder-t-transparentrounded-fullanimate-spin"/>
</div>
)
}

exportdefaultInvitePage
