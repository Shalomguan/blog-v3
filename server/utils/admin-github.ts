import type { H3Event } from 'h3'
import { createError } from 'h3'
import { getAdminEnv } from './admin-auth'

interface GitHubTreeItem {
	path: string
	mode: string
	type: 'blob' | 'tree' | 'commit'
	sha: string
	size?: number
	url: string
}

interface GitHubTreeResponse {
	sha: string
	truncated: boolean
	tree: GitHubTreeItem[]
}

interface GitHubContentResponse {
	type: string
	encoding?: string
	size: number
	name: string
	path: string
	content?: string
	sha: string
}

export interface AdminFileItem {
	name: string
	path: string
	sha: string
	size?: number
}

interface GitHubConfig {
	branch: string
	owner: string
	repo: string
	token: string
}

function getGitHubConfig(event: H3Event): GitHubConfig {
	const token = getAdminEnv(event, 'githubToken')
	const owner = getAdminEnv(event, 'githubOwner') || 'Shalomguan'
	const repo = getAdminEnv(event, 'githubRepo') || 'blog-v3'
	const branch = getAdminEnv(event, 'githubBranch') || 'main'

	if (!token) {
		throw createError({ statusCode: 500, statusMessage: 'GitHub token is not configured' })
	}

	return { branch, owner, repo, token }
}

function encodePath(path: string): string {
	return path.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

function encodeBase64(input: string): string {
	const bytes = new TextEncoder().encode(input)
	let binary = ''
	const chunkSize = 0x8000

	for (let index = 0; index < bytes.length; index += chunkSize) {
		const chunk = bytes.subarray(index, index + chunkSize)
		binary += String.fromCharCode(...chunk)
	}

	return btoa(binary)
}

function decodeBase64(input: string): string {
	const normalized = input.replace(/\s/g, '')
	const binary = atob(normalized)
	const bytes = new Uint8Array(binary.length)

	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index)
	}

	return new TextDecoder().decode(bytes)
}

async function githubRequest<T>(
	event: H3Event,
	path: string,
	options: Parameters<typeof $fetch<T>>[1] = {},
): Promise<T> {
	const config = getGitHubConfig(event)
	const url = `https://api.github.com/repos/${config.owner}/${config.repo}${path}`

	try {
		return await $fetch<T>(url, {
			...options,
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${config.token}`,
				'X-GitHub-Api-Version': '2022-11-28',
				...options.headers,
			},
		})
	}
	catch (error) {
		const statusCode = (error as { status?: number, statusCode?: number }).statusCode
			?? (error as { status?: number }).status
			?? 500
		const statusMessage = (error as { statusMessage?: string, message?: string }).statusMessage
			?? (error as { message?: string }).message
			?? 'GitHub request failed'

		throw createError({ statusCode, statusMessage })
	}
}

async function githubRequestNullable<T>(
	event: H3Event,
	path: string,
	options: Parameters<typeof $fetch<T>>[1] = {},
): Promise<T | null> {
	try {
		return await githubRequest<T>(event, path, options)
	}
	catch (error) {
		const statusCode = (error as { statusCode?: number, status?: number }).statusCode
			?? (error as { status?: number }).status
		if (statusCode === 404) return null
		throw error
	}
}

export async function listGitHubMarkdownFiles(event: H3Event, kind: 'post' | 'talk'): Promise<AdminFileItem[]> {
	const { branch } = getGitHubConfig(event)
	const basePath = kind === 'post' ? 'content/posts/' : 'content/talks/'
	const tree = await githubRequest<GitHubTreeResponse>(
		event,
		`/git/trees/${encodeURIComponent(branch)}?recursive=1`,
	)

	return tree.tree
		.filter(item => item.type === 'blob' && item.path.startsWith(basePath) && item.path.endsWith('.md'))
		.map(item => ({
			name: item.path.split('/').at(-1) || item.path,
			path: item.path,
			sha: item.sha,
			size: item.size,
		}))
		.sort((left, right) => right.path.localeCompare(left.path))
}

export async function readGitHubMarkdownFile(event: H3Event, path: string): Promise<{ content: string, path: string, sha: string } | null> {
	const { branch } = getGitHubConfig(event)
	const file = await githubRequestNullable<GitHubContentResponse>(
		event,
		`/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
	)

	if (!file) return null
	if (file.type !== 'file' || file.encoding !== 'base64' || !file.content) {
		throw createError({ statusCode: 502, statusMessage: 'GitHub returned an unsupported content response' })
	}

	return {
		content: decodeBase64(file.content),
		path: file.path,
		sha: file.sha,
	}
}

export async function writeGitHubMarkdownFile(
	event: H3Event,
	path: string,
	content: string,
	message: string,
): Promise<{ path: string, sha: string }> {
	const { branch } = getGitHubConfig(event)
	const existing = await readGitHubMarkdownFile(event, path)
	const response = await githubRequest<GitHubContentResponse>(
		event,
		`/contents/${encodePath(path)}`,
		{
			method: 'PUT',
			body: {
				branch,
				content: encodeBase64(content),
				message,
				sha: existing?.sha,
			},
		},
	)

	return {
		path: response.path,
		sha: response.sha,
	}
}

export async function ensureUniqueGitHubPath(event: H3Event, path: string): Promise<string> {
	if (!await readGitHubMarkdownFile(event, path)) return path

	const extensionIndex = path.lastIndexOf('.md')
	const base = path.slice(0, extensionIndex)
	const extension = path.slice(extensionIndex)

	for (let suffix = 2; suffix < 100; suffix++) {
		const nextPath = `${base}-${suffix}${extension}`
		if (!await readGitHubMarkdownFile(event, nextPath)) return nextPath
	}

	throw createError({ statusCode: 409, statusMessage: 'Could not generate a unique file path' })
}
