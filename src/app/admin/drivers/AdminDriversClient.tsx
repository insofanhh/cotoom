'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Check, X, Clock, Bike, Car, Zap, Star, ShieldOff, Trash2,
  Phone, AlertTriangle, UserCheck, UserX, Snowflake, MoreVertical,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const statusMap = {
  PENDING_APPROVAL: { label: 'Chờ duyệt', class: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Đã duyệt', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Từ chối', class: 'bg-red-100 text-red-700 border-red-200' },
  FROZEN: { label: 'Đóng băng', class: 'bg-blue-100 text-blue-700 border-blue-200' },
}

const vehicleIcons: Record<string, any> = { MOTORBIKE: Bike, CAR: Car, ELECTRIC_CAR: Zap }
const vehicleLabels: Record<string, string> = { MOTORBIKE: 'Xe máy', CAR: 'Ô tô', ELECTRIC_CAR: 'Xe điện' }

const PAGE_SIZES = [10, 25, 50, 100]

interface Driver {
  id: string
  status: string
  vehicleType: string
  vehiclePlate: string
  ratingAvg: number
  totalTrips: number
  isOnline: boolean
  isBusy: boolean
  user: { name: string; phone: string; createdAt: Date }
}

interface ConfirmDialog {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmClass?: string
  onConfirm: () => void
}

const TABS = [
  { key: 'pending', label: 'Chờ duyệt', icon: Clock, filter: (d: Driver) => d.status === 'PENDING_APPROVAL' },
  { key: 'approved', label: 'Đã duyệt', icon: UserCheck, filter: (d: Driver) => d.status === 'APPROVED' },
  { key: 'frozen', label: 'Đóng băng', icon: Snowflake, filter: (d: Driver) => d.status === 'FROZEN' },
  { key: 'rejected', label: 'Từ chối', icon: UserX, filter: (d: Driver) => d.status === 'REJECTED' },
]

// Dropdown rendered at a fixed screen position to avoid parent overflow:hidden clipping
function DropdownMenu({
  anchorRef,
  open,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const [pos, setPos] = useState({ top: 0, right: 0 })

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const menuHeight = 130 // approx height of menu
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4
    setPos({ top, right: window.innerWidth - rect.right })
  }, [open, anchorRef])

  if (!open) return null

  return (
    <>
      {/* Transparent backdrop — clicking outside closes menu */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />
      {/* Menu panel */}
      <div
        style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
        className="bg-white rounded-xl shadow-2xl border border-slate-100 min-w-[200px] py-1 overflow-hidden"
      >
        {children}
      </div>
    </>
  )
}

export function AdminDriversClient({ drivers: initialDrivers }: { drivers: Driver[] }) {
  const [drivers, setDrivers] = useState(initialDrivers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const menuRefs = useRef<Record<string, React.RefObject<HTMLButtonElement | null>>>({})

  const getMenuRef = (id: string) => {
    if (!menuRefs.current[id]) {
      menuRefs.current[id] = { current: null }
    }
    return menuRefs.current[id]
  }

  const filteredDrivers = TABS.find(t => t.key === activeTab)?.filter
    ? drivers.filter(TABS.find(t => t.key === activeTab)!.filter)
    : []

  const totalPages = Math.ceil(filteredDrivers.length / pageSize)
  const pagedDrivers = filteredDrivers.slice((page - 1) * pageSize, page * pageSize)

  // Reset to page 1 when tab or pageSize changes
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    setPage(1)
    setOpenMenuId(null)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const doAction = async (driverId: string, action: 'approve' | 'reject' | 'freeze' | 'unfreeze') => {
    setLoadingId(driverId)
    setOpenMenuId(null)
    try {
      const res = await fetch('/api/admin/drivers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, action }),
      })
      if (!res.ok) throw new Error()
      const messages = {
        approve: '✅ Đã phê duyệt tài xế!',
        reject: '❌ Đã từ chối tài xế',
        freeze: '🔒 Đã đóng băng tài khoản',
        unfreeze: '✅ Đã mở khóa tài khoản',
      }
      toast.success(messages[action])
      const nextStatus: Record<string, string> = {
        approve: 'APPROVED', reject: 'REJECTED', freeze: 'FROZEN', unfreeze: 'APPROVED',
      }
      setDrivers(prev => prev.map(d =>
        d.id === driverId
          ? { ...d, status: nextStatus[action], isOnline: action === 'freeze' ? false : d.isOnline }
          : d
      ))
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoadingId(null)
    }
  }

  const doDelete = async (driverId: string) => {
    setLoadingId(driverId)
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/admin/drivers?driverId=${driverId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('🗑️ Đã xóa tài khoản tài xế')
      setDrivers(prev => prev.filter(d => d.id !== driverId))
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoadingId(null)
      setConfirmDialog(null)
    }
  }

  const confirmAndDo = (dialog: Omit<ConfirmDialog, 'open'>) => {
    setOpenMenuId(null)
    setConfirmDialog({ ...dialog, open: true })
  }

  return (
    <div className="space-y-6">
      {/* Confirm Dialog */}
      {confirmDialog?.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{confirmDialog.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{confirmDialog.description}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDialog(null)}>
                Hủy
              </Button>
              <Button
                className={cn('flex-1 text-white', confirmDialog.confirmClass ?? 'bg-red-500 hover:bg-red-600')}
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }}
              >
                {confirmDialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar + list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {TABS.map(tab => {
            const count = drivers.filter(tab.filter).length
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                id={`admin-tab-${tab.key}`}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-medium transition-colors relative',
                  activeTab === tab.key
                    ? 'text-blue-600 bg-blue-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center',
                    activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                  )}>
                    {count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t" />
                )}
              </button>
            )
          })}
        </div>

        {/* Toolbar: page size selector */}
        {filteredDrivers.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-50 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              Hiển thị{' '}
              <span className="font-semibold text-slate-700">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredDrivers.length)}
              </span>{' '}
              / {filteredDrivers.length} tài xế
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Hiển thị:</span>
              {PAGE_SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => handlePageSizeChange(size)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors',
                    pageSize === size
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Driver list */}
        <div>
          {filteredDrivers.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                {(() => { const Icon = TABS.find(t => t.key === activeTab)?.icon ?? Clock; return <Icon size={28} /> })()}
              </div>
              <p className="font-medium">Không có tài xế nào</p>
              <p className="text-sm mt-1">trong danh mục này</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {pagedDrivers.map(driver => {
                const VehicleIcon = vehicleIcons[driver.vehicleType] ?? Car
                const s = statusMap[driver.status as keyof typeof statusMap]
                const menuRef = getMenuRef(driver.id)

                return (
                  <div
                    key={driver.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                        <span className="font-bold text-white">{driver.user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      {driver.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-800 truncate">{driver.user.name}</p>
                        {driver.isBusy && (
                          <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full shrink-0">
                            Đang chở
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone size={11} />
                          {driver.user.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <VehicleIcon size={11} />
                          {vehicleLabels[driver.vehicleType]}
                          <span className="font-medium text-slate-600">{driver.vehiclePlate}</span>
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
                      <div className="text-center">
                        <p className="font-bold text-slate-700 text-base">{driver.totalTrips}</p>
                        <p>chuyến</p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-semibold">
                        <Star size={12} fill="currentColor" />
                        {driver.ratingAvg.toFixed(1)}
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge className={cn('text-xs border shrink-0', s?.class)}>
                      {s?.label}
                    </Badge>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {driver.status === 'PENDING_APPROVAL' && (
                        <>
                          <Button
                            id={`approve-driver-${driver.id}`}
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3 gap-1"
                            onClick={() => doAction(driver.id, 'approve')}
                            disabled={loadingId === driver.id}
                          >
                            <Check size={14} /> Duyệt
                          </Button>
                          <Button
                            id={`reject-driver-${driver.id}`}
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-500 hover:bg-red-50 h-8 px-3 gap-1"
                            onClick={() => confirmAndDo({
                              title: 'Từ chối tài xế',
                              description: `Bạn có chắc muốn từ chối hồ sơ của ${driver.user.name}?`,
                              confirmLabel: 'Từ chối',
                              onConfirm: () => doAction(driver.id, 'reject'),
                            })}
                            disabled={loadingId === driver.id}
                          >
                            <X size={14} /> Từ chối
                          </Button>
                        </>
                      )}

                      {/* More menu (fixed-position dropdown to avoid clipping) */}
                      {(driver.status === 'APPROVED' || driver.status === 'FROZEN') && (
                        <div className="relative">
                          <Button
                            id={`more-driver-${driver.id}`}
                            ref={menuRef as React.RefObject<HTMLButtonElement>}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400"
                            onClick={() => setOpenMenuId(openMenuId === driver.id ? null : driver.id)}
                            disabled={loadingId === driver.id}
                          >
                            <MoreVertical size={16} />
                          </Button>

                          <DropdownMenu
                            anchorRef={menuRef}
                            open={openMenuId === driver.id}
                            onClose={() => setOpenMenuId(null)}
                          >
                            {driver.status === 'APPROVED' ? (
                              <button
                                id={`freeze-driver-${driver.id}`}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                                onClick={() => confirmAndDo({
                                  title: 'Đóng băng tài khoản',
                                  description: `Tài khoản của ${driver.user.name} sẽ bị khóa và tài xế sẽ nhận thông báo.`,
                                  confirmLabel: 'Đóng băng',
                                  confirmClass: 'bg-blue-500 hover:bg-blue-600',
                                  onConfirm: () => doAction(driver.id, 'freeze'),
                                })}
                              >
                                <Snowflake size={15} />
                                Đóng băng tài khoản
                              </button>
                            ) : (
                              <button
                                id={`unfreeze-driver-${driver.id}`}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                                onClick={() => doAction(driver.id, 'unfreeze')}
                              >
                                <ShieldOff size={15} />
                                Mở khóa tài khoản
                              </button>
                            )}
                            <div className="h-px bg-slate-100 mx-3 my-1" />
                            <button
                              id={`delete-driver-${driver.id}`}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                              onClick={() => confirmAndDo({
                                title: 'Xóa tài khoản',
                                description: `Hành động này không thể hoàn tác. Toàn bộ dữ liệu của ${driver.user.name} sẽ bị xóa vĩnh viễn.`,
                                confirmLabel: 'Xóa vĩnh viễn',
                                onConfirm: () => doDelete(driver.id),
                              })}
                            >
                              <Trash2 size={15} />
                              Xóa tài khoản
                            </button>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
              </Button>
              {/* Page number buttons (max 5 visible) */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                  ) : (
                    <Button
                      key={p}
                      size="sm"
                      variant={page === p ? 'default' : 'outline'}
                      className={cn('h-8 w-8 p-0 text-sm', page === p ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' : '')}
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
