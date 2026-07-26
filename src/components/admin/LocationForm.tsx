'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createLocation, updateLocation } from '@/app/admin/places/actions'
import { toast } from 'sonner'
import type { LocationModel as Location } from '@/generated/prisma/models'

interface LocationFormProps {
  location?: Location
  children?: React.ReactElement
}

export function LocationForm({ location, children }: LocationFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const isEdit = !!location

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      type: formData.get('type') as 'ATTRACTION' | 'HOMESTAY' | 'RESTAURANT',
      description: formData.get('description') as string,
      latitude: parseFloat(formData.get('latitude') as string) || 0,
      longitude: parseFloat(formData.get('longitude') as string) || 0,
      priceRange: formData.get('priceRange') as string,
      contactPhone: (formData.get('contactPhone') as string) || null,
      images: (location?.images as string[] | undefined) || ['/uploads/placeholder.jpg'] // simplified image handling
    }

    const res = isEdit && location 
      ? await updateLocation(location.id, data)
      : await createLocation(data)

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm mới'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên địa điểm</Label>
            <Input id="name" name="name" defaultValue={location?.name} required />
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
            <Textarea id="description" name="description" defaultValue={location?.description || ''} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Vĩ độ (Latitude)</Label>
              <Input id="latitude" name="latitude" type="number" step="any" defaultValue={location?.latitude} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Kinh độ (Longitude)</Label>
              <Input id="longitude" name="longitude" type="number" step="any" defaultValue={location?.longitude} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceRange">Mức giá</Label>
            <Input id="priceRange" name="priceRange" defaultValue={location?.priceRange || ''} placeholder="VD: 50.000 - 150.000 VND" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Số điện thoại liên hệ</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={location?.contactPhone || ''} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu lại'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
