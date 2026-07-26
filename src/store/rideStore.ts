import { create } from 'zustand'
import type { RideStatus, VehicleType, DriverInfo, RideBooking } from '@/types'

type RideFlowState =
  | 'IDLE'
  | 'LOCATING'
  | 'PREVIEW'
  | 'SEARCHING'
  | 'DRIVER_FOUND'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ERROR'

interface RideStore {
  // Flow state
  flowState: RideFlowState
  setFlowState: (state: RideFlowState) => void

  // Booking data
  booking: RideBooking | null
  setBooking: (booking: RideBooking | null) => void

  // Active ride ID (after creation)
  activeRideId: string | null
  setActiveRideId: (id: string | null) => void

  // Driver info (after acceptance)
  driverInfo: DriverInfo | null
  setDriverInfo: (driver: DriverInfo | null) => void

  // Vehicle type selection
  selectedVehicleType: VehicleType
  setSelectedVehicleType: (type: VehicleType) => void

  // Error message
  errorMessage: string | null
  setErrorMessage: (msg: string | null) => void

  // Destination (pre-filled when coming from Location detail)
  prefilledDestination: {
    lat: number
    lng: number
    name: string
    address: string
  } | null
  setPrefilledDestination: (dest: RideStore['prefilledDestination']) => void

  // Reset everything
  reset: () => void
}

const initialState = {
  flowState: 'IDLE' as RideFlowState,
  booking: null,
  activeRideId: null,
  driverInfo: null,
  selectedVehicleType: 'MOTORBIKE' as VehicleType,
  errorMessage: null,
  prefilledDestination: null,
}

export const useRideStore = create<RideStore>((set) => ({
  ...initialState,

  setFlowState: (flowState) => set({ flowState }),
  setBooking: (booking) => set({ booking }),
  setActiveRideId: (activeRideId) => set({ activeRideId }),
  setDriverInfo: (driverInfo) => set({ driverInfo }),
  setSelectedVehicleType: (selectedVehicleType) => set({ selectedVehicleType }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setPrefilledDestination: (prefilledDestination) => set({ prefilledDestination }),

  reset: () => set(initialState),
}))
