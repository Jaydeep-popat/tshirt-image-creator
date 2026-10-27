export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

export const ACCEPTED_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
] as const

/** Longest canvas edge in pixels (keeps layout stable for very large uploads). */
export const MAX_CANVAS_EDGE = 1200

export const OBJECT_ROLE = {
  PRODUCT: 'product',
  CUSTOM_IMAGE: 'custom-image',
  CUSTOM_TEXT: 'custom-text',
} as const

export type ObjectRole = (typeof OBJECT_ROLE)[keyof typeof OBJECT_ROLE]
