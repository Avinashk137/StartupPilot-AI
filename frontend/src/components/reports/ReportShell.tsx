import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Download, Printer, Copy, Check, RefreshCw, Loader,
  FileText, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Breadcrumb } from '@/components/navigation/Breadcrumb'
import { useReportActions, ReportMetadata } from '@/hooks/useReportActions'
import { usePrint } from '@/providers/PrintProvider'

interface ReportShellProps {
  projectId: string
  reportType: string   // e.g. 'research', 'competitor', 'business-plan', 'finance', 'marketing'
  title: string
  subtitle?: string
  accentColor?: string
  children: React.ReactNode
  rawData?: any        
  loading?: boolean
  error?: string | null
  onReload?: () => void
  hideNavigation?: boolean
  projectData?: any
  reportMetadata?: any
  printMode?: boolean
}

function SkeletonCard({ h = 40 }: { h?: number }) {
  return <div className={`w-full animate-pulse rounded-xl bg-muted`} style={{ height: `${h * 4}px` }} />
}

export function ReportSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl">
      <SkeletonCard h={12} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} h={24} />)}
      </div>
      <SkeletonCard h={48} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <SkeletonCard key={i} h={40} />)}
      </div>
      <SkeletonCard h={32} />
    </div>
  )
}

export default function ReportShell({
  projectId,
  reportType,
  title,
  subtitle,
  accentColor = 'from-violet-600 to-indigo-600',
  children,
  rawData,
  loading = false,
  error = null,
  onReload,
  hideNavigation = false,
  projectData,
  reportMetadata,
  printMode = false,
}: ReportShellProps) {
  
  const {
    handleDownloadPDF,
    handleCopyMarkdown,
    handlePrint,
    handleRegenerate,
    isCopying,
    isRegenerating,
    regenProgress
  } = useReportActions()

  const { isPrinting } = usePrint()

  const meta: ReportMetadata = {
    projectName: projectData?.business_name || 'Project',
    reportTypeStr: title,
    industry: projectData?.industry,
    country: projectData?.country,
    dateStr: reportMetadata?.updated_at ? new Date(reportMetadata.updated_at).toLocaleDateString() : undefined,
    provider: reportMetadata?.provider_used
  }

  const projName = meta.projectName!.replace(/\s+/g, '')
  const fileName = `${projName}_${title.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.pdf`

  if (loading) return <ReportSkeleton />

  if (error) {
    return (
      <div className="max-w-5xl space-y-4 print:hidden">
        {!hideNavigation && <Breadcrumb projectId={projectId} projectName={subtitle?.split(' · ')[0] || 'Project'} reportType={reportType} />}
        {!hideNavigation && (
          <Link to={`/projects/${projectId}`}>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Project
            </button>
          </Link>
        )}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <p className="font-semibold text-foreground text-lg">{title} — Not Generated Yet</p>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">{error}</p>
          {onReload && (
            <Button onClick={onReload} variant="outline" size="sm">
              Try Again
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (printMode) {
    return (
      <div className="print-report-content space-y-6">
        {children}
      </div>
    )
  }

  const generatedTimestamp = new Date().toLocaleString()

  return (
    <div className="space-y-6 max-w-5xl">

      <div>
        {!hideNavigation && <Breadcrumb projectId={projectId} projectName={subtitle?.split(' · ')[0] || 'Project'} reportType={reportType} />}
      </div>
      
      {/* Back navigation + export toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {!hideNavigation && (
            <Link to={`/projects/${projectId}`}>
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Project
              </button>
            </Link>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRegenerate(projectId, reportType, onReload)}
              disabled={isRegenerating || isPrinting || isCopying}
              className="gap-1.5 h-8 text-xs transition-colors"
            >
              {isRegenerating ? (
                <><Loader className="w-3 h-3 animate-spin" /> {regenProgress ? `${regenProgress.percent}%` : 'Regenerating…'}</>
              ) : (
                <><RefreshCw className="w-3 h-3" /> Regenerate</>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleCopyMarkdown(projectId, reportType, meta)} 
              disabled={isCopying || isPrinting || isRegenerating}
              className="gap-1.5 h-8 text-xs"
            >
              {isCopying ? <><Loader className="w-3 h-3 animate-spin" /> Copying</> : <><Copy className="w-3 h-3" /> Copy MD</>}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isPrinting || isCopying || isRegenerating}
              className="gap-1.5 h-8 text-xs"
              onClick={() => handleDownloadPDF(reportType, rawData, projectData, reportMetadata, fileName, meta)}
            >
              {isPrinting ? <><Loader className="w-3 h-3 animate-spin" /> Preparing...</> : <><Download className="w-3 h-3" /> Download PDF</>}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePrint(reportType, rawData, projectData, reportMetadata, fileName, meta)} 
              disabled={isPrinting || isCopying || isRegenerating}
              className="gap-1.5 h-8 text-xs"
            >
              <Printer className="w-3 h-3" /> Print
            </Button>
          </div>
        </div>

        {/* Report header with gradient accent */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm print:hidden">
          <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r print:hidden', accentColor)} />
          <div className="px-7 py-6">
            <div className="flex items-start gap-4">
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', accentColor)}>
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="w-full">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  {projectData && (
                    <>
                      <span className="font-medium text-foreground">Project: {meta.projectName}</span>
                      {meta.industry && <span>Industry: {meta.industry}</span>}
                      {meta.country && <span>Country: {meta.country}</span>}
                    </>
                  )}
                  {reportMetadata && (
                    <>
                      {reportMetadata.version && <span>Version: {reportMetadata.version}</span>}
                      {meta.dateStr && (
                        <span>Generated: {meta.dateStr}</span>
                      )}
                      {meta.provider && <span className="capitalize">Provider: {meta.provider.replace('_', ' ')}</span>}
                    </>
                  )}
                </div>
                
                {isRegenerating && (
                  <div className="mt-3">
                    <p className="text-xs text-primary flex items-center gap-1.5 font-medium">
                      <Loader className="w-3 h-3 animate-spin" />
                      {regenProgress ? `${regenProgress.step} (${regenProgress.percent}%)` : 'Regenerating this report...'}
                    </p>
                    <div className="h-1.5 w-64 bg-primary/10 rounded-full mt-2 overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary" 
                        initial={{ width: 0 }} 
                        animate={{ width: `${regenProgress?.percent || 0}%` }} 
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Page content */}
      <div className="space-y-6 print:space-y-4 print:pt-4">
        {children}
      </div>

      {/* Footer for on-screen view only */}
      <div className="pt-8 pb-4 text-center text-sm text-muted-foreground">
        Generated by StartupPilot AI
      </div>
    </div>
  )
}
