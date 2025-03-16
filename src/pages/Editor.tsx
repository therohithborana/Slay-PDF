import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PDFEditor from '@/components/PDFEditor';
import { motion } from 'framer-motion';
import { getDocument, PDFDocumentProxy } from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { openDB } from 'idb';

const Editor = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [fileName, setFileName] = useState<string>('document.pdf');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadPDF = async () => {
      if (!fileId) {
        toast.error('No file ID provided');
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        
        // Get file data from sessionStorage
        const fileDataStr = sessionStorage.getItem(`pdf_file_${fileId}`);
        if (!fileDataStr) {
          toast.error('PDF data not found');
          navigate('/');
          return;
        }
        
        const fileData = JSON.parse(fileDataStr);
        setFileName(fileData.name);
        
        // Get file data from IndexedDB
        const db = await openDB('pdf-storage', 1);
        const arrayBuffer = await db.get('pdfs', fileId);
        
        if (!arrayBuffer) {
          toast.error('PDF data not found');
          navigate('/');
          return;
        }
        
        // Load PDF document
        const loadingTask = getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Failed to load PDF');
        navigate('/');
      }
    };
    
    loadPDF();
  }, [fileId, navigate]);

  const handleSave = (content: string) => {
    // Handle save operation if needed
    console.log('Content saved:', content);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <nav className="bg-black/50 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={handleBackToHome}
          >
            <span className="text-xl font-bold text-purple-500">SlayPDF</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          {pdfDocument && (
            <PDFEditor 
              pdfContent={pdfDocument}
              onSave={handleSave}
              fileName={fileName}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Editor; 