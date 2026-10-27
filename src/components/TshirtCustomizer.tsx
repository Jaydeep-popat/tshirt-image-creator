import { useCallback, useEffect, useRef, useState } from 'react'
import { isAcceptedImageFile } from '../core'
import { useTshirtEditor } from '../hooks/useTshirtEditor'
import '../App.css'

const DEFAULT_TEXT = 'Your text'
const DEFAULT_FONT_SIZE = 36
const DEFAULT_TEXT_COLOR = '#111111'

export function TshirtCustomizer() {
  const {
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
  } = useTshirtEditor()

  const productInputRef = useRef<HTMLInputElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)

  const [textValue, setTextValue] = useState(DEFAULT_TEXT)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (selection?.kind === 'text') {
      setTextValue(selection.text)
      setFontSize(selection.fontSize)
      setTextColor(selection.fill)
    }
  }, [selection])

  const handleImageFile = useCallback(
    async (file: File | undefined, kind: 'product' | 'custom') => {
      if (!file) {
        return
      }
      clearMessages()

      if (!isAcceptedImageFile(file)) {
        showError('Please upload a PNG, JPG, JPEG, or WebP image.')
        return
      }

      const editor = getEditor()
      if (!editor) {
        return
      }

      try {
        if (kind === 'product') {
          await editor.setProductImageFromFile(file)
          setPreviewUrl(null)
          setStatusMessage('Product image loaded. Add your design or text on the canvas.')
        } else {
          await editor.setCustomImageFromFile(file)
          setStatusMessage('Custom image added. Drag, resize, or rotate it on the canvas.')
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to load the image.')
      }
    },
    [clearMessages, getEditor, setStatusMessage, showError],
  )

  const handleAddText = () => {
    clearMessages()
    const editor = getEditor()
    if (!editor) {
      return
    }

    try {
      if (selection?.kind === 'text') {
        editor.updateSelectedText(textValue, fontSize, textColor)
        setStatusMessage('Text updated.')
      } else {
        editor.addText(textValue, fontSize, textColor)
        setStatusMessage('Text added. Double-click it on the canvas to edit inline.')
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not add text.')
    }
  }

  const handleTextControlChange = (
    field: 'text' | 'fontSize' | 'color',
    value: string | number,
  ) => {
    if (field === 'text') {
      setTextValue(String(value))
    } else if (field === 'fontSize') {
      setFontSize(Number(value))
    } else {
      setTextColor(String(value))
    }

    if (selection?.kind === 'text') {
      const editor = getEditor()
      const nextText = field === 'text' ? String(value) : textValue
      const nextSize = field === 'fontSize' ? Number(value) : fontSize
      const nextColor = field === 'color' ? String(value) : textColor
      editor?.updateSelectedText(nextText, nextSize, nextColor)
    }
  }

  const handleDeleteSelected = () => {
    const editor = getEditor()
    if (!editor?.deleteSelected()) {
      showError('Select a custom image or text layer to delete.')
      return
    }
    setStatusMessage('Selected layer removed.')
  }

  const handleReset = () => {
    getEditor()?.clearCustomizations()
    setPreviewUrl(null)
    setStatusMessage('Custom image and text cleared. Product image kept.')
  }

  const handleGeneratePreview = () => {
    clearMessages()
    const editor = getEditor()
    if (!editor) {
      return
    }

    try {
      const dataUrl = editor.exportCompositePng()
      setPreviewUrl(dataUrl)
      setStatusMessage('Preview generated below.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not generate preview.')
    }
  }

  const handleDownload = () => {
    if (!previewUrl) {
      showError('Generate a preview before downloading.')
      return
    }

    const link = document.createElement('a')
    link.href = previewUrl
    link.download = 'custom-tshirt.png'
    link.click()
    setStatusMessage('Download started.')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>T-Shirt Customizer PoC</h1>
        <p className="app-tagline">
          Upload a product photo, place your artwork and text, then export a PNG.
        </p>
      </header>

      <div className="app-layout">
        <aside className="control-panel" aria-label="Customization controls">
          <section className="panel-section">
            <h2>Product image</h2>
            <p className="hint">Background layer — fixed on the canvas.</p>
            <label className="file-button">
              Upload product image
              <input
                ref={productInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  void handleImageFile(e.target.files?.[0], 'product')
                  e.target.value = ''
                }}
              />
            </label>
          </section>

          <section className="panel-section">
            <h2>Custom image</h2>
            <p className="hint">Drag, resize, rotate, or replace anytime.</p>
            <label className="file-button secondary">
              Upload custom image
              <input
                ref={customInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                disabled={!hasProduct}
                onChange={(e) => {
                  void handleImageFile(e.target.files?.[0], 'custom')
                  e.target.value = ''
                }}
              />
            </label>
          </section>

          <section className="panel-section">
            <h2>Text</h2>
            <label className="field">
              <span>Content</span>
              <input
                type="text"
                value={textValue}
                disabled={!hasProduct}
                onChange={(e) => handleTextControlChange('text', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Font size ({fontSize}px)</span>
              <input
                type="range"
                min={12}
                max={120}
                value={fontSize}
                disabled={!hasProduct}
                onChange={(e) =>
                  handleTextControlChange('fontSize', Number(e.target.value))
                }
              />
            </label>
            <label className="field">
              <span>Color</span>
              <input
                type="color"
                value={textColor}
                disabled={!hasProduct}
                onChange={(e) => handleTextControlChange('color', e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn primary"
              disabled={!hasProduct}
              onClick={handleAddText}
            >
              {selection?.kind === 'text' ? 'Update text' : 'Add text'}
            </button>
          </section>

          <section className="panel-section panel-actions">
            <button type="button" className="btn" onClick={handleDeleteSelected}>
              Delete selected
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={!hasProduct}
              onClick={handleReset}
            >
              Reset customizations
            </button>
          </section>

          <section className="instructions" aria-label="Instructions">
            <h2>How to use</h2>
            <ol>
              <li>Upload a T-shirt (or product) photo.</li>
              <li>Add your logo or artwork on top.</li>
              <li>Add text and adjust size and color.</li>
              <li>Click the canvas layer to move or transform it.</li>
              <li>Generate preview, then download the PNG.</li>
            </ol>
          </section>
        </aside>

        <main className="editor-main">
          <div
            ref={containerRef}
            className={`canvas-wrap${hasProduct ? '' : ' canvas-wrap--empty'}`}
          >
            <canvas
              ref={canvasRef}
              tabIndex={0}
              aria-label="T-shirt customization canvas"
            />
            {!hasProduct && (
              <p className="canvas-placeholder">
                Upload a product image to start customizing.
              </p>
            )}
          </div>

          {(errorMessage || statusMessage) && (
            <div
              className={`message ${errorMessage ? 'message--error' : 'message--info'}`}
              role="status"
            >
              {errorMessage ?? statusMessage}
            </div>
          )}

          <div className="export-actions">
            <button
              type="button"
              className="btn primary"
              disabled={!hasProduct}
              onClick={handleGeneratePreview}
            >
              Generate preview
            </button>
            <button
              type="button"
              className="btn"
              disabled={!previewUrl}
              onClick={handleDownload}
            >
              Download PNG
            </button>
          </div>

          <section className="preview-section" aria-label="Export preview">
            <h2>Preview</h2>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Composite preview of the customized T-shirt"
                className="preview-image"
              />
            ) : (
              <p className="preview-empty">
                Your exported composite will appear here after you generate a preview.
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
