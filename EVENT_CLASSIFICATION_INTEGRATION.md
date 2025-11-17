# 事件智能分类功能集成说明

## 概述

事件智能分类功能已成功集成到海曙区社会治理中心事件分析系统中。该功能基于千问大模型，支持对事件进行智能的二级分类预测，支持145个分类类别。

## 功能特性

- ✅ **单事件实时分类**：输入事件描述，实时获取分类结果
- ✅ **批量文件分类**：支持CSV文件批量上传和处理
- ✅ **事件类型限制**：根据一级分类自动限定二级分类范围
- ✅ **智能别名映射**：自动处理模型输出的非标准名称
- ✅ **5层智能匹配**：别名映射+关键词匹配+相似度匹配
- ✅ **分类反馈机制**：支持提交错误分类的反馈

## 已集成的组件

### 后端

1. **分类器模块** (`backend/qwen_classifier.py`)
   - 千问API调用封装
   - Few-shot示例管理
   - 5层智能匹配算法
   - 批量分类并发处理

2. **数据模型** (`backend/models.py`)
   - `ClassifySingleRequest/Response` - 单事件分类
   - `ClassifyBatchTaskResponse/StatusResponse` - 批量分类
   - `ClassificationFeedback` - 分类反馈
   - `CategoryListResponse` - 分类列表
   - `FewShotExamplesResponse` - Few-shot示例
   - `ClassificationStatsResponse` - 分类统计

3. **API接口** (`backend/main.py`)
   - `POST /api/classify/single` - 单事件分类
   - `POST /api/classify/batch` - 批量分类上传
   - `GET /api/classify/batch/{task_id}` - 查询批量任务状态
   - `POST /api/classify/feedback` - 提交分类反馈
   - `GET /api/classify/categories` - 获取所有分类
   - `GET /api/classify/few-shot/{category}` - 获取Few-shot示例
   - `GET /api/classify/stats` - 获取分类统计

### 前端

1. **分类页面**
   - **单个事件分类** (`frontend/src/pages/EventClassification.js`)
     - 单事件分类表单
     - 实时分类结果展示
     - 置信度和分类依据显示
   - **批量分类** (`frontend/src/pages/BatchClassification.js`)
     - CSV文件拖拽上传
     - 批量任务进度跟踪
     - 分类结果预览和下载
   - **定义分类** (`frontend/src/pages/CategoryManagement.js`)
     - 事件类型与二级分类映射关系展示
     - 树形结构表格显示
     - 分类统计信息

2. **路由配置** (`frontend/src/App.js`)
   - `/event-classification` - 单个事件分类
   - `/event-classification/batch` - 批量分类
   - `/event-classification/categories` - 定义分类
   - 所有路由均为受保护路由，需要登录

3. **导航菜单** (`frontend/src/components/Layout.js`)
   - 下拉菜单: "智能分类"
   - 图标: ThunderboltOutlined
   - 子菜单:
     - 单个事件分类
     - 批量分类
     - 定义分类

### 数据文件

配置文件位于 `data/classification/` 目录：

- `few_shot_examples.json` - Few-shot示例库（每个分类5个示例）
- `event_type_category_mapping.json` - 事件类型到二级分类的映射
- `category_aliases.json` - 分类别名映射表

## 配置说明

### 1. 环境变量配置

在系统启动前，需要配置千问API密钥。可以通过以下方式之一配置：

**方式一：环境变量**

```bash
export QWEN_API_KEY="your-api-key-here"
export QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"  # 可选
export QWEN_MODEL="qwen-plus"  # 可选
```

**方式二：创建 .env 文件**

在项目根目录创建 `.env` 文件：

```bash
QWEN_API_KEY=your-api-key-here
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
QWEN_TEMPERATURE=0.1
QWEN_MAX_TOKENS=1000
QWEN_TIMEOUT=30
QWEN_MAX_RETRIES=3
```

### 2. 获取千问API密钥

1. 访问阿里云百炼平台：https://bailian.console.aliyun.com/
2. 申请千问模型API密钥
3. 将密钥填入环境变量或.env文件

### 3. 安装依赖

后端已添加 `requests` 依赖，重新安装即可：

```bash
cd backend
pip install -r requirements.txt
```

## 使用方法

### 1. 启动系统

```bash
# 使用一键启动脚本
./start.sh

# 或分别启动
cd backend && python3 main.py
cd frontend && npm start
```

### 2. 访问分类功能

#### 2.1 单个事件分类

1. 登录系统（默认账号: admin/admin）
2. 点击顶部导航栏的"智能分类" → "单个事件分类"
3. 在表单中填写：
   - 事件描述（必填，建议20-200字）
   - 事件类型（必填，一级分类）
   - 区县名称（可选）
   - 镇街名称（可选）
4. 点击"开始智能分类"按钮
5. 等待几秒后查看分类结果

#### 2.2 批量分类

1. 准备CSV文件（格式见下方说明）
2. 点击"智能分类" → "批量分类"
3. 拖拽或点击上传CSV文件
4. 系统自动开始处理，显示进度
5. 处理完成后可查看结果预览
6. 点击"下载分类结果"获取完整结果CSV

#### 2.3 查看分类定义

1. 点击"智能分类" → "定义分类"
2. 查看29种事件类型及其对应的二级分类
3. 可展开每个事件类型查看详细分类列表
4. 显示统计信息：事件类型总数、二级分类总数

### 3. API调用示例

**单事件分类：**

```bash
curl -X POST http://localhost:8000/api/classify/single \
  -H "Content-Type: application/json" \
  -d '{
    "event_description": "居民反映小区业主房子涉嫌违建",
    "event_type": "矛盾纠纷"
  }'
```

**批量分类：**

```bash
# 1. 上传CSV文件
curl -X POST http://localhost:8000/api/classify/batch \
  -F "file=@events.csv"

# 返回：{"task_id": "xxx", "message": "批量分类任务已创建", "total": 100}

# 2. 查询任务状态
curl http://localhost:8000/api/classify/batch/xxx
```

**CSV文件格式要求：**

```csv
事件描述,事件类型,区县名称,镇街名称
居民反映小区业主房子涉嫌违建,矛盾纠纷,海曙区,高桥镇
网约车收费不合理引发纠纷,矛盾纠纷,海曙区,
小区电动车违规充电,消防安全,海曙区,鼓楼街道
```

## 性能指标

根据事件分类系统的测试结果：

- **准确率**：54-56%（全量数据）
- **预测成功率**：99.95%+
- **平均置信度**：0.80-0.95
- **支持分类数**：145个二级分类
- **事件类型数**：29种一级分类
- **处理速度**：单事件约2-3秒

## 注意事项

### 1. API成本

- 每次分类调用千问API会产生费用
- 建议先用少量数据测试
- 批量分类会消耗较多API调用次数

### 2. 数据要求

- 事件描述建议20-200字，越详细越准确
- 必须提供事件类型（一级分类）
- 事件描述不能为空

### 3. 性能优化

- 分类器采用延迟初始化，首次调用会较慢
- 批量分类采用异步处理，不阻塞请求
- 分类结果会缓存在内存中

### 4. 故障排查

**问题1：分类失败，提示API密钥未配置**
```bash
# 检查环境变量
echo $QWEN_API_KEY

# 或查看.env文件
cat .env

# 重新设置
export QWEN_API_KEY="your-key"
```

**问题2：分类结果不准确**
- 检查事件描述是否详细
- 确认事件类型选择是否正确
- 查看data/classification/目录下的配置文件是否存在

**问题3：批量分类任务一直pending**
- 查看后端日志：`tail -f backend.log`
- 检查API密钥是否有效
- 确认网络连接正常

## 进一步优化

### 1. 添加更多高级功能页面

已完成：
- ✅ `BatchClassification.js` - 批量分类页面
- ✅ `CategoryManagement.js` - 分类定义查看页面

可选添加（参考 `事件分类/web/frontend/src/pages/`）：
- `FewShotManagement.tsx` - Few-shot示例管理（编辑和优化示例）
- `PromptManagement.tsx` - 提示词管理（调整分类提示词）
- `Analytics.tsx` - 分类分析Dashboard（准确率趋势、热力图等）

### 2. 优化Few-shot示例

编辑 `data/classification/few_shot_examples.json`：
- 为每个分类添加更多优质示例
- 确保示例描述详细且具有代表性
- 定期根据反馈数据更新示例

### 3. 添加新的分类别名

编辑 `data/classification/category_aliases.json`：

```json
{
  "占道经营": "街面秩序",
  "租赁纠纷": "债务纠纷",
  "新的别名": "标准分类名称"
}
```

### 4. 调整事件类型映射

编辑 `data/classification/event_type_category_mapping.json`：

```json
{
  "矛盾纠纷": ["债务纠纷", "劳动人事纠纷", "..."],
  "城市管理": ["街面秩序", "市容环境", "..."],
  "新事件类型": ["分类1", "分类2", "..."]
}
```

## 技术架构

```
┌─────────────────────────────────────────┐
│           前端 (React)                  │
│  EventClassification.js                 │
│  - 表单输入                             │
│  - 结果展示                             │
└──────────────┬──────────────────────────┘
               │ HTTP POST/GET
               ▼
┌─────────────────────────────────────────┐
│           后端 (FastAPI)                │
│  /api/classify/*                        │
│  - 请求验证                             │
│  - 数据处理                             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      QwenClassifier                     │
│  - 提示词构建                           │
│  - API调用                              │
│  - 结果匹配                             │
└──────────────┬──────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────┐
│      千问API (阿里云)                   │
│  qwen-plus model                        │
│  - Few-shot学习                         │
│  - 分类预测                             │
└─────────────────────────────────────────┘
```

## 相关文档

- **原始系统文档**：`事件分类/README.md`
- **详细运行指南**：`事件分类/如何运行.md`
- **优化建议**：`事件分类/优化建议报告.md`
- **完整文档**：`事件分类/docs/` 目录（27篇详细文档）

## 联系支持

如有问题或需要进一步的帮助，请参考：
- 原始事件分类系统的文档
- FastAPI自动生成的API文档：http://localhost:8000/docs
- 千问API文档：https://help.aliyun.com/zh/model-studio/

---

**集成完成时间**: 2025-11-17
**集成版本**: v1.0
