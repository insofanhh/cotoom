'use client'

import { useEffect, useCallback } from 'react'
import { MobileShell } from '@/components/layout/MobileShell'
import { RideFlow } from '@/components/ride/RideFlow'

export default function RidePage() {
  return (
    <MobileShell withBottomNav={false} bgClass="bg-slate-50">
      <RideFlow />
    </MobileShell>
  )
}
