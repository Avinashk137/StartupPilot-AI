import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, ReferenceLine
} from 'recharts'
import { TrendingUp, DollarSign, Target, AlertCircle, CheckCircle2, Percent, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import api from '@/lib/api'
import ReportShell from '@/components/reports/ReportShell'
import KpiCard from '@/components/reports/KpiCard'
import DataTable from '@/components/reports/DataTable'

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const CustomTooltip = ({ active, payload, label, currency = 'USD' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-2">Month {label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex justify-between gap-4 text-muted-foreground">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-medium text-foreground">{formatCurrency(entry.value, currency)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function FinancialReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, p] = await Promise.all([
        api.get(`/projects/${id}/reports/finance`),
        api.get(`/projects/${id}`),
      ])
      setReport(r.data.data)
      setProject(p.data.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Report not yet generated. Run AI Analysis first.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  const currency = project?.budget_currency || 'USD'
  const raw = report?.raw_data || {}
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

  const combinedData = revenueData.map((r: any, i: number) => ({
    month: r.month,
    Revenue: r.revenue,
    Profit: profitData[i]?.profit || 0,
    Costs: profitData[i]?.costs || 0,
  }))

  const categoryMap: Record<string, number> = {}
  startupCosts.forEach((c: any) => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + (c.amount || 0)
  })
  const costPieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }))
  const fundingData = funding.use_of_funds || []

  const startupCostColumns = [
    { key: 'item', label: 'Item', render: (row: any) => <span className="font-medium text-foreground">{row.item}</span> },
    { key: 'category', label: 'Category', render: (row: any) => <span className="capitalize text-muted-foreground text-xs">{row.category}</span> },
    { key: 'amount', label: 'Amount', align: 'right' as const, render: (row: any) => <span className="font-semibold text-foreground">{formatCurrency(row.amount, currency)}</span> },
  ]

  return (
    <ReportShell
      projectId={id!}
      reportType="finance"
      title="Financial Report"
      subtitle={project ? `${project.business_name} · 12-Month Projections` : ''}
      accentColor="from-emerald-600 to-cyan-600"
      rawData={raw}
      loading={loading}
      error={error}
      onReload={loadData}
    >
      {/* KPI Cards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Year 1 Revenue"
          value={formatCurrency(summary.year1_total_revenue || 0, currency)}
          sub="Projected"
          icon={DollarSign}
          iconColor="text-primary"
          highlight
        />
        <KpiCard
          label="Break-even Month"
          value={`Month ${breakeven.breakeven_month || '—'}`}
          sub={breakeven.breakeven_revenue ? formatCurrency(breakeven.breakeven_revenue, currency) + ' MRR' : ''}
          icon={Target}
          iconColor="text-emerald-500"
          trend="up"
        />
        <KpiCard
          label="LTV:CAC Ratio"
          value={`${ratios.ltv_cac_ratio || 0}x`}
          sub="Customer value efficiency"
          icon={CreditCard}
          iconColor={ratios.ltv_cac_ratio >= 3 ? 'text-emerald-500' : 'text-amber-500'}
          trend={ratios.ltv_cac_ratio >= 3 ? 'up' : 'neutral'}
          trendLabel={ratios.ltv_cac_ratio >= 3 ? 'Healthy' : 'Improve'}
        />
        <KpiCard
          label="Year 2 Projected"
          value={formatCurrency(summary.year2_projected_revenue || 0, currency)}
          sub={`${summary.annual_growth_rate || 0}% growth`}
          icon={TrendingUp}
          iconColor="text-blue-500"
          trend="up"
          trendLabel={`${summary.annual_growth_rate || 0}%`}
        />
      </motion.div>

      {/* Revenue + Profit + Costs Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue, Profit & Cost Projection (12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={combinedData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -10, fontSize: 11 }} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="Revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="Profit" stroke="#10b981" fill="url(#profGrad)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="Costs" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 4" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Chart */}
      {cashflowData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cumulative Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={cashflowData.map((c: any) => ({ month: c.month, 'Net Cash': c.net, 'Cumulative': c.cumulative }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine y={0} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Break-even', fontSize: 10 }} />
                <Area type="monotone" dataKey="Cumulative" stroke="#8b5cf6" fill="url(#cumGrad)" strokeWidth={2.5} />
                <Bar dataKey="Net Cash" fill="#06b6d4" radius={[2, 2, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ROI + Funding Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ROI Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" /> ROI & Investment Returns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Year 1 ROI', value: `${roi.year1_roi || 0}%`, good: roi.year1_roi >= 0 },
              { label: 'Year 2 ROI', value: `${roi.year2_roi || 0}%`, good: roi.year2_roi >= 50 },
              { label: 'Year 3 ROI', value: `${roi.year3_roi || 0}%`, good: roi.year3_roi >= 100 },
              { label: 'Payback Period', value: `${roi.payback_period_months || '—'} months`, good: roi.payback_period_months <= 18 },
              { label: 'Internal Rate of Return (IRR)', value: `${roi.irr || 0}%`, good: roi.irr >= 20 },
              { label: 'Net Present Value (NPV)', value: formatCurrency(roi.npv || 0, currency), good: (roi.npv || 0) > 0 },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn('text-sm font-bold', item.good === true ? 'text-emerald-500' : item.good === false ? 'text-red-500' : 'text-foreground')}>
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cost Pie or Funding Pie */}
        {costPieData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Startup Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={costPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value" labelLine={false} fontSize={10}
                    label={({ name, percent }) => `${(name || '').length > 10 ? (name || '').slice(0,10)+'…' : (name || '')} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {costPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v, currency)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {costPieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}: {formatCurrency(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Key Financial Ratios</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Gross Margin', value: `${ratios.gross_margin || 0}%`, good: ratios.gross_margin >= 50 },
                { label: 'Customer LTV', value: formatCurrency(ratios.customer_ltv || 0, currency) },
                { label: 'Customer CAC', value: formatCurrency(ratios.customer_cac || 0, currency) },
                { label: 'Monthly Burn Rate', value: formatCurrency(ratios.monthly_burn_rate || 0, currency) },
                { label: 'Net Margin (Yr 2)', value: `${ratios.net_margin_year2 || 0}%`, good: ratios.net_margin_year2 >= 15 },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={cn('text-sm font-bold', item.good === true ? 'text-emerald-500' : item.good === false ? 'text-amber-500' : 'text-foreground')}>
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Financial Ratios (always show) */}
      {costPieData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Key Financial Ratios</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Gross Margin', value: `${ratios.gross_margin || 0}%`, good: ratios.gross_margin >= 50 },
                { label: 'Customer LTV', value: formatCurrency(ratios.customer_ltv || 0, currency) },
                { label: 'Monthly Burn Rate', value: formatCurrency(ratios.monthly_burn_rate || 0, currency) },
                { label: 'Net Margin Yr2', value: `${ratios.net_margin_year2 || 0}%`, good: ratios.net_margin_year2 >= 15 },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-xl border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={cn('text-xl font-bold', item.good === true ? 'text-emerald-500' : item.good === false ? 'text-amber-500' : 'text-foreground')}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Startup & Monthly Costs Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {startupCosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex justify-between">
                <span>Startup Costs</span>
                <span className="text-primary">{formatCurrency(raw.startup_costs?.total || 0, currency)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable columns={startupCostColumns} data={startupCosts} />
            </CardContent>
          </Card>
        )}

        {monthlyCosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex justify-between">
                <span>Monthly Operating Costs</span>
                <span className="text-amber-500">{formatCurrency(raw.monthly_costs?.total || 0, currency)}/mo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: 'item', label: 'Item', render: (row: any) => <span className="font-medium text-foreground">{row.item}</span> },
                  { key: 'category', label: 'Category', render: (row: any) => <span className="capitalize text-muted-foreground text-xs">{row.category}</span> },
                  { key: 'amount', label: 'Amount/mo', align: 'right', render: (row: any) => <span className="font-semibold text-foreground">{formatCurrency(row.amount, currency)}</span> },
                ]}
                data={monthlyCosts}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Funding Requirements */}
      {funding.total_required && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Funding Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary mb-3">{formatCurrency(funding.total_required, currency)}</p>
            {funding.funding_rounds && (
              <div className="space-y-2">
                {funding.funding_rounds.map((round: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-sm font-medium text-foreground">{round.round}</span>
                    <span className="text-sm font-bold text-primary">{formatCurrency(round.amount, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </ReportShell>
  )
}
