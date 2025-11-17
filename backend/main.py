from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import uvicorn
from contextlib import asynccontextmanager
from datetime import datetime
from io import StringIO
import os

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
    PersonAnalysisQuery,
    ClusterEditRequest,
    UndoRequest,
    EventClusterInfo,
    ClusterEditResponse,
    Subscription,
    SubscriptionCreateRequest,
    SubscriptionUpdateRequest,
    SubscriptionListResponse,
    Topic, TopicCreateRequest, TopicUpdateRequest, TopicListResponse, TopicEventsQuery, TopicStatsResponse,
    IndicatorSearchResponse, IndicatorValueResponse, ReportListResponse, ReportCreateRequest, ReportUpdateRequest, Report, ReportPreviewRequest, ReportPreviewResponse,
    ChartRenderRequest, ChartRenderResponse,
    OperationLogQuery, OperationLogResponse, OperationStatsResponse, OperationLogFilterOptions
)
from services import event_service, operation_log_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理（AI问答已移除，无需初始化）"""
    yield

# 创建FastAPI应用
app = FastAPI(
    title="事件查询系统 API",
    description="基于冲突事件数据的查询和管理系统",
    version="1.0.0",
    lifespan=lifespan
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
    
    # 检查服务状态文件是否存在
    service_file = "../.service_status"
    service_active = os.path.exists(service_file)
    
    return {
        "status": "healthy" if service_active else "stopping",
        "service_active": service_active,
        "message": "API is running normally" if service_active else "Service is stopping"
    }

# 事件列表：支持多关键词包含/排除与多选筛选
@app.get("/api/events", response_model=PaginatedResponse, summary="获取事件列表")
async def get_events(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词（单个）"),
    include: Optional[List[str]] = Query(None, description="包含关键词（可多值，通用）"),
    exclude: Optional[List[str]] = Query(None, description="排除关键词（可多值，通用）"),
    include_desc: Optional[List[str]] = Query(None, description="描述包含关键词（多值）"),
    exclude_desc: Optional[List[str]] = Query(None, description="描述排除关键词（多值）"),
    include_result: Optional[List[str]] = Query(None, description="处置结果包含关键词（多值）"),
    exclude_result: Optional[List[str]] = Query(None, description="处置结果排除关键词（多值）"),
    town: Optional[List[str]] = Query(None, description="镇街名称筛选（可多选）"),
    village: Optional[List[str]] = Query(None, description="村社名称筛选（可多选）"),
    level: Optional[List[str]] = Query(None, description="事件级别筛选（可多选）"),
    category: Optional[List[str]] = Query(None, description="二级分类筛选（可多选）"),
    event_type: Optional[List[str]] = Query(None, description="事件类型筛选（可多选）"),
    related_events: Optional[str] = Query(None, description="相关事件数量筛选"),
    start_time: Optional[str] = Query(None, description="开始时间筛选"),
    end_time: Optional[str] = Query(None, description="结束时间筛选"),
    sort_field: Optional[str] = Query(None, description="排序字段"),
    sort_order: Optional[str] = Query(None, description="排序方向 (asc/desc)")
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
            include=include,
            exclude=exclude,
            include_desc=include_desc,
            exclude_desc=exclude_desc,
            include_result=include_result,
            exclude_result=exclude_result,
            town=town,
            village=village,
            level=level,
            category=category,
            event_type=event_type,
            related_events=related_events,
            start_time=start_time,
            end_time=end_time,
            sort_field=sort_field,
            sort_order=sort_order
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取事件列表失败: {str(e)}")


@app.get("/api/events/export", summary="导出事件列表为CSV")
async def export_events(
    search: Optional[str] = Query(None),
    include: Optional[List[str]] = Query(None),
    exclude: Optional[List[str]] = Query(None),
    include_desc: Optional[List[str]] = Query(None),
    exclude_desc: Optional[List[str]] = Query(None),
    include_result: Optional[List[str]] = Query(None),
    exclude_result: Optional[List[str]] = Query(None),
    town: Optional[List[str]] = Query(None),
    village: Optional[List[str]] = Query(None),
    level: Optional[List[str]] = Query(None),
    category: Optional[List[str]] = Query(None),
    event_type: Optional[List[str]] = Query(None),
    related_events: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    sort_field: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None),
):
    try:
        df = event_service.filter_events_dataframe(
            search=search,
            include=include,
            exclude=exclude,
            include_desc=include_desc,
            exclude_desc=exclude_desc,
            include_result=include_result,
            exclude_result=exclude_result,
            town=town,
            village=village,
            level=level,
            category=category,
            event_type=event_type,
            related_events=related_events,
            start_time=start_time,
            end_time=end_time,
            sort_field=sort_field,
            sort_order=sort_order,
        )

        buffer = StringIO()
        if not df.empty:
            df.to_csv(buffer, index=False)
        buffer.seek(0)

        filename = f"events_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@app.post("/api/events/import", summary="导入事件Excel")
async def import_events(file: UploadFile = File(...), mode: str = Form('append')):
    try:
        contents = await file.read()
        result = event_service.import_events_from_excel(contents, file.filename, mode)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")

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
    max_duration: Optional[float] = Query(None, ge=0, description="最大持续时间（天）"),
    first_report_time_start: Optional[str] = Query(None, description="首次上报时间开始"),
    first_report_time_end: Optional[str] = Query(None, description="首次上报时间结束"),
    last_report_time_start: Optional[str] = Query(None, description="最后上报时间开始"),
    last_report_time_end: Optional[str] = Query(None, description="最后上报时间结束")
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
    - **first_report_time_start**: 首次上报时间开始
    - **first_report_time_end**: 首次上报时间结束
    - **last_report_time_start**: 最后上报时间开始
    - **last_report_time_end**: 最后上报时间结束
    """
    try:
        result = event_service.get_cluster_list(
            page=page,
            page_size=page_size,
            search=search,
            min_event_count=min_event_count,
            max_event_count=max_event_count,
            min_duration=min_duration,
            max_duration=max_duration,
            first_report_time_start=first_report_time_start,
            first_report_time_end=first_report_time_end,
            last_report_time_start=last_report_time_start,
            last_report_time_end=last_report_time_end
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
    role: Optional[str] = Query(None, description="角色筛选"),
    tags: Optional[str] = Query(None, description="人口标签筛选（逗号分隔）")
):
    """
    获取人员分析列表，按事件数量倒序排列

    - **page**: 页码，从1开始
    - **page_size**: 每页数量，1-100之间
    - **search**: 搜索关键词，支持姓名或手机号
    - **role**: 按角色筛选，如"报警人"、"对方"等
    - **tags**: 按人口标签筛选，多个标签用逗号分隔
    """
    try:
        query = PersonAnalysisQuery(
            page=page,
            page_size=page_size,
            search=search,
            role=role,
            tags=tags
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

# 已移除：AI问答相关端点

@app.get("/api/statistics/report", summary="获取统计报告")
async def get_statistics_report():
    """
    获取统计报告数据，基于实际数据计算各项指标
    """
    try:
        stats = event_service.get_statistics_report()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"统计报告生成失败: {str(e)}")

# 月度统计（带筛选）
@app.get("/api/statistics/monthly", summary="按月统计事件数量与分组")
async def get_statistics_monthly(
    start_time: Optional[str] = Query(None, description="开始时间，YYYY-MM-DD"),
    end_time: Optional[str] = Query(None, description="结束时间，YYYY-MM-DD"),
    towns: Optional[list[str]] = Query(None, description="筛选镇街，多值"),
    levels: Optional[list[str]] = Query(None, description="筛选事件级别，多值"),
):
    try:
        data = event_service.get_monthly_statistics(start_time, end_time, towns, levels)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取月度统计失败: {str(e)}")

# 运行应用
# ============ Cluster编辑相关API端点 ============

@app.get("/api/events/{event_id}/cluster", response_model=EventClusterInfo)
async def get_event_cluster_info(event_id: str):
    """获取事件所属的cluster信息"""
    try:
        cluster_info = event_service.get_event_cluster_info(event_id)
        return cluster_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clusters/{cluster_id}/edit", response_model=ClusterEditResponse)
async def edit_cluster(cluster_id: str, request: ClusterEditRequest):
    """编辑cluster（添加或删除事件）"""
    try:
        if request.operation == "remove_event":
            return event_service.remove_event_from_cluster(request)
        elif request.operation == "add_event":
            if not request.target_cluster:
                request.target_cluster = cluster_id
            return event_service.add_event_to_cluster(request)
        else:
            raise HTTPException(status_code=400, detail="不支持的操作类型")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clusters/undo/{operation_id}", response_model=ClusterEditResponse)
async def undo_cluster_operation(operation_id: str, request: UndoRequest):
    """撤销cluster操作"""
    try:
        # 创建新的请求对象，包含URL中的operation_id
        undo_request = UndoRequest(operation_id=operation_id, operator=request.operator)
        return event_service.undo_cluster_operation(undo_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clusters/{cluster_id}/operations")
async def get_cluster_operations(cluster_id: str):
    """获取cluster的操作记录"""
    try:
        operations = event_service.get_cluster_operations(cluster_id)
        return {"operations": operations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 订阅管理API ============

@app.get("/api/subscriptions", response_model=SubscriptionListResponse, summary="获取所有订阅")
async def get_subscriptions():
    """获取用户的所有订阅"""
    try:
        return event_service.get_all_subscriptions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取订阅列表失败: {str(e)}")

@app.post("/api/subscriptions", response_model=Subscription, summary="创建新订阅")
async def create_subscription(request: SubscriptionCreateRequest):
    """创建新的事件查询订阅"""
    try:
        return event_service.create_subscription(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建订阅失败: {str(e)}")

@app.put("/api/subscriptions/{subscription_id}", response_model=Subscription, summary="更新订阅")
async def update_subscription(subscription_id: str, request: SubscriptionUpdateRequest):
    """更新指定的订阅"""
    try:
        return event_service.update_subscription(subscription_id, request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新订阅失败: {str(e)}")

@app.delete("/api/subscriptions/{subscription_id}", summary="删除订阅")
async def delete_subscription(subscription_id: str):
    """删除指定的订阅"""
    try:
        success = event_service.delete_subscription(subscription_id)
        if success:
            return {"message": "订阅已删除", "success": True}
        else:
            raise HTTPException(status_code=404, detail="订阅不存在")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除订阅失败: {str(e)}")

# ============ 主题管理API ============

@app.get("/api/topics", response_model=TopicListResponse, summary="获取主题列表")
async def get_topics():
    try:
        return event_service.get_all_topics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取主题列表失败: {str(e)}")

@app.post("/api/topics", response_model=Topic, summary="创建主题")
async def create_topic(request: TopicCreateRequest, http_request: Request):
    try:
        topic = event_service.create_topic(request)

        # 记录操作日志
        operation_log_service.log_operation(
            operator="管理员",  # 在实际系统中应该从认证信息获取
            operation_type="create",
            resource_type="topic",
            resource_id=topic.id,
            resource_name=topic.name,
            operation_desc=f"创建了主题：{topic.name}",
            after_data=topic.dict(),
            ip_address=http_request.client.host if http_request.client else None,
            user_agent=http_request.headers.get("user-agent")
        )

        return topic
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建主题失败: {str(e)}")

@app.get("/api/topics/{topic_id}", response_model=Topic, summary="获取单个主题")
async def get_topic(topic_id: str):
    try:
        topic = event_service.get_topic(topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail=f"主题不存在: {topic_id}")
        return topic
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取主题失败: {str(e)}")

@app.put("/api/topics/{topic_id}", response_model=Topic, summary="更新主题")
async def update_topic(topic_id: str, request: TopicUpdateRequest, http_request: Request):
    try:
        # 获取更新前的数据
        old_topic = event_service.get_topic(topic_id)
        updated_topic = event_service.update_topic(topic_id, request)

        # 记录操作日志
        operation_log_service.log_operation(
            operator="管理员",
            operation_type="update",
            resource_type="topic",
            resource_id=topic_id,
            resource_name=updated_topic.name,
            operation_desc=f"更新了主题：{updated_topic.name}",
            before_data=old_topic.dict() if old_topic else None,
            after_data=updated_topic.dict(),
            ip_address=http_request.client.host if http_request.client else None,
            user_agent=http_request.headers.get("user-agent")
        )

        return updated_topic
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新主题失败: {str(e)}")

@app.delete("/api/topics/{topic_id}", summary="删除主题")
async def delete_topic(topic_id: str, http_request: Request):
    try:
        # 获取删除前的数据
        old_topic = event_service.get_topic(topic_id)
        success = event_service.delete_topic(topic_id)

        if success:
            # 记录操作日志
            operation_log_service.log_operation(
                operator="管理员",
                operation_type="delete",
                resource_type="topic",
                resource_id=topic_id,
                resource_name=old_topic.name if old_topic else topic_id,
                operation_desc=f"删除了主题：{old_topic.name if old_topic else topic_id}",
                before_data=old_topic.dict() if old_topic else None,
                ip_address=http_request.client.host if http_request.client else None,
                user_agent=http_request.headers.get("user-agent")
            )
            return {"message": "主题已删除", "success": True}
        else:
            raise HTTPException(status_code=404, detail="主题不存在")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除主题失败: {str(e)}")

@app.get("/api/topics/{topic_id}/events", response_model=PaginatedResponse, summary="获取主题事件")
async def get_topic_events(topic_id: str,
                           page: int = Query(1, ge=1),
                           page_size: int = Query(20, ge=1, le=100),
                           start_time: Optional[str] = Query(None),
                           end_time: Optional[str] = Query(None),
                           search: Optional[str] = Query(None)):
    try:
        query = TopicEventsQuery(page=page, page_size=page_size, start_time=start_time, end_time=end_time, search=search)
        return event_service.get_topic_events(topic_id, query)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取主题事件失败: {str(e)}")

@app.get("/api/topics/{topic_id}/stats", response_model=TopicStatsResponse, summary="获取主题统计")
async def get_topic_stats(topic_id: str,
                          start_time: Optional[str] = Query(None),
                          end_time: Optional[str] = Query(None)):
    try:
        return event_service.get_topic_stats(topic_id, start_time, end_time)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取主题统计失败: {str(e)}")

# ============ 数据管理API ============

@app.post("/api/reload-data", summary="重新加载数据")
async def reload_data():
    """
    重新加载所有CSV数据文件到内存中
    用于在数据文件更新后刷新系统数据，避免重启服务
    """
    try:
        # 记录重新加载前的数据统计
        old_stats = {
            "detail_count": len(event_service.detail_df) if event_service.detail_df is not None else 0,
            "cluster_count": len(event_service.cluster_df) if event_service.cluster_df is not None else 0,
            "raw_count": len(event_service.raw_conflict_df) if event_service.raw_conflict_df is not None else 0,
        }
        
        # 重新加载数据
        print("🔄 开始重新加载数据...")
        event_service.load_data()
        
        # 记录重新加载后的数据统计
        new_stats = {
            "detail_count": len(event_service.detail_df) if event_service.detail_df is not None else 0,
            "cluster_count": len(event_service.cluster_df) if event_service.cluster_df is not None else 0,
            "raw_count": len(event_service.raw_conflict_df) if event_service.raw_conflict_df is not None else 0,
        }
        
        # 计算数据变化
        changes = {
            "detail_change": new_stats["detail_count"] - old_stats["detail_count"],
            "cluster_change": new_stats["cluster_count"] - old_stats["cluster_count"],
            "raw_change": new_stats["raw_count"] - old_stats["raw_count"],
        }
        
        print("✅ 数据重新加载完成")
        
        return {
            "success": True,
            "message": "数据重新加载成功",
            "old_stats": old_stats,
            "new_stats": new_stats,
            "changes": changes,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ 数据重新加载失败: {e}")
        raise HTTPException(status_code=500, detail=f"数据重新加载失败: {str(e)}")

# ====== 报告与指标（Demo） ======

@app.get("/api/indicators", response_model=IndicatorSearchResponse)
async def indicators(
    keyword: Optional[str] = Query(None),
    page: int = 1,
    page_size: int = 10,
    kind: Optional[str] = Query(None)
):
    return event_service.indicators_search(keyword, page, page_size, kind)

@app.get("/api/indicators/value", response_model=IndicatorValueResponse)
async def indicator_value(code: str, period: str, scope: Optional[str] = None):
    return event_service.indicator_value(code, period, scope)

@app.post("/api/charts/render", response_model=ChartRenderResponse)
async def render_chart(req: ChartRenderRequest):
    markdown, period_used, chart = event_service.render_chart_markdown(req.code, req.period, req.scope, req.month)
    return ChartRenderResponse(markdown=markdown, period_used=period_used, chart=chart)

@app.get("/api/reports", response_model=ReportListResponse)
async def list_reports():
    return event_service.list_reports()

@app.post("/api/reports", response_model=Report)
async def create_report(req: ReportCreateRequest):
    return event_service.create_report(req)

@app.get("/api/reports/{report_id}", response_model=Report)
async def get_report(report_id: str):
    rpt = event_service.get_report(report_id)
    if not rpt:
        raise HTTPException(status_code=404, detail="报告不存在")
    return rpt

@app.put("/api/reports/{report_id}", response_model=Report)
async def update_report(report_id: str, req: ReportUpdateRequest):
    try:
        return event_service.update_report(report_id, req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/reports/{report_id}/preview", response_model=ReportPreviewResponse)
async def preview_report(report_id: str, req: ReportPreviewRequest):
    return event_service.preview_report(req)

@app.post("/api/reports/{report_id}/publish")
async def publish_report(report_id: str, month: str):
    try:
        return event_service.publish_report(report_id, month)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/reports/{report_id}/export")
async def export_report(report_id: str, month: Optional[str] = None, format: str = 'docx'):
    import io
    from docx import Document
    rpt = event_service.get_report(report_id)
    if not rpt:
        raise HTTPException(status_code=404, detail="报告不存在")
    # 生成渲染内容（若未发布或指定month，按当前取数渲染）
    if rpt.status == 'published' and not month:
        html = event_service.preview_report(ReportPreviewRequest(content_md=rpt.content_md_draft, month=rpt.month)).rendered_html
    else:
        html = event_service.preview_report(ReportPreviewRequest(content_md=rpt.content_md_draft, month=month or rpt.month)).rendered_html
    # 简易导出：基于原始渲染串按换行拆分
    doc = Document()
    text = html.replace('<br/>', '\n').replace('<br>', '\n').replace('<br />', '\n')
    for line in text.split('\n'):
        doc.add_paragraph(line)
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', headers={
        'Content-Disposition': f'attachment; filename=report_{report_id}.docx'
    })


# ============ 操作日志相关API ============

@app.get("/api/operation-logs", response_model=OperationLogResponse)
async def get_operation_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    operator: Optional[str] = Query(None),
    operation_type: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """获取操作日志列表"""
    query = OperationLogQuery(
        page=page,
        page_size=page_size,
        operator=operator,
        operation_type=operation_type,
        resource_type=resource_type,
        resource_id=resource_id,
        start_time=start_time,
        end_time=end_time,
        search=search
    )
    return operation_log_service.get_logs(query)

@app.get("/api/operation-logs/stats", response_model=OperationStatsResponse)
async def get_operation_stats():
    """获取操作统计信息"""
    return operation_log_service.get_stats()

@app.get("/api/operation-logs/filter-options", response_model=OperationLogFilterOptions)
async def get_operation_filter_options():
    """获取操作日志筛选选项"""
    return operation_log_service.get_filter_options()


if __name__ == "__main__":
    host = os.getenv("UVICORN_HOST", "127.0.0.1")
    try:
        port = int(os.getenv("PORT", "8000"))
    except ValueError:
        port = 8000
    reload_env = os.getenv("UVICORN_RELOAD", "0").lower()
    if reload_env == "auto":
        reload_enabled = True
    else:
        reload_enabled = reload_env not in {"0", "false", "no", "off"}
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload_enabled,
            log_level="info"
        )
    except (PermissionError, OSError) as exc:
        # 在受限环境下watchgod可能没有权限启动，自动降级为禁用热重载
        if not isinstance(exc, PermissionError) and getattr(exc, "errno", None) not in (1,):
            raise
        if reload_env == "auto":
            print(f"热重载启动失败({exc}), 回退为 reload=False")
            uvicorn.run(
                "main:app",
                host=host,
                port=port,
                reload=False,
                log_level="info"
            )
        else:
            raise
