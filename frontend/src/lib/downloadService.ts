import api from './api';
import html2pdf from 'html2pdf.js';

export const downloadService = {
  /**
   * Downloads DOCX, PPTX, or CSV directly from the backend API.
   */
  async downloadFromServer(exportId: string, format: string, filename: string) {
    try {
      const response = await api.post(`/exports/${exportId}/download/${format}`, null, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      return true;
    } catch (error) {
      console.error(`Error downloading ${format}:`, error);
      throw error;
    }
  },

  /**
   * Generates a PDF client-side using html2pdf.js to preserve styles perfectly.
   */
  async generatePDF(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    // Prepare options
    const opt = {
      margin:       10,
      filename:     filename,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    // Add a class temporarily to hide elements we don't want in the PDF (e.g., buttons)
    element.classList.add('pdf-mode');
    
    try {
      await html2pdf().set(opt).from(element).save();
      return true;
    } catch (err) {
      console.error('PDF Generation failed', err);
      throw err;
    } finally {
      element.classList.remove('pdf-mode');
    }
  },

  /**
   * Print dialog
   */
  print(elementId: string) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // The browser print dialog usually uses CSS media queries (@media print)
    // We just call window.print(), but we need to ensure the element is visible
    // and other things are hidden using CSS.
    window.print();
  }
};
