import type { FeedEntry } from './app/types/feed'

const siteUrl = 'https://blog.gslpro.top/'
// 图标/头像使用站内自托管文件（public/tx.jpg），避免第三方图床故障导致站点图标与头像不可用。
// 订阅源与 OG 要求绝对 URL，因此这里用规范化域名拼出完整地址。
const siteIcon = new URL('/tx.jpg', siteUrl).toString()

const basicConfig = {
	title: 'Wa的小家',
	subtitle: 'Wa\'s Blog',
	// 长 description 利好于 SEO
	description: '技术文章，经验分享，生活杂谈，代码笔记，Wa 的个人博客。',
	author: {
		name: 'Wa',
		avatar: siteIcon,
		email: 'qutypebeat@gmail.com',
		homepage: siteUrl,
	},
	copyright: {
		abbr: 'CC BY-NC-SA 4.0',
		name: '署名-非商业性使用-相同方式共享 4.0 国际',
		url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans',
	},
	favicon: siteIcon,
	language: 'zh-CN',
	timeEstablished: '2024-10-1',
	timezone: 'Asia/Shanghai',
	url: siteUrl,
	defaultCategory: '未分类',
}

// 存储 nuxt.config 和 app.config 共用的配置
// 此处为启动时需要的配置，启动后可变配置位于 app/app.config.ts
// @keep-sorted
const blogConfig = {
	...basicConfig,

	article: {
		/** 分类配色与图标；未在此声明的分类会按名称生成稳定的兜底颜色 */
		// 色相仍分散以保留辨识度，但统一压低饱和度与明度，
		// 避免多个分类并排时出现刺眼的红绿紫色块
		categories: {
			[basicConfig.defaultCategory]: { icon: 'ph:folder-dotted-bold' },
			acm: { icon: 'ph:trophy-bold', color: 'hsl(215deg 58% 62%)' },
			fullstackopen: { icon: 'ph:graduation-cap-bold', color: 'hsl(178deg 40% 52%)' },
			obsidian: { icon: 'ph:notebook-bold', color: 'hsl(258deg 44% 68%)' },
			教程: { icon: 'ph:book-open-bold', color: 'hsl(28deg 52% 62%)' },
			经验分享: { icon: 'ph:mouse-bold', color: 'hsl(205deg 55% 62%)' },
			杂谈: { icon: 'ph:chat-bold', color: 'hsl(158deg 38% 54%)' },
			生活: { icon: 'ph:shooting-star-bold', color: 'hsl(352deg 48% 68%)' },
			代码: { icon: 'ph:code-bold', color: 'hsl(232deg 50% 68%)' },
		},
		defaultCategoryIcon: 'ph:folder-bold',
		/** 文章版式，首个为默认版式 */
		types: {
			tech: {},
			story: {},
		},
		/** 分类排序方式，键为排序字段，值为显示名称 */
		order: {
			date: '创建日期',
			updated: '更新日期',
			// title: '标题',
		},
		/** 使用 pnpm new 新建文章时自动生成自定义链接（permalink/abbrlink） */
		useRandomPremalink: false,
		/** 隐藏基于文件路由（不是自定义链接）的 URL /post 路径前缀 */
		hidePostPrefix: true,
		/** 禁止搜索引擎收录的路径 */
		robotsNotIndex: ['/preview', '/previews/*'],
	},

	/** 博客 Atom 订阅源 */
	feed: {
		/** 订阅源最大文章数量 */
		limit: 50,
		/** 订阅源是否启用XSLT样式 */
		enableStyle: true,
	},

	/** 向 <head> 中添加脚本 */
	scripts: [
		// 自己部署的 Umami 统计服务
		// { 'src': 'https://zhi.gslpro.top/script.js', 'data-website-id': '4a12fe8d-4049-4d4f-834b-a3e54c221eac', 'defer': true },
		// 自己网站的 Cloudflare Insights 统计服务
		{ 'src': 'https://static.cloudflareinsights.com/beacon.min.js', 'data-cf-beacon': '{"token": "97a4fe32ed8240ac8284e9bffaf03962"}', 'defer': true },
		// Twikoo 评论系统
		{ src: 'https://lib.baomitu.com/twikoo/1.6.44/twikoo.min.js', defer: true },
	],

	/** 自己部署的 Twikoo 服务 */
	twikoo: {
		envId: 'https://twikoo-navy-one.vercel.app/',
		preload: 'https://twikoo-navy-one.vercel.app/',
	},
}

/** 用于生成 OPML 和友链页面配置 */
export const myFeed: FeedEntry = {
	author: blogConfig.author.name,
	sitenick: 'Wa的小家',
	title: blogConfig.title,
	desc: blogConfig.subtitle || blogConfig.description,
	link: blogConfig.url,
	feed: new URL('/atom.xml', blogConfig.url).toString(),
	icon: blogConfig.favicon,
	avatar: blogConfig.author.avatar,
	archs: ['Nuxt', 'Cloudflare'],
	date: blogConfig.timeEstablished,
	comment: '这是我自己',
}

export default blogConfig
