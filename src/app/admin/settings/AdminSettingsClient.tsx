'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Bike, Car, Zap, Phone } from 'lucide-react'

const SETTINGS_CONFIG = [
  { key: 'price_per_km_motorbike', label: 'Giá/km — Xe máy (VND)', icon: Bike, placeholder: '15000', type: 'number' },
  { key: 'price_per_km_car', label: 'Giá/km — Ô tô (VND)', icon: Car, placeholder: '25000', type: 'number' },
  { key: 'price_per_km_electric', label: 'Giá/km — Xe điện (VND)', icon: Zap, placeholder: '20000', type: 'number' },
  { key: 'admin_zalo_phone', label: 'Số Zalo Admin (liên hệ)', icon: Phone, placeholder: '0901234567', type: 'tel' },
]

export function AdminSettingsClient({ settings }: { settings: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(settings)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: values }),
      })
      if (!res.ok) throw new Error()
      toast.success('Đã lưu cài đặt!')
    } catch {
      toast.error('Lỗi lưu cài đặt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 mb-2">Giá cước & Liên hệ</h2>

        {SETTINGS_CONFIG.map((config) => {
          const Icon = config.icon
          return (
            <div key={config.key} className="space-y-1.5">
              <Label htmlFor={`setting-${config.key}`} className="flex items-center gap-2 text-slate-600">
                <Icon size={14} />
                {config.label}
              </Label>
              <Input
                id={`setting-${config.key}`}
                type={config.type}
                placeholder={config.placeholder}
                value={values[config.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [config.key]: e.target.value }))}
              />
            </div>
          )
        })}

        <div className="pt-2">
          <Button
            id="settings-save"
            className="ocean-gradient text-white font-semibold gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        </div>
      </div>

      {/* Price preview */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
        <h3 className="font-semibold text-slate-700 mb-3 text-sm">Ví dụ tính giá (3 km)</h3>
        <div className="space-y-2">
          {['motorbike', 'car', 'electric'].map((type) => {
            const price = parseInt(values[`price_per_km_${type}`] ?? '0')
            const total = price * 3
            return (
              <div key={type} className="flex justify-between text-sm">
                <span className="text-slate-500 capitalize">{type === 'motorbike' ? 'Xe máy' : type === 'car' ? 'Ô tô' : 'Xe điện'}</span>
                <span className="font-semibold text-blue-700">
                  {total.toLocaleString('vi-VN')}đ
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
