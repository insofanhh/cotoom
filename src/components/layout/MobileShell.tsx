import { BottomNav } from './BottomNav'
import { cn } from '@/lib/utils'

interface MobileShellProps {
  children: React.ReactNode
  className?: string
  withBottomNav?: boolean
  bgClass?: string
}

/**
 * Mobile-first shell: max-w-md centered, simulates a phone app on desktop.
 * Includes the BottomNav by default.
 */
export function MobileShell({
  children,
  className,
  withBottomNav = true,
  bgClass,
}: MobileShellProps) {
  return (
    <div className="min-h-svh bg-slate-100 flex justify-center">
      {/* Desktop background effect */}
      <div className="hidden md:block fixed inset-0 ocean-gradient opacity-10 pointer-events-none" />

      <main
        className={cn(
          'mobile-shell w-full',
          bgClass ?? 'bg-white',
          className
        )}
      >
        {children}
        {withBottomNav && <BottomNav />}
      </main>
    </div>
  )
}
