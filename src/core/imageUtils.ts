import {
  ACCEPTED_IMAGE_EXTENSIONS,
  ACCEPTED_IMAGE_TYPES,
} from './constants'

export function isAcceptedImageFile(file: File): boolean {
  if (
    ACCEPTED_IMAGE_TYPES.includes(
      file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
    )
  ) {
    return true
  }

  const name = file.name.toLowerCase()
  return ACCEPTED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Could not read the file.'))
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

export function verifyImageDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error('The image file appears to be invalid or corrupted.'))
    img.src = dataUrl
  })
}

export function computeFitScale(
  width: number,
  height: number,
  maxEdge: number,
): number {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) {
    return 1
  }
  return maxEdge / longest
}
