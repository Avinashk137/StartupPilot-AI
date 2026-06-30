import { motion } from 'framer-motion'
import { FileText, TrendingUp, DollarSign, Users, Megaphone, BarChart3, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from 'react-router-dom'

const reportTypes = [
  { icon: TrendingUp, label: 'Market Research', desc: 'TAM, SAM, SOM, trends, opportunities', color: 'bg-blue-500', key: 'research' },
  { icon: Users, label: 'Competitor Analysis', desc: 'SWOT, pricing, market gaps', color: 'bg-violet-500', key: 'competitor' },
  { icon: FileText, label: 'Business Plan', desc: 'Executive summary, strategy, roadmap', color: 'bg-emerald-500', key: 'business_plan' },
  { icon: DollarSign, label: 'Financial Report', desc: 'Forecasts, cashflow, break-even', color: 'bg-amber-500', key: 'finance' },
  { icon: Megaphone, label: 'Marketing Strategy', desc: 'Social posts, campaigns, SEO', color: 'bg-pink-500', key: 'marketing' },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">All AI-generated reports for your projects</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report, i) => (
          <motion.div key={report.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${report.color} bg-opacity-15 flex items-center justify-center mb-3`}>
                  <report.icon className={`w-5 h-5 ${report.color.replace('bg-', 'text-')}`} />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{report.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{report.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Navigate to a project to view specific reports →{' '}
            <Link to="/projects" className="text-primary font-medium hover:underline">My Projects</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
