import { createError } from 'h3'
import blogConfig from '../../blog.config'

type ContentKind = 'post' | 'talk'

const articleTypes = Object.keys(blogConfig.article.types)
const talkVideoTypes = ['raw', 'bilibili', 'bilibili-nano', 'youtube', 'douyin', 'douyin-wide', 'tiktok']

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/

/**
 * 落库前的服务端校验：与 content.config.ts 的 collection schema 保持一致。
 *
 * 若写入非法 frontmatter，@nuxt/content 会在构建时校验失败导致整站无法发布，
 * 因此必须在写入前拦下，而不是等 CI 构建报错。
 */
function assertPostFields(fields: Record<string, unknown>): void {
	const type = String(fields.type ?? '')
	if (type && !articleTypes.includes(type)) {
		throw createError({
			statusCode: 400,
			statusMessage: `Invalid article type "${type}", expected one of: ${articleTypes.join(', ')}`,
		})
	}

	for (const key of ['date', 'updated'] as const) {
		const value = String(fields[key] ?? '')
		if (value && !ISO_DATE.test(value)) {
			throw createError({
				statusCode: 400,
				statusMessage: `Invalid ${key} "${value}", expected format YYYY-MM-DD or YYYY-MM-DD HH:mm`,
			})
		}
	}

	const image = String(fields.image ?? '')
	if (image && !/^(?:https?:\/\/|\/)/.test(image)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Article image must be an absolute URL or a site-relative path',
		})
	}
}

function assertTalkFields(fields: Record<string, unknown>): void {
	const date = String(fields.date ?? '')
	if (date && !ISO_DATE.test(date)) {
		throw createError({
			statusCode: 400,
			statusMessage: `Invalid date "${date}", expected format YYYY-MM-DD or YYYY-MM-DD HH:mm`,
		})
	}

	const video = fields.video
	if (video && typeof video === 'object' && !Array.isArray(video)) {
		const videoType = String((video as Record<string, unknown>).type ?? '')
		if (videoType && !talkVideoTypes.includes(videoType)) {
			throw createError({
				statusCode: 400,
				statusMessage: `Invalid video type "${videoType}", expected one of: ${talkVideoTypes.join(', ')}`,
			})
		}
	}
}

export interface ParsedMarkdownFile {
	body: string
	frontmatter: Record<string, unknown>
}

interface SaveContentPayload {
	body?: string
	fields?: Record<string, unknown>
	path?: string
	sha?: string
	type?: ContentKind
}

function toStringValue(value: unknown): string {
	return typeof value === 'string' ? value.trim() : ''
}

function toBooleanValue(value: unknown): boolean {
	return value === true || value === 'true'
}

function toStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.map(item => String(item).trim())
			.filter(Boolean)
	}

	if (typeof value === 'string') {
		return value
			.split(/[\n,，]+/)
			.map(item => item.trim())
			.filter(Boolean)
	}

	return []
}

function toVideoValue(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		return undefined

	const raw = value as Record<string, unknown>
	const id = toStringValue(raw.id)
	if (!id)
		return undefined

	const video: Record<string, unknown> = { id }
	const type = toStringValue(raw.type)
	const ratio = toStringValue(raw.ratio)
	const poster = toStringValue(raw.poster)

	if (type)
		video.type = type
	if (ratio)
		video.ratio = Number.isFinite(Number(ratio)) ? Number(ratio) : ratio
	if (poster)
		video.poster = poster

	return video
}

function slugifyFilename(input: string): string {
	const slug = input
		.trim()
		.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^[.-]+|[.-]+$/g, '')

	return slug || 'untitled'
}

function getYearFromDate(date: string): string {
	const match = date.match(/^\d{4}/)
	return match?.[0] || new Date().getFullYear().toString()
}

function getTalkSlugFromDate(date: string): string {
	const slug = date
		.trim()
		.slice(0, 16)
		.replace(/\D+/g, '-')
		.replace(/^-|-$/g, '')

	return slug || new Date().toISOString().slice(0, 16).replace(/\D+/g, '-')
}

function yamlScalar(value: unknown): string {
	if (typeof value === 'boolean' || typeof value === 'number')
		return String(value)
	return JSON.stringify(String(value))
}

function yamlValue(key: string, value: unknown): string[] {
	if (Array.isArray(value)) {
		if (!value.length)
			return []
		return [`${key}: [${value.map(yamlScalar).join(', ')}]`]
	}

	if (value && typeof value === 'object') {
		const lines = [`${key}:`]
		for (const [childKey, childValue] of Object.entries(value)) {
			if (childValue === undefined || childValue === null || childValue === '')
				continue
			lines.push(`  ${childKey}: ${yamlScalar(childValue)}`)
		}
		return lines.length > 1 ? lines : []
	}

	if (value === undefined || value === null || value === '')
		return []
	return [`${key}: ${yamlScalar(value)}`]
}

function stringifyFrontmatter(frontmatter: Record<string, unknown>): string {
	return Object.entries(frontmatter)
		.flatMap(([key, value]) => yamlValue(key, value))
		.join('\n')
}

function normalizePostFields(fields: Record<string, unknown>): Record<string, unknown> {
	const title = toStringValue(fields.title)
	const date = toStringValue(fields.date)
	const categories = toStringArray(fields.categories)
	const tags = toStringArray(fields.tags)

	if (!title)
		throw createError({ statusCode: 400, statusMessage: 'Article title is required' })
	if (!date)
		throw createError({ statusCode: 400, statusMessage: 'Article date is required' })
	if (!categories.length)
		categories.push(blogConfig.defaultCategory)
	if (!tags.length)
		throw createError({ statusCode: 400, statusMessage: 'Article tags are required' })

	return {
		title,
		description: toStringValue(fields.description) || undefined,
		date,
		updated: toStringValue(fields.updated) || date,
		image: toStringValue(fields.image) || undefined,
		type: toStringValue(fields.type) || undefined,
		categories,
		tags,
		draft: toBooleanValue(fields.draft) || undefined,
	}
}

function normalizeTalkFields(fields: Record<string, unknown>): Record<string, unknown> {
	const date = toStringValue(fields.date)
	if (!date)
		throw createError({ statusCode: 400, statusMessage: 'Talk date is required' })

	return {
		title: toStringValue(fields.title) || undefined,
		description: toStringValue(fields.description) || undefined,
		date,
		images: toStringArray(fields.images),
		location: toStringValue(fields.location) || undefined,
		tags: toStringArray(fields.tags),
		video: toVideoValue(fields.video),
	}
}

export function parseMarkdownFile(content: string): ParsedMarkdownFile {
	if (!content.startsWith('---\n')) {
		return { body: content, frontmatter: {} }
	}

	const endIndex = content.indexOf('\n---', 4)
	if (endIndex < 0)
		return { body: content, frontmatter: {} }

	const frontmatterRaw = content.slice(4, endIndex).trim()
	const body = content.slice(endIndex + 4).replace(/^\r?\n/, '')
	const frontmatter: Record<string, unknown> = {}
	const lines = frontmatterRaw.split(/\r?\n/)

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]
		const match = line.match(/^([A-Z][\w-]*):\s*(.*)$/i)
		if (!match)
			continue

		const [, key, rawValue] = match
		if (rawValue === '') {
			const objectValue: Record<string, unknown> = {}
			const arrayValue: string[] = []

			while (lines[index + 1]?.startsWith('  ')) {
				const childLine = lines[++index].trim()
				const arrayMatch = childLine.match(/^-\s*(.*)$/)
				const objectMatch = childLine.match(/^([A-Z][\w-]*):\s*(.*)$/i)

				if (arrayMatch)
					arrayValue.push(stripYamlScalar(arrayMatch[1]))
				else if (objectMatch)
					objectValue[objectMatch[1]] = stripYamlScalar(objectMatch[2])
			}

			frontmatter[key] = arrayValue.length ? arrayValue : objectValue
			continue
		}

		frontmatter[key] = parseYamlScalar(rawValue)
	}

	return { body, frontmatter }
}

function parseYamlScalar(raw: string): unknown {
	const value = raw.trim()
	if (value === 'true')
		return true
	if (value === 'false')
		return false
	if (value.startsWith('[') && value.endsWith(']')) {
		const inner = value.slice(1, -1).trim()
		if (!inner)
			return []
		return inner
			.split(',')
			.map(item => stripYamlScalar(item))
			.filter(Boolean)
	}
	return stripYamlScalar(value)
}

function stripYamlScalar(value: string): string {
	const trimmed = value.trim()
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"'))
		|| (trimmed.startsWith('\'') && trimmed.endsWith('\''))
	) {
		return trimmed.slice(1, -1)
	}
	return trimmed
}

export function normalizeSavePayload(payload: SaveContentPayload): {
	body: string
	frontmatter: Record<string, unknown>
	path: string | undefined
	sha: string | undefined
	type: ContentKind
} {
	const type = payload.type
	if (type !== 'post' && type !== 'talk') {
		throw createError({ statusCode: 400, statusMessage: 'Content type must be post or talk' })
	}

	if (type === 'post')
		assertPostFields(payload.fields || {})
	else
		assertTalkFields(payload.fields || {})

	return {
		body: toStringValue(payload.body),
		frontmatter: type === 'post'
			? normalizePostFields(payload.fields || {})
			: normalizeTalkFields(payload.fields || {}),
		path: toStringValue(payload.path) || undefined,
		sha: toStringValue(payload.sha) || undefined,
		type,
	}
}

export function buildManagedMarkdown(frontmatter: Record<string, unknown>, body: string): string {
	return `---\n${stringifyFrontmatter(frontmatter)}\n---\n\n${body.trim()}\n`
}

export function deriveManagedPath(type: ContentKind, frontmatter: Record<string, unknown>): string {
	if (type === 'post') {
		const title = String(frontmatter.title || 'untitled')
		const date = String(frontmatter.date || '')
		const year = getYearFromDate(date)
		return `content/posts/${year}/${slugifyFilename(title)}.md`
	}

	const date = String(frontmatter.date || '')
	return `content/talks/${getTalkSlugFromDate(date)}.md`
}

export function assertManagedPath(path: string, type?: ContentKind): void {
	const normalized = path.replaceAll('\\', '/')
	const allowedBases = type
		? [type === 'post' ? 'content/posts/' : 'content/talks/']
		: ['content/posts/', 'content/talks/']

	if (
		normalized !== path
		|| path.includes('..')
		|| !path.endsWith('.md')
		|| !allowedBases.some(base => path.startsWith(base))
	) {
		throw createError({ statusCode: 400, statusMessage: 'Path is outside managed content directories' })
	}
}
