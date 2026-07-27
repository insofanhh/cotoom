'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createLocation, updateLocation } from '@/app/admin/places/actions'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'
import type { LocationModel as Location } from '@/generated/prisma/models'

// Dynamic import with no SSR for Leaflet map picker
const LocationMapPicker = dynamic(() => import('./LocationMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[240px] bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-500">
      Đang tải bản đồ chọn vị trí...
    </div>
  ),
})

interface LocationFormProps {
  location?: Location
  children?: React.ReactElement
}

export function LocationForm({ location, children }: LocationFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lat, setLat] = useState<number>(location?.latitude || 20.9892)
  const [lng, setLng] = useState<number>(location?.longitude || 107.7695)

  const isEdit = !!location

  function handleMapPick(newLat: number, newLng: number) {
    setLat(newLat)
    setLng(newLng)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      type: formData.get('type') as 'ATTRACTION' | 'HOMESTAY' | 'RESTAURANT',
      description: formData.get('description') as string,
      latitude: lat,
      longitude: lng,
      priceRange: formData.get('priceRange') as string,
      contactPhone: (formData.get('contactPhone') as string) || null,
      images: (location?.images as string[] | undefined) || ['/uploads/placeholder.jpg'],
    }

    const res = isEdit && location ? await updateLocation(location.id, data) : await createLocation(data)

    setLoading(false)

    if (res.success) {
      toast.success(isEdit ? 'Đã cập nhật địa điểm' : 'Đã thêm địa điểm mới')
      setOpen(false)
    } else {
      toast.error(res.error || 'Có lỗi xảy ra')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children ?? <Button>Thêm địa điểm</Button>} />
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin size={20} className="text-blue-600" />
            {isEdit ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Tên địa điểm</Label>
            <Input id="name" name="name" defaultValue={location?.name} placeholder="VD: Bãi biển Hồng Vàn" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Loại hình</Label>
            <Select name="type" defaultValue={location?.type || 'ATTRACTION'}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại hình" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATTRACTION">Điểm tham quan</SelectItem>
                <SelectItem value="HOMESTAY">Homestay / Khách sạn</SelectItem>
                <SelectItem value="RESTAURANT">Nhà hàng / Quán ăn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={location?.description || ''}
              placeholder="Mô tả nổi bật về địa điểm..."
              required
            />
          </div>

          {/* Interactive Map Coordinate Picker */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between font-semibold text-slate-800">
              <span>Chọn vị trí trên Bản đồ</span>
              <span className="text-[11px] text-blue-600 font-normal">
                Tọa độ: {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
            </Label>
            <LocationMapPicker lat={lat} lng={lng} onChange={handleMapPick} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Vĩ độ (Latitude)</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Kinh độ (Longitude)</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceRange">Mức giá</Label>
            <Input
              id="priceRange"
              name="priceRange"
              defaultValue={location?.priceRange || ''}
              placeholder="VD: 50.000 - 150.000 VND"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Số điện thoại liên hệ</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              defaultValue={location?.contactPhone || ''}
              placeholder="VD: 0912345678"
            />
          </div>

          <Button type="submit" className="w-full font-semibold" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu lại'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
