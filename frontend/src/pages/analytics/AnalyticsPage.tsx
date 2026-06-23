import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Business performance analytics across all projects</p>
      </motion.div>
      <Card>
        <CardContent className="py-24 flex flex-col items-center gap-4">
          <BarChart3 className="w-16 h-16 text-primary opacity-30" />
          <p className="text-muted-foreground">Analytics dashboard coming soon. Complete a project analysis to see charts here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
