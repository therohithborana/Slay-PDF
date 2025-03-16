import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { getDocument } from 'pdfjs-dist';
import { FileUp } from 'lucide-react';

interface PDFUploaderProps {
  onFileSelect: (file: File, pdf: any) => void;
  className?: string;
}

const PDFUploader = ({ onFileSelect, className }: PDFUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    try {
      setIsLoading(true);
      
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      // Create a new FileReader instance
      const reader = new FileReader();
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => {
          reject(new Error('Error reading file'));
        };
        reader.readAsArrayBuffer(file);
      });
      
      // Load PDF document
      const loadingTask = getDocument({
        data: arrayBuffer,
        // Enable CORS for external PDFs if needed
        cMapUrl: 'https://unpkg.com/pdfjs-dist@2.14.305/cmaps/',
        cMapPacked: true,
      });
      
      const pdf = await loadingTask.promise;
      
      // Call the onFileSelect callback with both file and PDF
      onFileSelect(file, pdf);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`${className || ''}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging 
            ? 'border-purple-500 bg-purple-900/20' 
            : 'border-gray-700 bg-gray-900/50 hover:border-purple-500 hover:bg-purple-900/10'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center py-6">
          <FileUp className="w-12 h-12 mb-3 text-purple-500" />
          
          <p className="mb-2 text-xl font-medium text-white">
            Drop your PDF here or click to browse
          </p>
          <p className="text-sm text-gray-400">
            Supported format: PDF
          </p>
          
          {isLoading && (
            <div className="mt-4">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-sm text-gray-400">Loading PDF...</p>
            </div>
          )}
        </div>

        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFile(e.target.files[0]);
            }
          }}
        />
      </div>
    </div>
  );
};

export default PDFUploader;
