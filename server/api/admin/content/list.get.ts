import { createError, getQuery } from 'h3'
import { requireAdminSession } from '../../../utils/admin-auth'
import { listGitHubMarkdownFiles } from '../../../utils/admin-github'

export default defineEventHandler(async (event) => {
	await requireAdminSession(event)

	const type = String(getQuery(event).type || '')
	if (type !== 'post' && type !== 'talk') {
		throw createError({ statusCode: 400, statusMessage: 'Content type must be post or talk' })
	}

	return {
		items: await listGitHubMarkdownFiles(event, type),
	}
})
