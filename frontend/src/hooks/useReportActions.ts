import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { usePrint } from '@/providers/PrintProvider';

export interface ReportMetadata {
  projectName?: string;
  reportTypeStr?: string;
  industry?: string;
  country?: string;
  dateStr?: string;
  provider?: string;
}

export function useReportActions() {
  const { isPrinting, printReport } = usePrint();
  const [isCopying, setIsCopying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState<{ step: string; percent: number } | null>(null);

  const handleDownloadPDF = useCallback(async (
    reportType: string,
    reportData: any,
    projectData: any,
    reportMetadata: any,
    filename: string,
    meta: ReportMetadata
  ) => {
    if (isPrinting) return false;
    try {
      await printReport(reportType, reportData, projectData, reportMetadata, filename, meta);
      return true;
    } catch (err: any) {
      console.error('Failed to trigger PDF export:', err);
      toast.error('Failed to generate PDF.');
      return false;
    }
  }, [isPrinting, printReport]);

  const handleCopyMarkdown = useCallback(async (
    projectId: string,
    reportType: string,
    meta: ReportMetadata,
    exportId?: string // if called from ExportsPage
  ) => {
    if (isCopying) return false;
    setIsCopying(true);
    
    try {
      let rawMd = '';
      if (exportId) {
        const res = await api.get(`/exports/${exportId}/preview`);
        rawMd = res.data.markdown || JSON.stringify(res.data.content, null, 2);
      } else {
        const res = await api.get(`/projects/${projectId}/reports/${reportType}/markdown`);
        rawMd = res.data;
      }

      const header = [
        `# ${meta.projectName || 'Project'} - ${meta.reportTypeStr || 'Report'}`,
        '',
        `**Generated Date:** ${meta.dateStr || new Date().toLocaleDateString()}`,
        meta.industry ? `**Industry:** ${meta.industry}` : null,
        meta.country ? `**Country:** ${meta.country}` : null,
        meta.provider ? `**Provider:** ${meta.provider.replace('_', ' ')}` : null,
        '',
        '---',
        '',
      ].filter(Boolean).join('\n');

      const finalMd = `${header}\n${rawMd}`;

      try {
        await navigator.clipboard.writeText(finalMd);
      } catch (err) {
        // Fallback for some browsers if clipboard API fails
        const textArea = document.createElement('textarea');
        textArea.value = finalMd;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      toast.success('Markdown copied successfully.');
      return true;
    } catch (err) {
      console.error('Failed to copy markdown', err);
      toast.error('Failed to copy markdown.');
      return false;
    } finally {
      setIsCopying(false);
    }
  }, [isCopying, toast]);

  const handlePrint = useCallback(async (
    reportType: string,
    reportData: any,
    projectData: any,
    reportMetadata: any,
    filename: string,
    meta: ReportMetadata
  ) => {
    if (isPrinting) return false;
    return await printReport(reportType, reportData, projectData, reportMetadata, filename, meta);
  }, [isPrinting, printReport]);

  const handleRegenerate = useCallback(async (
    projectId: string, 
    reportType: string,
    onSuccess?: () => void
  ) => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setRegenProgress(null);

    try {
      await api.post(`/projects/${projectId}/reports/${reportType}/regenerate`);
      toast.loading('Starting regeneration...');
      
      let attempts = 0;
      const maxAttempts = 60; // 120s
      
      const poll = setInterval(async () => {
        attempts++;
        try {
          const res = await api.get(`/projects/${projectId}/reports/${reportType}`);
          if (res.status === 202) {
            const detail = res.data?.detail;
            if (detail && typeof detail === 'object') {
              setRegenProgress({
                step: detail.progress_step || 'Regenerating...',
                percent: detail.progress_percent || 0
              });
            }
            return;
          }
          
          // Success
          clearInterval(poll);
          setIsRegenerating(false);
          setRegenProgress(null);
          toast.success('Report updated successfully.');
          onSuccess?.();
        } catch (pollErr: any) {
          if (pollErr?.response?.status === 202) {
            const detail = pollErr.response.data?.detail;
            if (detail && typeof detail === 'object') {
              setRegenProgress({
                step: detail.progress_step || 'Regenerating...',
                percent: detail.progress_percent || 0
              });
            }
            return;
          }
          
          clearInterval(poll);
          setIsRegenerating(false);
          setRegenProgress(null);
          toast.error(pollErr?.response?.data?.detail || 'Regeneration failed.');
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setIsRegenerating(false);
          toast.error('Timeout waiting for regeneration.');
        }
      }, 2000);
      
    } catch (err: any) {
      setIsRegenerating(false);
      toast.error(err?.response?.data?.detail || 'Failed to start regeneration.');
    }
  }, [isRegenerating, toast]);

  return {
    handleDownloadPDF,
    handleCopyMarkdown,
    handlePrint,
    handleRegenerate,
    isPrinting,
    isCopying,
    isRegenerating,
    regenProgress
  };
}
