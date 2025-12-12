export type TalkItem = {
  _id?: string
  _path?: string
  body?: unknown
  text?: string
  date: string
  images?: string[]
  video?: {
    type?: 'raw' | 'bilibili' | 'bilibili-nano' | 'youtube' | 'douyin' | 'douyin-wide' | 'tiktok'
    id: string
    ratio?: string | number
    poster?: string
  }
  tags?: string[]
  location?: string
  draft?: boolean
}