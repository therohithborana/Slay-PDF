import React, { useState, useEffect } from 'react';
import { Download, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { PDFDocumentProxy } from 'pdfjs-dist';
import PDFCanvasEditor from './PDFCanvasEditor';
import { fabric } from 'fabric';
import { fabricCanvasToPDF } from '@/utils/fabricUtils';

interface PDFEditorProps {
  pdfContent: PDFDocumentProxy;
  onSave: (content: string) => void;
  fileName?: string;
}

const PDFEditor = ({ pdfContent, onSave, fileName = 'document.pdf' }: PDFEditorProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [editedCanvases, setEditedCanvases] = useState<Map<number, fabric.Canvas>>(new Map());
  const [pageRotations, setPageRotations] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    if (pdfContent) {
      setTotalPages(pdfContent.numPages);
    }
  }, [pdfContent]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSaveCanvas = (canvas: fabric.Canvas) => {
    const newEditedCanvases = new Map(editedCanvases);
    newEditedCanvases.set(currentPage, canvas);
    setEditedCanvases(newEditedCanvases);
    toast.success(`Page ${currentPage} saved - Nailed it! 💯`, {
      position: 'top-center',
      className: 'terminal-toast',
      duration: 3000,
      style: {
        backgroundColor: '#1a1a1a',
        color: '#00ff00',
        border: '1px solid #00ff00',
        fontFamily: 'monospace',
        borderRadius: '0',
        padding: '12px 20px',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
      }
    });
  };

  const handleSaveAllPages = () => {
    toast.success('All changes saved - Nailed it! 💯', {
      position: 'top-center',
      className: 'terminal-toast',
      duration: 3000,
      style: {
        backgroundColor: '#1a1a1a',
        color: '#00ff00',
        border: '1px solid #00ff00',
        fontFamily: 'monospace',
        borderRadius: '0',
        padding: '12px 20px',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
      }
    });
  };

  const handleExportPDF = async () => {
    try {
      toast('Preparing your PDF... Hold tight! ⏳', {
        position: 'top-center',
        className: 'terminal-toast',
        duration: 3000,
        style: {
          backgroundColor: '#1a1a1a',
          color: '#00ff00',
          border: '1px solid #00ff00',
          fontFamily: 'monospace',
          borderRadius: '0',
          padding: '12px 20px',
          boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
        }
      });

      const doc = new jsPDF();
      let isFirstPage = true;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const canvas = editedCanvases.get(pageNum);
        
        if (canvas) {
          // Add a new page for all pages except the first one
          if (!isFirstPage) {
            doc.addPage();
          }
          isFirstPage = false;
          
          // Make sure all objects are rendered properly
          canvas.renderAll();
          
          // Wait a moment to ensure all images are fully rendered
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Get the data URL with higher quality and proper image format
          const dataURL = canvas.toDataURL({
            format: 'jpeg',
            quality: 1.0,
            multiplier: 2  // Increase resolution
          });
          
          // Add the image to the PDF
          doc.addImage(
            dataURL, 
            'JPEG', 
            0, 
            0, 
            doc.internal.pageSize.getWidth(), 
            doc.internal.pageSize.getHeight()
          );
        } else if (pageNum <= pdfContent.numPages) {
          // For non-edited pages, try to get the original page from the PDF
          try {
            // Add a new page for all pages except the first one
            if (!isFirstPage) {
              doc.addPage();
            }
            isFirstPage = false;
            
            // Get the page from the original PDF
            const page = await pdfContent.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            
            // Create a canvas to render the PDF page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context!,
              viewport: viewport
            }).promise;
            
            // Add the rendered page to the PDF
            const dataURL = canvas.toDataURL('image/jpeg', 1.0);
            doc.addImage(
              dataURL, 
              'JPEG', 
              0, 
              0, 
              doc.internal.pageSize.getWidth(), 
              doc.internal.pageSize.getHeight()
            );
          } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
          }
        }
      }
      
      // Save the PDF
      doc.save(fileName);
      toast.success('PDF downloaded - You slayed it! 💅', {
        position: 'top-center',
        className: 'terminal-toast',
        duration: 3000,
        style: {
          backgroundColor: '#1a1a1a',
          color: '#00ff00',
          border: '1px solid #00ff00',
          fontFamily: 'monospace',
          borderRadius: '0',
          padding: '12px 20px',
          boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
        }
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF - Big oof! 😬', {
        position: 'top-center',
        className: 'terminal-toast',
        duration: 3000,
        style: {
          backgroundColor: '#1a1a1a',
          color: '#ff0000',
          border: '1px solid #ff0000',
          fontFamily: 'monospace',
          borderRadius: '0',
          padding: '12px 20px',
          boxShadow: '0 0 10px rgba(255, 0, 0, 0.3)'
        }
      });
    }
  };

  const handlePageRotation = (angle: number) => {
    const newRotations = new Map(pageRotations);
    newRotations.set(currentPage, angle);
    setPageRotations(newRotations);
  };

  return (
    <div className="flex flex-col gap-4 w-full bg-black text-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-purple-300">Edit {fileName}</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportPDF}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
          className="text-green-400 font-mono hover:bg-gray-900/50 px-2 py-1 rounded-none border-b-2 border-transparent hover:border-green-400 transition-all"
        >
          <span className="text-green-400">←</span> Prev
        </Button>
        <span className="text-sm font-medium text-green-400 font-mono">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="text-green-400 font-mono hover:bg-gray-900/50 px-2 py-1 rounded-none border-b-2 border-transparent hover:border-green-400 transition-all"
        >
          Next <span className="text-green-400">→</span>
        </Button>
      </div>

      <PDFCanvasEditor
        pdfDocument={pdfContent}
        currentPage={currentPage}
        fileName={fileName}
        onSave={handleSaveCanvas}
        onRotate={handlePageRotation}
      />
    </div>
  );
};

export default PDFEditor;
