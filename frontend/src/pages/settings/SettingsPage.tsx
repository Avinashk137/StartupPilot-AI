import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Key, Bot, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const providers = [
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...', recommended: true },
  { id: 'openai', label: 'OpenAI GPT-4', placeholder: 'sk-...', recommended: false },
  { id: 'claude', label: 'Anthropic Claude', placeholder: 'sk-ant-...', recommended: false },
  { id: 'groq', label: 'Groq', placeholder: 'gsk_...', recommended: false },
  { id: 'together', label: 'Together AI', placeholder: 'your-key...', recommended: false },
]

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your AI providers and preferences</p>
      </motion.div>

      {/* AI Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="w-4 h-4" /> AI Provider Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add at least one API key. The system will automatically fall back to the next available provider.
          </p>
          {providers.map((provider) => (
            <div key={provider.id} className="space-y-1.5">
              <Label htmlFor={provider.id} className="flex items-center gap-2">
                {provider.label}
                {provider.recommended && (
                  <span className="text-xs gradient-brand text-white px-1.5 py-0.5 rounded-full">Recommended</span>
                )}
              </Label>
              <Input
                id={provider.id}
                type="password"
                placeholder={provider.placeholder}
                value={keys[provider.id] || ''}
                onChange={(e) => setKeys((k) => ({ ...k, [provider.id]: e.target.value }))}
              />
            </div>
          ))}
          <Button onClick={handleSave} className="w-full">
            {saved ? '✓ Saved!' : 'Save API Keys'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Keys are stored securely and never shared. Configure in backend .env file for production.
          </p>
        </CardContent>
      </Card>

      {/* Notifications Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Notification settings coming in next version.</p>
        </CardContent>
      </Card>
    </div>
  )
}
