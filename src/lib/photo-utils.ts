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
