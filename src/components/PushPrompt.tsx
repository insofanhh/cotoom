'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCircle2, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { pushSupported, ensurePushSubscription } from '@/lib/push-client'

type PushState = 'loading' | 'hidden' | 'install-ios' | 'prompt' | 'denied' | 'subscribed'

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

// Banner that walks the user through enabling push notifications.
// Handles the iOS quirk where push only works from the installed PWA.
export function PushPrompt() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const check = async () => {
      if (!pushSupported()) {
        setState(isIos() && !isStandalone() ? 'install-ios' : 'hidden')
        return
      }
      if (Notification.permission === 'denied') {
        setState('denied')
        return
      }
      if (Notification.permission === 'granted') {
        try {
          const reg = await navigator.serviceWorker.getRegistration()
          const sub = await reg?.pushManager.getSubscription()
          setState(sub ? 'subscribed' : 'prompt')
          return
        } catch {}
      }
      setState('prompt')
    }
    check()
  }, [])

  const enable = async () => {
    setBusy(true)
    const ok = await ensurePushSubscription()
    setBusy(false)
    if (ok) {
      setState('subscribed')
      toast.success('Đã bật thông báo!')
    } else {
      setState(Notification.permission === 'denied' ? 'denied' : 'prompt')
      toast.error('Chưa bật được thông báo. Vui lòng thử lại.')
    }
  }

  const sendTest = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.subscriptions > 0) {
        toast.success('Đã gửi! Thông báo sẽ đến trong vài giây.')
      } else {
        toast.error('Thiết bị chưa đăng ký nhận thông báo.')
      }
    } catch {
      toast.error('Lỗi gửi thông báo thử.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading' || state === 'hidden') return null

  if (state === 'install-ios') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Share size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-800 text-sm">Cài app để nhận thông báo</p>
          <p className="text-blue-600 text-xs mt-0.5">
            Trên iPhone: mở bằng Safari → nút Chia sẻ → «Thêm vào MH chính», rồi mở app từ màn hình chính.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <BellOff size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Thông báo đang bị chặn</p>
          <p className="text-amber-600 text-xs mt-0.5">
            Vào cài đặt trình duyệt / hệ thống → Thông báo → cho phép CoToom, rồi mở lại app.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'subscribed') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
        <p className="font-medium text-emerald-800 text-sm flex-1">Thông báo đẩy đã bật</p>
        <Button variant="outline" size="sm" onClick={sendTest} disabled={busy}>
          Gửi thử
        </Button>
      </div>
    )
  }

  // state === 'prompt'
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
      <Bell size={18} className="text-blue-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-blue-800 text-sm">Bật thông báo đẩy</p>
        <p className="text-blue-600 text-xs mt-0.5">Nhận báo chuyến mới & trạng thái chuyến ngay cả khi không mở app.</p>
      </div>
      <Button size="sm" className="ocean-gradient text-white font-semibold" onClick={enable} disabled={busy}>
        {busy ? 'Đang bật...' : 'Bật ngay'}
      </Button>
    </div>
  )
}
