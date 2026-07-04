import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, Search, Filter, FileText, FileBarChart, PieChart, 
  TrendingUp, Target, MoreVertical, Eye, Printer, Copy, RefreshCw, 
  Share2, Trash2, CheckCircle2, XCircle, Clock, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { downloadService } from '@/lib/downloadService';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

export default function ExportsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [sort, setSort] = useState('newest');

  // Preview
  const [previewExport, setPreviewExport] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [search, status, reportType, sort, page]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/exports/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exports', {
        params: { search, status, report_type: reportType, sort, page, limit: 20 }
      });
      setReports(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (exp: any) => {
    setPreviewLoading(true);
    setPreviewExport({ ...exp, content_rendered: '' });
    try {
      const res = await api.get(`/exports/${exp.id}/preview`);
      setPreviewExport({ ...exp, content_rendered: res.data.markdown || JSON.stringify(res.data.content, null, 2) });
    } catch (err) {
      toast({ title: "Failed to load preview", variant: "destructive" });
      setPreviewExport(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this export? The project will remain safe.')) return;
    try {
      await api.delete(`/exports/${id}`);
      toast({ title: "Export deleted" });
      fetchReports();
      fetchStats();
    } catch (err) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleDownloadServer = async (exp: any, format: string) => {
    try {
      toast({ title: `Generating ${format.toUpperCase()}...` });
      const filename = `${exp.project_name.replace(/ /g, '_')}_${exp.report_type}.${format}`;
      await downloadService.downloadFromServer(exp.id, format, filename);
      fetchStats();
      fetchReports(); // Update download count
    } catch (err) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async (exp: any) => {
    // Quick load content if not previewed
    try {
      toast({ title: "Generating PDF..." });
      let contentToRender = '';
      if (previewExport && previewExport.id === exp.id) {
        contentToRender = previewExport.content_rendered;
      } else {
        const res = await api.get(`/exports/${exp.id}/preview`);
        contentToRender = res.data.markdown;
      }
      
      // We create a temporary hidden div to render the markdown to HTML for html2pdf
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-pdf-container';
      tempDiv.className = 'prose max-w-none p-8 dark:prose-invert bg-white dark:bg-gray-900 text-black dark:text-white';
      
      // Very basic markdown to HTML for PDF (In real app we'd render the React component)
      tempDiv.innerHTML = `
        <div style="text-align:center; margin-bottom: 2rem;">
          <h1>${exp.project_name}</h1>
          <h2 style="color:#666;">${exp.report_type.replace('_', ' ').toUpperCase()}</h2>
          <p>Generated on ${new Date(exp.created_at).toLocaleDateString()}</p>
        </div>
        <div style="white-space: pre-wrap;">${contentToRender}</div>
      `;
      document.body.appendChild(tempDiv);
      
      const filename = `${exp.project_name.replace(/ /g, '_')}_${exp.report_type}.pdf`;
      await downloadService.generatePDF('temp-pdf-container', filename);
      
      document.body.removeChild(tempDiv);
      
      // ping server to update download count
      api.post(`/exports/${exp.id}/download/pdf`);
      fetchStats();
      fetchReports();
    } catch (err) {
      toast({ title: "PDF generation failed", variant: "destructive" });
    }
  };

  const handlePrint = (exp: any) => {
    handlePreview(exp).then(() => {
      setTimeout(() => {
        downloadService.print('preview-content');
      }, 500);
    });
  };

  const handleCopyMarkdown = async (exp: any) => {
    try {
      const res = await api.get(`/exports/${exp.id}/preview`);
      await navigator.clipboard.writeText(res.data.markdown);
      toast({ title: "Copied Successfully!" });
    } catch (err) {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleRegenerate = async (exp: any) => {
    if (!confirm(`Are you sure you want to regenerate the ${exp.report_type}? This will overwrite the current export.`)) return;
    try {
      toast({ title: "Starting regeneration..." });
      await api.post(`/reports/${exp.project_id}/${exp.report_type}/regenerate`);
      toast({ title: "Regeneration queued. Check status shortly." });
      setTimeout(fetchReports, 2000);
    } catch (err) {
      toast({ title: "Failed to start regeneration", variant: "destructive" });
    }
  };

  const handleShare = (exp: any) => {
    // Generate a fake share link for now
    const link = `${window.location.origin}/share/export/${exp.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Share link copied (View Only)" });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Completed</Badge>;
      case 'processing': 
      case 'pending': return <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Processing</Badge>;
      case 'failed': return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1"/> Failed</Badge>;
      case 'partial': return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1"/> Partial</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'research': return <Search className="w-4 h-4 text-blue-500"/>;
      case 'competitor': return <Target className="w-4 h-4 text-red-500"/>;
      case 'business_plan': return <FileText className="w-4 h-4 text-emerald-500"/>;
      case 'financial': return <TrendingUp className="w-4 h-4 text-yellow-500"/>;
      case 'marketing': return <PieChart className="w-4 h-4 text-purple-500"/>;
      default: return <FileText className="w-4 h-4"/>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Export Center</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Download, preview, regenerate and manage every AI generated report from one place.
        </p>
      </motion.div>

      {/* TOP SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_reports || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats?.completed || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_downloads || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by project name..." 
              className="pl-9 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select 
              className="flex h-10 w-full md:w-36 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>

            <select 
              className="flex h-10 w-full md:w-44 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="all">All Reports</option>
              <option value="research">Market Research</option>
              <option value="competitor">Competitor Analysis</option>
              <option value="business_plan">Business Plan</option>
              <option value="financial">Financial Report</option>
              <option value="marketing">Marketing Strategy</option>
            </select>

            <select 
              className="flex h-10 w-full md:w-36 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="downloads">Most Downloaded</option>
              <option value="project">Project Name</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* REPORT LIST */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Report</th>
                  <th className="px-6 py-4 font-medium">Project / Industry</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Engine</th>
                  <th className="px-6 py-4 font-medium">Date & Version</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
                    </tr>
                  ))
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No reports found</p>
                        <p className="text-sm">Create your first project to generate AI reports.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reports.map((exp: any) => (
                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-medium">
                          {getReportIcon(exp.report_type)}
                          <span className="capitalize">{exp.report_type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{exp.project_name || 'Unnamed Project'}</div>
                        <div className="text-xs text-muted-foreground">{exp.industry || 'No industry'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(exp.status)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize text-xs">{exp.generated_by || 'Auto'}</Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-1 text-xs"><Clock className="w-3 h-3"/> {new Date(exp.created_at).toLocaleDateString()}</div>
                        <div className="text-xs mt-1">v{exp.version} • {exp.download_count} DLs</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handlePreview(exp)}>
                            <Eye className="w-4 h-4 mr-1"/> Preview
                          </Button>
                          
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-1" align="end">
                              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 uppercase">Downloads</div>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleDownloadPDF(exp)}>
                                <FileText className="w-4 h-4 mr-2" /> Download PDF
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleDownloadServer(exp, 'docx')}>
                                <FileText className="w-4 h-4 mr-2" /> Download DOCX
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleDownloadServer(exp, 'pptx')}>
                                <PieChart className="w-4 h-4 mr-2" /> Download PPTX
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleDownloadServer(exp, 'csv')}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" /> Download CSV
                              </Button>
                              
                              <div className="h-px bg-border my-1" />
                              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 uppercase">Actions</div>
                              
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleCopyMarkdown(exp)}>
                                <Copy className="w-4 h-4 mr-2" /> Copy Markdown
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handlePrint(exp)}>
                                <Printer className="w-4 h-4 mr-2" /> Print
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleShare(exp)}>
                                <Share2 className="w-4 h-4 mr-2" /> Share
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleRegenerate(exp)}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                              </Button>
                              
                              <div className="h-px bg-border my-1" />
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => handleDelete(exp.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Export
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* PAGINATION */}
          {total > 20 && (
            <div className="p-4 border-t flex justify-between items-center bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} reports
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PREVIEW DIALOG */}
      <Dialog open={!!previewExport} onOpenChange={(v) => !v && setPreviewExport(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl capitalize flex items-center gap-2">
                  {previewExport ? getReportIcon(previewExport.report_type) : null}
                  {previewExport?.report_type?.replace('_', ' ')}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewExport?.project_name} • v{previewExport?.version}
                </p>
              </div>
              <div className="flex gap-2 mr-6 print:hidden">
                <Button size="sm" variant="outline" onClick={() => handlePrint(previewExport)}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
                <Button size="sm" onClick={() => handleDownloadPDF(previewExport)}>
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div id="preview-content" className="flex-1 overflow-y-auto p-8 bg-white dark:bg-gray-950">
            {previewLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-32 w-full mt-8" />
              </div>
            ) : previewExport?.content_rendered ? (
              <article className="prose prose-slate dark:prose-invert max-w-none print:text-black">
                <ReactMarkdown>{previewExport.content_rendered}</ReactMarkdown>
              </article>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No preview content available.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
