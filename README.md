# 紫微斗数 · 开源排盘引擎

基于**倪海夏《天纪》**教学体系的紫微斗数排盘系统，包含完整排盘算法、四化系统、格局知识库与古籍原文数据。

线上体验：[wdyziweidoushu666.com](https://wdyziweidoushu666.com)

---

## 开源内容

### 排盘算法（`lib/ziwei/`）

| 文件 | 说明 |
|------|------|
| `algorithm.ts` | 完整排盘流程：安命宫、定五行局、安十四主星、安辅星、排大限流年 |
| `constants.ts` | 天干地支、十四主星、辅星常量 |
| `sihua.ts` | 四化飞星系统（禄权科忌），含各天干四化对照表 |
| `patterns.ts` | **1100+ 行格局知识库**：紫府同宫、日月并明、七杀朝斗等经典格局判定规则 |
| `heming-knowledge.ts` | 合盘方法论：倪师体系下双盘比对逻辑 |
| `types.ts` | TypeScript 类型定义 |
| `cities.ts` | 中国城市经纬度，用于真太阳时校正 |
| `famous.ts` | 历史名人命盘示例数据 |

### 古籍原文（`lib/classics/`）

- **骨髓赋**（`gusuifu.ts`）— 紫微斗数核心歌诀
- **紫微斗数全集**（`quanji.ts`）— 清代古本
- **紫微斗数全书**（`quanshu.ts`）— 陈希夷传本

### 前端界面（`app/` + `components/`）

完整的 Next.js 14 前端，包含：

- 排盘工作台（命盘方格、宫位详情、星曜面板）
- 合盘分析页
- 古籍阅读器（全文搜索）
- 命理百科（14 主星 + 12 宫位知识页）
- 亮色/暗色主题切换
- 移动端适配

### SEO 知识图谱（`lib/seo/`）

14 主星 × 12 宫位的结构化知识数据，可用于内容生成或知识库构建。

---

## 未包含的部分

以下属于平台运营层，不在开源范围内：

- **AI 解读 prompt**：基于倪海夏体系调教的命盘解读提示词
- **后端 API**：`/api/interpret`、`/api/heming`、`/api/generate` 等路由实现
- **用户系统**：登录、短信验证、会员、支付
- **服务端安全**：签名校验、防刷、水印
- **部署配置**：Vercel/Nginx/Docker/数据库

如果你需要 AI 解读能力，可以参考 `lib/ziwei/patterns.ts` 和 `heming-knowledge.ts` 中的知识库，结合任意 LLM 自行构建 prompt。

---

## 快速开始

```bash
# 克隆
git clone https://github.com/Renhuai123/ziwei-doushu.git
cd ziwei-doushu

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 AI API Key

# 启动开发服务器
npm run dev
```

> 注意：开源版不含后端 API 路由，AI 解读功能需要你自行实现 `/api/interpret` 等接口。排盘算法和前端界面可独立运行。

---

## 技术栈

- **框架**：Next.js 14（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS + CSS Variables 设计系统
- **排盘**：基于 [iztro](https://github.com/SylarLong/iztro) + lunar-javascript
- **动画**：Framer Motion

---

## 项目理念

紫微斗数是中国传统命理学的瑰宝，倪海夏老师在《天纪》中系统梳理了正宗的紫微斗数体系。我们希望通过技术手段让更多人接触和学习这门学问。

开源排盘算法和知识库，是因为我们相信：**算法是公开的传统智慧，不应该被锁在围墙里**。真正的价值在于解读的深度、用户体验的打磨、以及持续运营的积累。

想自己搭？代码都在这里，拿去用。嫌麻烦？来 [wdyziweidoushu666.com](https://wdyziweidoushu666.com) 直接用。

---

## 协议

MIT License

---

## 联系

- 线上平台：[wdyziweidoushu666.com](https://wdyziweidoushu666.com)
- Issues：欢迎提 Bug 和建议
