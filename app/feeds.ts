// 友链检测 CLI 需要使用显式导入和相对路径
import type { FeedGroup } from '../app/types/feed'
import { myFeed } from '../blog.config'
import { getFavicon, getGhAvatar, getGhIcon, getQqAvatar, QqAvatarSize } from './utils/img'

export default [
	// #region Clarity
	{
		name: '网上邻居',
		desc: '哔——啵——电波通讯中，欢迎常来串门。',
		// @keep-sorted { "keys": ["date"] }
		entries: []
	},
	/* ========从此处新增友链======== */
	// #endregion
	// #region XUPTers
	{
		name: 'Wusters',
		desc: '武汉科技大学的校友们。',
		// @keep-sorted { "keys": ["date"] }
		entries: []
	},
	// #endregion
	// #region 现实之域
	// #endregion
] satisfies FeedGroup[]
