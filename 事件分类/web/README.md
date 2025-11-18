# 事件分类系统 Web 界面

## 📋 项目说明

基于 React + Ant Design + FastAPI 的事件分类系统Web界面

### 功能列表

✅ **1. 单事件实时分类**
- 输入事件描述、事件类型等信息
- 实时获取分类结果和置信度

✅ **2. 批量文件上传和处理**
- 上传CSV文件进行批量分类
- 实时显示处理进度
- 下载分类结果

✅ **3. 分类进度显示**
- 进度条显示处理进度
- 实时更新已处理数量

✅ **4. 结果修正反馈**
- 对错误的分类结果进行修正
- 反馈数据用于模型改进

✅ **5. 分类管理**
- 查看所有二级分类
- 新增分类（配置事件类型映射）
- 启用/禁用分类

✅ **6. Few-shot示例配置**
- 查看/编辑每个分类的示例
- 添加新示例
- 示例质量评估

✅ **7. 提示词配置**
- 查看当前提示词模板
- 自定义提示词模板
- 测试不同提示词效果

✅ **8. 结果分析**
- 分类统计Dashboard
- 准确率趋势图
- 混淆矩阵可视化
- 错误案例分析

---

## 🚀 快速开始

### 后端启动

```bash
cd web/backend

# 安装依赖
pip install -r requirements.txt

# 启动FastAPI服务器
python main.py

# 或使用uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

访问 API 文档：http://localhost:8000/docs

### 前端启动

```bash
cd web/frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

访问前端：http://localhost:3000

---

## 📁 项目结构

```
web/
├── backend/                    # 后端 FastAPI
│   ├── main.py                # 主程序入口
│   ├── requirements.txt       # Python依赖
│   ├── uploads/               # 上传文件临时目录
│   └── feedback/              # 用户反馈数据
│
└── frontend/                  # 前端 React
    ├── public/
    ├── src/
    │   ├── components/        # 组件
    │   │   ├── SingleClassify/      # 单事件分类
    │   │   ├── BatchClassify/       # 批量分类
    │   │   ├── CategoryManage/      # 分类管理
    │   │   ├── FewShotManage/       # Few-shot管理
    │   │   ├── PromptManage/        # 提示词管理
    │   │   └── Analytics/           # 结果分析
    │   ├── services/          # API服务
    │   ├── App.tsx            # 主应用
    │   └── index.tsx          # 入口文件
    └── package.json
```

---

## 🔌 API 接口文档

### 1. 单事件分类
```http
POST /api/classify/single
Content-Type: application/json

{
  "event_description": "居民反映小区业主房子涉嫌违建",
  "event_type": "矛盾纠纷",
  "district": "海曙区",
  "street": "高桥镇"
}

Response:
{
  "predicted_category": "建筑类纠纷",
  "confidence": 0.92,
  "timestamp": "2025-10-17T10:30:00"
}
```

### 2. 批量分类
```http
POST /api/classify/batch
Content-Type: multipart/form-data

file: events.csv

Response:
{
  "task_id": "uuid-xxx",
  "message": "批量分类任务已创建"
}
```

### 3. 查询批量任务状态
```http
GET /api/classify/batch/{task_id}

Response:
{
  "task_id": "uuid-xxx",
  "status": "processing",  // pending/processing/completed/failed
  "total": 1000,
  "processed": 500,
  "success_count": 480,
  "results": [...]  // 完成后返回
}
```

### 4. 提交反馈
```http
POST /api/feedback
Content-Type: application/json

{
  "event_description": "...",
  "event_type": "...",
  "predicted_category": "错误分类",
  "correct_category": "正确分类",
  "confidence": 0.85
}
```

### 5. 获取所有分类
```http
GET /api/categories

Response:
{
  "categories": ["分类1", "分类2", ...],
  "total": 145
}
```

### 6. 获取Few-shot示例
```http
GET /api/few-shot/{category}

Response:
{
  "category": "消费纠纷",
  "examples": [
    {
      "事件描述": "...",
      "事件类型": "...",
      "二级分类": "消费纠纷"
    }
  ]
}
```

### 7. 获取分析数据
```http
GET /api/analytics/summary

Response:
{
  "total_predictions": 5000,
  "accuracy": 0.629,
  "avg_confidence": 0.899,
  "category_distribution": {...}
}
```

---

## 🎨 前端页面设计

### 主布局
```
┌─────────────────────────────────────────┐
│  Logo    事件分类系统                    │
├─────────┬───────────────────────────────┤
│         │                               │
│ 📊 首页 │                               │
│ 🔍 单事件│      页面内容区               │
│ 📁 批量  │                               │
│ ⚙️  分类 │                               │
│ 📝 Few   │                               │
│ 💬 提示词│                               │
│ 📈 分析  │                               │
│         │                               │
└─────────┴───────────────────────────────┘
```

### 1. 单事件分类页面

```tsx
组件：SingleClassify.tsx

布局：
┌──────────────────────────────────┐
│  单事件分类                       │
├──────────────────────────────────┤
│  事件描述： [文本框 - 多行]      │
│  事件类型： [下拉选择]           │
│  区县名称： [输入框]             │
│  镇街名称： [输入框]             │
│                                   │
│         [开始分类] 按钮           │
├──────────────────────────────────┤
│  分类结果：                       │
│  ┌────────────────────────────┐ │
│  │ 预测分类：消费纠纷         │ │
│  │ 置信度：  92.3%            │ │
│  │ 时间：    2025-10-17       │ │
│  │                            │ │
│  │ [结果正确] [结果错误→修正] │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
```

### 2. 批量分类页面

```tsx
组件：BatchClassify.tsx

布局：
┌──────────────────────────────────┐
│  批量分类                         │
├──────────────────────────────────┤
│  📤 上传CSV文件                   │
│  ┌────────────────────────────┐ │
│  │  拖拽文件到此处            │ │
│  │  或点击上传                │ │
│  └────────────────────────────┘ │
│                                   │
│  [开始批量分类] 按钮              │
├──────────────────────────────────┤
│  处理进度：                       │
│  ████████░░  80%                 │
│  已处理：800 / 1000              │
│  成功：  780                     │
├──────────────────────────────────┤
│  结果列表（表格）                 │
│  序号 | 描述 | 预测 | 置信度     │
│  1   | ... | 消费  | 92%        │
│  2   | ... | 劳动  | 88%        │
│                                   │
│  [下载结果CSV] [导出Excel]       │
└──────────────────────────────────┘
```

### 3. 分类管理页面

```tsx
组件：CategoryManage.tsx

布局：
┌──────────────────────────────────┐
│  分类管理          [+ 新增分类]  │
├──────────────────────────────────┤
│  🔍 搜索： [搜索框]              │
├──────────────────────────────────┤
│  分类列表（表格）                 │
│  分类名称    | 事件类型 | 状态   │
│  消费纠纷    | 矛盾纠纷 | ✅启用 │
│  劳动纠纷    | 矛盾纠纷 | ✅启用 │
│  街面秩序    | 城市管理 | ❌禁用 │
│                                   │
│  [编辑] [删除] [启用/禁用]       │
└──────────────────────────────────┘

新增分类弹窗：
┌──────────────────────────────────┐
│  新增分类                    [×] │
├──────────────────────────────────┤
│  分类名称：[输入框]              │
│  适用事件类型：                   │
│    ☑ 矛盾纠纷                    │
│    ☐ 城市管理                    │
│    ☐ 安全生产                    │
│                                   │
│  描述：[文本框]                  │
│                                   │
│         [取消] [确定]            │
└──────────────────────────────────┘
```

### 4. Few-shot示例管理

```tsx
组件：FewShotManage.tsx

布局：
┌──────────────────────────────────┐
│  Few-shot示例管理                │
├──────────────────────────────────┤
│  选择分类：[下拉选择 - 消费纠纷] │
├──────────────────────────────────┤
│  当前示例（5个）      [+ 添加]   │
│  ┌────────────────────────────┐ │
│  │ 示例1：                    │ │
│  │ 事件描述：网约车收费不合理 │ │
│  │ 事件类型：矛盾纠纷         │ │
│  │ [编辑] [删除]              │ │
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │ 示例2：                    │ │
│  │ ...                        │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
```

### 5. 提示词管理

```tsx
组件：PromptManage.tsx

布局：
┌──────────────────────────────────┐
│  提示词模板管理                   │
├──────────────────────────────────┤
│  选择模板：[基础提示词 ▼]        │
│                                   │
│  变量说明：                       │
│  • {event_description} - 事件描述│
│  • {event_type} - 事件类型       │
│  • {valid_categories} - 候选分类 │
├──────────────────────────────────┤
│  模板内容：                       │
│  ┌────────────────────────────┐ │
│  │ 你是一个专业的事件分类专家 │ │
│  │                            │ │
│  │ 当前事件类型：{event_type} │ │
│  │ 事件描述：{event_descrip.} │ │
│  │                            │ │
│  │ 候选分类：{valid_categor.} │ │
│  │                            │ │
│  │ [编辑模式]                 │ │
│  └────────────────────────────┘ │
│                                   │
│  [测试提示词] [保存] [重置]      │
└──────────────────────────────────┘
```

### 6. 结果分析页面

```tsx
组件：Analytics.tsx

布局：
┌──────────────────────────────────┐
│  数据分析看板                     │
├──────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  │总数│ │准确│ │置信│ │成功│   │
│  │5000│ │62% │ │89% │ │99% │   │
│  └────┘ └────┘ └────┘ └────┘   │
├──────────────────────────────────┤
│  准确率趋势图                     │
│  ┌────────────────────────────┐ │
│  │   📈                       │ │
│  │  65%│        ╱             │ │
│  │  60%│    ╱                 │ │
│  │  55%│╱                     │ │
│  │     └─────────────────────  │
│  │     1月  2月  3月  4月  5月│ │
│  └────────────────────────────┘ │
├──────────────────────────────────┤
│  分类分布（饼图）  | 混淆矩阵     │
│  ┌────────┐       │ ┌─────────┐ │
│  │  📊   │       │ │ 热力图  │ │
│  │       │       │ │         │ │
│  └────────┘       │ └─────────┘ │
└──────────────────────────────────┘
```

---

## 💻 核心代码示例

### 前端服务层 (src/services/api.ts)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface SingleEventRequest {
  event_description: string;
  event_type: string;
  district?: string;
  street?: string;
}

export interface SingleEventResponse {
  predicted_category: string;
  confidence: number;
  timestamp: string;
}

export const classifyAPI = {
  // 单事件分类
  classifySingle: (data: SingleEventRequest) =>
    api.post<SingleEventResponse>('/api/classify/single', data),

  // 批量分类
  classifyBatch: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/classify/batch', formData);
  },

  // 查询批量任务状态
  getBatchStatus: (taskId: string) =>
    api.get(`/api/classify/batch/${taskId}`),

  // 提交反馈
  submitFeedback: (data: any) =>
    api.post('/api/feedback', data),
};

export const configAPI = {
  // 获取所有分类
  getCategories: () => api.get('/api/categories'),

  // 获取事件类型
  getEventTypes: () => api.get('/api/event-types'),

  // 获取分类映射
  getCategoryMapping: () => api.get('/api/categories/mapping'),
};

export const fewShotAPI = {
  // 获取Few-shot示例
  getExamples: (category?: string) =>
    category
      ? api.get(`/api/few-shot/${category}`)
      : api.get('/api/few-shot'),

  // 添加示例
  addExample: (data: any) =>
    api.post('/api/few-shot', data),
};

export const analyticsAPI = {
  // 获取分析摘要
  getSummary: () => api.get('/api/analytics/summary'),

  // 获取混淆矩阵
  getConfusionMatrix: () => api.get('/api/analytics/confusion'),
};
```

---

## 🎯 开发计划

### 阶段1：核心功能（1周）
- [x] 后端API框架
- [ ] 单事件分类页面
- [ ] 批量分类页面
- [ ] 基础Layout和路由

### 阶段2：配置管理（1周）
- [ ] 分类管理页面
- [ ] Few-shot管理页面
- [ ] 提示词管理页面

### 阶段3：分析与优化（1周）
- [ ] 结果分析Dashboard
- [ ] 反馈机制
- [ ] 性能优化

---

## 📝 部署说明

### Docker部署（推荐）

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./results:/app/results
    environment:
      - QWEN_API_KEY=${QWEN_API_KEY}

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

运行：
```bash
docker-compose up -d
```

---

## 🔧 配置说明

### 后端配置

修改 `config/config.py` 中的API密钥等配置

### 前端配置

修改 `frontend/src/config.ts`:
```typescript
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

---

## 📞 技术支持

如有问题，请查看：
- API文档：http://localhost:8000/docs
- 项目仓库：...
- 联系方式：...

