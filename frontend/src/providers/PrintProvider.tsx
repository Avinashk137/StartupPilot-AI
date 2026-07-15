import React, { createContext, useContext, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ReportMetadata } from '@/hooks/useReportActions';

const PrintableReport = lazy(() => import('@/components/print/PrintableReport'));

interface PrintContextType {
  isPrinting: boolean;
  printReport: (
    reportType: string,
    reportData: any,
    projectData: any,
    reportMetadata: any,
    filename: string,
    meta: ReportMetadata
  ) => Promise<boolean>;
}

const PrintContext = createContext<PrintContextType>({
  isPrinting: false,
  printReport: async () => false,
});

export const usePrint = () => useContext(PrintContext);

export function PrintProvider({ children }: { children: React.ReactNode }) {
  const [printState, setPrintState] = useState<{
    reportType: string;
    reportData: any;
    projectData: any;
    reportMetadata: any;
    filename: string;
    meta: ReportMetadata;
  } | null>(null);

  const printReport = useCallback(async (
    reportType: string,
    reportData: any,
    projectData: any,
    reportMetadata: any,
    filename: string,
    meta: ReportMetadata
  ) => {
    if (printState) return false;

    setPrintState({ reportType, reportData, projectData, reportMetadata, filename, meta });
    
    // The actual window.print() will be called by PrintableReport once it confirms rendering
    return true;
  }, [printState]);

  const handlePrintComplete = useCallback(() => {
    setPrintState(null);
  }, []);

  useEffect(() => {
    if (printState) {
      document.body.classList.add('is-printing');
    } else {
      document.body.classList.remove('is-printing');
    }
  }, [printState]);

  return (
    <PrintContext.Provider value={{ isPrinting: !!printState, printReport }}>
      {children}
      {printState && createPortal(
        <Suspense fallback={null}>
          <PrintableReport 
            {...printState} 
            onComplete={handlePrintComplete} 
          />
        </Suspense>,
        document.body
      )}
    </PrintContext.Provider>
  );
}
