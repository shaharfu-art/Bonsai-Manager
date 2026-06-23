import { supabase } from './supabase-client'

const VAPID_PUBLIC_KEY = 'BJXuaCbSz4ncgV65nUpvHQHGM8txH1-_Ii5F_GCsYB4G6JxE8w0fv3AM0zWjS1yorXFtWG3940GHCeTD32Ov4tU'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendLocalNotification(title: string, body: string, icon = '/favicon.svg') {
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon })
}

/**
 * Subscribe to Web Push notifications and save the subscription in the DB.
 * Should be called after the user grants notification permission.
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    const permission = await requestNotificationPermission()
    if (!permission) return false

    const registration = await navigator.serviceWorker.ready

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Save to DB
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return false

    const subscriptionJSON = subscription.toJSON()
    const language = localStorage.getItem('language') || document.documentElement.lang || 'he'
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userData.user.id,
      endpoint: subscriptionJSON.endpoint!,
      p256dh: subscriptionJSON.keys!.p256dh!,
      auth: subscriptionJSON.keys!.auth!,
      language,
    }, { onConflict: 'user_id,endpoint' })

    return !error
  } catch (err) {
    console.error('Push subscription failed:', err)
    return false
  }
}

/**
 * Unsubscribe from push notifications and remove from DB.
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()

      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        await supabase.from('push_subscriptions')
          .delete()
          .eq('user_id', userData.user.id)
          .eq('endpoint', endpoint)
      }
    }
  } catch (err) {
    console.error('Push unsubscribe failed:', err)
  }
}

// Helper: convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
