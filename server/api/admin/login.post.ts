import { createError, readBody } from 'h3'
import { constantTimeEqual, createAdminSession, getAdminEnv, isAdminConfigured, sha256Hex } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
	if (!isAdminConfigured(event)) {
		throw createError({ statusCode: 500, statusMessage: 'Admin auth is not configured' })
	}

	const body = await readBody<{ password?: string }>(event)
	const password = body.password || ''
	const passwordHash = await sha256Hex(password)
	const expectedHash = getAdminEnv(event, 'adminPasswordSha256').toLowerCase()

	if (!constantTimeEqual(passwordHash, expectedHash)) {
		throw createError({ statusCode: 401, statusMessage: 'Invalid admin password' })
	}

	await createAdminSession(event)
	return { authenticated: true }
})
