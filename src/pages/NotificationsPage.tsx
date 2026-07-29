import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useNotifications, type Notification } from '../hooks/useNotifications'
import { renderAvatar } from '../components/AvatarPicker'

function timeAgo(dateStr: string, isRtl: boolean): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return isRtl ? 'עכשיו' : 'now'
  if (diffMin < 60) return isRtl ? `לפני ${diffMin} דק׳` : `${diffMin}m ago`
  if (diffHours < 24) return isRtl ? `לפני ${diffHours} שע׳` : `${diffHours}h ago`
  if (diffDays < 7) return isRtl ? `לפני ${diffDays} ימים` : `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getNotificationText(n: Notification, isRtl: boolean): string {
  const name = n.from_display_name ?? (isRtl ? 'משתמש' : 'User')
  const treeName = n.tree_name ?? (isRtl ? 'עץ' : 'tree')

  switch (n.type) {
    case 'like':
      return isRtl ? `${name} אהב/ה את ${treeName}` : `${name} liked ${treeName}`
    case 'comment':
      return isRtl
        ? `${name} הגיב/ה על ${treeName}${n.text ? ': ' + n.text : ''}`
        : `${name} commented on ${treeName}${n.text ? ': ' + n.text : ''}`
    case 'friend_request':
      return isRtl ? `${name} שלח/ה לך בקשת חברות` : `${name} sent you a friend request`
    case 'friend_accepted':
      return isRtl ? `${name} אישר/ה את בקשת החברות` : `${name} accepted your friend request`
    default:
      return ''
  }
}

const NotificationsPage: React.FC = () => {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const isRtl = i18n.language === 'he'
  const { notifications, unreadCount, markAsRead, markAllRead, loading } = useNotifications()

  const handleClick = (n: Notification) => {
    markAsRead(n.id)
    switch (n.type) {
      case 'like':
      case 'comment':
        if (n.tree_id) {
          navigate(`/trees/${n.tree_id}`)
        } else {
          navigate('/community')
        }
        break
      case 'friend_request':
        navigate('/community')
        break
      case 'friend_accepted':
        if (n.from_user_id) navigate(`/user/${n.from_user_id}`)
        break
    }
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">
            🔔 {isRtl ? 'הודעות' : 'Notifications'}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-green-700 hover:text-green-900 font-medium"
            >
              {isRtl ? 'סמן הכל כנקרא' : 'Mark all as read'}
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && notifications.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">🔔</div>
            <p>{isRtl ? 'אין הודעות עדיין' : 'No notifications yet'}</p>
          </div>
        )}

        {/* Notification list */}
        {!loading && notifications.length > 0 && (
          <div className="space-y-1">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-${isRtl ? 'right' : 'left'} transition-colors ${
                  n.read ? 'bg-white hover:bg-gray-50' : 'bg-green-50 hover:bg-green-100'
                }`}
              >
                {/* Unread indicator */}
                <div className="flex-shrink-0 pt-2">
                  {!n.read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                  {n.read && <div className="w-2.5 h-2.5" />}
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  {renderAvatar(n.from_avatar_url, n.from_display_name, 'w-10 h-10', 'text-sm')}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">
                    {getNotificationText(n, isRtl)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {timeAgo(n.created_at, isRtl)}
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

export default NotificationsPage
