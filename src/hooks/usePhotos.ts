import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'
import { type Photo, applyNewCoverPhoto, isImageSizeValid } from '../lib/photo-utils'
import { cacheGet, cacheSet } from '../lib/cache'

async function getSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('bonsai-photos')
    .createSignedUrl(storagePath, 3600) // 1 hour expiry
  if (error) return null
  return data.signedUrl
}

interface UploadPhotoMetadata {
  photo_date: string
  caption?: string
  treatment_log_id?: string
}

interface UsePhotosResult {
  photos: Photo[]
  loading: boolean
  error: string | null
  uploadPhoto: (file: File, metadata: UploadPhotoMetadata) => Promise<Photo>
  deletePhoto: (photoId: string) => Promise<void>
  setCoverPhoto: (photoId: string) => Promise<void>
}

export function usePhotos(treeId: string): UsePhotosResult {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPhotos = useCallback(async () => {
    if (!treeId) return

    // Check cache first
    const cacheKey = `photos:${treeId}`
    const cached = cacheGet<Photo[]>(cacheKey)
    if (cached) {
      setPhotos(cached)
      setLoading(false)
      // Still refresh in background
    } else {
      setLoading(true)
    }

    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .eq('tree_id', treeId)
        .order('photo_date', { ascending: false })

      if (fetchError) throw fetchError

      // Enrich with signed URLs
      const enriched = await Promise.all(
        (data ?? []).map(async (photo) => {
          const signedUrl = await getSignedUrl(photo.storage_path)
          return { ...photo, public_url: signedUrl }
        })
      )
      setPhotos(enriched)
      cacheSet(cacheKey, enriched)
    } catch (err: unknown) {
      if (!cached) setError(err instanceof Error ? err.message : 'Failed to fetch photos')
    } finally {
      setLoading(false)
    }
  }, [treeId])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  const uploadPhoto = useCallback(async (file: File, metadata: UploadPhotoMetadata): Promise<Photo> => {
    if (!isImageSizeValid(file)) {
      throw new Error('FILE_TOO_LARGE')
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error('Not authenticated')

    const userId = userData.user.id
    const uuid = crypto.randomUUID()
    const storagePath = `${userId}/${treeId}/${uuid}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('bonsai-photos')
      .upload(storagePath, file)

    if (uploadError) throw uploadError

    // Use createSignedUrl instead of getPublicUrl (bucket is private)
    const { data: signedData } = await supabase.storage
      .from('bonsai-photos')
      .createSignedUrl(storagePath, 3600)
    const publicUrl = signedData?.signedUrl ?? null

    const { data, error: insertError } = await supabase
      .from('photos')
      .insert({
        tree_id: treeId,
        user_id: userId,
        storage_path: storagePath,
        public_url: publicUrl,
        photo_date: metadata.photo_date,
        caption: metadata.caption ?? null,
        is_cover: photos.length === 0,
        treatment_log_id: metadata.treatment_log_id ?? null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    const newPhoto = data as Photo
    setPhotos(prev => [newPhoto, ...prev])
    return newPhoto
  }, [treeId, photos.length])

  const deletePhoto = useCallback(async (photoId: string): Promise<void> => {
    const photoToDelete = photos.find(p => p.id === photoId)
    if (!photoToDelete) return

    setPhotos(prev => prev.filter(p => p.id !== photoId))

    try {
      const { error: storageError } = await supabase.storage
        .from('bonsai-photos')
        .remove([photoToDelete.storage_path])

      if (storageError) throw storageError

      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (deleteError) throw deleteError
    } catch (err) {
      setPhotos(prev => [...prev, photoToDelete].sort(
        (a, b) => new Date(b.photo_date).getTime() - new Date(a.photo_date).getTime()
      ))
      throw err
    }
  }, [photos])

  const setCoverPhoto = useCallback(async (photoId: string): Promise<void> => {
    const previous = [...photos]

    setPhotos(prev => applyNewCoverPhoto(prev, photoId))

    try {
      // Set all photos for this tree to is_cover=false
      const { error: resetError } = await supabase
        .from('photos')
        .update({ is_cover: false })
        .eq('tree_id', treeId)

      if (resetError) throw resetError

      // Set selected photo to is_cover=true
      const { error: setError } = await supabase
        .from('photos')
        .update({ is_cover: true })
        .eq('id', photoId)

      if (setError) throw setError
    } catch (err) {
      setPhotos(previous)
      throw err
    }
  }, [photos, treeId])

  return { photos, loading, error, uploadPhoto, deletePhoto, setCoverPhoto }
}
