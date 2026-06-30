import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbProps {
  projectId?: string
  projectName?: string
  reportType?: string
  currentPage?: string
}

export function Breadcrumb({ projectId, projectName, reportType, currentPage }: BreadcrumbProps) {
  const crumbs = [
    { label: 'StartupPilot', path: '/dashboard' }
  ]

  if (currentPage === 'Dashboard') {
    // Only StartupPilot -> Dashboard
  } else if (projectId || reportType || currentPage === 'Projects' || currentPage === 'Project Detail') {
    crumbs.push({ label: 'Projects', path: '/projects' })
    
    if (projectId) {
      crumbs.push({ label: projectName || 'Details', path: `/projects/${projectId}` })
    }

    if (reportType) {
      crumbs.push({ label: 'Reports', path: `/projects/${projectId}?tab=reports` })
      
      const reportLabels: Record<string, string> = {
        research: 'Market Research',
        competitor: 'Competitor Analysis',
        'business-plan': 'Business Plan',
        financial: 'Financial Report',
        marketing: 'Marketing Strategy',
      }
      
      crumbs.push({ 
        label: reportLabels[reportType] || reportType, 
        path: `/projects/${projectId}/reports/${reportType}` 
      })
    }
  } else if (currentPage) {
    // For standalone pages like Agents, Notifications, etc.
    crumbs.push({ label: currentPage, path: '#' })
  }

  return (
    <div className="flex items-center gap-1.5 text-sm mb-6 print:hidden">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <div key={`${crumb.path}-${index}`} className="flex items-center gap-1.5">
            {isLast ? (
              <span className="font-semibold text-foreground cursor-default">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {crumb.label}
              </Link>
            )}
            {!isLast && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  )
}
