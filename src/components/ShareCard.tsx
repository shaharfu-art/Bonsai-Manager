import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import html2canvas from 'html2canvas'
import type { Tree } from '../hooks/useTrees'

interface ShareCardProps {
  tree: Tree
  speciesName: string | null
  coverPhotoUrl: string | null
  recentPhotos: { url: string }[]
  onClose: () => void
}

const ShareCard: React.FC<ShareCardProps> = ({ tree, speciesName, coverPhotoUrl, recentPhotos, onClose }) => {
  const { t, i18n } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const isRtl = i18n.language === 'he'

  const handleShare = async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#1a1a2e',
      })

      canvas.toBlob(async (blob) => {
        if (!blob) return

        const file = new File([blob], `${tree.custom_name}-bonsai.png`, { type: 'image/png' })

        // Try Web Share API first (mobile)
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: tree.custom_name,
            text: isRtl
              ? `🌿 ${tree.custom_name} - אוסף הבונסאי שלי`
              : `🌿 ${tree.custom_name} - My Bonsai Collection`,
            files: [file],
          })
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${tree.custom_name}-bonsai.png`
          a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  const photos = recentPhotos.slice(0, 4)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* The actual card that gets captured */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1a2e1a 0%, #2d6a4f 50%, #52b788 100%)' }}
        >
          {/* Cover image */}
          <div className="h-48 relative overflow-hidden">
            {coverPhotoUrl ? (
              <img src={coverPhotoUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">🌿</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <h2 className="absolute bottom-3 left-4 right-4 text-white text-2xl font-bold drop-shadow-lg" dir={isRtl ? 'rtl' : 'ltr'}>
              {tree.custom_name}
            </h2>
          </div>

          {/* Info section */}
          <div className="px-5 py-4 space-y-3" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Tree details */}
            <div className="flex flex-wrap gap-3">
              {speciesName && (
                <span className="text-sm text-green-100">🌳 {speciesName}</span>
              )}
              {tree.age_years && (
                <span className="text-sm text-green-100">🗓️ {tree.age_years} {isRtl ? 'שנים' : 'years'}</span>
              )}
              {tree.style && (
                <span className="text-sm text-green-100">✨ {t(`style.${tree.style}`)}</span>
              )}
              {tree.location && (
                <span className="text-sm text-green-100">📍 {t(`location.${tree.location}`)}</span>
              )}
            </div>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div className={`grid gap-1.5 ${
                photos.length === 1 ? 'grid-cols-1' :
                photos.length === 2 ? 'grid-cols-2' :
                photos.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
              }`}>
                {photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo.url}
                    alt=""
                    className="w-full aspect-square object-cover rounded-lg"
                    crossOrigin="anonymous"
                  />
                ))}
              </div>
            )}

            {/* Branding */}
            <div className="flex items-center justify-between pt-2 border-t border-white/20">
              <span className="text-xs text-green-200 opacity-70">🌿 Bonsai Manager</span>
              <span className="text-xs text-green-200 opacity-50">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action buttons (not captured) */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm"
          >
            {sharing ? '...' : (isRtl ? '📤 שתף' : '📤 Share')}
          </button>
          <button
            onClick={onClose}
            className="px-5 border border-white/30 text-white py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShareCard
