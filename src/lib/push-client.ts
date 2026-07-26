'use client'

// Client-side helpers for service worker registration and push subscription

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (err) {
    console.warn('[push] SW registration failed:', err)
    return null
  }
}

/**
 * Ask for notification permission (must be called from a user gesture for
 * best results), subscribe to push, and register the subscription server-side.
 * Safe to call repeatedly — resolves to true when subscribed.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!pushSupported()) return false
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return false

  try {
    if (Notification.permission === 'denied') return false
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      if (result !== 'granted') return false
    }

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    })
    return res.ok
  } catch (err) {
    console.warn('[push] subscribe failed:', err)
    return false
  }
}
