import React, { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePhotos } from '../hooks/usePhotos'
import { sortPhotosByDate } from '../lib/photo-utils'
import { isImageSizeValid } from '../lib/photo-utils'

interface Props {
  treeId: string
  onCoverPhotoChange?: (photoId: string) => void
}

const today = () => new Date().toISOString().split('T')[0]

const PhotoTimelineSection: React.FC<Props> = ({ treeId, onCoverPhotoChange }) => {
  const { t } = useTranslation()
  const { photos, loading, error, uploadPhoto, deletePhoto, setCoverPhoto } = usePhotos(treeId)

  const [showForm, setShowForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileSizeError, setFileSizeError] = useState(false)
  const [photoDate, setPhotoDate] = useState(today())
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setSelectedFile(null)
    setPhotoDate(today())
    setCaption('')
    setFileSizeError(false)
    setUploadError('')
  }

  const handleFileSelect = (file: File) => {
    if (!isImageSizeValid(file)) {
      setFileSizeError(true)
      setSelectedFile(null)
      return
    }
    setFileSizeError(false)
    setSelectedFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setUploadError('')
    try {
      const photo = await uploadPhoto(selectedFile, {
        photo_date: photoDate,
        caption: caption || undefined,
      })
      if (photo.is_cover && onCoverPhotoChange) {
        onCoverPhotoChange(photo.id)
      }
      resetForm()
      setShowForm(false)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'FILE_TOO_LARGE') {
        setUploadError(t('photo.fileTooLarge'))
      } else {
        setUploadError(err instanceof Error ? err.message : t('common.error'))
      }
    } finally {
      setUploading(false)
    }
  }

  const handleSetCover = async (photoId: string) => {
    try {
      await setCoverPhoto(photoId)
      if (onCoverPhotoChange) onCoverPhotoChange(photoId)
    } catch {
      // silently ignore; state is rolled back in the hook
    }
  }

  const handleDelete = async (photoId: string) => {
    try {
      await deletePhoto(photoId)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const sorted = sortPhotosByDate(photos, sortDir)

  return (
    <div>
      {/* Heading + controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-[#2d6a4f]">
          {t('tabs.photos')}
        </h2>
        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            {sortDir === 'desc' ? t('photo.newestFirst') : t('photo.oldestFirst')}
          </button>
          {/* Add photo button */}
          <button
            onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
            className="text-sm bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {showForm ? t('common.cancel') : t('photo.addPhoto')}
          </button>
        </div>
      </div>

      {/* Upload form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 space-y-3">
          {/* Drag & drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-[#2d6a4f] bg-green-100'
                : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-[#2d6a4f] bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />
            {selectedFile ? (
              <p className="text-sm text-green-700 font-medium">{selectedFile.name}</p>
            ) : (
              <p className="text-sm text-gray-500">{t('photo.dropOrClick')}</p>
            )}
          </div>
          {fileSizeError && (
            <p className="text-xs text-red-600">{t('photo.fileTooLarge')}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('photo.date')}
              </label>
              <input
                type="date"
                value={photoDate}
                onChange={e => setPhotoDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>
            {/* Caption */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('photo.caption')} <span className="text-gray-400">({t('common.optional')})</span>
              </label>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>
          </div>

          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}

          {/* Progress indicator */}
          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-[#2d6a4f] h-1.5 rounded-full animate-pulse w-2/3" />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
              disabled={uploading}
              className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="text-sm bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {uploading ? t('common.loading') : t('photo.upload')}
            </button>
          </div>
        </form>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="aspect-square bg-gray-200 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-6">
          {t('photo.noPhotos')}
        </p>
      )}

      {/* Photo grid */}
      {!loading && sorted.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sorted.map(photo => (
            <div key={photo.id} className="group relative">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightboxPhotoId(photo.id)}>
                {photo.public_url ? (
                  <img
                    src={photo.public_url}
                    alt={photo.caption ?? photo.photo_date}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                    🖼️
                  </div>
                )}

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {/* Set cover */}
                  <button
                    onClick={() => handleSetCover(photo.id)}
                    title={t('photo.setCover')}
                    className={`p-1.5 rounded-full text-lg transition-transform hover:scale-110 ${
                      photo.is_cover ? 'bg-yellow-400' : 'bg-white/80'
                    }`}
                    aria-label={t('photo.setCover')}
                  >
                    ⭐
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDeleteId(photo.id)}
                    title={t('common.delete')}
                    className="p-1.5 bg-white/80 rounded-full text-red-500 hover:bg-red-100 transition-colors text-sm font-bold leading-none"
                    aria-label={t('common.delete')}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Date + caption */}
              <div className="mt-1 px-0.5">
                <p className="text-xs text-gray-500">{photo.photo_date}</p>
                {photo.caption && (
                  <p className="text-xs text-gray-700 truncate">{photo.caption}</p>
                )}
                {photo.is_cover && (
                  <p className="text-xs text-yellow-600 font-medium">⭐ {t('photo.cover')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox - full screen photo viewer */}
      {lightboxPhotoId && (() => {
        const currentIndex = sorted.findIndex(p => p.id === lightboxPhotoId)
        const currentPhoto = sorted[currentIndex]
        if (!currentPhoto) return null
        const hasPrev = currentIndex > 0
        const hasNext = currentIndex < sorted.length - 1
        return (
          <div
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxPhotoId(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxPhotoId(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light z-10"
              aria-label={t('common.cancel')}
            >
              ×
            </button>

            {/* Previous button */}
            {hasPrev && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxPhotoId(sorted[currentIndex - 1].id) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl font-light z-10 p-2"
                aria-label="Previous"
              >
                ‹
              </button>
            )}

            {/* Next button */}
            {hasNext && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxPhotoId(sorted[currentIndex + 1].id) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl font-light z-10 p-2"
                aria-label="Next"
              >
                ›
              </button>
            )}

            {/* Image */}
            <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
              {currentPhoto.public_url ? (
                <img
                  src={currentPhoto.public_url}
                  alt={currentPhoto.caption ?? currentPhoto.photo_date}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-800 rounded-lg flex items-center justify-center text-5xl">🖼️</div>
              )}
              {/* Caption and date */}
              <div className="mt-3 text-center">
                <p className="text-white/90 text-sm">{currentPhoto.photo_date}</p>
                {currentPhoto.caption && (
                  <p className="text-white/70 text-xs mt-1">{currentPhoto.caption}</p>
                )}
                <p className="text-white/50 text-xs mt-1">{currentIndex + 1} / {sorted.length}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.confirm')}</h3>
            <p className="text-sm text-gray-600 mb-6">{t('common.deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {t('common.yes')}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.no')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoTimelineSection
