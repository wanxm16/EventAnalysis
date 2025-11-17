# 月度报告功能产品需求文档

## 1. 项目概述

### 1.1 项目背景
事件管理系统已积累了大量的事件数据，需要建立月度报告机制，帮助管理者定期了解事件趋势、处置效率、热点问题等关键指标，为决策提供数据支撑。

### 1.2 产品目标
- 提供自动化的月度数据统计和分析能力
- 生成标准化的月度报告，减少人工统计工作量
- 通过数据可视化展示事件管理的关键指标和趋势
- 支持报告的自定义配置和导出功能

### 1.3 目标用户
- **系统管理员**：负责系统整体运营，需要全局数据分析
- **区域管理者**：关注特定区域的事件处理情况
- **决策层领导**：需要汇总性的分析报告用于决策

## 2. 需求分析

### 2.1 功能需求

#### 2.1.1 报告生成功能
- **自动生成**：系统每月1日自动生成上月报告
- **手动生成**：用户可手动选择任意月份生成报告
- **实时预览**：生成过程中可实时查看报告内容
- **模板管理**：支持多种报告模板，可自定义配置

#### 2.1.2 数据统计维度
- **事件总览**：总数、同比/环比增长率、处置率
- **时间维度**：按日、周、月的事件分布趋势
- **空间维度**：按镇街、村社的事件分布热力图
- **分类维度**：按事件级别、二级分类的统计分析
- **处置效率**：平均处置时长、及时处置率、超时率
- **热点分析**：高频关键词、热点区域、问题趋势

#### 2.1.3 可视化图表
- **趋势图**：事件数量时间趋势线图
- **饼图**：事件级别、分类占比分析
- **柱状图**：各镇街事件数量对比
- **热力图**：地理位置事件分布密度
- **表格**：详细数据统计表格

#### 2.1.4 报告管理
- **报告列表**：显示所有历史报告，支持筛选和搜索
- **报告详情**：查看报告完整内容
- **报告导出**：支持PDF、Word、Excel格式导出
- **报告分享**：生成分享链接，支持权限控制

### 2.2 非功能需求

#### 2.2.1 性能要求
- 报告生成时间不超过30秒（万条数据以内）
- 支持并发生成多个报告
- 图表渲染流畅，无明显卡顿

#### 2.2.2 可用性要求
- 界面简洁直观，操作流程清晰
- 支持移动端查看（响应式设计）
- 提供操作引导和帮助文档

#### 2.2.3 兼容性要求
- 支持主流浏览器（Chrome、Firefox、Safari、Edge）
- 导出的文件格式兼容主流办公软件

## 3. 功能设计

### 3.1 页面结构

```
报告管理
├── 报告列表页
│   ├── 报告搜索和筛选
│   ├── 报告状态显示
│   └── 操作按钮（查看、导出、删除）
├── 报告生成页
│   ├── 月份选择器
│   ├── 报告模板选择
│   ├── 自定义配置选项
│   └── 生成按钮
├── 报告详情页
│   ├── 报告基本信息
│   ├── 数据统计概览
│   ├── 图表展示区域
│   └── 导出/分享功能
└── 报告模板管理页
    ├── 模板列表
    ├── 模板编辑器
    └── 模板预览
```

### 3.2 核心功能流程

#### 3.2.1 自动报告生成流程
1. 系统定时任务每月1日凌晨2点执行
2. 获取上月1日至月末的所有事件数据
3. 按预设模板进行数据统计和分析
4. 生成图表和可视化内容
5. 保存报告到数据库
6. 发送通知给相关用户

#### 3.2.2 手动报告生成流程
1. 用户进入报告生成页面
2. 选择目标月份和报告模板
3. 配置报告参数（可选）
4. 点击生成按钮
5. 系统后台处理数据
6. 生成完成后跳转到报告详情页

#### 3.2.3 报告查看和导出流程
1. 用户在报告列表中选择目标报告
2. 点击查看进入报告详情页
3. 浏览报告内容和图表
4. 选择导出格式（PDF/Word/Excel）
5. 系统生成导出文件
6. 用户下载导出文件

### 3.3 数据模型设计

#### 3.3.1 报告主表 (reports)
```sql
CREATE TABLE reports (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,           -- 报告标题
    report_month VARCHAR(7) NOT NULL,      -- 报告月份 (YYYY-MM)
    template_id VARCHAR(50),               -- 模板ID
    status ENUM('generating', 'completed', 'failed') DEFAULT 'generating',
    summary TEXT,                          -- 报告摘要
    created_by VARCHAR(50),                -- 创建人
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    file_path VARCHAR(500),                -- 导出文件路径
    INDEX idx_month (report_month),
    INDEX idx_status (status)
);
```

#### 3.3.2 报告数据表 (report_data)
```sql
CREATE TABLE report_data (
    id VARCHAR(50) PRIMARY KEY,
    report_id VARCHAR(50) NOT NULL,
    section VARCHAR(100) NOT NULL,         -- 数据分组（overview, trend, spatial等）
    data_type VARCHAR(50) NOT NULL,        -- 数据类型（chart, table, text）
    data_content JSON NOT NULL,            -- 数据内容
    sort_order INT DEFAULT 0,              -- 排序顺序
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    INDEX idx_report_section (report_id, section)
);
```

#### 3.3.3 报告模板表 (report_templates)
```sql
CREATE TABLE report_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,            -- 模板名称
    description TEXT,                      -- 模板描述
    config JSON NOT NULL,                  -- 模板配置
    is_default BOOLEAN DEFAULT FALSE,      -- 是否为默认模板
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.4 API接口设计

#### 3.4.1 报告列表接口
```
GET /api/reports
参数：
- page: 页码
- page_size: 每页数量
- month: 筛选月份
- status: 报告状态
- keyword: 搜索关键词

响应：
{
    "reports": [
        {
            "id": "report_id",
            "title": "2024年1月事件管理月度报告",
            "report_month": "2024-01",
            "status": "completed",
            "created_at": "2024-02-01T02:00:00Z",
            "summary": "本月共处理事件1234件..."
        }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
}
```

#### 3.4.2 生成报告接口
```
POST /api/reports/generate
参数：
{
    "month": "2024-01",
    "template_id": "template_id",
    "title": "自定义报告标题",
    "config": {
        "include_charts": true,
        "include_details": true,
        "regions": ["all"]
    }
}

响应：
{
    "report_id": "new_report_id",
    "status": "generating",
    "estimated_time": 30
}
```

#### 3.4.3 报告详情接口
```
GET /api/reports/{report_id}
响应：
{
    "id": "report_id",
    "title": "报告标题",
    "report_month": "2024-01",
    "status": "completed",
    "sections": [
        {
            "name": "概览统计",
            "type": "overview",
            "data": {
                "total_events": 1234,
                "growth_rate": 5.6,
                "resolution_rate": 95.2
            }
        },
        {
            "name": "趋势分析",
            "type": "chart",
            "chart_type": "line",
            "data": [...]
        }
    ]
}
```

#### 3.4.4 报告导出接口
```
POST /api/reports/{report_id}/export
参数：
{
    "format": "pdf", // pdf, word, excel
    "options": {
        "include_charts": true,
        "include_raw_data": false
    }
}

响应：
{
    "download_url": "/api/downloads/report_20240101.pdf",
    "expires_at": "2024-01-02T00:00:00Z"
}
```

## 4. 技术实现

### 4.1 技术栈
- **前端**：React + Ant Design + ECharts
- **后端**：Python FastAPI + SQLAlchemy
- **数据库**：MySQL 8.0
- **文件处理**：ReportLab (PDF) + python-docx (Word) + openpyxl (Excel)
- **任务调度**：Celery + Redis

### 4.2 关键技术点

#### 4.2.1 数据统计算法
- 使用SQL聚合查询进行基础统计
- 实现移动平均、同比环比计算
- 支持多维度交叉分析

#### 4.2.2 图表生成
- 前端使用ECharts生成交互式图表
- 导出时使用无头浏览器截图或服务端渲染

#### 4.2.3 文件导出
- PDF：使用ReportLab生成专业报告格式
- Word：使用python-docx创建可编辑文档
- Excel：使用openpyxl生成数据表格

#### 4.2.4 异步处理
- 使用Celery处理耗时的报告生成任务
- WebSocket推送生成进度给前端
- 任务队列管理和错误恢复

## 5. 界面设计要求

### 5.1 设计原则
- **清晰性**：信息层次分明，重点突出
- **一致性**：遵循系统整体设计风格
- **易用性**：操作流程简单直观
- **专业性**：报告展示格式专业正式

### 5.2 关键页面设计

#### 5.2.1 报告列表页
- 卡片式布局展示报告缩略信息
- 支持列表/网格切换视图
- 筛选器固定在顶部
- 状态用不同颜色标识

#### 5.2.2 报告详情页
- 左侧导航树展示报告章节
- 右侧主区域展示内容
- 图表支持全屏查看
- 导出按钮固定在右上角

#### 5.2.3 报告生成页
- 向导式步骤引导
- 实时预览配置效果
- 进度条显示生成状态
- 支持后台生成

### 5.3 移动端适配
- 报告列表页完全适配移动端
- 报告详情页支持手势操作
- 图表支持触摸交互
- 简化导出流程

## 6. 测试计划

### 6.1 功能测试
- 报告生成功能完整性测试
- 数据统计准确性验证
- 导出文件格式兼容性测试
- 权限控制功能测试

### 6.2 性能测试
- 大数据量报告生成性能测试
- 并发用户访问压力测试
- 图表渲染性能测试
- 文件导出性能测试

### 6.3 兼容性测试
- 多浏览器兼容性测试
- 移动端设备兼容性测试
- 导出文件在不同软件中的兼容性测试

## 7. 上线计划

### 7.1 开发阶段
- **第1周**：数据模型设计和API开发
- **第2周**：后端报告生成逻辑实现
- **第3周**：前端页面开发
- **第4周**：图表和导出功能实现
- **第5周**：测试和优化

### 7.2 测试阶段
- **第6周**：功能测试和Bug修复
- **第7周**：性能测试和优化
- **第8周**：用户验收测试

### 7.3 上线阶段
- **第9周**：灰度发布
- **第10周**：全量上线
- **第11周**：运行监控和优化

## 8. 风险评估

### 8.1 技术风险
- **大数据量处理**：月度数据可能很大，需要优化查询性能
- **文件生成稳定性**：导出功能需要处理各种异常情况
- **并发问题**：多用户同时生成报告可能导致资源竞争

### 8.2 业务风险
- **数据准确性**：统计算法错误可能导致决策失误
- **模板灵活性**：固定模板可能无法满足不同用户需求
- **权限控制**：敏感数据需要严格的访问控制

### 8.3 风险应对措施
- 建立完善的数据校验机制
- 实现模板自定义功能
- 加强权限管理和数据脱敏
- 建立备份和恢复机制

## 9. 后续规划

### 9.1 功能扩展
- 支持周报、季报、年报
- 增加更多图表类型和分析维度
- 实现AI驱动的趋势预测
- 支持报告订阅和自动推送

### 9.2 技术优化
- 引入缓存机制提升性能
- 支持分布式部署
- 增加更多导出格式
- 实现报告版本管理

### 9.3 数据增强
- 集成更多外部数据源
- 实现跨系统数据关联分析
- 支持自定义指标计算
- 建立数据质量监控体系

---

*本文档版本：v1.0*
*最后更新：2024年*
*文档维护：产品团队*