# AI+X 行业案例网（静态网站原型）

全球 AI 技术进展 × 行业落地案例 × 机构与地区观察。纯静态站点：**HTML + CSS + 原生 JavaScript，无构建步骤、无后台、无外部 CDN**（不依赖 Google Fonts / googleapis 等国内无法访问的资源），可直接部署到任意静态托管服务。

> ⚠️ 本站为原型，内容为**样例数据集**：每条内容都附原始来源链接；来源中未披露的量化效果一律标注为“未公开”。上线前请按需复核与扩充数据。

## 目录结构

```
aix-site/
├── index.html              # 单页应用入口（hash 路由：#/home、#/cases、#/case/c01 …）
├── .nojekyll               # 让 GitHub Pages 原样发布所有文件
├── assets/
│   ├── css/style.css       # 样式（浅色主题 + 深蓝科技色，响应式）
│   ├── js/app.js           # 路由、渲染、筛选、SVG 图表（零依赖）
│   └── favicon.svg
└── data/                   # 全部内容数据，可由自动采集任务直接覆盖更新
    ├── meta.json           # 站点信息与数据更新日期
    ├── news.json           # AI 动态快讯
    ├── cases.json          # 行业案例库（核心）
    ├── topics.json         # 技术前沿专题
    ├── institutions.json   # 机构与高校
    └── regions.json        # 地区观察
```

页面（hash 路由）：

| 页面 | 地址 |
| --- | --- |
| 首页（今日要闻 + 热点技术 / 最新案例 / 数据看板：KPI 指标 + 7 张交互图表） | `#/home` |
| AI 动态快讯（按类别、地区筛选） | `#/news`，如 `#/news?cat=政策法规&region=中国` |
| 技术前沿 | `#/tech`，定位某专题：`#/tech?t=agent` |
| 行业案例库（行业/地区/技术/成熟度/关键词） | `#/cases`，如 `#/cases?industry=金融&q=客服` |
| 案例详情 | `#/case/c01` |
| 机构与高校 | `#/institutions?type=高校` |
| 地区观察 | `#/regions` |
| 关于 / 订阅（订阅表单为演示占位，不提交任何数据） | `#/about` |

所有筛选条件都会写入网址，**复制浏览器地址即可转发、分享当前筛选结果或某个案例**。

## 一、本地预览

浏览器出于安全限制，不允许 `file://` 方式读取本地 JSON，所以请用任意静态服务器打开：

```bash
cd aix-site
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080
```

或（已安装 Node.js 时）：`npx serve .`

## 二、部署方式

### (a) GitHub Pages

1. 在 GitHub 新建仓库（如 `aix-site`），把本目录**内的全部文件**（含 `.nojekyll`）推送到仓库根目录：
   ```bash
   cd aix-site
   git init && git add . && git commit -m "init AI+X site"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/aix-site.git
   git push -u origin main
   ```
2. 进入仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，Branch 选 `main`、目录 `/ (root)`，保存。
3. 1–2 分钟后访问 `https://<你的用户名>.github.io/aix-site/`。
4. 绑定自定义域名：在 Pages 设置中填写域名，并在 DNS 处添加 CNAME 记录指向 `<你的用户名>.github.io`。

> 提示：GitHub Pages 在中国大陆访问速度不稳定，面向国内用户建议看 (c)。

### (b) Cloudflare Pages / Netlify（拖拽上传，最快）

**Netlify Drop**：打开 <https://app.netlify.com/drop>，登录后把 `aix-site` 文件夹（或解压后的 `aix-site.zip` 内容）直接拖进页面，几秒后得到 `https://xxx.netlify.app` 访问地址，可在站点设置中改名或绑定域名。

**Cloudflare Pages**：登录 Cloudflare 控制台 → **Workers & Pages → 创建 → Pages → 上传资产（Upload assets）**，填写项目名，拖入 `aix-site` 文件夹或 zip，点击部署，得到 `https://<项目名>.pages.dev`。也可连接 GitHub 仓库实现推送即自动部署（构建命令留空，输出目录填 `/`）。

**Vercel**：导入 GitHub 仓库，Framework 选 **Other**，Build Command 留空，Output Directory 留空或填 `.`，部署即可。

### (c) 阿里云 OSS 静态网站托管 / 国内访问建议

1. 登录阿里云控制台 → **对象存储 OSS → 创建 Bucket**：地域选离用户近的（如华东1 杭州），读写权限设为**公共读**。
2. 进入 Bucket → **数据管理 → 静态页面**：默认首页填 `index.html`，默认 404 页填 `index.html`。
3. **文件管理 → 上传文件**：上传本目录全部文件，保持目录结构（`assets/`、`data/` 都要上传）。
4. **绑定自定义域名**（Bucket → 域名管理）：
   - 使用中国内地地域的 Bucket 并绑定自定义域名时，**该域名必须先完成 ICP 备案**；
   - 出于安全策略，OSS 默认域名直接访问 HTML 时通常会被强制下载而不是在浏览器中打开，因此正式对外访问需要绑定已备案的自定义域名；
   - 建议同时开启 **CDN 加速** 与 **HTTPS 证书**（可用阿里云免费 DV 证书）。
5. 更新内容：仅需重新上传 `data/*.json`，并在 CDN 控制台刷新缓存。

**国内访问建议**
- 面向中国大陆用户：优先选择 阿里云 OSS + CDN、腾讯云 COS + CDN 等国内服务，域名需完成 **ICP 备案**（在服务器/存储所在云厂商处办理，一般需 1–3 周）。
- 未备案时的过渡方案：使用香港地域的 OSS/COS Bucket，或 Cloudflare Pages / Netlify（无需备案，但国内速度与可达性不保证）。
- 本站不加载任何境外字体或 CDN 资源，所有文件均为本地相对路径，国内部署无额外依赖。
- 若网站涉及经营性内容（如付费会员），还需按规定办理相应的经营许可。

## 三、数据结构（JSON Schema 说明）

所有文件均为 UTF-8 JSON 数组（`meta.json` 为对象）。自动采集任务只需按以下字段生成文件并覆盖 `data/` 目录即可，前端会自动统计数量、生成图表与筛选项。

### `data/news.json` —— AI 动态快讯

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 唯一 ID，如 `n01` |
| `date` | string | 日期 `YYYY-MM-DD` |
| `category` | string | `模型发布` / `产品更新` / `融资并购` / `政策法规` / `科研突破` |
| `region` | string | 地区：`中国` / `北美` / `欧洲` / `日韩` / `东南亚` / `中东` / `拉美` 等 |
| `title` | string | 标题 |
| `summary` | string | 一句话摘要（只写来源中有的事实） |
| `source_name` | string | 来源名称 |
| `source_url` | string | 原始来源链接（必须以 http/https 开头） |
| `credibility` | string | `官方发布` / `媒体报道` |

### `data/cases.json` —— 行业案例（核心）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 唯一 ID，如 `c01`（详情页地址 `#/case/c01`） |
| `title` | string | 案例标题 |
| `org` | string | 企业 / 机构 |
| `region` | string | 地区（同上，用于筛选与地区页统计） |
| `country` | string | 国家 / 地区细分 |
| `industry` | string | 行业，如 金融、医疗健康、制造、能源、教育、政务… |
| `tech` | string[] | 技术标签，如 `["大语言模型","AI Agent"]` |
| `scenario` | string | 应用场景 |
| `problem` | string | 解决的问题 |
| `approach` | string | 实施方式 |
| `effect` | string | 量化效果；来源未披露时填 `未公开` |
| `date` | string | 时间 `YYYY-MM` 或 `YYYY` |
| `source_name` / `source_url` | string | 主来源 |
| `extra_sources` | {name,url}[] | 可选，补充来源 |
| `maturity` | string | 成熟度：`研究验证` / `试点` / `规模化` / `商业化` |
| `credibility` | string | 可信等级：`官方发布` / `媒体报道` |

### `data/topics.json` —— 技术前沿

`id`（用于 `#/tech?t=id`）、`name`、`what`（是什么）、`why`（为什么重要）、`who`（string[]，谁在做）、`maturity`（文字描述）、`maturity_score`（1–5，用于雷达图，编辑评估）、`related_news`（string[]，关联的 news id）。

### `data/institutions.json` —— 机构与高校

`id`、`name`、`type`（`企业` / `高校` / `科研机构`）、`region`、`country`、`intro`、`focus`（string[]）、`site`（官网）、`products`（代表成果，无则填 `—`）。

### `data/regions.json` —— 地区观察

`id`、`name`（`中国`/`美国`/`欧洲`/`日韩`/`东南亚`/`中东`）、`summary`、`points`（string[]）、`sources`（{name,url}[]）。
地区页会把 `美国` 映射到案例/快讯中的 `北美` 进行统计。

### `data/meta.json`

`site`、`version`、`updated`（数据更新日期，显示在页脚）、`note`。

### 自动更新建议

采集 → AI 去重/分类/摘要 → 人工审核 → 生成 JSON → 重新部署（GitHub Actions 定时任务提交 `data/` 即可触发 Pages/Cloudflare/Netlify 自动发布；OSS 可用 `ossutil cp -r data/ oss://<bucket>/data/` 同步并刷新 CDN）。
数据质量红线：每条必须有可访问的原始来源；不得补写来源中没有的数字；区分官方发布与媒体报道。

## 四、技术说明

- 零依赖：无框架、无构建、无外部字体/CDN；首页“数据看板”的 KPI 与图表（行业/地区/技术标签 Top-N+其他、月度堆叠柱图、成熟度与可信等级占比、技术成熟度雷达）均由 `data/*.json` 实时计算，手写 SVG 渲染，支持悬停提示与入场动画（尊重系统“减少动态效果”设置）。
- 兼容：现代浏览器（Chrome / Edge / Safari / Firefox / 微信内置浏览器）。
- 所有外部链接以 `target="_blank" rel="noopener noreferrer"` 打开；渲染内容统一做 HTML 转义。
