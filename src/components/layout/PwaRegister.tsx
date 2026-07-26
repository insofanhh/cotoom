'use client'

import { useEffect } from 'react'
import { registerServiceWorker, ensurePushSubscription } from '@/lib/push-client'

// Registers the service worker on every page load and quietly re-syncs the
// push subscription for users who already granted notification permission.
export function PwaRegister() {
  useEffect(() => {
    registerServiceWorker().then(() => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        ensurePushSubscription()
      }
    })
  }, [])

  return null
}
