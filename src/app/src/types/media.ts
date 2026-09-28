import type { BaseItem } from './item'

export interface MediaConfig {
  external: boolean
  publicUrl?: string
  maxFileSize?: number
  allowedTypes?: string[]
}

export interface MediaItem extends BaseItem {
  [key: string]: unknown
}
