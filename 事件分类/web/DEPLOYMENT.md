# 事件分类系统 Web 界面部署指南

## 快速开始

### 1. 环境要求

**后端：**
- Python 3.8+
- 已配置 Qwen API 密钥

**前端：**
- Node.js 16+
- npm 或 yarn

### 2. 后端部署

#### 2.1 安装依赖

```bash
cd web/backend
pip install -r requirements.txt
```

#### 2.2 配置环境变量

确保项目根目录的 `.env` 文件中配置了 Qwen API 密钥：

```bash
# 在项目根目录 /Users/Meng/project/事件分类/.env
DASHSCOPE_API_KEY=your_api_key_here
```

#### 2.3 启动后端服务

```bash
# 在项目根目录
cd web/backend
python main.py
```

或使用 uvicorn 直接启动：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

后端服务将在 `http://localhost:8000` 启动

**API 文档访问：**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. 前端部署

#### 3.1 安装依赖

```bash
cd web/frontend
npm install
```

#### 3.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
# VITE_API_BASE_URL=http://localhost:8000
```

#### 3.3 启动开发服务器

```bash
npm run dev
```

前端服务将在 `http://localhost:3000` 启动

#### 3.4 生产构建

```bash
npm run build
```

构建产物在 `dist` 目录，可以部署到任何静态服务器。

## 目录结构

```
web/
├── backend/                 # 后端 FastAPI 应用
│   ├── main.py             # 主程序入口
│   ├── requirements.txt    # Python 依赖
│   ├── uploads/            # 批量上传文件临时目录（自动创建）
│   └── feedback/           # 用户反馈数据存储（自动创建）
│
├── frontend/               # 前端 React 应用
│   ├── src/
│   │   ├── components/    # 共享组件
│   │   │   └── Layout/    # 布局组件
│   │   ├── pages/         # 页面组件
│   │   │   ├── SingleClassify.tsx      # 单事件分类
│   │   │   ├── BatchClassify.tsx       # 批量分类
│   │   │   ├── CategoryManagement.tsx  # 分类管理
│   │   │   ├── FewShotManagement.tsx   # Few-shot管理
│   │   │   ├── PromptManagement.tsx    # 提示词管理
│   │   │   └── Analytics.tsx           # 结果分析
│   │   ├── services/      # API 服务层
│   │   │   └── api.ts     # API 调用封装
│   │   ├── App.tsx        # 应用主组件
│   │   ├── main.tsx       # 应用入口
│   │   └── index.css      # 全局样式
│   ├── package.json       # 项目配置
│   ├── tsconfig.json      # TypeScript 配置
│   ├── vite.config.ts     # Vite 配置
│   └── index.html         # HTML 模板
│
├── README.md              # 功能说明文档
└── DEPLOYMENT.md          # 本部署指南
```

## 功能清单

### ✅ 已实现功能

1. **单事件实时分类**
   - 表单输入事件信息
   - 实时分类并显示结果
   - 置信度可视化
   - 分类结果反馈

2. **批量文件上传和处理**
   - CSV 文件上传
   - 后台异步处理
   - 实时进度显示
   - 结果下载

3. **分类配置管理**
   - 查看所有分类
   - 事件类型映射关系
   - 新增分类（接口已实现，需后续完善）

4. **Few-shot 示例管理**
   - 查看所有示例统计
   - 按分类查看示例详情
   - 新增示例（接口已实现，需后续完善）

5. **提示词管理**
   - 查看提示词结构说明
   - 提示词优化建议
   - 当前规则展示

6. **结果分析**
   - 整体统计指标
   - 分类分布图表
   - Top 分类详细数据

## 开发计划

### 待完成功能

1. **分类管理增强**
   - [ ] 实现添加新分类到配置文件
   - [ ] 分类编辑和删除功能
   - [ ] 分类启用/禁用切换

2. **Few-shot 示例管理增强**
   - [ ] 实现添加示例到 JSON 文件
   - [ ] 示例编辑和删除功能
   - [ ] 示例质量评估

3. **提示词管理增强**
   - [ ] 可视化编辑提示词模板
   - [ ] 提示词版本管理
   - [ ] A/B 测试支持

4. **结果分析增强**
   - [ ] 混淆矩阵可视化
   - [ ] 错误案例分析
   - [ ] 时间序列趋势分析

5. **系统增强**
   - [ ] 用户认证和权限管理
   - [ ] 操作日志记录
   - [ ] 数据库持久化（替换内存存储）
   - [ ] Docker 容器化部署

## 生产部署建议

### 1. 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. 使用 Gunicorn 运行后端

```bash
# 安装 gunicorn
pip install gunicorn

# 启动服务（4个工作进程）
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

### 3. 使用 systemd 管理服务

创建 `/etc/systemd/system/event-classifier.service`：

```ini
[Unit]
Description=Event Classifier Backend
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/path/to/事件分类/web/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl enable event-classifier
sudo systemctl start event-classifier
```

### 4. Docker 部署（待实现）

```dockerfile
# 后端 Dockerfile 示例
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 故障排查

### 后端无法启动

1. 检查 API 密钥是否配置
2. 检查 Python 路径是否包含项目根目录
3. 检查端口 8000 是否被占用

### 前端无法连接后端

1. 检查后端服务是否运行
2. 检查 CORS 配置
3. 检查 `.env` 中的 API 地址

### 批量分类任务失败

1. 检查 CSV 文件格式
2. 检查 uploads 目录权限
3. 查看后端日志

## 联系方式

如有问题，请查看：
- API 文档: http://localhost:8000/docs
- 项目 README: web/README.md
