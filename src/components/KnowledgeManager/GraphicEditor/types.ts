export type Point = { x: number; y: number };

export type GridShape =
  | {
      id?: string;
      type: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      label?: string;
    }
  | {
      id?: string;
      type: 'text';
      x: number;
      y: number;
      text: string;
    }
  | {
      id?: string;
      type: 'arrow' | 'line';
      points: Point[];
    }
  // Fallback to support unknown/legacy custom shapes without breaking
  | {
      id?: string;
      type: string;
      [key: string]: any;
    };

export interface GraphicEditorProps {
  shapes: any[]; // keep permissive to render legacy data (parsed.graphic?.shapes or parsed.shapes)
  onChange?: (shapes: any[]) => void;
  isEditable?: boolean;
  theme?: 'dark' | 'light';
  layout?: 'default' | 'compact';
}
