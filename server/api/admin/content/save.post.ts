import { readBody } from 'h3'
import {
	assertManagedPath,
	buildManagedMarkdown,
	deriveManagedPath,
	normalizeSavePayload,
} from '../../../utils/admin-content'
import { requireAdminSession } from '../../../utils/admin-auth'
import { ensureUniqueGitHubPath, writeGitHubMarkdownFile } from '../../../utils/admin-github'

export default defineEventHandler(async (event) => {
	await requireAdminSession(event)

	const payload = normalizeSavePayload(await readBody(event))
	const isUpdate = Boolean(payload.path)
	const requestedPath = payload.path || deriveManagedPath(payload.type, payload.frontmatter)
	assertManagedPath(requestedPath, payload.type)

	const path = isUpdate
		? requestedPath
		: await ensureUniqueGitHubPath(event, requestedPath)
	const content = buildManagedMarkdown(payload.frontmatter, payload.body)
	const title = String(payload.frontmatter.title || payload.frontmatter.date || path)
	const action = isUpdate ? 'update' : 'publish'

	const result = await writeGitHubMarkdownFile(
		event,
		path,
		content,
		`admin: ${action} ${payload.type} ${title}`,
	)

	return {
		...result,
		created: !isUpdate,
	}
})
