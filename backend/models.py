from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class EventResponse(BaseModel):
    """事件列表响应模型"""
    事件编号: str
    事件描述: str
    镇街名称: str
    事件级别: str
    二级分类: str
    上报时间: str
    CallerPhone: Optional[str] = None
    CallerID: Optional[str] = None
    EventUID: Optional[str] = None
    sequence_total: Optional[int] = None
    报警人信息: Optional[str] = None

class EventDetailResponse(BaseModel):
    """事件详情响应模型"""
    事件编号: str
    事件描述: str
    镇街名称: str
    村社名称: Optional[str] = None
    事件级别: str
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
    levels: List[str]
    categories: List[str]
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