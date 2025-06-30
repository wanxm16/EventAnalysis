# 事件查询系统

## 项目概述

事件查询系统是一个基于冲突事件数据的管理和查询平台，支持事件列表展示、筛选搜索、详情查看等功能。系统采用前后端分离架构，后端使用 Python FastAPI，前端使用 React + Ant Design。

## 核心功能

### 1. 列表页面
- 展示事件编号、事件描述、镇街名称、事件级别、二级分类、上报时间、报警人信息（CallerPhone、CallerID）
- 支持分页展示
- 提供"查看详情"操作

### 2. 筛选搜索
- **搜索功能**：支持对事件编号、事件描述、处置结果、报警人电话（CallerPhone）、报警人ID（CallerID）进行模糊搜索
- **筛选功能**：支持按镇街名称、事件级别、事件分类（二级分类）进行筛选

### 3. 事件详情页
- 展示事件编号、事件描述、镇街名称、村社名称、事件级别、事件分类（二级分类）、上报时间、办结时间、处置结果
- 当 sequence_total > 1 时，展示 EventUID 和相关事件数量（N = sequence_total - 1）
- 支持跳转到 EventUID 详情页

### 4. EventUID 详情页
- 展示事件描述（Event_description）
- 显示参与人数（phone_set 字段中电话号码的数量）
- 展示事件时间线，包含事件描述和处置结果
- 计算聚类事件持续时间（最晚办结时间 - 最早上报时间）

## 技术架构

### 后端
- **框架**：FastAPI
- **数据处理**：Pandas
- **API文档**：自动生成的 Swagger UI
- **CORS**：支持跨域请求

### 前端
- **框架**：React
- **UI组件**：Ant Design
- **状态管理**：React Hooks
- **HTTP请求**：Axios
- **路由**：React Router

## 项目结构

```
事件查询/
├── data/                           # 数据文件目录
│   ├── conflict_event_detail.csv   # 事件详情数据
│   ├── conflict_event.csv         # 聚类事件数据
│   └── raw_conflict.csv           # 原始冲突数据
├── backend/                        # 后端代码
│   ├── main.py                    # FastAPI 主应用
│   ├── models.py                  # 数据模型
│   ├── services.py                # 业务逻辑
│   └── requirements.txt           # Python 依赖
├── frontend/                       # 前端代码
│   ├── src/
│   │   ├── components/            # React 组件
│   │   ├── pages/                 # 页面组件
│   │   ├── services/              # API 服务
│   │   └── App.js                 # 主应用组件
│   ├── package.json               # NPM 依赖
│   └── public/                    # 静态资源
└── README.md                      # 项目文档
```

## 环境要求

### 后端
- Python 3.8+
- pip

### 前端
- Node.js 16+
- npm 或 yarn

## 安装与运行

### 一键启动（推荐）

```bash
# 给启动脚本添加执行权限（首次使用时）
chmod +x start.sh

# 一键启动前后端服务
./start.sh
```

启动脚本会自动：
1. 检查 Python3 和 Node.js 环境
2. 安装后端和前端依赖
3. 同时启动后端和前端服务
4. 提供服务地址信息

### 手动启动

#### 1. 后端启动

```bash
# 进入后端目录
cd backend

# 安装依赖
pip3 install -r requirements.txt

# 启动服务
python3 main.py
```

后端服务将在 `http://localhost:8000` 启动，API 文档可访问 `http://localhost:8000/docs`

#### 2. 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

前端应用将在 `http://localhost:3000` 启动

### 访问地址

- **前端界面**：http://localhost:3000
- **后端API**：http://localhost:8000  
- **API文档**：http://localhost:8000/docs

## API 接口

### 事件列表
- **GET** `/api/events`
- 参数：page, page_size, search, town, level, category
- 返回：分页的事件列表

### 事件详情
- **GET** `/api/events/{event_id}`
- 返回：单个事件的详细信息

### EventUID 详情
- **GET** `/api/clusters/{event_uid}`
- 返回：聚类事件的详细信息和时间线

### 筛选选项
- **GET** `/api/filter-options`
- 返回：可用的筛选选项（镇街、级别、分类）

## 数据字段说明

### 核心字段
- **EventUID**：聚类事件唯一标识符
- **事件编号**：单个事件的编号
- **事件描述**：事件的详细描述
- **phone_set**：参与者电话号码集合
- **sequence_total**：聚类中的事件总数
- **CallerPhone**：报警人电话
- **CallerID**：报警人身份证号

### 时间字段
- **上报时间**：事件首次上报时间
- **办结时间**：事件处理完成时间

### 分类字段
- **镇街名称**：事件发生的镇街
- **村社名称**：事件发生的村社
- **事件级别**：事件的重要性级别
- **二级分类**：事件的细分类别

## 开发说明

### 数据处理
系统使用 Pandas 处理 CSV 数据文件，支持：
- 数据清洗和格式化
- 复杂查询和筛选
- 数据聚合和统计

### 前端组件
主要组件包括：
- EventList：事件列表组件
- EventDetail：事件详情组件
- ClusterDetail：聚类事件详情组件
- SearchFilter：搜索筛选组件

### 状态管理
使用 React Hooks 管理组件状态，包括：
- 列表数据状态
- 搜索筛选状态
- 分页状态
- 加载状态

## 注意事项

1. **数据隐私**：报警人电话和身份证号已进行脱敏处理
2. **性能优化**：大数据量时采用分页加载
3. **错误处理**：完善的前后端错误处理机制
4. **兼容性**：支持现代浏览器，推荐使用 Chrome 或 Firefox

## 更新日志

- v1.0.0：初始版本，包含基础的事件查询功能
- 支持事件列表、详情查看、筛选搜索
- 实现聚类事件时间线展示

## 技术支持

如有问题请查看：
1. API 文档：`http://localhost:8000/docs`
2. 控制台日志：检查浏览器开发者工具
3. 服务器日志：查看后端控制台输出 