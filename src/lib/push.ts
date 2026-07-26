import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@cotoom.app'

const pushEnabled = !!(publicKey && privateKey)
if (pushEnabled) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!)
}

export interface PushPayload {
  title: string
  body: string
  /** Where to navigate when the notification is tapped */
  url?: string
  /** Same tag replaces the previous notification instead of stacking */
  tag?: string
}

/**
 * Send a push notification to every registered device of a user.
 * Never throws — push is best-effort and must not break the main flow.
 * Expired subscriptions (404/410) are pruned automatically.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } })
    if (subs.length === 0) return

    const body = JSON.stringify(payload)
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: 300 }
          )
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          } else {
            console.warn('[push] send failed:', err?.statusCode ?? err?.message)
          }
        }
      })
    )
  } catch (err) {
    console.warn('[push] sendPushToUser error:', err)
  }
}

/** Send the same notification to many users (e.g. admin broadcast). */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)))
}
