import { useState, useCallback } from 'react'

export function useExportPDF() {
  const [isExporting, setIsExporting] = useState(false)

  const exportToPDF = useCallback(async (elementId: string, filename: string) => {
    if (isExporting) return false
    
    // Set exporting state
    setIsExporting(true)
    
    // Crucial: Yield to the browser so React can actually render the spinner
    // before the heavy synchronous HTML2Canvas block freezes the main thread.
    await new Promise(resolve => setTimeout(resolve, 150))
    
    let originalElement: HTMLElement | null = null
    let cloneElement: HTMLElement | null = null
    let pdfWorker: any = null
    
    try {
      originalElement = document.getElementById(elementId)
      if (!originalElement) throw new Error('Element not found')

      // Clone the report to avoid modifying the live UI
      cloneElement = originalElement.cloneNode(true) as HTMLElement
      
      // Add dedicated PDF export class (replaces OKLCH variables with Hex)
      cloneElement.classList.add('pdf-export-mode')
      
      // Ensure the clone is in the DOM so html2canvas can read computed styles,
      // but keep it hidden and force it to match the original width.
      cloneElement.style.position = 'absolute'
      cloneElement.style.left = '-99999px'
      cloneElement.style.top = '0'
      cloneElement.style.width = `${originalElement.offsetWidth}px`
      cloneElement.style.backgroundColor = '#ffffff' // Force white background for PDF
      document.body.appendChild(cloneElement)
      
      // Fix for Tailwind v4: html2canvas does not support oklch()
      // We read the computed OKLCH value, draw it to a 1x1 canvas, and read back the exact RGB pixels!
      const replaceOklchWithRgb = (rootNode: HTMLElement) => {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        
        const cache: Record<string, string> = {}
        const convertSingleColor = (colorStr: string) => {
          if (cache[colorStr]) return cache[colorStr]
          ctx.clearRect(0, 0, 1, 1)
          ctx.fillStyle = '#000'
          ctx.fillStyle = colorStr
          ctx.fillRect(0, 0, 1, 1)
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
          const rgba = `rgba(${r}, ${g}, ${b}, ${a / 255})`
          cache[colorStr] = rgba
          return rgba
        }

        const convertPropertyString = (val: string) => {
          if (!val || !val.includes('oklch')) return val
          // Regex to match oklch(...) or oklch(... / ...)
          return val.replace(/oklch\([^)]+\)/g, (match) => convertSingleColor(match))
        }

        const elements = [rootNode, ...Array.from(rootNode.querySelectorAll('*'))] as HTMLElement[]
        const props = [
          'color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 
          'borderBottomColor', 'borderLeftColor', 'fill', 'stroke', 'outlineColor',
          'backgroundImage'
        ]
        
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i]
          if (!el.style) continue
          
          const computed = window.getComputedStyle(el)
          for (const prop of props) {
            const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
            const val = computed.getPropertyValue(cssProp)
            if (val && val.includes('oklch')) {
              (el.style as any)[prop] = convertPropertyString(val)
            }
          }
        }
      }
      
      replaceOklchWithRgb(cloneElement)
      
      const html2pdf = (await import('html2pdf.js')).default

      const opt = {
        margin:       [10, 10, 10, 10] as [number, number, number, number],
        filename:     filename,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      }

      // Create the worker using the CLONE
      pdfWorker = html2pdf().set(opt).from(cloneElement)

      // Implement a 30-second timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF generation timed out. Please try again.')), 30000)
      })

      // Race the actual generation against the timeout
      // using output('blob') to prevent browser blocking as much as possible, 
      // then manually triggering download
      const generationPromise = pdfWorker.output('blob')

      const blob = await Promise.race([generationPromise, timeoutPromise]) as Blob
      
      // Trigger download manually using object URL
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 100)

      return true
    } catch (err: any) {
      console.error('Failed to export PDF:', err)
      alert(err.message || 'Unable to generate PDF. Please try again.')
      return false
    } finally {
      // Remove temporary DOM
      if (cloneElement && document.body.contains(cloneElement)) {
        document.body.removeChild(cloneElement)
      }
      setIsExporting(false)
    }
  }, [isExporting])

  return { exportToPDF, isExporting }
}
