<script setup lang="ts">
type ContentType = 'post' | 'talk'
type EditorView = 'write' | 'preview'

interface AdminSession {
	authenticated: boolean
	configured: boolean
}

interface AdminFileItem {
	name: string
	path: string
	sha: string
	size?: number
}

interface AdminFileResponse {
	body: string
	frontmatter: Record<string, unknown>
	path: string
	sha: string
}

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside([])

useSeoMeta({
	title: '后台',
	robots: 'noindex,nofollow',
})

const session = reactive<AdminSession>({
	authenticated: false,
	configured: true,
})
const loginPassword = ref('')
const loginPending = ref(false)
const sessionPending = ref(true)
const contentType = ref<ContentType>('post')
const editorView = ref<EditorView>('write')
const files = ref<AdminFileItem[]>([])
const selectedPath = ref('')
const loadingList = ref(false)
const loadingFile = ref(false)
const saving = ref(false)
const statusMessage = ref('')
const errorMessage = ref('')

const form = reactive({
	title: '',
	description: '',
	date: getLocalDatetime(),
	updated: '',
	categories: appConfig.defaultCategory,
	tags: '',
	image: '',
	articleType: 'tech',
	draft: true,
	location: '',
	images: '',
	videoType: '',
	videoId: '',
	videoPoster: '',
	videoRatio: '',
	body: '',
})

const articleTypes = computed(() => Object.keys(appConfig.article.types))
const isEditing = computed(() => Boolean(selectedPath.value))
const visibleFiles = computed(() => files.value)
const editorTitle = computed(() => {
	if (selectedPath.value) return selectedPath.value
	return contentType.value === 'post' ? '新建文章' : '新建说说'
})

watch(contentType, async () => {
	resetEditor(contentType.value)
	if (session.authenticated) await loadList()
})

onMounted(async () => {
	await refreshSession()
	if (session.authenticated) await loadList()
})

function pad(value: number): string {
	return value.toString().padStart(2, '0')
}

function getLocalDatetime(): string {
	const now = new Date()
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function getErrorMessage(error: unknown): string {
	const data = (error as { data?: { statusMessage?: string, message?: string } }).data
	return data?.statusMessage
		|| data?.message
		|| (error as { statusMessage?: string, message?: string }).statusMessage
		|| (error as { message?: string }).message
		|| '操作失败'
}

function splitList(value: string): string[] {
	return value
		.split(/[\n,，]+/)
		.map(item => item.trim())
		.filter(Boolean)
}

function joinList(value: unknown): string {
	if (Array.isArray(value)) return value.map(String).join(', ')
	if (typeof value === 'string') return value
	return ''
}

function getFieldString(frontmatter: Record<string, unknown>, key: string): string {
	const value = frontmatter[key]
	if (typeof value === 'boolean') return value.toString()
	if (value === undefined || value === null) return ''
	return String(value)
}

async function refreshSession(): Promise<void> {
	sessionPending.value = true
	try {
		const response = await $fetch<AdminSession>('/api/admin/session')
		session.authenticated = response.authenticated
		session.configured = response.configured
	}
	catch (error) {
		errorMessage.value = getErrorMessage(error)
	}
	finally {
		sessionPending.value = false
	}
}

async function login(): Promise<void> {
	loginPending.value = true
	errorMessage.value = ''
	statusMessage.value = ''

	try {
		await $fetch('/api/admin/login', {
			method: 'POST',
			body: { password: loginPassword.value },
		})
		loginPassword.value = ''
		await refreshSession()
		await loadList()
	}
	catch (error) {
		errorMessage.value = getErrorMessage(error)
	}
	finally {
		loginPending.value = false
	}
}

async function logout(): Promise<void> {
	await $fetch('/api/admin/logout', { method: 'POST' })
	session.authenticated = false
	files.value = []
	resetEditor(contentType.value)
}

async function loadList(): Promise<void> {
	loadingList.value = true
	errorMessage.value = ''

	try {
		const response = await $fetch<{ items: AdminFileItem[] }>('/api/admin/content/list', {
			query: { type: contentType.value },
		})
		files.value = response.items
	}
	catch (error) {
		errorMessage.value = getErrorMessage(error)
	}
	finally {
		loadingList.value = false
	}
}

function resetEditor(type: ContentType): void {
	selectedPath.value = ''
	editorView.value = 'write'
	form.title = ''
	form.description = ''
	form.date = getLocalDatetime()
	form.updated = ''
	form.categories = appConfig.defaultCategory
	form.tags = ''
	form.image = ''
	form.articleType = articleTypes.value[0] || 'tech'
	form.draft = type === 'post'
	form.location = ''
	form.images = ''
	form.videoType = ''
	form.videoId = ''
	form.videoPoster = ''
	form.videoRatio = ''
	form.body = type === 'post' ? '## 从这里开始\n\n' : ''
}

async function loadFile(item: AdminFileItem): Promise<void> {
	loadingFile.value = true
	errorMessage.value = ''
	statusMessage.value = ''

	try {
		const response = await $fetch<AdminFileResponse>('/api/admin/content/file', {
			query: { path: item.path },
		})

		selectedPath.value = response.path
		contentType.value = response.path.startsWith('content/talks/') ? 'talk' : 'post'
		applyFrontmatter(response.frontmatter)
		form.body = response.body
		editorView.value = 'write'
	}
	catch (error) {
		errorMessage.value = getErrorMessage(error)
	}
	finally {
		loadingFile.value = false
	}
}

function applyFrontmatter(frontmatter: Record<string, unknown>): void {
	form.title = getFieldString(frontmatter, 'title')
	form.description = getFieldString(frontmatter, 'description')
	form.date = getFieldString(frontmatter, 'date') || getLocalDatetime()
	form.updated = getFieldString(frontmatter, 'updated')
	form.categories = joinList(frontmatter.categories) || appConfig.defaultCategory
	form.tags = joinList(frontmatter.tags)
	form.image = getFieldString(frontmatter, 'image')
	form.articleType = getFieldString(frontmatter, 'type') || articleTypes.value[0] || 'tech'
	form.draft = frontmatter.draft === true || frontmatter.draft === 'true'
	form.location = getFieldString(frontmatter, 'location')
	form.images = joinList(frontmatter.images).replaceAll(', ', '\n')

	const video = frontmatter.video && typeof frontmatter.video === 'object'
		? frontmatter.video as Record<string, unknown>
		: {}
	form.videoType = getFieldString(video, 'type')
	form.videoId = getFieldString(video, 'id')
	form.videoPoster = getFieldString(video, 'poster')
	form.videoRatio = getFieldString(video, 'ratio')
}

function createPayload() {
	if (contentType.value === 'post') {
		return {
			body: form.body,
			fields: {
				categories: splitList(form.categories),
				date: form.date,
				description: form.description,
				draft: form.draft,
				image: form.image,
				tags: splitList(form.tags),
				title: form.title,
				type: form.articleType,
				updated: form.updated,
			},
			path: selectedPath.value || undefined,
			type: contentType.value,
		}
	}

	return {
		body: form.body,
		fields: {
			date: form.date,
			description: form.description,
			images: splitList(form.images),
			location: form.location,
			tags: splitList(form.tags),
			title: form.title,
			video: {
				id: form.videoId,
				poster: form.videoPoster,
				ratio: form.videoRatio,
				type: form.videoType,
			},
		},
		path: selectedPath.value || undefined,
		type: contentType.value,
	}
}

async function saveContent(): Promise<void> {
	saving.value = true
	errorMessage.value = ''
	statusMessage.value = ''

	try {
		const response = await $fetch<{ path: string, sha: string, created: boolean }>('/api/admin/content/save', {
			method: 'POST',
			body: createPayload(),
		})
		selectedPath.value = response.path
		statusMessage.value = response.created ? `已创建 ${response.path}` : `已更新 ${response.path}`
		await loadList()
	}
	catch (error) {
		errorMessage.value = getErrorMessage(error)
	}
	finally {
		saving.value = false
	}
}
</script>

<template>
<section class="admin-page">
	<header class="admin-header">
		<div>
			<h1>内容后台</h1>
			<p>文章和说说会通过 GitHub API 提交到仓库，然后由 Cloudflare Pages 重新构建。</p>
		</div>
		<button v-if="session.authenticated" class="icon-button" type="button" v-tip="'退出登录'" @click="logout">
			<Icon name="ph:sign-out-bold" />
		</button>
	</header>

	<form v-if="!session.authenticated" class="login-panel" @submit.prevent="login">
		<p v-if="sessionPending" class="muted">
			正在检查登录状态...
		</p>
		<p v-else-if="!session.configured" class="error-message">
			后台认证环境变量未配置，请先配置 ADMIN_PASSWORD_SHA256 和 ADMIN_SESSION_SECRET。
		</p>

		<label>
			<span>管理员密码</span>
			<input v-model="loginPassword" type="password" autocomplete="current-password" :disabled="loginPending || !session.configured">
		</label>

		<button class="primary-button" type="submit" :disabled="loginPending || !session.configured">
			<Icon name="ph:lock-key-open-bold" />
			<span>{{ loginPending ? '登录中' : '登录' }}</span>
		</button>
	</form>

	<div v-else class="admin-shell">
		<aside class="content-list">
			<div class="list-toolbar">
				<div class="segmented">
					<button type="button" :class="{ active: contentType === 'post' }" @click="contentType = 'post'">
						文章
					</button>
					<button type="button" :class="{ active: contentType === 'talk' }" @click="contentType = 'talk'">
						说说
					</button>
				</div>
				<button class="icon-button" type="button" v-tip="'刷新列表'" :disabled="loadingList" @click="loadList">
					<Icon name="ph:arrows-clockwise-bold" />
				</button>
			</div>

			<button class="new-button" type="button" @click="resetEditor(contentType)">
				<Icon name="ph:plus-bold" />
				<span>{{ contentType === 'post' ? '新建文章' : '新建说说' }}</span>
			</button>

			<div class="file-list scrollcheck-y">
				<button
					v-for="item in visibleFiles"
					:key="item.path"
					class="file-item"
					:class="{ active: selectedPath === item.path }"
					type="button"
					:disabled="loadingFile"
					@click="loadFile(item)"
				>
					<span>{{ item.name }}</span>
					<small>{{ item.path }}</small>
				</button>
				<p v-if="loadingList" class="muted">
					正在加载...
				</p>
				<p v-else-if="!visibleFiles.length" class="muted">
					暂无内容
				</p>
			</div>
		</aside>

		<form class="editor-panel" @submit.prevent="saveContent">
			<div class="editor-toolbar">
				<div>
					<h2>{{ editorTitle }}</h2>
					<p>{{ isEditing ? '编辑已有 Markdown 文件' : '保存后会创建新的 Markdown 文件' }}</p>
				</div>
				<div class="toolbar-actions">
					<div class="segmented">
						<button type="button" :class="{ active: editorView === 'write' }" @click="editorView = 'write'">
							编辑
						</button>
						<button type="button" :class="{ active: editorView === 'preview' }" @click="editorView = 'preview'">
							预览
						</button>
					</div>
					<button class="primary-button" type="submit" :disabled="saving">
						<Icon name="ph:cloud-arrow-up-bold" />
						<span>{{ saving ? '保存中' : '保存' }}</span>
					</button>
				</div>
			</div>

			<div class="field-grid">
				<label v-if="contentType === 'post'">
					<span>标题</span>
					<input v-model="form.title" required>
				</label>
				<label v-else>
					<span>标题</span>
					<input v-model="form.title">
				</label>

				<label>
					<span>日期</span>
					<input v-model="form.date" required placeholder="2026-05-16 13:30">
				</label>

				<label>
					<span>描述</span>
					<input v-model="form.description">
				</label>

				<label>
					<span>标签</span>
					<input v-model="form.tags" :required="contentType === 'post'" placeholder="生活, 记录">
				</label>

				<template v-if="contentType === 'post'">
					<label>
						<span>分类</span>
						<input v-model="form.categories" required>
					</label>
					<label>
						<span>更新时间</span>
						<input v-model="form.updated" placeholder="不填则使用日期">
					</label>
					<label>
						<span>封面图 URL</span>
						<input v-model="form.image">
					</label>
					<label>
						<span>版式</span>
						<select v-model="form.articleType">
							<option v-for="type in articleTypes" :key="type" :value="type">
								{{ type }}
							</option>
						</select>
					</label>
					<label class="toggle-row">
						<input v-model="form.draft" type="checkbox">
						<span>保存为草稿</span>
					</label>
				</template>

				<template v-else>
					<label>
						<span>位置</span>
						<input v-model="form.location">
					</label>
					<label>
						<span>图片 URL</span>
						<textarea v-model="form.images" rows="3" placeholder="每行一个 URL" />
					</label>
					<label>
						<span>视频类型</span>
						<select v-model="form.videoType">
							<option value="">
								无
							</option>
							<option value="raw">
								raw
							</option>
							<option value="bilibili">
								bilibili
							</option>
							<option value="youtube">
								youtube
							</option>
							<option value="douyin">
								douyin
							</option>
						</select>
					</label>
					<label>
						<span>视频 ID / URL</span>
						<input v-model="form.videoId">
					</label>
					<label>
						<span>视频封面</span>
						<input v-model="form.videoPoster">
					</label>
					<label>
						<span>视频比例</span>
						<input v-model="form.videoRatio" placeholder="16/9 或 1.777">
					</label>
				</template>
			</div>

			<textarea
				v-if="editorView === 'write'"
				v-model="form.body"
				class="markdown-editor"
				spellcheck="false"
				placeholder="在这里写 Markdown"
			/>
			<MDC
				v-else
				class="article markdown-preview"
				:value="form.body || ' '"
				tag="article"
				partial
			/>
		</form>
	</div>

	<p v-if="statusMessage" class="status-message">
		{{ statusMessage }}
	</p>
	<p v-if="errorMessage" class="error-message">
		{{ errorMessage }}
	</p>
</section>
</template>

<style lang="scss" scoped>
.admin-page {
	display: grid;
	gap: 1rem;
	margin: 1rem;
	animation: float-in 0.2s backwards;
}

.admin-header,
.editor-toolbar,
.list-toolbar,
.toolbar-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
}

.admin-header {
	padding-bottom: 1rem;
	border-bottom: 1px solid var(--c-bg-soft);

	h1 {
		font-size: 1.6rem;
	}

	p {
		margin-top: 0.25rem;
		color: var(--c-text-3);
	}
}

.login-panel,
.admin-shell {
	border-radius: 8px;
	box-shadow: 0 0 0 1px var(--c-bg-soft);
	background-color: var(--ld-bg-card);
}

.login-panel {
	display: grid;
	gap: 1rem;
	max-width: 420px;
	padding: 1rem;

	label {
		display: grid;
		gap: 0.35rem;
	}
}

.admin-shell {
	display: grid;
	grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
	min-height: 72vh;
	overflow: hidden;
}

.content-list {
	display: grid;
	grid-template-rows: auto auto minmax(0, 1fr);
	gap: 0.75rem;
	padding: 1rem;
	border-inline-end: 1px solid var(--c-bg-soft);
}

.segmented {
	display: inline-grid;
	grid-auto-flow: column;
	padding: 3px;
	border-radius: 8px;
	background-color: var(--c-bg-2);

	button {
		min-width: 4rem;
		padding: 0.35rem 0.6rem;
		border-radius: 6px;
		color: var(--c-text-2);

		&.active {
			background-color: var(--ld-bg-card);
			color: var(--c-text);
			box-shadow: 0 1px 0.4rem var(--ld-shadow);
		}
	}
}

.icon-button,
.primary-button,
.new-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
	border-radius: 8px;
	transition: all 0.2s;

	&:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
}

.icon-button {
	width: 2.2rem;
	height: 2.2rem;
	background-color: var(--c-bg-2);

	&:hover {
		background-color: var(--c-bg-soft);
	}
}

.primary-button,
.new-button {
	padding: 0.45rem 0.7rem;
}

.primary-button {
	background-color: var(--c-primary);
	color: var(--c-bg);

	&:hover {
		filter: brightness(1.05);
	}
}

.new-button {
	width: 100%;
	background-color: var(--c-bg-2);
	color: var(--c-text);

	&:hover {
		background-color: var(--c-bg-soft);
	}
}

.file-list {
	display: grid;
	align-content: start;
	gap: 0.35rem;
	overflow-y: auto;
	min-height: 0;
}

.file-item {
	display: grid;
	gap: 0.15rem;
	padding: 0.55rem;
	border-radius: 8px;
	text-align: start;
	color: var(--c-text-2);

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--c-text);
	}

	small {
		overflow: hidden;
		font-family: var(--font-monospace);
		font-size: 0.7rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--c-text-3);
	}

	&:hover,
	&.active {
		background-color: var(--c-bg-2);
	}
}

.editor-panel {
	display: grid;
	grid-template-rows: auto auto minmax(24rem, 1fr);
	gap: 1rem;
	min-width: 0;
	padding: 1rem;
}

.editor-toolbar {
	h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	p {
		margin-top: 0.2rem;
		font-size: 0.8rem;
		color: var(--c-text-3);
	}
}

.field-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.75rem;
}

label {
	display: grid;
	gap: 0.3rem;
	font-size: 0.85rem;
	color: var(--c-text-2);
}

input,
select,
textarea {
	width: 100%;
	min-width: 0;
	padding: 0.45rem 0.55rem;
	border: 1px solid var(--c-bg-soft);
	border-radius: 8px;
	background-color: var(--c-bg-1);
	color: var(--c-text);

	&:focus {
		border-color: var(--c-primary);
		outline: none;
	}
}

.toggle-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;

	input {
		width: 1rem;
	}
}

.markdown-editor,
.markdown-preview {
	min-height: 24rem;
	max-height: 72vh;
	overflow: auto;
}

.markdown-editor {
	resize: vertical;
	font-family: var(--font-monospace);
	line-height: 1.6;
}

.markdown-preview {
	margin: 0;
	padding: 0.75rem;
	border: 1px solid var(--c-bg-soft);
	border-radius: 8px;
	background-color: var(--c-bg-1);
}

.muted,
.status-message,
.error-message {
	color: var(--c-text-3);
}

.status-message,
.error-message {
	padding: 0.75rem 1rem;
	border-radius: 8px;
}

.status-message {
	background-color: var(--c-primary-soft);
	color: var(--c-primary);
}

.error-message {
	background-color: var(--c-danger-soft, var(--c-bg-2));
	color: var(--c-danger, #d33);
}

@media (max-width: $breakpoint-mobile) {
	.admin-shell {
		grid-template-columns: 1fr;
	}

	.content-list {
		border-inline-end: 0;
		border-bottom: 1px solid var(--c-bg-soft);
	}

	.field-grid {
		grid-template-columns: 1fr;
	}

	.admin-header,
	.editor-toolbar,
	.toolbar-actions {
		align-items: stretch;
		flex-direction: column;
	}
}
</style>
