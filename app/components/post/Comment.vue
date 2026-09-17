<script setup lang="ts">
const appConfig = useAppConfig()

const failed = ref(false)

/**
 * twikoo 通过 <head> 中的外链脚本异步加载，
 * onMounted 时可能尚未就绪，或被广告拦截/网络问题阻断。
 * 因此轮询等待并设置超时，避免评论框永久停留在「评论加载中...」。
 */
const TWIKOO_READY_TIMEOUT = 10_000
const TWIKOO_READY_INTERVAL = 200

function waitForTwikoo(): Promise<boolean> {
	if (typeof window === 'undefined')
		return Promise.resolve(false)
	if (window.twikoo?.init)
		return Promise.resolve(true)

	return new Promise((resolve) => {
		const startedAt = Date.now()
		const timer = window.setInterval(() => {
			if (window.twikoo?.init) {
				window.clearInterval(timer)
				resolve(true)
				return
			}
			if (Date.now() - startedAt >= TWIKOO_READY_TIMEOUT) {
				window.clearInterval(timer)
				resolve(false)
			}
		}, TWIKOO_READY_INTERVAL)
		onScopeDispose(() => window.clearInterval(timer))
	})
}

onMounted(async () => {
	if (!await waitForTwikoo()) {
		failed.value = true
		return
	}

	try {
		await window.twikoo?.init?.({
			envId: appConfig.twikoo?.envId,
			// twikoo 会把挂载后的元素变为 #twikoo
			el: '#twikoo',
		})
	}
	catch {
		failed.value = true
	}
})
</script>

<template>
<section class="z-comment">
	<h3 class="text-creative">
		评论区
	</h3>
	<div id="twikoo">
		<p v-if="failed" class="comment-fallback">
			评论加载失败，可能是评论服务暂时不可用或浏览器插件拦截了脚本，请刷新重试。
		</p>
		<p v-else>
			评论加载中...
		</p>
	</div>
</section>
</template>

<style lang="scss" scoped>
.z-comment {
	margin: 3rem 1rem;

	> h3 {
		margin-top: 3rem;
		font-size: 1.25rem;
	}
}

:deep(#twikoo) {
	margin: 2em 0;

	.tk-admin-container {
		position: fixed;
		z-index: calc(var(--z-index-popover) + 1);
	}

	.tk-input {
		font-family: var(--font-monospace);
	}

	@supports (corner-shape: squircle) {
		.tk-avatar {
			border-radius: 50%;
			corner-shape: superellipse(1.2);
		}
	}

	.tk-time {
		color: var(--c-text-3);
	}

	.tk-content {
		margin-top: 0;
	}

	.tk-comments-title, .tk-nick > strong {
		font-family: var(--font-creative);
	}

	.tk-owo-emotion {
		width: auto;
		height: 1.4em;
		vertical-align: text-bottom;
	}

	.tk-extras, .tk-footer {
		font-size: 0.7rem;
		color: var(--c-text-3);
	}

	.tk-replies:not(.tk-replies-expand) {
		mask-image: linear-gradient(#FFF 50%, transparent);
	}

	.tk-expand {
		border-radius: 0.5rem;
		transition: background-color 0.1s;
	}
}

:deep(:where(.tk-preview-container,.tk-content)) {
	pre {
		overflow: auto;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
	}

	p {
		margin: 0.2em 0;
	}

	img {
		border-radius: 0.5em;
	}

	menu, ol, ul {
		margin: 0.5em 0;
		padding-inline-start: 1.5em;
		font-size: 0.9rem;
		list-style: revert;

		> li {
			margin: 0.2em 0;

			&::marker {
				color: var(--c-primary);
			}
		}
	}

	blockquote {
		margin: 0.5em 0;
		padding: 0.2em 0.5em;
		border-inline-start: 4px solid var(--c-border);
		border-radius: 4px;
		background-color: var(--c-bg-2);
		font-size: 0.9rem;
	}
}
</style>
