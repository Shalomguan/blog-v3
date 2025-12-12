import { defineCollection, z } from '@nuxt/content'
import { asSitemapCollection } from '@nuxtjs/sitemap/content'
import blogConfig from './blog.config'

const articleTypes = Object.keys(blogConfig.article.types)

const articleSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	date: z.string().optional(),
	updated: z.string().optional(),
	categories: z.array(z.string()).default([blogConfig.defaultCategory]),
	tags: z.array(z.string()).default([]),
	type: z.enum(articleTypes).optional().default(articleTypes[0]),

	image: z.string().optional(),
	recommend: z.number().optional(),
	references: z.array(z.object({
		title: z.string().optional(),
		link: z.string().optional(),
	})).optional(),
	draft: z.boolean().default(false),
	permalink: z.string().optional(),

	readingTime: z.object({
		text: z.string(),
		minutes: z.number(),
		time: z.number(),
		words: z.number(),
	}),
})

const talkSchema = z.object({
	text: z.string().optional(),
	date: z.string(),
	images: z.array(z.string()).optional(),
	video: z.object({
		type: z.enum(['raw', 'bilibili', 'bilibili-nano', 'youtube', 'douyin', 'douyin-wide', 'tiktok']).optional(),
		id: z.string(),
		ratio: z.union([z.string(), z.number()]).optional(),
		poster: z.string().optional(),
	}).optional(),
	tags: z.array(z.string()).optional(),
	location: z.string().optional(),
})

export const collections = {
	content: defineCollection(asSitemapCollection({
		source: '**',
		type: 'page',
		schema: articleSchema,
	})),
	talks: defineCollection({
		type: 'data',
		source: 'talks',
		schema: talkSchema,
	}),
}
