from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

class EventResponse(BaseModel):
    """事件列表响应模型"""
    事件编号: str
    事件描述: str
    镇街名称: str
    村社名称: Optional[str] = None
    事件级别: str
    二级分类: str
    上报时间: str
    CallerPhone: Optional[str] = None
    CallerID: Optional[str] = None
    EventUID: Optional[str] = None
    sequence_total: Optional[int] = None
    相关事件: Optional[int] = None
    报警人信息: Optional[str] = None
    处置结果: Optional[str] = None

class EventDetailResponse(BaseModel):
    """事件详情响应模型"""
    事件编号: str
    事件描述: str
    镇街名称: str
    村社名称: Optional[str] = None
    事件级别: str
    事件类型: Optional[str] = None
    二级分类: str
    上报时间: str
    办结时间: Optional[str] = None
    处置结果: Optional[str] = None
    EventUID: Optional[str] = None
    sequence_total: Optional[int] = None
    related_events_count: Optional[int] = None
    报警人信息: Optional[str] = None
    当事人信息: Optional[str] = None

class ClusterEventResponse(BaseModel):
    """聚类事件响应模型"""
    EventUID: str
    Event_description: str
    participant_count: int
    duration_days: Optional[float] = None
    timeline: List[dict]
    first_report_time: str
    last_report_time: str

class PaginatedResponse(BaseModel):
    """分页响应模型"""
    items: List[EventResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class FilterOptions(BaseModel):
    """筛选选项模型"""
    towns: List[str]
    villages: List[str]
    levels: List[str]
    categories: List[str]
    event_types: List[str]  # 事件类型选项
    related_event_options: List[str]  # 相关事件数量选项

class EventQuery(BaseModel):
    """事件查询参数模型"""
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None
    town: Optional[str] = None
    level: Optional[str] = None
    category: Optional[str] = None
    related_events: Optional[str] = None  # 相关事件数量筛选

class ClusterListResponse(BaseModel):
    """聚合事件列表响应模型"""
    EventUID: str
    cluster_description: str
    record_count: int
    duration_days: Optional[float] = None
    first_report_time: str
    last_report_time: str

class ClusterListPaginatedResponse(BaseModel):
    """聚合事件列表分页响应模型"""
    items: List[ClusterListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class ClusterQuery(BaseModel):
    """聚合事件查询参数模型"""
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None  # 对描述进行搜索
    min_event_count: Optional[int] = None  # 最小事件数量
    max_event_count: Optional[int] = None  # 最大事件数量
    min_duration: Optional[float] = None  # 最小持续时间（天）
    max_duration: Optional[float] = None  # 最大持续时间（天）

class ClusterFilterOptions(BaseModel):
    """聚合事件筛选选项模型"""
    event_count_ranges: List[str]
    duration_ranges: List[str]

class PersonInfo(BaseModel):
    """人口信息响应模型"""
    person_id: str
    name_cn: str
    id_card_no: str  # 脱敏后的身份证
    mobile_phone: str  # 脱敏后的手机号
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    nationality_code: Optional[str] = None
    ethnicity_code: Optional[str] = None
    hukou_province: Optional[str] = None
    hukou_city: Optional[str] = None
    hukou_county: Optional[str] = None
    reside_province: Optional[str] = None
    reside_city: Optional[str] = None
    reside_county: Optional[str] = None
    highest_education: Optional[str] = None
    occupation_code: Optional[str] = None
    employer_name: Optional[str] = None

class PersonSearchQuery(BaseModel):
    """人口信息搜索查询模型"""
    name: Optional[str] = None
    id_card: Optional[str] = None  # 脱敏的身份证
    phone: Optional[str] = None    # 脱敏的手机号
    page: int = 1
    page_size: int = 10

class PersonSearchResponse(BaseModel):
    """人口信息搜索响应模型"""
    items: List[PersonInfo]
    total: int
    page: int
    page_size: int
    total_pages: int 

# 人员分析相关模型
class PersonAnalysis(BaseModel):
    """人员分析响应模型"""
    phone: str
    name: Optional[str] = None
    id_card: Optional[str] = None
    primary_role: Optional[str] = None
    event_count: int
    name_candidates: Optional[str] = None
    id_candidates: Optional[str] = None
    population_tags: Optional[List[str]] = None

class PersonAnalysisResponse(BaseModel):
    """人员分析列表分页响应模型"""
    items: List[PersonAnalysis]
    total: int
    page: int
    page_size: int
    total_pages: int

class PersonEvent(BaseModel):
    """人员关联事件模型"""
    事件编号: str
    事件描述: str
    镇街名称: Optional[str] = None
    事件类型: Optional[str] = None
    二级分类: Optional[str] = None
    上报时间: Optional[str] = None
    办结时间: Optional[str] = None
    处置结果: Optional[str] = None
    role: Optional[str] = None  # 在该事件中的角色

class PersonDetailResponse(BaseModel):
    """人员详情响应模型"""
    phone: str
    name: Optional[str] = None
    id_card: Optional[str] = None
    primary_role: Optional[str] = None
    event_count: int
    name_candidates: Optional[str] = None
    id_candidates: Optional[str] = None
    events: List[PersonEvent]

class PersonAnalysisQuery(BaseModel):
    """人员分析查询参数模型"""
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None  # 搜索姓名或手机号
    role: Optional[str] = None    # 按角色筛选
    tags: Optional[str] = None    # 按人口标签筛选（逗号分隔）

# AI问答相关模型
# 已移除：AI问答相关模型

# Cluster编辑相关模型
class ClusterEditOperation(BaseModel):
    """Cluster编辑操作记录模型"""
    operation_id: str
    operation_type: str  # "add" | "delete"
    event_id: str
    source_cluster: Optional[str] = None
    target_cluster: str
    operator: str
    timestamp: datetime
    description: Optional[str] = None

class ClusterEditRequest(BaseModel):
    """Cluster编辑请求模型"""
    operation: str  # "add_event" | "remove_event"
    event_id: str
    operator: str
    target_cluster: Optional[str] = None  # 添加事件时需要

class UndoRequest(BaseModel):
    """撤销操作请求模型"""
    operation_id: Optional[str] = None
    operator: str = "管理员"

class EventClusterInfo(BaseModel):
    """事件所属Cluster信息模型"""
    event_id: str
    cluster_id: Optional[str] = None
    cluster_description: Optional[str] = None
    cluster_url: Optional[str] = None

class ClusterEditResponse(BaseModel):
    """Cluster编辑操作响应模型"""
    success: bool
    message: str
    operation_id: Optional[str] = None
    new_cluster_id: Optional[str] = None  # 删除事件时创建的新cluster ID

# 订阅相关模型
class SubscriptionTag(BaseModel):
    """订阅筛选标签模型"""
    key: str
    label: str
    value: str
    color: str

class Subscription(BaseModel):
    """订阅模型"""
    id: str
    name: str
    description: str
    filters: Dict[str, Any]
    searchParams: Dict[str, Any]
    tags: List[SubscriptionTag]
    createTime: str
    enabled: bool

class SubscriptionCreateRequest(BaseModel):
    """创建订阅请求模型"""
    name: str
    description: Optional[str] = None
    filters: Dict[str, Any]
    searchParams: Dict[str, Any]
    tags: List[SubscriptionTag]

class SubscriptionUpdateRequest(BaseModel):
    """更新订阅请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None

class SubscriptionListResponse(BaseModel):
    """订阅列表响应模型"""
    subscriptions: List[Subscription]

# 主题（Topic）相关模型
class FieldKeywords(BaseModel):
    """字段级关键词模型"""
    description: List[str] = []  # 事件描述关键词
    result: List[str] = []       # 处置结果关键词

class TopicCategory(BaseModel):
    """主题中的类型配置"""
    name: Optional[str] = None
    keywords: List[str] = []
    # 新增：可选过滤条件
    towns: List[str] = []
    levels: List[str] = []
    categories: List[str] = []
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class Topic(BaseModel):
    """主题模型（基于复杂关键词规则对事件进行集合化）"""
    id: str
    name: str
    description: Optional[str] = None
    include_keywords: FieldKeywords = FieldKeywords()  # 第一关：包含的关键词（字段间AND，字段内OR）
    exclude_keywords: FieldKeywords = FieldKeywords()  # 第二关：需要过滤掉的关键词（字段间OR，字段内OR）
    categories: List[TopicCategory] = []  # 可分类型及其关键词
    dedup: Optional[str] = None  # 第三关：去重方式，支持：None | "description" | "event_id"
    fine_filters: List[str] = []  # 第四关：精筛关键词（任一命中）
    enabled: bool = True
    createTime: str

class TopicCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    include_keywords: FieldKeywords = FieldKeywords()
    exclude_keywords: FieldKeywords = FieldKeywords()
    categories: List[TopicCategory] = []
    dedup: Optional[str] = None
    fine_filters: List[str] = []
    enabled: bool = True

class TopicUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    include_keywords: Optional[FieldKeywords] = None
    exclude_keywords: Optional[FieldKeywords] = None
    categories: Optional[List[TopicCategory]] = None
    dedup: Optional[str] = None
    fine_filters: Optional[List[str]] = None
    enabled: Optional[bool] = None

class TopicListResponse(BaseModel):
    topics: List[Topic]

class TopicEventsQuery(BaseModel):
    page: int = 1
    page_size: int = 20
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    search: Optional[str] = None

class TopicStatsPoint(BaseModel):
    date: str
    count: int
    ma7: Optional[float] = None
    anomaly: Optional[bool] = None

class TopicStatsResponse(BaseModel):
    topic_id: str
    total: int
    by_day: List[TopicStatsPoint]

# ============ 报告与指标（Demo） ============

class Indicator(BaseModel):
    code: str
    name: str
    unit: Optional[str] = None
    grain: str = "month"
    desc: Optional[str] = None
    kind: str = "KPI"  # KPI | CHART
    metadata: Optional[Dict[str, Any]] = None

class IndicatorSearchResponse(BaseModel):
    items: List[Indicator]
    total: int

class IndicatorValueResponse(BaseModel):
    code: str
    period: str
    scope: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    precision: Optional[int] = 0

class Report(BaseModel):
    id: str
    title: str
    month: str  # YYYY-MM
    content_md_draft: str
    status: str  # draft | published
    created_by: str = "admin"
    created_at: str
    updated_at: str
    published_at: Optional[str] = None
    schedule_type: Optional[str] = None  # e.g. monthly | manual
    schedule_day: Optional[int] = None   # 1-31
    template_id: Optional[str] = None
    template_name: Optional[str] = None

class ReportListResponse(BaseModel):
    items: List[Report]

class ReportCreateRequest(BaseModel):
    title: str
    month: str
    content_md_draft: str = ""
    schedule_type: Optional[str] = None
    schedule_day: Optional[int] = None
    template_id: Optional[str] = None
    template_name: Optional[str] = None

class ReportUpdateRequest(BaseModel):
    title: Optional[str] = None
    month: Optional[str] = None
    content_md_draft: Optional[str] = None
    schedule_type: Optional[str] = None
    schedule_day: Optional[int] = None
    template_id: Optional[str] = None
    template_name: Optional[str] = None

class ReportPreviewRequest(BaseModel):
    content_md: str
    month: str

class RenderedValue(BaseModel):
    placeholder_id: str
    code: str
    period: str
    value: Optional[Any] = None
    unit: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ReportPreviewResponse(BaseModel):
    rendered_html: str
    values: List[RenderedValue]


class ChartRenderRequest(BaseModel):
    code: str
    period: Optional[str] = '@month'
    scope: Optional[str] = None
    month: Optional[str] = None


class ChartRenderResponse(BaseModel):
    markdown: str
    period_used: Optional[str] = None
    chart: Optional[Dict[str, Any]] = None

# ============ 操作日志模块 ============

class OperationLog(BaseModel):
    """操作日志模型"""
    id: str
    operator: str  # 操作人
    operation_type: str  # 操作类型：create, update, delete, view, export, login
    resource_type: str  # 资源类型：topic, report, subscription, cluster, event, system
    resource_id: str  # 资源ID
    resource_name: Optional[str] = None  # 资源名称
    operation_desc: str  # 操作描述
    before_data: Optional[Dict[str, Any]] = None  # 操作前数据（JSON）
    after_data: Optional[Dict[str, Any]] = None  # 操作后数据（JSON）
    ip_address: Optional[str] = None  # IP地址
    user_agent: Optional[str] = None  # 用户代理
    timestamp: datetime
    extra_info: Optional[Dict[str, Any]] = None  # 额外信息

class OperationLogQuery(BaseModel):
    """操作日志查询参数"""
    page: int = 1
    page_size: int = 20
    operator: Optional[str] = None  # 按操作人筛选
    operation_type: Optional[str] = None  # 按操作类型筛选
    resource_type: Optional[str] = None  # 按资源类型筛选
    resource_id: Optional[str] = None  # 按资源ID筛选
    start_time: Optional[str] = None  # 开始时间
    end_time: Optional[str] = None  # 结束时间
    search: Optional[str] = None  # 搜索关键词

class OperationLogResponse(BaseModel):
    """操作日志分页响应"""
    items: List[OperationLog]
    total: int
    page: int
    page_size: int
    total_pages: int

class OperationStatsItem(BaseModel):
    """操作统计项"""
    key: str
    value: str
    count: int
    percentage: float

class OperationStatsResponse(BaseModel):
    """操作统计响应"""
    total_operations: int
    by_operator: List[OperationStatsItem]  # 按操作人统计
    by_operation_type: List[OperationStatsItem]  # 按操作类型统计
    by_resource_type: List[OperationStatsItem]  # 按资源类型统计
    recent_operations: List[OperationLog]  # 最近操作

class OperationLogFilterOptions(BaseModel):
    """操作日志筛选选项"""
    operators: List[str]
    operation_types: List[str]
    resource_types: List[str]


# ==================== 事件智能分类相关模型 ====================

class ClassifySingleRequest(BaseModel):
    """单事件分类请求"""
    event_description: str
    event_type: str
    district: Optional[str] = ""
    street: Optional[str] = ""


class TagSuggestion(BaseModel):
    """标签建议"""
    tag_id: str
    label: str
    confidence: float
    source: str
    reason: Optional[str] = None


class ClassifySingleResponse(BaseModel):
    """单事件分类响应"""
    predicted_category: str
    confidence: float
    reasoning: Optional[str] = None
    tags: List[TagSuggestion]
    timestamp: str


class ClassifyBatchRequest(BaseModel):
    """批量分类请求（用于JSON请求，CSV通过file upload）"""
    events: List[Dict[str, str]]


class ClassifyBatchTaskResponse(BaseModel):
    """批量分类任务响应"""
    task_id: str
    message: str
    total: int


class ClassifyBatchStatusResponse(BaseModel):
    """批量分类任务状态响应"""
    task_id: str
    status: str  # pending, processing, completed, failed
    total: int
    processed: int
    success_count: int
    results: Optional[List[Dict]] = None
    created_at: str
    completed_at: Optional[str] = None


class ClassificationFeedback(BaseModel):
    """分类反馈模型"""
    event_description: str
    event_type: str
    predicted_category: str
    correct_category: str
    confidence: float
    feedback_time: Optional[str] = None


class CategoryInfo(BaseModel):
    """分类信息"""
    category_name: str
    event_types: List[str]
    enabled: bool = True
    example_count: int = 0


class CategoryListResponse(BaseModel):
    """分类列表响应"""
    categories: List[str]
    total: int
    by_event_type: Optional[Dict[str, List[str]]] = None


class FewShotExample(BaseModel):
    """Few-shot示例"""
    category: str
    event_description: str
    event_type: str
    district: Optional[str] = ""
    street: Optional[str] = ""


class FewShotExamplesResponse(BaseModel):
    """Few-shot示例列表响应"""
    category: str
    examples: List[FewShotExample]
    total: int


class ClassificationStatsResponse(BaseModel):
    """分类统计响应"""
    total_predictions: int
    accuracy: Optional[float] = None
    avg_confidence: float
    category_distribution: Dict[str, int]
    event_type_distribution: Dict[str, int]
    recent_predictions: List[Dict]


class TagDefinition(BaseModel):
    """标签定义"""
    tag_id: str
    label: str
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    source: Optional[str] = None
    editable: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TagGroup(BaseModel):
    """标签分组"""
    group_id: str
    name: str
    description: Optional[str] = None
    source: Optional[str] = "system"
    max_tags: Optional[int] = None
    order: Optional[int] = None
    editable: Optional[bool] = None
    tag_count: Optional[int] = None
    active_tag_count: Optional[int] = None
    tags: List[TagDefinition]


class TagLibraryResponse(BaseModel):
    """标签库响应"""
    metadata: Optional[Dict[str, Any]] = None
    groups: List[TagGroup]
    default_recommendations: Optional[List[str]] = None
    event_type_recommendations: Optional[Dict[str, List[str]]] = None
    category_recommendations: Optional[Dict[str, List[str]]] = None


class TagListResponse(BaseModel):
    """标签列表响应"""
    tags: List[TagDefinition]
    total: int
    stats: Optional[Dict[str, Any]] = None


class TagCreateRequest(BaseModel):
    """创建标签请求"""
    label: str
    group_id: str
    color: Optional[str] = "#1890ff"
    description: Optional[str] = None


class TagUpdateRequest(BaseModel):
    """更新标签请求"""
    label: Optional[str] = None
    group_id: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class TagGroupCreateRequest(BaseModel):
    """创建标签组请求"""
    name: str
    group_id: Optional[str] = None
    description: Optional[str] = None
    max_tags: Optional[int] = None
    order: Optional[int] = None


class TagGroupUpdateRequest(BaseModel):
    """更新标签组请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    max_tags: Optional[int] = None
    order: Optional[int] = None


class TagGroupListResponse(BaseModel):
    """标签组列表响应"""
    groups: List[TagGroup]
    total: int


# ==================== 分类任务管理相关模型 ====================

class ClassificationTask(BaseModel):
    """分类任务"""
    id: str
    name: str
    task_type: str  # 'classify' 或 'tag'
    status: str  # 'pending', 'running', 'completed', 'failed'
    category_id: Optional[str] = None  # 分类任务使用
    category_name: Optional[str] = None
    tag_ids: Optional[List[str]] = None  # 打标任务使用
    tag_names: Optional[List[str]] = None
    file_name: str
    total_count: int = 0
    processed_count: int = 0
    success_count: int = 0
    failed_count: int = 0
    created_by: str
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


class ClassificationTaskCreate(BaseModel):
    """创建分类任务请求"""
    name: str
    task_type: str  # 'classify' 或 'tag'
    category_id: Optional[str] = None  # 分类任务必填
    tag_ids: Optional[List[str]] = None  # 打标任务必填
    created_by: str = "admin"


class ClassificationTaskResult(BaseModel):
    """分类任务结果"""
    id: str
    task_id: str
    event_id: Optional[str] = None
    event_title: str
    event_description: str
    predicted_category: Optional[str] = None  # 分类结果
    predicted_tags: Optional[List[str]] = None  # 打标结果
    confidence: float
    reasoning: str  # 分类/打标依据
    status: str  # 'success', 'failed'
    error_message: Optional[str] = None
    processed_at: str


class ClassificationTaskListResponse(BaseModel):
    """任务列表响应"""
    tasks: List[ClassificationTask]
    total: int


class ClassificationTaskDetailResponse(BaseModel):
    """任务详情响应"""
    task: ClassificationTask
    results: List[ClassificationTaskResult]
    total_results: int
