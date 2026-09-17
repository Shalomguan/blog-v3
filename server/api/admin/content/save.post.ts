import { readBody } from 'h3'
import { requireAdminSession } from '../../../utils/admin-auth'
import {
	assertManagedPath,
	buildManagedMarkdown,
	deriveManagedPath,
	normalizeSavePayload,
} from '../../../utils/admin-content'
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
		// 仅在更新已存在文件时校验版本，新建文件无需乐观锁
		isUpdate ? payload.sha : undefined,
	)

	return {
		...result,
		created: !isUpdate,
	}
})
