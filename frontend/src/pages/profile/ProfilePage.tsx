import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/providers/auth-provider'
import api from '@/lib/api'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    company: user?.company || '',
    phone: user?.phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/auth/profile', form)
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <div className="space-y-6 max-w-xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account information</p>
      </motion.div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center text-white text-xl font-bold">
              {initials}
            </div>
            <div>
              <CardTitle>{user?.full_name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize mt-1 inline-block">{user?.role}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} placeholder="Your company name" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+1 234 567 8900" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} placeholder="Tell us about yourself..." className="min-h-[80px]" />
          </div>
          <Button onClick={handleSave} loading={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
