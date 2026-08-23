# 部署与GitHub发布指南

## 推荐部署形态

当前MVP使用SQLite，因此最适合部署为“单个长期运行的Docker容器 + 持久化磁盘”。容器必须把持久化目录挂载到 `/app/data`。

不建议直接把当前SQLite版本部署到无持久化文件系统的Serverless平台。若计划使用此类平台，应先迁移到托管PostgreSQL。

## 上线前环境变量

至少配置：

```dotenv
DATABASE_URL="file:/app/data/talent-copilot.db"
LLM_PROVIDER="openai-compatible"
LLM_API_KEY="your-deepseek-api-key"
LLM_BASE_URL="https://api.deepseek.com"
LLM_MODEL="deepseek-chat"
APP_ACCESS_CODE="replace-with-a-private-access-code"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_COOKIE_SECURE="true"
```

生成随机认证密钥的PowerShell示例：

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

不要把上述真实值写入README、Dockerfile、`docker-compose.yml`或Git提交。

## 本地Docker验证

安装Docker Desktop后，在项目根目录执行：

```powershell
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://localhost:3000/api/health
```

健康检查应返回 `ok: true` 和 `database: connected`。停止服务：

```powershell
docker compose down
```

不要使用 `docker compose down -v`，除非明确希望删除SQLite数据卷。

## 云平台通用配置

无论选择哪一家支持Docker的云平台，都需要确认：

1. 构建来源指向仓库根目录的 `Dockerfile`；
2. 服务端口为 `3000`；
3. 持久化磁盘挂载点为 `/app/data`；
4. 健康检查路径为 `/api/health`；
5. 上述敏感变量通过平台Secrets功能注入；
6. HTTPS域名下设置 `AUTH_COOKIE_SECURE=true`；
7. 首次上线仅使用虚构Demo数据，并启用访问码。

## 初始化Git仓库并发布到GitHub

当前交付目录默认不替用户创建提交历史。确认项目内容和Git身份后，在项目根目录执行：

```powershell
git init
git add .
git status
git commit -m "feat: release AI Talent Copilot portfolio"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/ai-talent-copilot.git
git push -u origin main
```

执行 `git add` 后、提交前必须检查 `git status`，确保以下内容没有出现：

- `.env` 或 `.env.local`；
- `prisma/dev.db`；
- 真实简历、候选人信息或招聘数据；
- API Key、访问码和认证密钥；
- `node_modules`、`.next` 和本地日志。

## GitHub仓库首页建议

- 仓库描述：`AI-assisted recruiting workflow for JD analysis, resume matching, interview preparation and funnel diagnostics.`
- Topics：`nextjs`、`typescript`、`hrtech`、`ai`、`recruiting`、`deepseek`、`prisma`；
- 将README中的首页截图保留在首屏之后；
- 在About区域补充在线Demo地址；
- 发布 `v0.4.0` Release，并上传安全检查后的ZIP；
- 不要在公开Issue中提交候选人数据，安全问题使用GitHub Security Advisory。

## 上线后验收

1. 未登录访问业务页面会跳转到 `/login`；
2. `/api/health` 可被平台健康检查访问，但不泄露模型配置；
3. 错误访问码不能登录，正确访问码会写入HttpOnly Cookie；
4. JD、简历、匹配、面试和漏斗全链路可运行；
5. 重启容器后职位、候选人和漏斗快照仍存在；
6. 浏览器开发者工具中看不到API Key；
7. 日志不打印简历正文、密钥或完整模型请求。
