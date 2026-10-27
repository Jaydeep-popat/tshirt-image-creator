import { useEffect, useRef, useState } from 'react'
import { TshirtEditor } from '../core'
import type { EditorSelection } from '../core'

export function useTshirtEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<TshirtEditor | null>(null)

  const [hasProduct, setHasProduct] = useState(false)
  const [selection, setSelection] = useState<EditorSelection>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    const containerEl = containerRef.current
    if (!canvasEl || !containerEl) {
      return
    }

    const editor = new TshirtEditor(canvasEl, {
      onProductLoaded: () => {
        setHasProduct(true)
        setErrorMessage(null)
      },
      onProductCleared: () => setHasProduct(false),
      onSelectionChange: setSelection,
      onCanvasChanged: () => setStatusMessage(null),
      onError: (message) => setErrorMessage(message),
    })

    editor.attachContainer(containerEl)
    editorRef.current = editor

    const onKeyDown = (event: KeyboardEvent) => {
      editor.handleKeyDown(event)
    }
    canvasEl.addEventListener('keydown', onKeyDown)

    return () => {
      canvasEl.removeEventListener('keydown', onKeyDown)
      editor.dispose()
      editorRef.current = null
    }
  }, [])

  const getEditor = (): TshirtEditor | null => editorRef.current

  const showError = (message: string) => {
    setErrorMessage(message)
  }

  const clearMessages = () => {
    setErrorMessage(null)
    setStatusMessage(null)
  }

  return {
    canvasRef,
    containerRef,
    getEditor,
    hasProduct,
    selection,
    statusMessage,
    setStatusMessage,
    errorMessage,
    showError,
    clearMessages,
  }
}
