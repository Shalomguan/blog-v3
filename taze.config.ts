/**
 * taze（pnpm bump）配置。
 *
 * patches/ 下的补丁直接修改了依赖的 dist 产物且没有版本约束，
 * 一旦这些包被升级，`pnpm i` 会因补丁无法应用而失败，进而导致构建失败。
 * 因此升级时排除它们：需要升级时请手动改版本并同步更新对应补丁。
 */
export default {
	exclude: [
		'@nuxtjs/mdc',
		'@vue/shared',
		'plain-shiki',
		'playwright-core',
	],
}
