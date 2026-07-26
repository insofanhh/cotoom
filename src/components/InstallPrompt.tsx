'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share, SquarePlus, Smartphone, Download } from 'lucide-react'

const DISMISS_KEY = 'cotoom-install-prompt'
const DISMISS_DAYS = 7
const SHOW_DELAY_MS = 3500

type Mode = 'hidden' | 'ios' | 'android'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function recentlyDismissed() {
  try {
    const ts = parseInt(localStorage.getItem(DISMISS_KEY) ?? '0')
    return Date.now() - ts < DISMISS_DAYS * 86400000
  } catch {
    return false
  }
}

const IOS_STEPS = [
  { icon: Share, text: 'Bấm nút Chia sẻ trên thanh Safari' },
  { icon: SquarePlus, text: 'Chọn «Thêm vào MH chính»' },
  { icon: Smartphone, text: 'Mở CoToom từ màn hình chính' },
]

/**
 * Gentle install-to-home-screen guide, shown on client pages only.
 * - Android/Chrome: captures beforeinstallprompt and offers the native dialog
 * - iOS Safari: animated step-by-step walkthrough (no install API exists)
 * - Never shows when already installed; snoozes 7 days when dismissed
 */
export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>('hidden')
  const [step, setStep] = useState(0)
  const deferredPrompt = useRef<any>(null)

  useEffect(() => {
    if (isStandalone()) return
    const forced = window.location.search.includes('pwa-guide')
    if (!forced && recentlyDismissed()) return

    let showTimer: ReturnType<typeof setTimeout> | null = null

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e
      showTimer = setTimeout(() => setMode('android'), SHOW_DELAY_MS)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    const onInstalled = () => {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 365 * 86400000)) } catch {}
      setMode('hidden')
    }
    window.addEventListener('appinstalled', onInstalled)

    if (isIos() || forced) {
      showTimer = setTimeout(() => setMode('ios'), forced ? 300 : SHOW_DELAY_MS)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      if (showTimer) clearTimeout(showTimer)
    }
  }, [])

  // Auto-advance the iOS walkthrough like a looping screen recording
  useEffect(() => {
    if (mode !== 'ios') return
    const interval = setInterval(() => setStep((s) => (s + 1) % IOS_STEPS.length), 1800)
    return () => clearInterval(interval)
  }, [mode])

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setMode('hidden')
  }

  const installAndroid = async () => {
    const evt = deferredPrompt.current
    if (!evt) return
    evt.prompt()
    const choice = await evt.userChoice.catch(() => null)
    deferredPrompt.current = null
    if (choice?.outcome !== 'accepted') {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    }
    setMode('hidden')
  }

  return (
    <AnimatePresence>
      {mode !== 'hidden' && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed bottom-20 left-0 right-0 z-[900] px-4 pointer-events-none"
        >
          <div className="max-w-md mx-auto pointer-events-auto bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
              <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
              <div className="flex-1">
                <p className="font-outfit font-bold text-slate-800 text-sm leading-tight">
                  Cài CoToom như một ứng dụng
                </p>
                <p className="text-slate-400 text-[11px]">Mở nhanh hơn & nhận thông báo chuyến đi</p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Đóng"
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 active:scale-95"
              >
                <X size={14} />
              </button>
            </div>

            {mode === 'android' ? (
              <div className="px-4 pb-4 pt-1">
                <button
                  onClick={installAndroid}
                  className="w-full ocean-gradient text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Download size={15} />
                  Cài đặt ngay
                </button>
              </div>
            ) : (
              <div className="px-4 pb-4 pt-1 space-y-1.5">
                {IOS_STEPS.map((s, i) => {
                  const Icon = s.icon
                  const active = i === step
                  return (
                    <motion.div
                      key={i}
                      animate={{
                        backgroundColor: active ? 'rgba(219,234,254,1)' : 'rgba(248,250,252,1)',
                        scale: active ? 1 : 0.985,
                      }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2"
                    >
                      <motion.div
                        animate={active ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                        transition={active ? { duration: 0.9, repeat: Infinity } : {}}
                        className={
                          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ' +
                          (active ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400')
                        }
                      >
                        <Icon size={14} />
                      </motion.div>
                      <p className={'text-xs font-medium ' + (active ? 'text-blue-800' : 'text-slate-400')}>
                        <span className="font-bold mr-1">{i + 1}.</span>
                        {s.text}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
