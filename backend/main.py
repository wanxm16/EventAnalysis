from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn

from models import (
    EventResponse, EventDetailResponse, ClusterEventResponse, 
    PaginatedResponse, FilterOptions, EventQuery,
    ClusterListResponse, ClusterListPaginatedResponse, ClusterFilterOptions,
    PersonInfo,
    PersonSearchQuery,
    PersonSearchResponse,
    PersonAnalysis,
    PersonAnalysisResponse,
    PersonEvent,
    PersonDetailResponse,
    PersonAnalysisQuery
)
from services import event_service

# 创建FastAPI应用
app = FastAPI(
    title="事件查询系统 API",
    description="基于冲突事件数据的查询和管理系统",
    version="1.0.0"
)

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应该限制为具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", summary="根路径")
async def root():
    """根路径，返回API状态信息"""
    return {
        "message": "事件查询系统 API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/api/health", summary="健康检查")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "message": "API is running normally"
    }

@app.get("/api/events", response_model=PaginatedResponse, summary="获取事件列表")
async def get_events(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    town: Optional[str] = Query(None, description="镇街名称筛选"),
    level: Optional[str] = Query(None, description="事件级别筛选"),
    category: Optional[str] = Query(None, description="二级分类筛选"),
    related_events: Optional[str] = Query(None, description="相关事件数量筛选")
):
    """
    获取事件列表，支持分页、搜索和筛选，按上报时间倒序排列
    
    - **page**: 页码，从1开始
    - **page_size**: 每页数量，1-100之间
    - **search**: 搜索关键词，支持事件编号、描述、处置结果、CallerPhone、CallerID
    - **town**: 镇街名称筛选
    - **level**: 事件级别筛选
    - **category**: 二级分类筛选
    - **related_events**: 相关事件数量筛选，可选值：0（无关联）、1（1个关联）、2-5（2-5个关联）、5+（5个以上关联）
    """
    try:
        result = event_service.get_events(
            page=page,
            page_size=page_size,
            search=search,
            town=town,
            level=level,
            category=category,
            related_events=related_events
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取事件列表失败: {str(e)}")

@app.get("/api/events/{event_id}", response_model=EventDetailResponse, summary="获取事件详情")
async def get_event_detail(event_id: str):
    """
    根据事件编号获取事件详情
    
    - **event_id**: 事件编号
    """
    try:
        result = event_service.get_event_detail(event_id)
        if result is None:
            raise HTTPException(status_code=404, detail=f"未找到事件编号为 {event_id} 的事件")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取事件详情失败: {str(e)}")

@app.get("/api/clusters/{event_uid}", response_model=ClusterEventResponse, summary="获取聚类事件详情")
async def get_cluster_detail(event_uid: str):
    """
    根据EventUID获取聚类事件详情
    
    - **event_uid**: 聚类事件UID
    """
    try:
        result = event_service.get_cluster_detail(event_uid)
        if result is None:
            raise HTTPException(status_code=404, detail=f"未找到EventUID为 {event_uid} 的聚类事件")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取聚类事件详情失败: {str(e)}")

@app.get("/api/filter-options", response_model=FilterOptions, summary="获取筛选选项")
async def get_filter_options():
    """
    获取可用的筛选选项，包括镇街名称、事件级别、二级分类
    """
    try:
        result = event_service.get_filter_options()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取筛选选项失败: {str(e)}")

@app.get("/api/cluster-list", response_model=ClusterListPaginatedResponse, summary="获取聚合事件列表")
async def get_cluster_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索描述关键词"),
    min_event_count: Optional[int] = Query(None, ge=2, description="最小事件数量"),
    max_event_count: Optional[int] = Query(None, ge=2, description="最大事件数量"),
    min_duration: Optional[float] = Query(None, ge=0, description="最小持续时间（天）"),
    max_duration: Optional[float] = Query(None, ge=0, description="最大持续时间（天）")
):
    """
    获取聚合事件列表，只显示record_count > 1的记录
    
    - **page**: 页码，从1开始
    - **page_size**: 每页数量，1-100之间
    - **search**: 搜索描述关键词
    - **min_event_count**: 最小事件数量筛选
    - **max_event_count**: 最大事件数量筛选
    - **min_duration**: 最小持续时间筛选（天）
    - **max_duration**: 最大持续时间筛选（天）
    """
    try:
        result = event_service.get_cluster_list(
            page=page,
            page_size=page_size,
            search=search,
            min_event_count=min_event_count,
            max_event_count=max_event_count,
            min_duration=min_duration,
            max_duration=max_duration
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取聚合事件列表失败: {str(e)}")

@app.get("/api/cluster-filter-options", response_model=ClusterFilterOptions, summary="获取聚合事件筛选选项")
async def get_cluster_filter_options():
    """
    获取聚合事件的筛选选项，包括事件数量范围、持续时间范围
    """
    try:
        result = event_service.get_cluster_filter_options()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取聚合事件筛选选项失败: {str(e)}")

@app.post("/api/people/search", response_model=PersonSearchResponse, summary="搜索人口信息")
async def search_people(query: PersonSearchQuery):
    """
    搜索人口信息
    
    - **name**: 姓名（模糊搜索）
    - **id_card**: 身份证号码（支持脱敏格式）
    - **phone**: 手机号码（支持脱敏格式）
    - **page**: 页码，从1开始
    - **page_size**: 每页数量，1-100之间
    """
    try:
        result = event_service.search_people(query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索人口信息失败: {str(e)}")

@app.get("/api/people/{person_id}", response_model=PersonInfo, summary="获取人员详细信息")
async def get_person_detail(person_id: str):
    """
    根据人员ID获取详细信息
    
    - **person_id**: 人员ID
    """
    try:
        result = event_service.get_person_detail(person_id)
        if result is None:
            raise HTTPException(status_code=404, detail=f"未找到人员ID为 {person_id} 的人员信息")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取人员详细信息失败: {str(e)}")

@app.get("/api/person-analysis", response_model=PersonAnalysisResponse, summary="获取人员分析列表")
async def get_person_analysis(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词（姓名或手机号）"),
    role: Optional[str] = Query(None, description="角色筛选")
):
    """
    获取人员分析列表，按事件数量倒序排列
    
    - **page**: 页码，从1开始
    - **page_size**: 每页数量，1-100之间
    - **search**: 搜索关键词，支持姓名或手机号
    - **role**: 按角色筛选，如"报警人"、"对方"等
    """
    try:
        query = PersonAnalysisQuery(
            page=page,
            page_size=page_size,
            search=search,
            role=role
        )
        result = event_service.get_person_analysis(query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取人员分析列表失败: {str(e)}")

@app.get("/api/person-analysis/roles", response_model=list[str], summary="获取人员分析角色选项")
async def get_person_analysis_roles():
    """
    获取人员分析中的所有角色选项
    """
    try:
        result = event_service.get_person_analysis_roles()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取角色选项失败: {str(e)}")

@app.get("/api/person-analysis/{phone}", response_model=PersonDetailResponse, summary="获取人员分析详情")
async def get_person_analysis_detail(phone: str):
    """
    根据手机号获取人员分析详情，包含关联的事件列表
    
    - **phone**: 手机号码
    """
    try:
        result = event_service.get_person_analysis_detail(phone)
        if result is None:
            raise HTTPException(status_code=404, detail=f"未找到手机号为 {phone} 的人员信息")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取人员分析详情失败: {str(e)}")

# 运行应用
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 