import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import html2canvas from 'html2canvas'
import type { Tree } from '../hooks/useTrees'

interface ShareCardProps {
  tree: Tree
  speciesName: string | null
  photos: { id: string; url: string }[]
  onClose: () => void
}

type Step = 'select' | 'preview'

const ShareCard: React.FC<ShareCardProps> = ({ tree, speciesName, photos, onClose }) => {
  const { t, i18n } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step>('select')
  const [selectedIds, setSelectedIds] = useState<string[]>(photos.length > 0 ? [photos[0].id] : [])
  const [sharing, setSharing] = useState(false)
  const isRtl = i18n.language === 'he'

  const togglePhoto = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 4 ? [...prev, id] : prev
    )
  }

  const selectedPhotos = photos.filter(p => selectedIds.includes(p.id))

  const handleShare = async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
      })

      canvas.toBlob(async (blob) => {
        if (!blob) { setSharing(false); return }

        const file = new File([blob], `${tree.custom_name}-bonsai.png`, { type: 'image/png' })

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: tree.custom_name,
            text: isRtl
              ? `🌿 ${tree.custom_name} - אוסף הבונסאי שלי`
              : `🌿 ${tree.custom_name} - My Bonsai Collection`,
            files: [file],
          })
        } else {
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

  // ─── Step 1: Photo selection ───
  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900" dir={isRtl ? 'rtl' : 'ltr'}>
              📤 {isRtl ? 'בחר תמונות לשיתוף' : 'Select photos to share'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>

          {/* Photo grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {photos.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                {isRtl ? 'אין תמונות לשיתוף' : 'No photos to share'}
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3" dir={isRtl ? 'rtl' : 'ltr'}>
                  {isRtl ? `נבחרו ${selectedIds.length}/4 תמונות` : `${selectedIds.length}/4 selected`}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(photo => {
                    const isSelected = selectedIds.includes(photo.id)
                    return (
                      <button
                        key={photo.id}
                        onClick={() => togglePhoto(photo.id)}
                        className={`aspect-square rounded-lg overflow-hidden border-3 transition-all relative ${
                          isSelected ? 'border-[#2d6a4f] ring-2 ring-[#52b788]' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-[#2d6a4f] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
                            {selectedIds.indexOf(photo.id) + 1}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={() => setStep('preview')}
              disabled={selectedIds.length === 0}
              className="flex-1 bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-40 text-sm"
            >
              {isRtl ? 'המשך →' : 'Next →'}
            </button>
            <button onClick={onClose} className="px-4 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 2: Preview & Share ───
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* The card that gets captured */}
        <div ref={cardRef} className="rounded-2xl overflow-hidden shadow-2xl aspect-square relative">
          {/* Photo background */}
          {selectedPhotos.length === 1 ? (
            <img src={selectedPhotos[0].url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className={`w-full h-full grid gap-0.5 ${
              selectedPhotos.length === 2 ? 'grid-cols-2' :
              selectedPhotos.length === 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2 grid-rows-2'
            }`}>
              {selectedPhotos.map((photo, i) => (
                <img
                  key={i}
                  src={photo.url}
                  alt=""
                  className={`w-full h-full object-cover ${
                    selectedPhotos.length === 3 && i === 0 ? 'row-span-2' : ''
                  }`}
                  crossOrigin="anonymous"
                />
              ))}
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Text overlay */}
          <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-white" dir={isRtl ? 'rtl' : 'ltr'}>
            <h2 className="text-2xl font-bold drop-shadow-lg mb-1">{tree.custom_name}</h2>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm opacity-90 drop-shadow">
              {speciesName && <span>🌳 {speciesName}</span>}
              {tree.age_years && <span>🗓️ {tree.age_years} {isRtl ? 'שנים' : 'yrs'}</span>}
              {tree.style && <span>✨ {t(`style.${tree.style}`)}</span>}
            </div>
            <p className="text-[10px] text-white/60 mt-2 drop-shadow">🌿 Bonsai Manager</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm"
          >
            {sharing ? '...' : (isRtl ? '📤 שתף' : '📤 Share')}
          </button>
          <button
            onClick={() => setStep('select')}
            className="px-4 border border-white/30 text-white py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            ← {isRtl ? 'חזור' : 'Back'}
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-white/30 text-white py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShareCard
