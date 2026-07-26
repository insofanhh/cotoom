'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RideRatingProps {
  rideId: string
  driverName?: string
  driverAvatar?: string | null
  onSuccess: () => void
}

const positiveTags = [
  'Tài xế thân thiện',
  'Lái xe an toàn',
  'Xe sạch sẽ',
  'Đến đúng giờ',
  'Hỗ trợ nhiệt tình'
]

const negativeTags = [
  'Đến trễ',
  'Lái xe ẩu',
  'Thái độ không tốt',
  'Xe có mùi',
  'Chạy sai đường'
]

export function RideRating({ rideId, driverName = 'Tài xế', driverAvatar, onSuccess }: RideRatingProps) {
  const [rating, setRating] = useState(0)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const tags = rating >= 4 ? positiveTags : rating > 0 ? negativeTags : []

  const handleSubmit = async () => {
    if (rating === 0) return toast.error('Vui lòng chọn số sao')
    
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/rides/${rideId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: selectedTag })
      })

      if (!res.ok) throw new Error('Failed to submit review')
      
      toast.success('Cảm ơn bạn đã đánh giá!')
      onSuccess()
    } catch (error) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại sau')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center animate-in fade-in slide-in-from-bottom-4">
      <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-3 flex items-center justify-center text-3xl overflow-hidden">
        {driverAvatar ? (
          <img src={driverAvatar} alt={driverName} className="w-full h-full object-cover" />
        ) : '🧑‍✈️'}
      </div>
      <h3 className="font-outfit font-bold text-xl text-slate-800 mb-1">Đánh giá chuyến đi</h3>
      <p className="text-slate-500 text-sm mb-5">Bạn cảm thấy chuyến đi với {driverName} như thế nào?</p>

      {/* Stars */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => {
              setRating(star)
              setSelectedTag(null) // reset tag when star changes
            }}
            className="transition-transform active:scale-90 focus:outline-none"
          >
            <Star 
              size={36} 
              className={cn(
                "transition-colors duration-200", 
                star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"
              )} 
            />
          </button>
        ))}
      </div>

      {/* Tags */}
      {rating > 0 && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium text-slate-700 mb-3">Điều gì làm bạn {rating >= 4 ? 'hài lòng' : 'chưa hài lòng'}?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  selectedTag === tag 
                    ? "bg-blue-500 border-blue-500 text-white" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        className="w-full ocean-gradient text-white font-bold h-12"
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
      >
        {isSubmitting && <Loader2 size={18} className="mr-2 animate-spin" />}
        Gửi đánh giá
      </Button>
    </div>
  )
}
