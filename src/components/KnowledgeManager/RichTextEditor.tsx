import React, { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  theme: 'dark' | 'light';
  rows?: number;
}

interface ContextMenuProps {
  x: number;
  y: number;
  onFormat: (type: 'bold' | 'color' | 'bulletList') => void;
  onClose: () => void;
  theme: 'dark' | 'light';
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onFormat, onClose, theme }) => {
  const colors = [
    { name: 'Standard', value: '', color: theme === 'dark' ? '#ffffff' : '#000000' },
    { name: 'Rot', value: '#ef4444', color: '#ef4444' },
    { name: 'Blau', value: '#3b82f6', color: '#3b82f6' },
    { name: 'Grün', value: '#10b981', color: '#10b981' },
    { name: 'Gelb', value: '#f59e0b', color: '#f59e0b' },
    { name: 'Lila', value: '#8b5cf6', color: '#8b5cf6' },
    { name: 'Orange', value: '#f97316', color: '#f97316' },
  ];

  return (
    <div 
      className={`fixed z-50 rounded-lg shadow-xl border p-2 min-w-[200px] ${
        theme === 'light' 
          ? 'bg-white border-gray-200' 
          : 'bg-zinc-800 border-zinc-600'
      }`}
      style={{ left: x, top: y }}
    >
      {/* Bold Option */}
      <button
        onClick={() => onFormat('bold')}
        className={`w-full px-3 py-2 text-left rounded transition-colors text-sm flex items-center gap-2 ${
          theme === 'light'
            ? 'hover:bg-gray-100 text-gray-700'
            : 'hover:bg-zinc-700 text-zinc-200'
        }`}
      >
        <span className="font-bold">B</span>
        Fett formatieren
      </button>

      {/* Bullet List Option */}
      <button
        onClick={() => onFormat('bulletList')}
        className={`w-full px-3 py-2 text-left rounded transition-colors text-sm flex items-center gap-2 ${
          theme === 'light'
            ? 'hover:bg-gray-100 text-gray-700'
            : 'hover:bg-zinc-700 text-zinc-200'
        }`}
      >
        <span>•</span>
        Aufzählung erstellen
      </button>

      {/* Color Divider */}
      <div className={`border-t my-2 ${theme === 'light' ? 'border-gray-200' : 'border-zinc-600'}`}></div>
      
      {/* Color Options */}
      <div className="space-y-1">
        <div className={`px-3 py-1 text-xs font-medium ${
          theme === 'light' ? 'text-gray-500' : 'text-zinc-400'
        }`}>
          Textfarbe:
        </div>
        {colors.map((color) => (
          <button
            key={color.name}
            onClick={() => onFormat('color')}
            data-color={color.value}
            className={`w-full px-3 py-2 text-left rounded transition-colors text-sm flex items-center gap-2 ${
              theme === 'light'
                ? 'hover:bg-gray-100 text-gray-700'
                : 'hover:bg-zinc-700 text-zinc-200'
            }`}
          >
            <div 
              className="w-4 h-4 rounded border"
              style={{ 
                backgroundColor: color.color,
                border: theme === 'light' ? '1px solid #d1d5db' : '1px solid #4b5563'
              }}
            ></div>
            {color.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  theme,
  rows = 8
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
  }>({ show: false, x: 0, y: 0 });

  // Convert plain text to HTML on mount/value change
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = convertTextToHtml(value);
    }
  }, [value]);

  // Convert plain text with markdown-like syntax to HTML
  const convertTextToHtml = (text: string): string => {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*?)(<br>|$)/gm, '<ul><li>$1</li></ul>$2')
      .replace(/<\/ul><br><ul>/g, '') // Clean up consecutive lists
      .replace(/<ul><br>/g, '<ul>'); // Clean up list starts
  };

  // Convert HTML back to plain text with markdown-like syntax
  const convertHtmlToText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let text = tempDiv.innerHTML
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul>|<\/ul>/gi, '')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\n\n+/g, '\n\n') // Clean up extra newlines
      .trim();
    
    return text;
  };

  const handleInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      const plainText = convertHtmlToText(htmlContent);
      onChange(plainText);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleFormat = (type: 'bold' | 'color' | 'bulletList') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    if (type === 'bold') {
      // Toggle bold formatting
      const selectedContent = range.extractContents();
      const span = document.createElement('strong');
      span.appendChild(selectedContent);
      range.insertNode(span);
      
      // Clear selection
      selection.removeAllRanges();
      
    } else if (type === 'color') {
      // Get color from button data attribute
      const target = (document.activeElement as HTMLButtonElement);
      const color = target?.getAttribute('data-color') || '';
      
      const selectedContent = range.extractContents();
      const span = document.createElement('span');
      if (color) {
        span.style.color = color;
      }
      span.appendChild(selectedContent);
      range.insertNode(span);
      
      // Clear selection
      selection.removeAllRanges();
      
    } else if (type === 'bulletList') {
      // Create bullet list
      const selectedContent = range.extractContents();
      const lines = selectedContent.textContent?.split('\n') || [selectedContent.textContent || ''];
      
      const ul = document.createElement('ul');
      lines.forEach(line => {
        if (line.trim()) {
          const li = document.createElement('li');
          li.textContent = line.trim();
          ul.appendChild(li);
        }
      });
      
      range.insertNode(ul);
      
      // Clear selection
      selection.removeAllRanges();
    }

    // Update content
    handleInput();
    setContextMenu({ show: false, x: 0, y: 0 });
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0 });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.show) {
        setContextMenu({ show: false, x: 0, y: 0 });
      }
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show]);

  const minHeight = `${rows * 1.5}rem`;

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onContextMenu={handleContextMenu}
        className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          theme === 'light'
            ? 'bg-white border-gray-300 text-black placeholder-gray-500'
            : 'bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400'
        } ${className}`}
        style={{ 
          minHeight,
          wordWrap: 'break-word',
          overflowWrap: 'anywhere'
        }}
        data-placeholder={placeholder}
      />
      
      {/* Context Menu */}
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onFormat={handleFormat}
          onClose={closeContextMenu}
          theme={theme}
        />
      )}
      
      {/* Overlay to close context menu */}
      {contextMenu.show && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}
    </>
  );
};
