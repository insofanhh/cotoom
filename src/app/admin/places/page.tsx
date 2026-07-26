import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminShell } from '@/components/layout/AdminShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Pencil, Trash2 } from 'lucide-react'
import { LocationForm } from '@/components/admin/LocationForm'
import { deleteLocation } from './actions'

function getTypeLabel(type: string) {
  switch (type) {
    case 'ATTRACTION': return 'Tham quan'
    case 'HOMESTAY': return 'Lưu trú'
    case 'RESTAURANT': return 'Ăn uống'
    default: return type
  }
}

export default async function AdminPlacesPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const locations = await prisma.location.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <AdminShell>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Địa điểm</h2>
          <p className="text-muted-foreground">Quản lý các điểm tham quan, lưu trú và ăn uống.</p>
        </div>
        <div className="flex items-center space-x-2">
          <LocationForm />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách địa điểm ({locations.length})</CardTitle>
          <CardDescription>Các địa điểm sẽ hiển thị trên ứng dụng của khách hàng.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên địa điểm</TableHead>
                  <TableHead>Loại hình</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Mức giá</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Chưa có địa điểm nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(loc.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{loc.priceRange || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <LocationForm location={loc}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          </LocationForm>
                          <form action={async () => {
                            'use server'
                            await deleteLocation(loc.id)
                          }}>
                            <Button variant="ghost" size="icon" type="submit">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  )
}
