import { getDocument, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const loadPDF = async (file: File): Promise<PDFDocumentProxy> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = getDocument({ data: arrayBuffer });
    return await loadingTask.promise;
  } catch (error) {
    console.error('Error loading PDF:', error);
    throw error;
  }
};

// Function to convert PDF page to a data URL for fabric.js
export const pdfPageToDataURL = async (page: PDFPageProxy, rotation: number = 0): Promise<string> => {
  const viewport = page.getViewport({ scale: 1.5, rotation });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context!,
    viewport: viewport
  }).promise;
  
  return canvas.toDataURL('image/jpeg', 1.0);
};

// Get dimensions for a specific page
export const getPageDimensions = (page: PDFPageProxy) => {
  const viewport = page.getViewport({ scale: 1.5 });
  return {
    width: viewport.width,
    height: viewport.height
  };
};

// Extract text content from a PDF page
export const extractTextFromPage = async (page: any) => {
  try {
    const textContent = await page.getTextContent();
    return textContent.items.map((item: any) => {
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const style = textContent.styles?.[item.fontName] || {};
      
      return {
        text: item.str,
        x: transform[4],
        y: transform[5],
        fontSize: item.height || 12,
        fontFamily: style.fontFamily || 'sans-serif',
        fontWeight: style.fontWeight || 'normal',
        fontStyle: style.fontStyle || 'normal',
        color: '#000000'
      };
    });
  } catch (error) {
    console.error('Error extracting text from PDF page:', error);
    return [];
  }
};

// Create a fabric.js canvas from a PDF page
export const createFabricCanvasFromPDF = async (
  pdfPage: any,
  canvas: fabric.Canvas,
  scale: number = 1.5
) => {
  try {
    // Clear existing canvas
    canvas.clear();
    
    // Set dimensions based on the PDF page
    const dimensions = getPageDimensions(pdfPage);
    canvas.setWidth(dimensions.width);
    canvas.setHeight(dimensions.height);
    
    // Render the PDF page as background
    const imageUrl = await pdfPageToDataURL(pdfPage);
    fabric.Image.fromURL(imageUrl, (img) => {
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
      
      // Extract and add text elements from the PDF
      extractTextFromPage(pdfPage).then((textItems) => {
        textItems.forEach((item: any) => {
          const text = new fabric.Text(item.text, {
            left: item.x,
            top: dimensions.height - item.y, // Y-coordinate conversion
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            fill: item.color,
            fontWeight: item.fontWeight,
            fontStyle: item.fontStyle,
            editable: true
          });
          canvas.add(text);
        });
        canvas.renderAll();
      });
    });
  } catch (error) {
    console.error('Error creating fabric canvas from PDF:', error);
  }
};
