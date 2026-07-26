import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MobileShell } from '@/components/layout/MobileShell'
import { ProfileClient } from './ProfileClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Hồ sơ cá nhân' }

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <MobileShell>
      <ProfileClient user={session.user} />
    </MobileShell>
  )
}
