import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  TextIcon, 
  Pencil, 
  Pointer, 
  Square, 
  Circle,
  Save,
  Trash2,
  Type,
  Download,
  Bold,
  Italic,
  Underline,
  Edit,
  Check,
  Eraser,
  Image as ImageIcon,
  RotateCw,
  RotateCcw,
  Ruler,
  Undo,
  Redo
} from 'lucide-react';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfPageToDataURL, getPageDimensions } from '@/utils/pdfUtils';
import { fabric } from 'fabric';
import { 
  createText, 
  createRect, 
  createCircle, 
  availableFonts,
  updateTextProperties,
  createTextbox,
  ckeditorContentToFabric
} from '@/utils/fabricUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import CKEditorWrapper from './CKEditorWrapper';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SketchPicker } from 'react-color';
import { motion } from 'framer-motion';

interface PDFCanvasEditorProps {
  pdfDocument: PDFDocumentProxy;
  currentPage: number;
  fileName: string;
  onSave: (fabricCanvas: fabric.Canvas) => void;
  onRotate?: (angle: number) => void;
}

const PDFCanvasEditor = ({ 
  pdfDocument, 
  currentPage, 
  fileName,
  onSave,
  onRotate
}: PDFCanvasEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'text' | 'eraser' | 'image' | 'line'>('select');
  const [activeColor, setActiveColor] = useState('#000000');
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [fontSize, setFontSize] = useState<number>(20);
  const [fontFamily, setFontFamily] = useState<string>("Arial");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [eraserSize, setEraserSize] = useState<number>(50);
  const [isDrawingEraser, setIsDrawingEraser] = useState(false);
  const [eraserStartPoint, setEraserStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [whiteoutOpacity, setWhiteoutOpacity] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fillColor, setFillColor] = useState<string>('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [selectedObjectForFill, setSelectedObjectForFill] = useState<fabric.Object | null>(null);
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [history, setHistory] = useState<fabric.Object[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 1100,
      backgroundColor: '#ffffff',
      selection: true,
      allowTouchScrolling: true
    });
    
    // Enable touch support
    fabricCanvas.allowTouchScrolling = true;
    fabricCanvas.selection = true;
    
    fabricCanvas.freeDrawingBrush.color = activeColor;
    fabricCanvas.freeDrawingBrush.width = 2;
    
    fabricCanvas.on('selection:created', handleObjectSelected);
    fabricCanvas.on('selection:updated', handleObjectSelected);
    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      setIsTextSelected(false);
    });
    
    // Add event listener for changes
    fabricCanvas.on('object:added', handleCanvasChange);
    fabricCanvas.on('object:modified', handleCanvasChange);
    fabricCanvas.on('object:removed', handleCanvasChange);
    
    setCanvas(fabricCanvas);
    
    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  const handleObjectSelected = (e: any) => {
    const selectedObj = e.selected?.[0];
    setSelectedObject(selectedObj);
    
    if (selectedObj && (selectedObj.type === 'text' || selectedObj.type === 'textbox')) {
      setIsTextSelected(true);
      setFontFamily(selectedObj.fontFamily || 'Arial');
      setFontSize(selectedObj.fontSize || 20);
      setIsBold(selectedObj.fontWeight === 'bold');
      setIsItalic(selectedObj.fontStyle === 'italic');
      setIsUnderline(selectedObj.underline || false);
      setActiveColor(selectedObj.fill || '#000000');
      
      if (selectedObj.text) {
        setEditorContent(selectedObj.text);
      }
    } else {
      setIsTextSelected(false);
    }
    
    if (selectedObj && (selectedObj.type === 'rect' || selectedObj.type === 'circle')) {
      setSelectedObjectForFill(selectedObj);
      if (selectedObj.fill && typeof selectedObj.fill === 'string') {
        setFillColor(selectedObj.fill);
      }
    } else {
      setSelectedObjectForFill(null);
    }
  };

  useEffect(() => {
    if (!canvas || !pdfDocument) return;
    
    const loadPage = async () => {
      try {
        // Clear canvas but keep background
        canvas.getObjects().forEach(obj => {
          if (obj !== canvas.backgroundImage) {
            canvas.remove(obj);
          }
        });
        
        const page = await pdfDocument.getPage(currentPage);
        const dimensions = getPageDimensions(page);
        
        // Adjust dimensions based on rotation
        const isRotated = Math.abs(rotationAngle) % 180 !== 0;
        const width = isRotated ? dimensions.height : dimensions.width;
        const height = isRotated ? dimensions.width : dimensions.height;
        
        canvas.setWidth(width);
        canvas.setHeight(height);
        
        const canvasContainer = canvasRef.current?.parentElement;
        if (canvasContainer) {
          canvasContainer.style.minWidth = `${width}px`;
          canvasContainer.style.minHeight = `${height}px`;
        }
        
        const imageUrl = await pdfPageToDataURL(page);
        
        fabric.Image.fromURL(imageUrl, function(img) {
          // Apply rotation to the image
          img.set({
            angle: rotationAngle,
            originX: 'center',
            originY: 'center',
            left: width / 2,
            top: height / 2
          });
          
          canvas.setBackgroundImage(img, () => {
            canvas.renderAll();
            toast.success(`Page ${currentPage} loaded - Let's gooo! 🚀`, {
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
            
            // Initialize history with empty state
            setHistory([[]]);
            setHistoryIndex(0);
          });
        });
      } catch (error) {
        console.error('Error loading PDF page:', error);
        toast.error('Failed to load PDF page - Big oof! 😬', {
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
    
    loadPage();
  }, [pdfDocument, currentPage, canvas, rotationAngle]);

  useEffect(() => {
    if (!canvas) return;
    
    canvas.isDrawingMode = activeTool === 'draw';
    
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = 2;
    }
  }, [activeTool, activeColor, canvas]);

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);
  };

  const handleAddText = () => {
    if (!canvas) return;
    
    setIsEditorOpen(true);
    setEditorContent('');
  };

  const handleApplyRichText = () => {
    if (!canvas) return;
    
    const textbox = ckeditorContentToFabric(editorContent, {
      left: 100,
      top: 100,
      fontFamily,
      fontSize,
      fill: activeColor,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      underline: isUnderline,
    });
    
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.renderAll();
    
    setIsEditorOpen(false);
    toast.success('Rich text added - Slayed it! 💅', {
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

  const handleEditSelectedText = () => {
    if (!canvas || !selectedObject || selectedObject.type !== 'text') return;
    
    // @ts-ignore
    setEditorContent(selectedObject.text || '');
    setIsEditorOpen(true);
  };

  const handleUpdateSelectedText = () => {
    if (!canvas || !selectedObject || selectedObject.type !== 'text') return;
    
    // @ts-ignore
    selectedObject.set('text', editorContent.replace(/<[^>]*>?/gm, ''));
    
    updateTextProperties(selectedObject as fabric.Text, {
      fontFamily,
      fontSize,
      fill: activeColor,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      underline: isUnderline
    });
    
    canvas.renderAll();
    setIsEditorOpen(false);
    toast.success('Text updated - Slayed it! 💅', {
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

  const handleDeleteSelected = () => {
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        canvas.remove(obj);
      });
      canvas.discardActiveObject();
      canvas.renderAll();
      toast.success('Objects removed - Slayed it! 💅', {
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
    }
  };

  const handleSave = () => {
    if (!canvas) return;
    onSave(canvas);
  };

  const applyTextFormatting = () => {
    if (!canvas || !selectedObject) return;
    
    // Check if the object is a text or textbox object
    if (selectedObject.type === 'text' || selectedObject.type === 'textbox') {
      // Apply formatting properties directly to the object
      selectedObject.set({
        fontFamily: fontFamily,
        fontSize: fontSize,
        fill: activeColor,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        underline: isUnderline
      });
      
      // Make sure to render the canvas after changes
      canvas.renderAll();
      toast.success('Text formatting applied - Slayed it! 💅', {
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
    }
  };

  const handleAddWhiteout = (x: number, y: number, width: number, height: number) => {
    if (!canvas) return;
    
    const whiteout = createRect({
      left: x,
      top: y,
      fill: '#ffffff',
      width: width,
      height: height,
      selectable: true,
      hoverCursor: 'move',
      opacity: whiteoutOpacity,
      stroke: 'transparent',
      strokeWidth: 0
    });
    
    canvas.add(whiteout);
    canvas.setActiveObject(whiteout);
    canvas.renderAll();
    toast.success('Text erased - Slayed it! 💅', {
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

  // Add a function for quick white-out creation
  const handleQuickWhiteout = (e: fabric.IEvent) => {
    if (!canvas || activeTool !== 'eraser') return;
    
    const pointer = canvas.getPointer(e.e);
    // Create a preset-sized white-out rectangle centered on the click point
    const width = eraserSize;
    const height = eraserSize / 2; // Rectangle with 2:1 aspect ratio
    
    handleAddWhiteout(
      pointer.x - width / 2, 
      pointer.y - height / 2, 
      width, 
      height
    );
  };

  // Update the mouse event handlers
  useEffect(() => {
    if (!canvas) return;

    const handleMouseDown = (e: fabric.IEvent) => {
      if (activeTool !== 'eraser') return;
      
      // Check if it's a double click for quick white-out
      if ((e.e as MouseEvent).detail === 2) {
        handleQuickWhiteout(e);
        return;
      }
      
      const pointer = canvas.getPointer(e.e);
      setIsDrawingEraser(true);
      setEraserStartPoint({ x: pointer.x, y: pointer.y });
    };

    const handleMouseMove = (e: fabric.IEvent) => {
      if (activeTool !== 'eraser' || !isDrawingEraser || !eraserStartPoint) return;
      
      // This is for live preview if needed
    };

    const handleMouseUp = (e: fabric.IEvent) => {
      if (activeTool !== 'eraser' || !isDrawingEraser || !eraserStartPoint) return;
      
      const pointer = canvas.getPointer(e.e);
      const width = Math.abs(pointer.x - eraserStartPoint.x);
      const height = Math.abs(pointer.y - eraserStartPoint.y);
      
      // Calculate the top-left corner
      const left = Math.min(pointer.x, eraserStartPoint.x);
      const top = Math.min(pointer.y, eraserStartPoint.y);
      
      // Create the white-out rectangle
      handleAddWhiteout(left, top, width, height);
      
      // Reset the drawing state
      setIsDrawingEraser(false);
      setEraserStartPoint(null);
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [canvas, activeTool, isDrawingEraser, eraserStartPoint, eraserSize, whiteoutOpacity]);

  // Modify the handleImageUpload function
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target?.result) return;
      
      const imgUrl = event.target.result.toString();
      
      // Create an HTML image element to ensure it's fully loaded
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous'; // Handle cross-origin issues
      
      imgElement.onload = () => {
        const fabricImage = new fabric.Image(imgElement, {
          left: 100,
          top: 100,
        });
        
        // Scale down large images
        if (fabricImage.width && fabricImage.width > 300) {
          const aspectRatio = fabricImage.width / (fabricImage.height || 1);
          fabricImage.scaleToWidth(300);
          fabricImage.scaleToHeight(300 / aspectRatio);
        }
        
        canvas.add(fabricImage);
        canvas.setActiveObject(fabricImage);
        canvas.renderAll();
        toast.success('Image added - Slayed it! 💅', {
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
      
      imgElement.src = imgUrl;
    };
    
    reader.readAsDataURL(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add this function to trigger file input click
  const handleAddImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleApplyFill = () => {
    if (selectedObjectForFill && canvas) {
      selectedObjectForFill.set({
        fill: fillColor
      });
      canvas.renderAll();
      setShowColorPicker(false);
      toast.success('Fill color applied - Slayed it! 💅', {
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
    }
  };

  const handleClearFill = () => {
    if (selectedObjectForFill && canvas) {
      selectedObjectForFill.set({
        fill: 'transparent'
      });
      canvas.renderAll();
      setShowColorPicker(false);
      toast.success('Fill cleared - Slayed it! 💅', {
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
    }
  };

  const handleRotate = (direction: 'left' | 'right') => {
    const newAngle = direction === 'right' ? rotationAngle + 90 : rotationAngle - 90;
    setRotationAngle(newAngle);
    
    if (canvas) {
      const backgroundImage = canvas.backgroundImage as fabric.Image;
      if (backgroundImage) {
        backgroundImage.set({
          angle: newAngle
        });
        canvas.renderAll();
      }
    }
    
    if (onRotate) {
      onRotate(newAngle);
    }
  };

  // Add line drawing handler
  const handleAddLine = () => {
    if (!canvas) return;
    
    setIsDrawingLine(true);
    setActiveTool('line');
  };

  // Modify the useEffect that handles drawing
  useEffect(() => {
    if (!canvas) return;
    
    if (activeTool === 'line') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      
      let line: fabric.Line | null = null;
      let startPoint: { x: number, y: number } | null = null;
      
      const handleMouseDown = (options: fabric.IEvent) => {
        if (!isDrawingLine) return;
        
        const pointer = canvas.getPointer(options.e);
        startPoint = { x: pointer.x, y: pointer.y };
        
        line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: activeColor,
          strokeWidth: 2,
          selectable: true
        });
        
        canvas.add(line);
      };
      
      const handleMouseMove = (options: fabric.IEvent) => {
        if (!isDrawingLine || !line || !startPoint) return;
        
        const pointer = canvas.getPointer(options.e);
        line.set({
          x2: pointer.x,
          y2: pointer.y
        });
        canvas.renderAll();
      };
      
      const handleMouseUp = () => {
        if (!isDrawingLine || !line) return;
        
        setIsDrawingLine(false);
        setActiveTool('select');
        canvas.selection = true;
        
        // Clean up event listeners
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
      };
      
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
    }
  }, [canvas, activeTool, isDrawingLine, activeColor]);

  const handleCanvasChange = () => {
    if (!canvas) return;
    
    // Get current state excluding the background image
    const objects = canvas.getObjects().filter(obj => obj !== canvas.backgroundImage);
    
    // Add to history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(objects);
      return newHistory;
    });
    
    setHistoryIndex(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0 || !canvas) return;
    
    // Get previous state
    const prevState = history[historyIndex - 1];
    
    // Clear canvas (except background) and add previous state
    canvas.getObjects().forEach(obj => {
      if (obj !== canvas.backgroundImage) {
        canvas.remove(obj);
      }
    });
    
    prevState.forEach(obj => canvas.add(obj));
    
    setHistoryIndex(prev => prev - 1);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[100vw] overflow-x-auto p-2">
      <div className="flex flex-wrap gap-2 p-2 bg-gray-900 rounded-lg">
        <Button 
          variant={activeTool === 'text' ? 'default' : 'outline'} 
          size="sm"
          className="text-sm p-1.5"
        >
          <Type className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Add Text</span>
        </Button>
        <Button 
          variant={activeTool === 'image' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => { handleToolClick('image'); handleAddImage(); }}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Add Image
        </Button>
        <Button 
          variant={activeTool === 'draw' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => handleToolClick('draw')}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Draw
        </Button>
        <Button 
          variant={activeTool === 'select' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => handleToolClick('select')}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Pointer className="w-4 h-4 mr-2" />
          Select
        </Button>
        <Button 
          variant={activeTool === 'eraser' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => handleToolClick('eraser')}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Eraser className="w-4 h-4 mr-2" />
          Erase Text
        </Button>
        <Button 
          variant={activeTool === 'line' ? 'default' : 'outline'} 
          size="sm" 
          onClick={handleAddLine}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Ruler className="w-4 h-4 mr-2" />
          Add Line
        </Button>
        {activeTool === 'select' && selectedObjectForFill && (
          <Button 
            variant="outline" 
            onClick={() => setShowColorPicker(true)}
            className="bg-gray-800 hover:bg-gray-700 text-white"
          >
            Fill
          </Button>
        )}
        <input 
          type="color" 
          value={activeColor} 
          onChange={(e) => setActiveColor(e.target.value)} 
          className="w-10 h-10 border border-gray-300 rounded cursor-pointer bg-gray-800"
        />
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleDeleteSelected}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleSave}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleRotate('left')}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Rotate Left
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleRotate('right')}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <RotateCw className="w-4 h-4 mr-2" />
          Rotate Right
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Undo className="w-4 h-4 mr-2" />
          Undo
        </Button>
      </div>

      {activeTool === 'eraser' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-gray-900 rounded-lg mb-2"
        >
          <p className="text-sm text-purple-300 mb-2">
            <strong>Eraser Tool:</strong> Drag to cover text 🖱️ | Resize & move after 📏 | Double-click for quick erase ⚡
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium text-gray-700">Quick Eraser Size:</span>
            <div className="w-40">
              <Slider
                value={[eraserSize]}
                min={20}
                max={200}
                step={10}
                onValueChange={(values) => setEraserSize(values[0])}
              />
            </div>
            <span className="text-sm text-gray-600">{eraserSize}px</span>
          </div>
        </motion.div>
      )}

      {isTextSelected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 p-2 bg-gray-900 rounded-lg items-center"
        >
          <span className="text-sm font-medium text-purple-300">Text Format:</span>
          
          <Select value={fontFamily} onValueChange={(value) => {
            setFontFamily(value);
            if (selectedObject && (selectedObject.type === 'text' || selectedObject.type === 'textbox')) {
              selectedObject.set('fontFamily', value);
              canvas?.renderAll();
            }
          }}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              <SelectValue placeholder="Font" className="text-white" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {availableFonts.map(font => (
                <SelectItem 
                  key={font} 
                  value={font} 
                  style={{ fontFamily: font }}
                  className="text-white hover:bg-gray-700 focus:bg-gray-700"
                >
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                {fontSize}px
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-gray-800 border-gray-700">
              <div className="flex flex-col gap-4 p-2">
                <span className="text-sm font-medium text-purple-300">Font Size: {fontSize}px</span>
                <Slider
                  value={[fontSize]}
                  min={8}
                  max={72}
                  step={1}
                  onValueChange={(values) => setFontSize(values[0])}
                  className="bg-gray-700"
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant={isBold ? 'default' : 'outline'}
            size="sm"
            className={`${isBold ? 'bg-purple-600' : 'bg-gray-800'} border-gray-700 text-white hover:bg-gray-700`}
            onClick={() => setIsBold(!isBold)}
          >
            <Bold className="w-4 h-4" />
          </Button>
          
          <Button
            variant={isItalic ? 'default' : 'outline'}
            size="sm"
            className={`${isItalic ? 'bg-purple-600' : 'bg-gray-800'} border-gray-700 text-white hover:bg-gray-700`}
            onClick={() => setIsItalic(!isItalic)}
          >
            <Italic className="w-4 h-4" />
          </Button>
          
          <Button
            variant={isUnderline ? 'default' : 'outline'}
            size="sm"
            className={`${isUnderline ? 'bg-purple-600' : 'bg-gray-800'} border-gray-700 text-white hover:bg-gray-700`}
            onClick={() => setIsUnderline(!isUnderline)}
          >
            <Underline className="w-4 h-4" />
          </Button>
          
          <input 
            type="color" 
            value={activeColor} 
            onChange={(e) => setActiveColor(e.target.value)} 
            className="w-8 h-8 border border-gray-700 rounded cursor-pointer bg-gray-800"
          />
          
          <Button
            variant="default"
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={applyTextFormatting}
          >
            Apply Format
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            onClick={handleEditSelectedText}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Text
          </Button>
        </motion.div>
      )}

      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogContent className="sm:max-w-[400px] bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Choose Fill Color</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="fillColorPicker" className="text-sm font-medium text-purple-300">
                Select Color:
              </label>
              <input 
                id="fillColorPicker"
                type="color" 
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="w-10 h-10 border-0 cursor-pointer bg-gray-800 rounded-lg"
              />
            </div>
            <div className="w-full h-20 border border-gray-800 rounded-md" style={{ backgroundColor: fillColor }}></div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleClearFill}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Clear Fill
            </Button>
            <Button 
              onClick={handleApplyFill}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-[800px]" style={{ zIndex: 1050 }}>
          <DialogHeader>
            <DialogTitle>Spill the Tea ☕️</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <CKEditorWrapper 
              initialContent={editorContent}
              onContentChange={setEditorContent}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={selectedObject ? handleUpdateSelectedText : handleApplyRichText}>
              <Check className="w-4 h-4 mr-2" />
              {selectedObject ? 'Update' : 'Insert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
      />

      <div className="border border-gray-800 rounded-lg overflow-hidden shadow-lg mx-auto">
        <div className="canvas-container" style={{ 
          display: 'inline-block',
          maxWidth: '100%',
          overflow: 'auto'
        }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};

export default PDFCanvasEditor;
