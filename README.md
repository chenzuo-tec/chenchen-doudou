# 晨晨 × 豆豆 · 恋爱纪念册

零依赖 HTML / CSS / JavaScript 网站，适合 GitHub Pages。无收费 API、外部字体、跟踪脚本或后台。

## 功能

- 四个独立页面：首页 `index.html`、恋爱日历 `anniversaries.html`、愿望 `wishes.html`、抽卡 `cupid.html`。
- 恋爱日期固定为 **2026 年 3 月 15 日**，按北京时间计算日历天数；月 / 半年 / 周年纪念日，支持自选特别日子。
- 可翻月的纸质日历、纪念日标记、漂浮爱心和翻卡动效；支持系统减少动态效果设置。
- 愿望新增、完成、删除，JSON 导出 / 导入分享。
- 九张丘比特卡片，每轮 1～9 次机会；奖励池可编辑，等概率抽取，可重复奖励；用完后重新开始。
- 桌面丘比特爱心箭光标，手机触摸抽卡；刷新保留进度。

所有数据只保存在当前浏览器的 localStorage，不会自动同步到另一台设备。清除浏览器数据会清除设置。愿望清单导入会替换现有清单。小游戏是娱乐用途，没有现金支付、账号或实际奖励兑现。

## 本地查看

在本目录运行 `node preview-server.mjs`，然后访问 http://127.0.0.1:8000 。也可使用任何静态 HTTP 服务。使用 JavaScript 模块，因此不要直接双击 HTML 以 file:// 打开。

## 免费发布到 GitHub Pages

1. 登录自己的 GitHub 免费账号，创建一个公开仓库，比如 `chenchen-doudou`。
2. 将四个 `.html` 页面、`style.css`、`app.js`、`core.js`、`.nojekyll` 上传到仓库根目录。
3. 进入仓库 **Settings → Pages**，在 **Build and deployment** 中选 **Deploy from a branch**。
4. 选择 `main` 分支、`/ (root)` 文件夹并保存。
5. 等待部署完成，访问 Pages 页面返回的网址，格式为 `https://你的用户名.github.io/chenchen-doudou/`。

无需购买域名，使用平台提供的网址。GitHub 免费公开仓库中的代码及上传文件对外可见。实际网址以 GitHub 返回值为准。

已发布网址：https://chenzuo-tec.github.io/chenchen-doudou/ 。恋爱日期对所有设备固定一致；愿望、奖励和倒计时偏好保存在各自浏览器。旧版本的恋爱日期会自动被固定日期覆盖，原愿望和抽卡记录仍会读取。

## 检查

`npm run check` 检查语法，`npm test` 验证日期边界和抽卡机会限制。无需 npm install。
