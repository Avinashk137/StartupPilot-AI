import api from './api';

export const downloadService = {
  /**
   * Downloads DOCX, PPTX, or CSV directly from the backend API.
   */
  async downloadFromServer(exportId: string, format: string, filename: string) {
    try {
      const response = await api.post(`/exports/${exportId}/download/${format}`, null, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(response.data);
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
