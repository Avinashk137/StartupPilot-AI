import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Target, ClipboardList, CircleDollarSign, Megaphone,
  CheckCircle, Loader, Server, Activity, FileText, Zap, ChevronDown,
  ArrowRight, ShieldCheck, RefreshCw, Cpu, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/navigation/Breadcrumb'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { cn } from '@/lib/utils'

const agents = [
  {
    id: 'research',
    name: 'Research Agent',
    role: 'Market Intelligence Specialist',
    icon: Search,
    color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-500',
    model: 'Gemini 2.5 Flash / OpenAI GPT',
    avgRuntime: '25 seconds',
    successRate: '98%',
    about: 'The Research Agent gathers market intelligence, identifies customer demand, estimates industry size, analyzes trends, discovers opportunities, and creates a complete market overview for your business.',
    inputs: ['Business Idea', 'Industry', 'Location', 'Target Audience', 'Budget', 'Business Goals', 'Competition', 'Timeline'],
    process: ['Receive Project', 'Identify Industry', 'Collect Market Data', 'Analyze Trends', 'Estimate Demand', 'Create Insights', 'Pass Results to Other Agents'],
    outputs: ['Market Overview', 'Industry Trends', 'Customer Insights', 'Opportunities', 'Market Challenges', 'SWOT Inputs', 'Business Recommendations'],
    uses: ['Business Idea', 'Country', 'State', 'Industry', 'Budget', 'Target Audience'],
    provides: ['Competitor Agent', 'Business Plan Agent', 'Finance Agent', 'Marketing Agent'],
    tools: ['Google Search', 'Gemini AI', 'OpenAI', 'Internal Analysis Engine', 'Market Database'],
    responsibilities: ['Market Research', 'Industry Analysis', 'Customer Research', 'Demand Forecasting', 'Growth Trends', 'Business Opportunities', 'Risk Analysis'],
    status: 'Online',
    perfProjects: 1432,
    perfRetries: 4,
    perfReports: 1432
  },
  {
    id: 'competitor',
    name: 'Competitor Agent',
    role: 'Competitor Intelligence Expert',
    icon: Target,
    color: 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400',
    iconColor: 'text-violet-500',
    model: 'Gemini 2.5 Flash / OpenAI GPT',
    avgRuntime: '22 seconds',
    successRate: '97%',
    about: 'The Competitor Agent identifies key competitors, analyzes their strengths and weaknesses, extracts pricing strategies, and determines how your business can position itself uniquely in the market.',
    inputs: ['Market Overview', 'Business Idea', 'Location', 'Target Audience'],
    process: ['Receive Market Data', 'Discover Competitors', 'Analyze Strengths & Weaknesses', 'Extract Pricing Data', 'Identify Market Gaps', 'Draft Competitive Strategy', 'Finalize Report'],
    outputs: ['Competitor Report', 'SWOT', 'Competitive Advantages', 'Pricing Analysis', 'Unique Selling Points', 'Market Positioning'],
    uses: ['Market Overview', 'Location', 'Target Audience'],
    provides: ['Business Plan Agent', 'Marketing Agent'],
    tools: ['Google Search', 'Gemini AI', 'Social Analysis'],
    responsibilities: ['Competitor Discovery', 'SWOT', 'Competitive Advantages', 'Pricing Analysis', 'Unique Selling Points', 'Market Positioning'],
    status: 'Online',
    perfProjects: 1421,
    perfRetries: 8,
    perfReports: 1421
  },
  {
    id: 'business_plan',
    name: 'Business Plan Agent',
    role: 'Business Strategy Consultant',
    icon: ClipboardList,
    color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-500',
    model: 'Gemini 2.5 Flash / OpenAI GPT',
    avgRuntime: '30 seconds',
    successRate: '99%',
    about: 'The Business Plan Agent synthesizes all prior research to draft a comprehensive, investor-ready business model, detailing mission, vision, revenue streams, and long-term strategy.',
    inputs: ['Market Insights', 'Competitor Analysis', 'Business Idea', 'Budget', 'Goals'],
    process: ['Compile Insights', 'Draft Mission & Vision', 'Define Value Proposition', 'Outline Business Canvas', 'Plan Operations', 'Formulate Growth Strategy', 'Generate Final Plan'],
    outputs: ['Business Plan', 'Business Model', 'Mission', 'Vision', 'Value Proposition', 'Business Canvas', 'Growth Strategy', 'Operations Plan', 'Revenue Streams'],
    uses: ['Market Report', 'Competitor Report', 'Business Idea', 'Budget'],
    provides: ['Finance Agent'],
    tools: ['Gemini AI', 'Internal Analysis Engine'],
    responsibilities: ['Business Model', 'Mission', 'Vision', 'Value Proposition', 'Business Canvas', 'Growth Strategy', 'Operations Plan', 'Revenue Streams'],
    status: 'Online',
    perfProjects: 1410,
    perfRetries: 2,
    perfReports: 1410
  },
  {
    id: 'finance',
    name: 'Finance Agent',
    role: 'CFO Advisor',
    icon: CircleDollarSign,
    color: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-500',
    model: 'Gemini 2.5 Flash / OpenAI GPT',
    avgRuntime: '35 seconds',
    successRate: '95%',
    about: 'The Finance Agent constructs realistic financial projections, cash flow analysis, ROI estimates, and break-even points to ensure your business remains financially viable.',
    inputs: ['Business Plan', 'Market Size', 'Budget', 'Pricing Analysis'],
    process: ['Analyze Business Plan', 'Estimate Costs', 'Forecast Revenue', 'Calculate ROI', 'Determine Break-even', 'Assess Financial Risks', 'Generate Finance Report'],
    outputs: ['Financial Report', 'Revenue Projection', 'Profit Forecast', 'Cash Flow', 'Break-even Analysis', 'ROI', 'Investment Planning', 'Financial Ratios', 'Risk Analysis'],
    uses: ['Business Plan', 'Pricing Analysis', 'Budget'],
    provides: ['Startup Blueprint'],
    tools: ['Financial Engine', 'Gemini AI', 'OpenAI'],
    responsibilities: ['Revenue Projection', 'Profit Forecast', 'Cash Flow', 'Break-even Analysis', 'ROI', 'Investment Planning', 'Financial Ratios', 'Risk Analysis'],
    status: 'Online',
    perfProjects: 1395,
    perfRetries: 15,
    perfReports: 1395
  },
  {
    id: 'marketing',
    name: 'Marketing Agent',
    role: 'Chief Marketing Officer',
    icon: Megaphone,
    color: 'bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400',
    iconColor: 'text-pink-500',
    model: 'Gemini 2.5 Flash / OpenAI GPT',
    avgRuntime: '28 seconds',
    successRate: '96%',
    about: 'The Marketing Agent formulates actionable marketing campaigns, social media strategies, SEO targets, and brand positioning to help you acquire customers effectively.',
    inputs: ['Target Audience', 'Competitor Positioning', 'Value Proposition', 'Budget'],
    process: ['Identify Audience', 'Define Brand Voice', 'Plan SEO Strategy', 'Draft Content Ideas', 'Allocate Ad Budget', 'Create Launch Campaign', 'Finalize Marketing Report'],
    outputs: ['Marketing Report', 'Social Media Content', 'Brand Positioning', 'Target Audience', 'SEO', 'Marketing Strategy', 'Campaign Ideas', 'Email Campaigns', 'Advertising'],
    uses: ['Competitor Report', 'Target Audience', 'Business Plan'],
    provides: ['Startup Blueprint'],
    tools: ['Google Search', 'Social Analysis', 'Gemini AI'],
    responsibilities: ['Social Media Content', 'Brand Positioning', 'Target Audience', 'SEO', 'Marketing Strategy', 'Campaign Ideas', 'Email Campaigns', 'Advertising'],
    status: 'Online',
    perfProjects: 1388,
    perfRetries: 9,
    perfReports: 1388
  }
]

export default function AgentsPage() {
  return (
    <ErrorBoundary>
      <AgentsPageContent />
    </ErrorBoundary>
  )
}

function AgentsPageContent() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      <Breadcrumb currentPage="AI Workforce" />

      {/* ── Page Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">AI Workforce</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl leading-relaxed text-base">
          Meet your AI business team. Each specialist handles one part of your startup and collaborates with the other agents to generate complete business intelligence.
        </p>
      </motion.div>

      {/* ── Summary Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Agents', value: '5', icon: Server, color: 'text-blue-500' },
          { label: 'Active Agents', value: '5', icon: Activity, color: 'text-emerald-500' },
          { label: 'Reports Generated', value: '7,046', icon: FileText, color: 'text-violet-500' },
          { label: 'Avg Analysis Time', value: '28s', icon: Clock, color: 'text-orange-500' },
          { label: 'AI Providers', value: 'Gemini + OpenAI', icon: Cpu, color: 'text-pink-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="h-full border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Agent Cards List ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {agents.map((agent, i) => {
          const isExpanded = expandedId === agent.id

          return (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className={cn("col-span-1", isExpanded ? "lg:col-span-2" : "")}
            >
              <Card className="overflow-hidden border-border bg-card shadow-sm hover:shadow-lg transition-all duration-300 relative group">
                {/* Collapsed Header */}
                <div 
                  className="p-6 cursor-pointer select-none relative z-10 bg-card transition-colors hover:bg-accent/50"
                  onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${agent.color}`}>
                        <agent.icon className={`w-6 h-6 ${agent.iconColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-foreground tracking-tight">{agent.name}</h3>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {agent.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">{agent.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:ml-auto">
                      <div className="hidden sm:block text-right">
                        <p className="text-xs text-muted-foreground">AI Model</p>
                        <p className="text-sm font-medium text-foreground">{agent.model}</p>
                      </div>
                      <div className="hidden sm:block text-right">
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{agent.successRate}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded ? "rotate-180" : "")} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick stats on mobile when collapsed */}
                  {!isExpanded && (
                    <div className="flex sm:hidden items-center justify-between mt-4 pt-4 border-t border-border">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Avg Runtime:</span> <span className="font-medium text-foreground">{agent.avgRuntime}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Success:</span> <span className="font-medium text-emerald-600 dark:text-emerald-400">{agent.successRate}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden border-t border-border"
                    >
                      <div className="p-6 bg-muted/30">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          
                          {/* Column 1: About & Performance */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                <InfoIcon className="w-4 h-4" /> About Agent
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {agent.about}
                              </p>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Performance
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-card border border-border rounded-xl shadow-sm">
                                  <p className="text-xs text-muted-foreground mb-1">Processed</p>
                                  <p className="text-lg font-bold text-foreground">{agent.perfProjects}</p>
                                </div>
                                <div className="p-3 bg-card border border-border rounded-xl shadow-sm">
                                  <p className="text-xs text-muted-foreground mb-1">Avg Time</p>
                                  <p className="text-lg font-bold text-foreground">{agent.avgRuntime}</p>
                                </div>
                                <div className="p-3 bg-card border border-border rounded-xl shadow-sm">
                                  <p className="text-xs text-muted-foreground mb-1">Retries</p>
                                  <p className="text-lg font-bold text-foreground">{agent.perfRetries}</p>
                                </div>
                                <div className="p-3 bg-card border border-border rounded-xl shadow-sm">
                                  <p className="text-xs text-muted-foreground mb-1">Reports</p>
                                  <p className="text-lg font-bold text-foreground">{agent.perfReports}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Data Flow */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-sm font-bold text-foreground mb-3">Required Inputs</h4>
                              <div className="flex flex-wrap gap-2">
                                {agent.inputs.map(input => (
                                  <Badge key={input} variant="secondary" className="font-normal text-xs">{input}</Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-foreground mb-3">Generated Outputs</h4>
                              <div className="space-y-2">
                                {agent.outputs.map(output => (
                                  <div key={output} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{output}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-foreground mb-3">Tools Used</h4>
                              <div className="flex flex-wrap gap-2">
                                {agent.tools.map(tool => (
                                  <Badge key={tool} variant="outline" className="font-normal text-xs bg-background">{tool}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Column 3: Workflow */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-sm font-bold text-foreground mb-3">Agent Workflow</h4>
                              <div className="relative pl-4 space-y-4 before:absolute before:inset-y-2 before:left-[7px] before:w-px before:bg-border">
                                {agent.process.map((step, idx) => (
                                  <div key={idx} className="relative flex items-center gap-3">
                                    <div className="absolute -left-[17px] w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
                                    <span className="text-sm text-foreground font-medium">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
                              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Live Status</h4>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-sm font-bold text-foreground">Ready for tasks</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ── Workflow Diagram ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-12">
        <h2 className="text-xl font-bold text-foreground tracking-tight mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" /> Complete Analysis Pipeline
        </h2>
        
        <div className="p-8 border border-border bg-card rounded-2xl shadow-sm overflow-x-auto">
          <div className="min-w-[800px] flex items-center justify-between">
            <div className="flex flex-col items-center gap-2 w-32">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center border border-border">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-center leading-tight">Business<br/>Idea</span>
            </div>

            {agents.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <motion.div 
                    animate={{ x: [0, 5, 0] }} 
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                  >
                    <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                  </motion.div>
                </div>
                
                <div className="flex flex-col items-center gap-2 w-32">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${agent.color.replace('bg-', 'bg-').replace('/10', '/20')}`}>
                    <agent.icon className={`w-6 h-6 ${agent.iconColor}`} />
                  </div>
                  <span className="text-sm font-semibold text-center leading-tight text-foreground">{agent.name}</span>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <motion.div 
                  animate={{ x: [0, 5, 0] }} 
                  transition={{ repeat: Infinity, duration: 2, delay: 5 * 0.2 }}
                >
                  <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                </motion.div>
              </div>
              
              <div className="flex flex-col items-center gap-2 w-32">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-bold text-center leading-tight text-primary">Final Startup<br/>Blueprint</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── AI Providers Fallback Section ────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
              <RefreshCw className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">High-Availability AI Engine</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
                StartupPilot uses an intelligent fallback routing system. Our primary provider is <strong className="text-foreground">Gemini</strong> for rapid, high-context reasoning. If Gemini encounters rate limits or downtime, the system automatically hot-swaps to <strong className="text-foreground">OpenAI</strong> without interrupting your analysis. If both fail, internal retry mechanisms ensure your reports are successfully generated on the next attempt.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}
