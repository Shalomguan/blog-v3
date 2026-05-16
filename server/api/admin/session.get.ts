import { isAdminConfigured, verifyAdminSession } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
	return {
		authenticated: await verifyAdminSession(event),
		configured: isAdminConfigured(event),
	}
})
