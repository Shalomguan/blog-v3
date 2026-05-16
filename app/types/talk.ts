import type { PageCollectionItemBase } from '@nuxt/content'

export type TalkVideo = {
	type?: 'raw' | 'bilibili' | 'bilibili-nano' | 'youtube' | 'douyin' | 'douyin-wide' | 'tiktok'
	id: string
	ratio?: string | number
	poster?: string
}

export type TalkItem = {
	text?: string
	date: string
	images?: string[]
	video?: TalkVideo
	tags?: string[]
	location?: string
}

export type TalkContentItem = Omit<PageCollectionItemBase, 'description' | 'title'> & {
	title?: string
	description?: string
	date: string
	images?: string[]
	video?: TalkVideo
	tags?: string[]
	location?: string
}
