import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id: string
    name: string
    phone: string
    role: string
    avatar?: string
  }

  interface Session {
    user: {
      id: string
      name: string
      phone: string
      email: string
      role: string
      avatar?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    phone: string
    role: string
    avatar?: string
  }
}

// Ride types
export type RideStatus =
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type VehicleType = 'MOTORBIKE' | 'CAR' | 'ELECTRIC_CAR'

export type LocationType = 'ATTRACTION' | 'HOMESTAY' | 'RESTAURANT'

export type UserRole = 'CLIENT' | 'DRIVER' | 'ADMIN'

export type DriverStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

export interface RideBooking {
  pickupLat: number
  pickupLng: number
  pickupAddress: string
  dropoffLat: number
  dropoffLng: number
  dropoffAddress: string
  dropoffName: string
  distanceKm: number
  totalPrice: number
  vehicleType: VehicleType
  durationMin?: number
  note?: string
}

export interface DriverInfo {
  id: string
  name: string
  phone: string
  plate: string
  vehicleType: VehicleType
  rating: number
  avatar?: string
  latitude?: number
  longitude?: number
}
