import antfu from '@antfu/eslint-config'

export default antfu({
	ignores: [
		'*.yaml',
		// 文章内的代码块常为示意性伪代码，不要求是合法 JS/TS，因此不参与 lint
		'content/**/*.md',
	],
	stylistic: {
		indent: 'tab',
	},
	pnpm: true,
	// @keep-sorted
	rules: {
		'jsonc/indent': ['error', 2],
		'vue/block-lang': ['warn', {
			script: { lang: ['ts', 'tsx'] },
			style: { lang: ['scss'] },
		}],
		'vue/enforce-style-attribute': ['warn', {
			allow: ['scoped'],
		}],
		'vue/html-indent': ['error', 'tab', { baseIndent: 0 }],
		'yaml/indent': ['error', 2],
	},
}, {
	files: ['**/*.json'],
	ignores: ['content/**'],
	rules: {
		'style/eol-last': ['warn', 'never'],
	},
}, {
	files: ['content/**'],
	// @keep-sorted
	rules: {
		'antfu/consistent-list-newline': 'off',
		'eqeqeq': 'off',
		'jsonc/comma-dangle': ['warn', 'always'],
		'no-irregular-whitespace': 'off',
		'no-sequences': 'off',
		'prefer-arrow-callback': 'off',
		'prefer-template': 'off',
		'style/indent': 'off',
		'style/quotes': 'off',
		'style/semi': 'off',
		'unicorn/prefer-includes': 'off',
	},
}, {
	// 该组件刻意保持空模板（不渲染任何内容）
	files: ['app/components/widget/CommGroup.vue'],
	rules: {
		'vue/valid-template-root': 'off',
	},
}, {
	files: ['server/utils/admin-auth.ts'],
	rules: {
		// 此处刻意用 `typeof process === 'undefined'` 守卫边缘运行时（Cloudflare Workers 无 process），
		// 改用 require("process") 会破坏该兼容性
		'node/prefer-global/process': 'off',
	},
}, {
	files: ['server/utils/admin-content.ts'],
	// @keep-sorted
	rules: {
		// 控制字符是文件名校验的必要部分（Windows 保留字符）
		'no-control-regex': 'off',
		// `[^\d]` 与 `\D` 的写法需与 replace 链保持可读的一致，不做等价改写
		'regexp/negation': 'off',
		// 行内 frontmatter 解析：`\s*` 与 `(.*)$` 之间由行结束符锚定，不存在回溯风险
		'regexp/no-super-linear-backtracking': 'off',
		'regexp/prefer-d': 'off',
	},
})
