import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, ReferenceLine
} from 'recharts'
import { ArrowLeft, TrendingUp, DollarSign, Users, Target, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import api from '@/lib/api'

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const CustomTooltip = ({ active, payload, label, currency = 'USD' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-2">Month {label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex justify-between gap-4 text-muted-foreground">
            <span>{entry.name}:</span>
            <span className="font-medium text-foreground">{formatCurrency(entry.value, currency)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn('text-2xl font-bold mt-1', color || 'text-foreground')}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function FinancialReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}/reports/finance`),
      api.get(`/projects/${id}`),
    ]).then(([r, p]) => {
      setReport(r.data.data)
      setProject(p.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-40 animate-shimmer rounded-xl" />)}</div>
  if (!report) return <div className="text-center py-20 text-muted-foreground">Report not generated yet</div>

  const currency = project?.budget_currency || 'USD'
  const raw = report.raw_data || {}
  const revenueData = raw.revenue_forecast || []
  const profitData = raw.profit_forecast || []
  const cashflowData = raw.cashflow_forecast || []
  const startupCosts = raw.startup_costs?.breakdown || []
  const monthlyCosts = raw.monthly_costs?.breakdown || []
  const breakeven = raw.breakeven_analysis || {}
  const roi = raw.roi_estimation || {}
  const ratios = raw.financial_ratios || {}
  const funding = raw.funding_requirements || {}
  const summary = raw.summary_metrics || {}

  // Combine revenue + profit for combo chart
  const combinedData = revenueData.map((r: any, i: number) => ({
    month: r.month,
    Revenue: r.revenue,
    Profit: profitData[i]?.profit || 0,
    Costs: profitData[i]?.costs || 0,
  }))

  // Pie chart for startup costs categories
  const categoryMap: Record<string, number> = {}
  startupCosts.forEach((c: any) => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + (c.amount || 0)
  })
  const costPieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }))

  // Use of funds pie
  const fundingData = funding.use_of_funds || []

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/projects/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </button>
        </Link>
        <h1 className="text-2xl font-bold gradient-brand-text">Financial Report</h1>
        <p className="text-muted-foreground text-sm mt-1">{project?.business_name} · 12-Month Projections</p>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Year 1 Revenue" value={formatCurrency(summary.year1_total_revenue || 0, currency)} sub="Projected" color="text-primary" />
        <MetricCard label="Break-even Month" value={`Month ${breakeven.breakeven_month || '-'}`} sub={`${formatCurrency(breakeven.breakeven_revenue || 0, currency)} MRR`} color="text-green-500" />
        <MetricCard label="LTV:CAC Ratio" value={`${ratios.ltv_cac_ratio || 0}x`} sub="Customer value efficiency" color={ratios.ltv_cac_ratio >= 3 ? 'text-green-500' : 'text-orange-500'} />
        <MetricCard label="Year 2 Projected" value={formatCurrency(summary.year2_projected_revenue || 0, currency)} sub={`${summary.annual_growth_rate || 0}% growth`} color="text-blue-500" />
      </div>

      {/* Revenue + Profit + Costs Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue, Profit & Cost Projection (12 Months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={combinedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -2 }} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="Revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Profit" stroke="#10b981" fill="url(#profGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="Costs" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cashflow Chart */}
      {cashflowData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cumulative Cash Flow</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cashflowData.map((c: any) => ({ month: c.month, 'Net Cash': c.net, 'Cumulative': c.cumulative }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine y={0} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Break-even', fontSize: 10 }} />
                <Area type="monotone" dataKey="Cumulative" stroke="#8b5cf6" fill="url(#cumGrad)" strokeWidth={2} />
                <Bar dataKey="Net Cash" fill="#06b6d4" radius={[2, 2, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown & Funding */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost Pie */}
        {costPieData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Startup Cost Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={costPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {costPieData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v, currency)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {costPieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}: {formatCurrency(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Ratios */}
        <Card>
          <CardHeader><CardTitle className="text-base">Key Financial Ratios</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Gross Margin', value: `${ratios.gross_margin || 0}%`, good: ratios.gross_margin >= 50 },
              { label: 'Customer LTV', value: formatCurrency(ratios.customer_ltv || 0, currency) },
              { label: 'Customer CAC', value: formatCurrency(ratios.customer_cac || 0, currency) },
              { label: 'Monthly Burn Rate', value: formatCurrency(ratios.monthly_burn_rate || 0, currency) },
              { label: 'Net Margin (Yr 2)', value: `${ratios.net_margin_year2 || 0}%`, good: ratios.net_margin_year2 >= 15 },
              { label: 'ROI (3 Year)', value: `${roi.year3_roi || 0}%`, good: roi.year3_roi >= 100 },
              { label: 'Payback Period', value: `${roi.payback_period_months || '-'} months` },
              { label: 'IRR', value: `${roi.irr || 0}%`, good: roi.irr >= 20 },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-1 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn('text-sm font-semibold', item.good === true ? 'text-green-500' : item.good === false ? 'text-orange-500' : 'text-foreground')}>
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Startup & Monthly Costs Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex justify-between">
              <span>Startup Costs</span>
              <span className="text-primary">{formatCurrency(raw.startup_costs?.total || 0, currency)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {startupCosts.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{item.item}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                  </div>
                  <span className="text-foreground font-medium">{formatCurrency(item.amount, currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex justify-between">
              <span>Monthly Operating Costs</span>
              <span className="text-orange-500">{formatCurrency(raw.monthly_costs?.total || 0, currency)}/mo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthlyCosts.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{item.item}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                  </div>
                  <span className="text-foreground font-medium">{formatCurrency(item.amount, currency)}/mo</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
