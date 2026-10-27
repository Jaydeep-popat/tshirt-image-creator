import {
  Canvas,
  FabricImage,
  IText,
  type FabricObject,
} from 'fabric'
import {
  MAX_CANVAS_EDGE,
  OBJECT_ROLE,
  type ObjectRole,
} from './constants'
import {
  computeFitScale,
  readFileAsDataUrl,
  verifyImageDataUrl,
} from './imageUtils'
import type { TshirtEditorCallbacks } from './types'

type RoleObject = FabricObject & { objectRole?: ObjectRole }

function setObjectRole(obj: FabricObject, role: ObjectRole): void {
  ;(obj as RoleObject).objectRole = role
}

function getObjectRole(obj: FabricObject): ObjectRole | undefined {
  return (obj as RoleObject).objectRole
}

export class TshirtEditor {
  private canvas: Canvas
  private container: HTMLElement | null = null
  private callbacks: TshirtEditorCallbacks
  private productObject: FabricImage | null = null
  private customImageObject: FabricImage | null = null
  private resizeObserver: ResizeObserver | null = null
  private logicalWidth = 0
  private logicalHeight = 0

  constructor(
    canvasElement: HTMLCanvasElement,
    callbacks: TshirtEditorCallbacks = {},
  ) {
    this.callbacks = callbacks
    this.canvas = new Canvas(canvasElement, {
      preserveObjectStacking: true,
      selection: true,
      uniformScaling: true,
    })

    this.canvas.on('selection:created', () => this.emitSelection())
    this.canvas.on('selection:updated', () => this.emitSelection())
    this.canvas.on('selection:cleared', () => this.emitSelection())
    this.canvas.on('object:modified', () => this.callbacks.onCanvasChanged?.())
    this.canvas.on('object:added', () => this.callbacks.onCanvasChanged?.())
    this.canvas.on('object:removed', () => this.callbacks.onCanvasChanged?.())
    this.canvas.on('text:changed', () => this.callbacks.onCanvasChanged?.())
  }

  attachContainer(container: HTMLElement): void {
    this.container = container
    this.resizeObserver = new ResizeObserver(() => this.applyResponsiveScale())
    this.resizeObserver.observe(container)
    this.applyResponsiveScale()
  }

  dispose(): void {
    this.resizeObserver?.disconnect()
    this.canvas.dispose()
  }

  hasProductImage(): boolean {
    return this.productObject !== null
  }

  getCanvasElement(): HTMLCanvasElement {
    return this.canvas.getElement()
  }

  focusCanvas(): void {
    this.canvas.getElement().focus()
  }

  async setProductImageFromFile(file: File): Promise<void> {
    const dataUrl = await readFileAsDataUrl(file)
    await verifyImageDataUrl(dataUrl)
    await this.setProductImageFromUrl(dataUrl)
  }

  async setProductImageFromUrl(dataUrl: string): Promise<void> {
    await verifyImageDataUrl(dataUrl)

    const img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
    const { width: naturalWidth, height: naturalHeight } = img.getOriginalSize()
    const fitScale = computeFitScale(
      naturalWidth,
      naturalHeight,
      MAX_CANVAS_EDGE,
    )

    this.clearCustomizations()
    if (this.productObject) {
      this.canvas.remove(this.productObject)
      this.productObject = null
    }

    this.logicalWidth = naturalWidth * fitScale
    this.logicalHeight = naturalHeight * fitScale

    this.canvas.setDimensions({
      width: this.logicalWidth,
      height: this.logicalHeight,
    })

    img.set({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      scaleX: fitScale,
      scaleY: fitScale,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    })
    setObjectRole(img, OBJECT_ROLE.PRODUCT)

    this.productObject = img
    this.canvas.add(img)
    this.canvas.sendObjectToBack(img)
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
    this.applyResponsiveScale()
    this.callbacks.onProductLoaded?.()
    this.callbacks.onCanvasChanged?.()
  }

  async setCustomImageFromFile(file: File): Promise<void> {
    if (!this.hasProductImage()) {
      throw new Error('Upload a product image before adding a custom design.')
    }

    const dataUrl = await readFileAsDataUrl(file)
    await verifyImageDataUrl(dataUrl)

    const img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
    const { width: naturalWidth } = img.getOriginalSize()

    if (this.customImageObject) {
      this.canvas.remove(this.customImageObject)
      this.customImageObject = null
    }

    const targetWidth = this.logicalWidth * 0.45
    const scale = targetWidth / naturalWidth

    img.set({
      left: this.logicalWidth / 2,
      top: this.logicalHeight * 0.35,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      lockScalingFlip: true,
      cornerStyle: 'circle',
      transparentCorners: false,
    })
    setObjectRole(img, OBJECT_ROLE.CUSTOM_IMAGE)

    this.customImageObject = img
    this.canvas.add(img)
    this.canvas.setActiveObject(img)
    this.canvas.renderAll()
    this.emitSelection()
    this.callbacks.onCanvasChanged?.()
  }

  addText(text: string, fontSize: number, fill: string): void {
    if (!this.hasProductImage()) {
      throw new Error('Upload a product image before adding text.')
    }

    const trimmed = text.trim()
    if (!trimmed) {
      throw new Error('Enter some text before adding it to the design.')
    }

    const textObject = new IText(trimmed, {
      left: this.logicalWidth / 2,
      top: this.logicalHeight * 0.55,
      originX: 'center',
      originY: 'center',
      fontSize,
      fill,
      fontFamily: 'Arial, Helvetica, sans-serif',
      lockScalingFlip: true,
    })
    setObjectRole(textObject, OBJECT_ROLE.CUSTOM_TEXT)

    this.canvas.add(textObject)
    this.canvas.setActiveObject(textObject)
    this.canvas.renderAll()
    this.emitSelection()
    this.callbacks.onCanvasChanged?.()
  }

  updateSelectedText(text: string, fontSize: number, fill: string): void {
    const active = this.canvas.getActiveObject()
    if (!active || getObjectRole(active) !== OBJECT_ROLE.CUSTOM_TEXT) {
      return
    }

    const textObject = active as IText
    textObject.set({
      text: text.trim() || ' ',
      fontSize,
      fill,
    })
    textObject.setCoords()
    this.canvas.renderAll()
    this.callbacks.onCanvasChanged?.()
  }

  deleteSelected(): boolean {
    const active = this.canvas.getActiveObject()
    if (!active) {
      return false
    }

    const role = getObjectRole(active)
    if (role === OBJECT_ROLE.PRODUCT) {
      return false
    }

    if (role === OBJECT_ROLE.CUSTOM_IMAGE) {
      this.customImageObject = null
    }

    this.canvas.remove(active)
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
    this.emitSelection()
    this.callbacks.onCanvasChanged?.()
    return true
  }

  clearCustomizations(): void {
    const toRemove = this.canvas
      .getObjects()
      .filter((obj) => getObjectRole(obj) !== OBJECT_ROLE.PRODUCT)

    for (const obj of toRemove) {
      this.canvas.remove(obj)
    }

    this.customImageObject = null
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
    this.emitSelection()
    this.callbacks.onCanvasChanged?.()
  }

  exportCompositePng(): string {
    if (!this.hasProductImage()) {
      throw new Error('Upload a product image before generating a preview.')
    }

    this.canvas.discardActiveObject()
    this.canvas.renderAll()

    return this.canvas.toDataURL({
      format: 'png',
      multiplier: 1,
      enableRetinaScaling: false,
    })
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return
    }

    const active = this.canvas.getActiveObject()
    if (active instanceof IText && (active as IText).isEditing) {
      return
    }

    if (this.deleteSelected()) {
      event.preventDefault()
    }
  }

  private applyResponsiveScale(): void {
    if (!this.container || this.logicalWidth === 0 || this.logicalHeight === 0) {
      return
    }

    const availableWidth = this.container.clientWidth
    if (availableWidth <= 0) {
      return
    }

    const scale = Math.min(1, availableWidth / this.logicalWidth)
    const cssWidth = Math.round(this.logicalWidth * scale)
    const cssHeight = Math.round(this.logicalHeight * scale)

    this.canvas.setDimensions(
      { width: `${cssWidth}px`, height: `${cssHeight}px` },
      { cssOnly: true },
    )
    this.canvas.requestRenderAll()
  }

  private emitSelection(): void {
    const active = this.canvas.getActiveObject()
    if (!active) {
      this.callbacks.onSelectionChange?.(null)
      return
    }

    const role = getObjectRole(active)
    if (role === OBJECT_ROLE.CUSTOM_IMAGE && active instanceof FabricImage) {
      this.callbacks.onSelectionChange?.({
        kind: 'custom-image',
        object: active,
      })
      return
    }

    if (role === OBJECT_ROLE.CUSTOM_TEXT && active instanceof IText) {
      this.callbacks.onSelectionChange?.({
        kind: 'text',
        object: active,
        text: active.text ?? '',
        fontSize: active.fontSize ?? 32,
        fill: typeof active.fill === 'string' ? active.fill : '#000000',
      })
      return
    }

    this.callbacks.onSelectionChange?.(null)
  }
}
