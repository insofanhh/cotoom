'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createLocation(data: {
  name: string
  type: 'ATTRACTION' | 'HOMESTAY' | 'RESTAURANT'
  description: string
  latitude: number
  longitude: number
  priceRange: string
  contactPhone: string | null
  images: string[]
}) {
  try {
    await prisma.location.create({ data })
    revalidatePath('/admin/places')
    revalidatePath('/discovery')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateLocation(id: string, data: {
  name: string
  type: 'ATTRACTION' | 'HOMESTAY' | 'RESTAURANT'
  description: string
  latitude: number
  longitude: number
  priceRange: string
  contactPhone: string | null
  images: string[]
}) {
  try {
    await prisma.location.update({ where: { id }, data })
    revalidatePath('/admin/places')
    revalidatePath('/discovery')
    revalidatePath(`/location/${id}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteLocation(id: string) {
  try {
    await prisma.location.delete({ where: { id } })
    revalidatePath('/admin/places')
    revalidatePath('/discovery')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
