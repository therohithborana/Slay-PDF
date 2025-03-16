import { fabric } from 'fabric';
import { jsPDF } from 'jspdf';
import DOMPurify from 'dompurify';

// Re-export fabric object for easier use
export { fabric };

// Extended list of fonts
export const availableFonts = [
  'Arial',
  'Verdana',
  'Helvetica',
  'Times New Roman',
  'Times',
  'Courier New',
  'Courier',
  'Georgia',
  'Palatino',
  'Garamond',
  'Bookman',
  'Comic Sans MS',
  'Trebuchet MS',
  'Impact',
  'Lucida Console',
  'Tahoma',
  'Century Gothic',
  'Calibri',
  'Cambria',
  'Consolas'
];

// Helper to create text objects with enhanced editing capabilities
export const createText = (options: fabric.ITextOptions = {}) => {
  return new fabric.Text('Edit this text', {
    left: 100,
    top: 100,
    fontFamily: 'Arial',
    fontSize: 20,
    fill: '#000000',
    ...options,
  });
};

// Helper to create rectangle objects
export const createRect = (options: fabric.IRectOptions = {}) => {
  return new fabric.Rect({
    left: 100,
    top: 100,
    width: 100,
    height: 100,
    fill: 'transparent',
    stroke: '#000000',
    strokeWidth: 1,
    ...options,
  });
};

// Helper to create circle objects
export const createCircle = (options: fabric.ICircleOptions = {}) => {
  return new fabric.Circle({
    left: 100,
    top: 100,
    radius: 50,
    fill: 'transparent',
    stroke: '#000000',
    strokeWidth: 1,
    ...options,
  });
};

// Helper for creating text boxes with rich text capabilities
export const createTextbox = (text: string, options: fabric.ITextboxOptions = {}) => {
  return new fabric.Textbox(text, {
    left: 100,
    top: 100,
    fontFamily: 'Arial',
    fontSize: 20,
    fill: '#000000',
    width: 300,
    ...options,
  });
};

// Helper to update text properties
export const updateTextProperties = (textObject: fabric.Text, properties: any) => {
  if (!textObject) return;
  
  textObject.set({
    ...properties,
  });
};

// Parse HTML content from CKEditor into a format that can be used by fabric.js
export const ckeditorContentToFabric = (htmlContent: string, options: fabric.ITextboxOptions = {}) => {
  // Clean the HTML content
  const cleanHtml = DOMPurify.sanitize(htmlContent);
  
  // Extract plain text (simple approach)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanHtml;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Create a textbox with the plain text
  return createTextbox(plainText, options);
};

// Convert PDF to editable content
export const pdfToEditableContent = async (pdfDoc: any, pageNum: number, scale: number = 1.5) => {
  try {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Extract text items from the PDF page
    const textItems = textContent.items.map((item: any) => {
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      return {
        text: item.str,
        x: transform[4],
        y: transform[5],
        fontSize: item.fontSize || 12,
        fontFamily: item.fontFamily || 'Arial'
      };
    });
    
    return textItems;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return [];
  }
};

// Helper function to create a PDF from fabric canvas
export const fabricCanvasToPDF = (canvas: fabric.Canvas) => {
  // This would be a more complex implementation
  // Placeholder for now
  return canvas.toDataURL({
    format: 'jpeg',
    quality: 1.0
  });
};
