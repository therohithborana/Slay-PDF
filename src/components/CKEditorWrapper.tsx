import React, { useEffect, useState, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { fabric , fabricCanvas} from 'fabric';

interface CKEditorWrapperProps {
  initialContent?: string;
  onContentChange: (content: string) => void;
}

const CKEditorWrapper = ({ initialContent = '', onContentChange }: CKEditorWrapperProps) => {
  const editorRef = useRef<CKEditorType>();
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [fillColor, setFillColor] = useState<string>('#ffffff');
  const [selectedObjectForFill, setSelectedObjectForFill] = useState<fabric.Object | null>(null);

  useEffect(() => {
    // @ts-ignore
    editorRef.current = window.CKEditor;
    setEditorLoaded(true);
  }, []);

  return (
    <div className="ckeditor-dark">
      {editorLoaded ? (
        <CKEditor
          editor={ClassicEditor}
          data={initialContent}
          onReady={(editor) => {
            // Store the editor instance for later use
            setEditorInstance(editor);
            
            // Log available plugins to console for debugging
            console.log('Available plugins:', Array.from(editor.plugins.names()));
            
            // Log available toolbar items
            if (editor.ui.componentFactory) {
              console.log('Available toolbar items:', 
                Array.from(editor.ui.componentFactory.names())
                  .filter(name => editor.ui.componentFactory.has(name))
              );
            }
          }}
          onChange={(event, editor) => {
            const data = editor.getData();
            onContentChange(data);
          }}
          config={{
            toolbar: [
              'heading', '|',
              'bold', 'italic', 'underline', 'strikethrough', '|',
              'fontColor', 'fontBackgroundColor', '|',
              'bulletedList', 'numberedList', '|',
              'undo', 'redo'
            ],
            ui: {
              viewportOffset: { top: 50 }
            }
          }}
        />
      ) : (
        <div className="h-64 flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Loading editor...</p>
        </div>
      )}
      {selectedObjectForFill && (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (selectedObjectForFill && fabricCanvas) {
                selectedObjectForFill.set({ fill: fillColor });
                fabricCanvas.renderAll();
                toast.success('Fill color applied');
              }
            }}
          >
            Fill Shape
          </Button>
          <input 
            type="color" 
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-8 h-8 border-0"
          />
          <Button 
            variant="outline" 
            onClick={() => {
              if (selectedObjectForFill && fabricCanvas) {
                selectedObjectForFill.set({ fill: '' });
                fabricCanvas.renderAll();
                toast.success('Fill color cleared');
              }
            }}
          >
            Clear Fill
          </Button>
        </div>
      )}
    </div>
  );
};

// Add dark theme styles
const ckeditorStyles = `
  .ckeditor-dark .ck.ck-editor {
    max-width: 100%;
  }
  .ckeditor-dark .ck.ck-editor__main>.ck-editor__editable {
    background: #1f2937 !important;
    color: #f3f4f6 !important;
    border: 1px solid #374151 !important;
    min-height: 200px;
  }
  .ckeditor-dark .ck.ck-editor__main>.ck-editor__editable.ck-focused {
    border-color: #7c3aed !important;
    box-shadow: 0 0 0 1px #7c3aed !important;
  }
  .ckeditor-dark .ck.ck-toolbar {
    background: #111827 !important;
    border: 1px solid #374151 !important;
  }
  .ckeditor-dark .ck.ck-button {
    color: #f3f4f6 !important;
  }
  .ckeditor-dark .ck.ck-button:not(.ck-disabled):hover {
    background: #374151 !important;
  }
  .ckeditor-dark .ck.ck-dropdown__panel {
    background: #1f2937 !important;
    border: 1px solid #374151 !important;
  }
  .ckeditor-dark .ck.ck-list__item {
    color: #f3f4f6 !important;
  }
  .ckeditor-dark .ck.ck-list__item:hover {
    background: #374151 !important;
  }
  .ckeditor-dark .ck.ck-input-text {
    background: #1f2937 !important;
    color: #f3f4f6 !important;
    border: 1px solid #374151 !important;
  }
  .ckeditor-dark .ck.ck-color-table__color {
    border: 1px solid #374151 !important;
  }
`;

// Add styles to the document
const styleElement = document.createElement('style');
styleElement.innerHTML = ckeditorStyles;
document.head.appendChild(styleElement);

export default CKEditorWrapper;
