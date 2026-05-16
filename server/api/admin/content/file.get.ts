import { createError, getQuery } from 'h3'
import { assertManagedPath, parseMarkdownFile } from '../../../utils/admin-content'
import { requireAdminSession } from '../../../utils/admin-auth'
import { readGitHubMarkdownFile } from '../../../utils/admin-github'

export default defineEventHandler(async (event) => {
	await requireAdminSession(event)

	const path = String(getQuery(event).path || '')
	assertManagedPath(path)

	const file = await readGitHubMarkdownFile(event, path)
	if (!file) {
		throw createError({ statusCode: 404, statusMessage: 'Markdown file not found' })
	}

	const parsed = parseMarkdownFile(file.content)
	return {
		...file,
		...parsed,
	}
})
