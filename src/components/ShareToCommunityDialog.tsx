import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCommunityPost } from '../hooks/useCommunity'
import type { Photo } from '../lib/photo-utils'

interface ShareToCommunityDialogProps {
  treeId: string
  treeName: string
  photos: Photo[]
  onClose: () => void
  onSuccess?: () => void
}

const ShareToCommunityDialog: React.FC<ShareToCommunityDialogProps> = ({ treeId, treeName, photos, onClose, onSuccess }) => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'he'
  const { createPost, submitting } = useCommunityPost()

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(photos[0]?.id ?? null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const photosWithUrl = photos.filter(p => p.public_url)

  const handleSubmit = async () => {
    setError(null)
    try {
      await createPost({
        treeId,
        photoId: selectedPhotoId ?? undefined,
        text: text.trim() || undefined,
      })
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? 'שגיאה בפרסום' : 'Failed to publish'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#2d6a4f]">
            📢 {isRtl ? 'שתף לקהילה' : 'Share to Community'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <span className="text-5xl block mb-3">🎉</span>
            <p className="text-sm font-medium text-green-700">
              {isRtl ? 'פורסם בהצלחה!' : 'Published successfully!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tree info */}
            <div className="bg-green-50 rounded-lg p-3 text-sm text-[#2d6a4f] font-medium">
              🌳 {treeName}
            </div>

            {/* Photo selection */}
            {photosWithUrl.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-2 block">
                  {isRtl ? 'בחר תמונה' : 'Choose a photo'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {photosWithUrl.map(photo => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoId(photo.id === selectedPhotoId ? null : photo.id)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        photo.id === selectedPhotoId
                          ? 'border-[#2d6a4f] ring-2 ring-[#2d6a4f]/30'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img src={photo.public_url!} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text input */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                {isRtl ? 'טקסט (אופציונלי)' : 'Text (optional)'}
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={isRtl ? 'ספר על העץ שלך...' : 'Tell about your tree...'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f] outline-none"
                maxLength={500}
              />
              <p className="text-[10px] text-gray-400 mt-0.5 text-end">{text.length}/500</p>
            </div>

            {/* Note about public */}
            <p className="text-[11px] text-gray-400 text-center">
              {isRtl
                ? '📌 שיתוף יסמן את העץ כציבורי'
                : '📌 Sharing will mark this tree as public'}
            </p>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-600 text-center">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {submitting
                  ? (isRtl ? 'מפרסם...' : 'Publishing...')
                  : (isRtl ? 'פרסם 🚀' : 'Publish 🚀')
                }
              </button>
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-600 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isRtl ? 'ביטול' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShareToCommunityDialog
