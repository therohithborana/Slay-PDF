import React from 'react';
import { useNavigate } from 'react-router-dom';
import PDFUploader from '@/components/PDFUploader';
import { motion } from 'framer-motion';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { openDB } from 'idb';

const Home = () => {
  const navigate = useNavigate();

  // Add this helper function to check storage space
  const checkStorageSpace = async (fileSize: number): Promise<boolean> => {
    try {
      if (!navigator.storage || !navigator.storage.estimate) {
        // If storage estimation is not available, assume we have enough space
        return true;
      }
      
      const storage = await navigator.storage.estimate();
      if (storage.quota && storage.usage) {
        const availableSpace = storage.quota - storage.usage;
        return availableSpace > fileSize;
      }
      return true;
    } catch (error) {
      console.error('Error checking storage space:', error);
      return true;
    }
  };

  // Update the handleFileSelect function
  const handleFileSelect = async (file: File, pdf: PDFDocumentProxy) => {
    try {
      // Check file size
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      // Check available storage space
      const hasSpace = await checkStorageSpace(file.size);
      if (!hasSpace) {
        toast.error('Not enough storage space available');
        return;
      }
      
      // Generate a unique ID for the file
      const fileId = Date.now().toString();
      
      // Store the file metadata in sessionStorage
      sessionStorage.setItem(`pdf_file_${fileId}`, JSON.stringify({
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        size: file.size
      }));
      
      // Use IndexedDB for storing the file data
      const db = await openDB('pdf-storage', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('pdfs')) {
            db.createObjectStore('pdfs');
          }
        },
      });
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Store in IndexedDB
      await db.put('pdfs', arrayBuffer, fileId);
      
      // Navigate to the editor page with the file ID
      navigate(`/editor/${fileId}`);
    } catch (error) {
      console.error('Error handling file:', error);
      toast.error('Failed to process PDF file');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative p-4">
      {/* Grid background using CSS class */}
      <div className="absolute inset-0 grid-background"></div>
      
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-4 border-b border-gray-800">
        <div className="text-xl sm:text-2xl font-bold font-mono">SlayPDF</div>
      </header>
      
      {/* Main content */}
      <main className="relative z-10 container mx-auto px-2 sm:px-4 py-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 font-mono tracking-tight">
            SlayPDF
          </h1>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-purple-500 font-mono tracking-tighter">
            no cap, just vibes.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md"
        >
          <PDFUploader 
            onFileSelect={handleFileSelect}
            className="mx-auto"
          />
          
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => document.getElementById('file-upload')?.click()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md flex items-center space-x-2 transition"
            >
              <span>Get Started</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-gray-800 text-center text-gray-400">
        Built by{' '}
        <a 
          href="https://www.linkedin.com/in/rohith-borana-b10778266/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-purple-500 hover:text-purple-400 transition-colors"
        >
          Rohith Borana
        </a>
      </footer>
    </div>
  );
};

export default Home; 