import type { H3Event } from 'h3'
import { createError, deleteCookie, getCookie, getRequestHeader, getRequestIP, getRequestURL, setCookie, setResponseHeader } from 'h3'

const ADMIN_COOKIE = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

const runtimeKeys = {
	adminPasswordSha256: 'ADMIN_PASSWORD_SHA256',
	adminSessionSecret: 'ADMIN_SESSION_SECRET',
	githubToken: 'GITHUB_TOKEN',
	githubOwner: 'GITHUB_OWNER',
	githubRepo: 'GITHUB_REPO',
	githubBranch: 'GITHUB_BRANCH',
} as const

type RuntimeKey = keyof typeof runtimeKeys

function getCloudflareEnv(event: H3Event, envKey: string): string | undefined {
	return (event.context as { cloudflare?: { env?: Record<string, string> } }).cloudflare?.env?.[envKey]
}

export function getAdminEnv(event: H3Event, key: RuntimeKey): string {
	const envKey = runtimeKeys[key]
	const runtimeConfig = useRuntimeConfig(event) as Record<string, unknown>
	const processEnv = typeof process === 'undefined' ? undefined : process.env?.[envKey]

	return String(
		getCloudflareEnv(event, envKey)
		?? processEnv
		?? runtimeConfig[key]
		?? '',
	).trim()
}

export function isAdminConfigured(event: H3Event): boolean {
	return Boolean(getAdminEnv(event, 'adminPasswordSha256') && getAdminEnv(event, 'adminSessionSecret'))
}

function bytesToHex(bytes: ArrayBuffer): string {
	return [...new Uint8Array(bytes)]
		.map(byte => byte.toString(16).padStart(2, '0'))
		.join('')
}

export async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input)
	const digest = await crypto.subtle.digest('SHA-256', data)
	return bytesToHex(digest)
}

async function hmacSha256Hex(input: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
	return bytesToHex(signature)
}

export function constantTimeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false

	let diff = 0
	for (let index = 0; index < left.length; index++) {
		diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
	}
	return diff === 0
}

export async function createAdminSession(event: H3Event): Promise<void> {
	const secret = getAdminEnv(event, 'adminSessionSecret')
	if (!secret) {
		throw createError({ statusCode: 500, statusMessage: 'Admin session secret is not configured' })
	}

	const issuedAt = Date.now().toString()
	const signature = await hmacSha256Hex(issuedAt, secret)
	const url = getRequestURL(event)

	setCookie(event, ADMIN_COOKIE, `${issuedAt}.${signature}`, {
		httpOnly: true,
		maxAge: SESSION_MAX_AGE,
		path: '/',
		sameSite: 'lax',
		secure: url.protocol === 'https:' || import.meta.env.PROD,
	})
}

export function clearAdminSession(event: H3Event): void {
	deleteCookie(event, ADMIN_COOKIE, { path: '/' })
}

export async function verifyAdminSession(event: H3Event): Promise<boolean> {
	const secret = getAdminEnv(event, 'adminSessionSecret')
	const cookie = getCookie(event, ADMIN_COOKIE)
	if (!secret || !cookie) return false

	const [issuedAt, signature] = cookie.split('.')
	const issuedAtNumber = Number(issuedAt)
	if (!issuedAt || !signature || !Number.isFinite(issuedAtNumber)) return false
	if (Date.now() - issuedAtNumber > SESSION_MAX_AGE * 1000) return false

	const expected = await hmacSha256Hex(issuedAt, secret)
	return constantTimeEqual(signature, expected)
}

export async function requireAdminSession(event: H3Event): Promise<void> {
	if (await verifyAdminSession(event)) return

	throw createError({ statusCode: 401, statusMessage: 'Admin login required' })
}

/**
 * 登录失败限流：按客户端 IP 计数并指数退避，另加一层全局熔断以覆盖换 IP 的情况。
 *
 * 计数只保存在当前 Worker 实例的内存中，isolate 回收后会重置，
 * 因此它只提高在线爆破的成本，不能替代持久化的访问控制。
 * 如需跨实例的强限流，应把计数放进 D1 或 KV。
 */
interface LoginAttempt {
	count: number
	lockedUntil: number
	windowStart: number
}

const LOGIN_FAILURE_WINDOW = 15 * 60 * 1000
const LOGIN_MAX_FAILURES = 5
const LOGIN_BASE_LOCKOUT = 60 * 1000
const LOGIN_MAX_LOCKOUT = 30 * 60 * 1000
const LOGIN_MAX_TRACKED_IPS = 5000
const LOGIN_GLOBAL_WINDOW = 10 * 60 * 1000
const LOGIN_GLOBAL_MAX_FAILURES = 100
const LOGIN_GLOBAL_COOLDOWN = 5 * 60 * 1000

const loginAttempts = new Map<string, LoginAttempt>()
let globalFailures: number[] = []
let globalLockedUntil = 0

function getLoginClientKey(event: H3Event): string {
	return getRequestHeader(event, 'cf-connecting-ip')
		|| getRequestIP(event, { xForwardedFor: true })
		|| 'unknown'
}

function rejectTooManyAttempts(event: H3Event, retryAfterMs: number) {
	setResponseHeader(event, 'Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))))
	throw createError({ statusCode: 429, statusMessage: 'Too many login attempts, please try again later' })
}

export function assertLoginAllowed(event: H3Event): void {
	const now = Date.now()

	if (globalLockedUntil > now) {
		rejectTooManyAttempts(event, globalLockedUntil - now)
	}

	const attempt = loginAttempts.get(getLoginClientKey(event))
	if (attempt && attempt.lockedUntil > now) {
		rejectTooManyAttempts(event, attempt.lockedUntil - now)
	}
}

export function recordLoginFailure(event: H3Event): void {
	const now = Date.now()
	const key = getLoginClientKey(event)
	const attempt = loginAttempts.get(key)

	if (!attempt || now - attempt.windowStart > LOGIN_FAILURE_WINDOW) {
		loginAttempts.set(key, { count: 1, lockedUntil: 0, windowStart: now })
	}
	else {
		attempt.count += 1
		if (attempt.count >= LOGIN_MAX_FAILURES) {
			const lockout = Math.min(LOGIN_BASE_LOCKOUT * 2 ** (attempt.count - LOGIN_MAX_FAILURES), LOGIN_MAX_LOCKOUT)
			attempt.lockedUntil = now + lockout
		}
	}

	globalFailures = globalFailures.filter(timestamp => now - timestamp < LOGIN_GLOBAL_WINDOW)
	globalFailures.push(now)
	if (globalFailures.length > LOGIN_GLOBAL_MAX_FAILURES) {
		globalLockedUntil = now + LOGIN_GLOBAL_COOLDOWN
		globalFailures = []
	}

	if (loginAttempts.size > LOGIN_MAX_TRACKED_IPS) {
		for (const [trackedKey, tracked] of loginAttempts) {
			if (tracked.lockedUntil < now && now - tracked.windowStart > LOGIN_FAILURE_WINDOW) {
				loginAttempts.delete(trackedKey)
			}
		}
	}
}

export function recordLoginSuccess(event: H3Event): void {
	loginAttempts.delete(getLoginClientKey(event))
}
