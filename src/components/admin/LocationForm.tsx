'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createLocation, updateLocation } from '@/app/admin/places/actions'
import { toast } from 'sonner'
import { MapPin, Upload, Trash2, Plus, Image as ImageIcon } from 'lucide-react'
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

// Client-side image compressor & reader to prevent Vercel EROFS read-only file system errors
function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const src = event.target?.result as string
      if (!src) return reject(new Error('Khởi tạo file thất bại'))

      const img = new window.Image()
      img.src = src
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(src)

        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
      img.onerror = () => resolve(src)
    }
    reader.onerror = (err) => reject(err)
  })
}

export function LocationForm({ location, children }: LocationFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lat, setLat] = useState<number>(location?.latitude || 20.9892)
  const [lng, setLng] = useState<number>(location?.longitude || 107.7695)
  const [type, setType] = useState<'ATTRACTION' | 'HOMESTAY' | 'RESTAURANT'>(
    (location?.type as any) || 'ATTRACTION'
  )
  const [images, setImages] = useState<string[]>(
    Array.isArray(location?.images) ? (location.images as string[]) : []
  )
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEdit = !!location

  function handleMapPick(newLat: number, newLng: number) {
    setLat(newLat)
    setLng(newLng)
  }

  // Handle client-side file selection & compression (Zero Vercel EROFS errors)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const dataUrl = await compressImage(file)
        setImages((prev) => [...prev, dataUrl])
      } catch (err: any) {
        toast.error(`Lỗi đọc ảnh ${file.name}`)
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Add custom image URL manually
  function handleAddUrl() {
    if (!urlInput.trim()) return
    setImages((prev) => [...prev, urlInput.trim()])
    setUrlInput('')
  }

  // Remove image from album
  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const finalImages = images.length > 0 ? images : ['/uploads/placeholder.jpg']

    const data = {
      name: formData.get('name') as string,
      type,
      description: formData.get('description') as string,
      latitude: lat,
      longitude: lng,
      priceRange: formData.get('priceRange') as string,
      contactPhone: (formData.get('contactPhone') as string) || null,
      images: finalImages,
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
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
            <input type="hidden" name="type" value={type} />
            <Select value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại hình">
                  {type === 'ATTRACTION' && 'Điểm tham quan'}
                  {type === 'HOMESTAY' && 'Homestay / Khách sạn'}
                  {type === 'RESTAURANT' && 'Nhà hàng / Quán ăn'}
                </SelectValue>
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

          {/* Image Album Management */}
          <div className="space-y-2.5">
            <Label className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <ImageIcon size={16} className="text-blue-500" />
                Album hình ảnh ({images.length})
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Hỗ trợ JPG, PNG, WEBP</span>
            </Label>

            {/* Existing images list */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200/80 max-h-[220px] overflow-y-auto">
                {images.map((imgUrl, index) => (
                  <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-200">
                    <Image
                      src={imgUrl}
                      alt={`Album ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500/90 text-white p-1 rounded-full opacity-90 group-hover:opacity-100 transition-opacity shadow-md z-10"
                      title="Xóa ảnh này"
                    >
                      <Trash2 size={12} />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono z-10">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload controls */}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-medium"
                >
                  <Upload size={14} />
                  {uploading ? 'Đang đọc ảnh...' : 'Tải ảnh từ máy tính'}
                </Button>

                <div className="flex-1 flex gap-1.5">
                  <Input
                    placeholder="Hoặc dán URL ảnh..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddUrl}
                    disabled={!urlInput.trim()}
                    className="h-8 px-2.5 text-xs gap-1"
                  >
                    <Plus size={13} /> Thêm
                  </Button>
                </div>
              </div>
            </div>
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

          <Button type="submit" className="w-full font-semibold" disabled={loading || uploading}>
            {loading ? 'Đang lưu...' : 'Lưu lại'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
