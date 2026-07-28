export interface Photo {
  id: string
  tree_id: string
  user_id: string
  storage_path: string
  public_url: string | null
  photo_date: string
  caption: string | null
  is_cover: boolean
  treatment_log_id: string | null
  created_at: string
}

export function sortPhotosByDate(photos: Photo[], direction: 'asc' | 'desc'): Photo[] {
  return [...photos].sort((a, b) => {
    const diff = new Date(a.photo_date).getTime() - new Date(b.photo_date).getTime()
    return direction === 'asc' ? diff : -diff
  })
}

export function applyNewCoverPhoto(photos: Photo[], newCoverId: string): Photo[] {
  return photos.map(p => ({ ...p, is_cover: p.id === newCoverId }))
}

export function isImageSizeValid(file: File): boolean {
  return file.size <= 10 * 1024 * 1024 // 10MB
}

/**
 * Compress an image file to max 1200px width, 80% JPEG quality.
 * Returns a Blob ready for upload.
 */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
