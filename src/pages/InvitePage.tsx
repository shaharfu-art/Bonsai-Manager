import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const INVITE_KEY = 'inviter_user_id'

/**
 * /invite/:userId — saves the inviter's ID and redirects to install flow
 * Flow: invite link → install (PWA) → signup → dashboard with "X invited you!" banner
 */
const InvitePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (userId) {
      localStorage.setItem(INVITE_KEY, userId)
    }
    // Clear install-completed so wizard shows again for this new user
    localStorage.removeItem('install-completed')
    // Redirect to install page
    navigate('/install', { replace: true })
  }, [userId, navigate])

  return (
    <div className="min-h-screen bg-[#1a3d2b] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default InvitePage
