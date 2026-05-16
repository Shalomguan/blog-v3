import { requireAdminSession, getAdminEnv } from '../../utils/admin-auth'

interface GitHubCheckResult {
	message?: string
	ok: boolean
	status: number
	statusText: string
	url: string
}

async function checkGitHubUrl(url: string, token: string): Promise<GitHubCheckResult> {
	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${token}`,
				'User-Agent': 'blog-v3-admin-check',
				'X-GitHub-Api-Version': '2022-11-28',
			},
		})
		const body = await response.json().catch(() => ({})) as { message?: string }

		return {
			message: body.message,
			ok: response.ok,
			status: response.status,
			statusText: response.statusText,
			url,
		}
	}
	catch (error) {
		return {
			message: error instanceof Error ? error.message : 'Unknown fetch error',
			ok: false,
			status: 0,
			statusText: 'Fetch failed',
			url,
		}
	}
}

export default defineEventHandler(async (event) => {
	await requireAdminSession(event)

	const token = getAdminEnv(event, 'githubToken')
	const owner = getAdminEnv(event, 'githubOwner') || 'Shalomguan'
	const repo = getAdminEnv(event, 'githubRepo') || 'blog-v3'
	const branch = getAdminEnv(event, 'githubBranch') || 'main'
	const baseUrl = `https://api.github.com/repos/${owner}/${repo}`

	return {
		branch,
		owner,
		repo,
		tokenConfigured: Boolean(token),
		checks: token
			? await Promise.all([
					checkGitHubUrl(baseUrl, token),
					checkGitHubUrl(`${baseUrl}/contents/content/posts?ref=${encodeURIComponent(branch)}`, token),
					checkGitHubUrl(`${baseUrl}/contents/content/talks?ref=${encodeURIComponent(branch)}`, token),
				])
			: [],
	}
})
