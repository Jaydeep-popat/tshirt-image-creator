import type { FabricImage } from 'fabric'
import type { IText } from 'fabric'

export type EditorSelection =
  | { kind: 'custom-image'; object: FabricImage }
  | { kind: 'text'; object: IText; text: string; fontSize: number; fill: string }
  | null

export interface TshirtEditorCallbacks {
  onProductLoaded?: () => void
  onProductCleared?: () => void
  onSelectionChange?: (selection: EditorSelection) => void
  onCanvasChanged?: () => void
  onError?: (message: string) => void
}
