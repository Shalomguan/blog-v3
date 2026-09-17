import { createError, readBody } from 'h3'
import { assertLoginAllowed, constantTimeEqual, createAdminSession, getAdminEnv, isAdminConfigured, recordLoginFailure, recordLoginSuccess, sha256Hex } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
	if (!isAdminConfigured(event)) {
		throw createError({ statusCode: 500, statusMessage: 'Admin auth is not configured' })
	}

	// 先于任何口令校验执行，避免爆破请求消耗哈希计算
	assertLoginAllowed(event)

	const body = await readBody<{ password?: string }>(event)
	const password = body.password || ''
	const passwordHash = await sha256Hex(password)
	const expectedHash = getAdminEnv(event, 'adminPasswordSha256').toLowerCase()

	if (!constantTimeEqual(passwordHash, expectedHash)) {
		recordLoginFailure(event)
		throw createError({ statusCode: 401, statusMessage: 'Invalid admin password' })
	}

	recordLoginSuccess(event)
	await createAdminSession(event)
	return { authenticated: true }
})
