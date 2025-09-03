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
  onFormat: (type: 'bold' | 'color' | 'bulletList', colorValue?: string) => void;
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
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {/* Bold Option */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          onFormat('bold');
        }}
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
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          onFormat('bulletList');
        }}
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              onFormat('color', color.value);
            }}
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

  // Convert plain text to HTML on mount/value change, but preserve cursor position
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Save cursor position
      const selection = window.getSelection();
      let cursorPosition = 0;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorPosition = range.startOffset;
      }
      
      // Only update if the content is significantly different (not just formatting)
      const currentText = convertHtmlToText(editorRef.current.innerHTML);
      if (currentText !== value) {
        editorRef.current.innerHTML = convertTextToHtml(value);
        
        // Restore cursor position
        if (selection && editorRef.current.firstChild) {
          try {
            const newRange = document.createRange();
            const textNode = editorRef.current.firstChild;
            const maxOffset = textNode.textContent?.length || 0;
            newRange.setStart(textNode, Math.min(cursorPosition, maxOffset));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch (e) {
            // Ignore cursor positioning errors
          }
        }
      }
    }
  }, [value]);

  // Convert plain text with markdown-like syntax to HTML
  const convertTextToHtml = (text: string): string => {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[color:#([a-fA-F0-9]{6})\](.*?)\[\/color\]/g, '<span style="color: #$1;">$2</span>')
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
      .replace(/<span style="color:\s*#([a-fA-F0-9]{6});?"[^>]*>(.*?)<\/span>/gi, '[color:#$1]$2[/color]')
      .replace(/<font color="#([a-fA-F0-9]{6})"[^>]*>(.*?)<\/font>/gi, '[color:#$1]$2[/color]')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul>|<\/ul>/gi, '')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\n\n+/g, '\n\n') // Clean up extra newlines
      .trim();
    
    return text;
  };

  const handleInput = (e?: React.FormEvent) => {
    handleInputChange(e);
  };

  // Handle Enter key specifically to ensure proper line breaks and list behavior
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        const range = selection.getRangeAt(0);
        
        // Get current line by looking at the text before cursor
        const beforeCursor = editorRef.current.textContent?.substring(0, range.startOffset) || '';
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1] || '';
        
        // Check if current line starts with list marker
        if (currentLine.startsWith('- ')) {
          if (currentLine.trim() === '-' || currentLine.trim() === '- ') {
            // Empty list item - exit list mode with double line break
            document.execCommand('insertHTML', false, '<br><br>');
          } else {
            // Continue list with new item
            document.execCommand('insertHTML', false, '<br>- ');
          }
        } else {
          // Normal line break
          document.execCommand('insertHTML', false, '<br>');
        }
        
        // Apply formatting after DOM change
        setTimeout(() => {
          handleInputChange();
        }, 10);
      }
    } else {
      // For other keys, apply formatting after input
      setTimeout(() => {
        handleInputChange();
      }, 10);
    }
  };

  // Handle input to detect and format list items
  const handleInputChange = (e?: React.FormEvent) => {
    if (editorRef.current) {
      const textContent = editorRef.current.textContent || '';
      const lines = textContent.split('\n');
      let hasListItems = false;
      
      // Check if we have any list items
      for (const line of lines) {
        if (line.trim().startsWith('- ') && line.trim().length > 2) {
          hasListItems = true;
          break;
        }
      }
      
      if (hasListItems) {
        // Save cursor position
        const selection = window.getSelection();
        let cursorOffset = 0;
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          // Get the offset relative to the text content
          const walker = document.createTreeWalker(
            editorRef.current,
            NodeFilter.SHOW_TEXT
          );
          let node;
          let textOffset = 0;
          while (node = walker.nextNode()) {
            if (node === range.startContainer) {
              cursorOffset = textOffset + range.startOffset;
              break;
            }
            textOffset += (node as Text).textContent?.length || 0;
          }
        }
        
        // Build formatted HTML
        let formattedHTML = '';
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('- ') && line.trim().length > 2) {
            // This is a list item - format it with indentation
            formattedHTML += `<div style="margin-left: 20px; margin-top: 6px; margin-bottom: 2px;">${line}</div>`;
          } else {
            // Regular line
            if (line.trim()) {
              formattedHTML += `<div>${line}</div>`;
            } else {
              formattedHTML += '<br>';
            }
          }
        }
        
        // Update content if it changed
        if (editorRef.current.innerHTML !== formattedHTML) {
          editorRef.current.innerHTML = formattedHTML;
          
          // Restore cursor position
          if (selection) {
            try {
              const walker = document.createTreeWalker(
                editorRef.current,
                NodeFilter.SHOW_TEXT
              );
              let node;
              let textOffset = 0;
              let targetNode = null;
              let targetOffset = 0;
              
              while (node = walker.nextNode()) {
                const nodeLength = (node as Text).textContent?.length || 0;
                if (textOffset + nodeLength >= cursorOffset) {
                  targetNode = node;
                  targetOffset = cursorOffset - textOffset;
                  break;
                }
                textOffset += nodeLength;
              }
              
              if (targetNode) {
                const range = document.createRange();
                range.setStart(targetNode, Math.min(targetOffset, (targetNode as Text).textContent?.length || 0));
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            } catch (e) {
              // Ignore cursor positioning errors
            }
          }
        }
      }
      
      // Convert to plain text and notify parent
      const plainText = editorRef.current.textContent || '';
      if (plainText !== value) {
        onChange(plainText);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling up to parent components
    
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleFormat = (type: 'bold' | 'color' | 'bulletList', colorValue?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setContextMenu({ show: false, x: 0, y: 0 });
      return;
    }

    const range = selection.getRangeAt(0);
    
    try {
      if (type === 'bold') {
        // Use document.execCommand for better compatibility
        document.execCommand('bold', false);
        
      } else if (type === 'color') {
        // Get color from the event or parameter
        const color = colorValue || '';
        if (color) {
          document.execCommand('foreColor', false, color);
        } else {
          // Remove color formatting
          document.execCommand('removeFormat', false);
        }
        
      } else if (type === 'bulletList') {
        // Create bullet list using execCommand
        document.execCommand('insertUnorderedList', false);
      }

      // Update content
      setTimeout(() => {
        handleInput();
      }, 10);
      
    } catch (error) {
      console.error('Formatting error:', error);
    }

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
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        suppressContentEditableWarning={true}
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
