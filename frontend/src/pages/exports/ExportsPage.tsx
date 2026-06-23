import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function ExportsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Exports</h1>
        <p className="text-muted-foreground text-sm mt-1">Download your reports as PDF, DOCX, CSV or PPTX</p>
      </motion.div>
      <Card>
        <CardContent className="py-24 flex flex-col items-center gap-4">
          <Download className="w-16 h-16 text-primary opacity-30" />
          <p className="text-muted-foreground">Export system coming in next version. Complete a project to generate exports.</p>
        </CardContent>
      </Card>
    </div>
  )
}
