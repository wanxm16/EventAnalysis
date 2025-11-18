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
    OperationLogQuery, OperationLogResponse, OperationStatsResponse, OperationLogFilterOptions,
    # 智能分类相关模型
    ClassifySingleRequest, ClassifySingleResponse, ClassifyBatchRequest,
    ClassifyBatchTaskResponse, ClassifyBatchStatusResponse, ClassificationFeedback,
    CategoryListResponse, FewShotExamplesResponse, ClassificationStatsResponse, TagLibraryResponse,
    TagDefinition,
    TagListResponse, TagCreateRequest, TagUpdateRequest,
    TagGroupCreateRequest, TagGroupUpdateRequest, TagGroupListResponse,
    # 分类任务相关
    ClassificationTask, ClassificationTaskCreate, ClassificationTaskListResponse,
    ClassificationTaskDetailResponse, ClassificationTaskResult
)
from services import event_service, operation_log_service
from tag_service import TagService
from classification_task_service import task_service

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


# ==================== 智能事件分类API ====================

# 全局分类器实例（延迟初始化）
_classifier = None
_batch_tasks = {}  # 批量任务存储
_tag_service = TagService(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'classification'))

def get_classifier():
    """获取分类器实例（单例模式）"""
    global _classifier
    if _classifier is None:
        from qwen_classifier import QwenClassifier
        _classifier = QwenClassifier()
    return _classifier


@app.post("/api/classify/single", response_model=ClassifySingleResponse, summary="单事件智能分类")
async def classify_single_event(request: ClassifySingleRequest):
    """
    单事件智能分类
    使用千问大模型对单个事件进行二级分类预测
    """
    try:
        classifier = get_classifier()

        event_data = {
            '事件描述': request.event_description,
            '事件类型': request.event_type,
            '区县名称': request.district,
            '镇街名称': request.street
        }

        predicted_category, confidence, reasoning, tags = classifier.classify_single(event_data)

        if predicted_category is None:
            raise HTTPException(status_code=500, detail="分类失败，请检查输入或稍后重试")

        return ClassifySingleResponse(
            predicted_category=predicted_category,
            confidence=confidence,
            reasoning=reasoning,
            tags=tags,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分类错误: {str(e)}")


@app.post("/api/classify/batch", response_model=ClassifyBatchTaskResponse, summary="批量事件分类")
async def classify_batch_events(file: UploadFile = File(...)):
    """
    批量事件分类
    上传CSV文件进行批量分类，返回任务ID用于查询进度

    CSV文件格式要求：
    - 必须包含列: 事件描述, 事件类型
    - 可选列: 区县名称, 镇街名称
    """
    import uuid
    import pandas as pd
    from io import BytesIO
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    try:
        # 读取CSV文件
        contents = await file.read()
        df = pd.read_csv(BytesIO(contents), encoding='utf-8')

        # 验证必需列
        required_columns = ['事件描述', '事件类型']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"CSV文件缺少必需列: {', '.join(missing_columns)}")

        # 生成任务ID
        task_id = str(uuid.uuid4())
        total = len(df)

        # 初始化任务状态
        _batch_tasks[task_id] = {
            "task_id": task_id,
            "status": "pending",
            "total": total,
            "processed": 0,
            "success_count": 0,
            "results": [],
            "created_at": datetime.now().isoformat(),
            "completed_at": None
        }

        # 在后台线程处理批量分类
        async def process_batch():
            try:
                classifier = get_classifier()
                _batch_tasks[task_id]["status"] = "processing"

                results = []
                success_count = 0

                for idx, row in df.iterrows():
                    event_data = {
                        '事件描述': str(row.get('事件描述', '')),
                        '事件类型': str(row.get('事件类型', '')),
                        '区县名称': str(row.get('区县名称', '')),
                        '镇街名称': str(row.get('镇街名称', ''))
                    }

                    predicted_category, confidence, reasoning, tags = classifier.classify_single(event_data)

                    if predicted_category:
                        success_count += 1

                    results.append({
                        'index': int(idx),
                        'event_description': event_data['事件描述'],
                        'event_type': event_data['事件类型'],
                        'predicted_category': predicted_category,
                        'confidence': float(confidence) if confidence else 0.0,
                        'reasoning': reasoning,
                        'tags': tags
                    })

                    _batch_tasks[task_id]["processed"] = int(idx) + 1

                _batch_tasks[task_id]["status"] = "completed"
                _batch_tasks[task_id]["success_count"] = success_count
                _batch_tasks[task_id]["results"] = results
                _batch_tasks[task_id]["completed_at"] = datetime.now().isoformat()

            except Exception as e:
                _batch_tasks[task_id]["status"] = "failed"
                _batch_tasks[task_id]["error"] = str(e)
                _batch_tasks[task_id]["completed_at"] = datetime.now().isoformat()

        # 启动后台任务
        asyncio.create_task(process_batch())

        return ClassifyBatchTaskResponse(
            task_id=task_id,
            message="批量分类任务已创建",
            total=total
        )

    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="CSV文件格式错误")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")


@app.get("/api/classify/batch/{task_id}", response_model=ClassifyBatchStatusResponse, summary="查询批量分类任务状态")
async def get_batch_task_status(task_id: str):
    """
    查询批量分类任务状态
    """
    if task_id not in _batch_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")

    task = _batch_tasks[task_id]

    return ClassifyBatchStatusResponse(
        task_id=task["task_id"],
        status=task["status"],
        total=task["total"],
        processed=task["processed"],
        success_count=task["success_count"],
        results=task.get("results") if task["status"] == "completed" else None,
        created_at=task["created_at"],
        completed_at=task.get("completed_at")
    )


@app.post("/api/classify/feedback", summary="提交分类反馈")
async def submit_classification_feedback(feedback: ClassificationFeedback):
    """
    提交分类结果反馈
    用于收集错误分类案例，用于后续模型优化
    """
    try:
        # 保存反馈到文件
        import json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        feedback_dir = os.path.join(parent_dir, 'data', 'classification', 'feedback')
        os.makedirs(feedback_dir, exist_ok=True)

        feedback_file = os.path.join(feedback_dir, 'feedback.jsonl')

        feedback_data = feedback.dict()
        feedback_data['feedback_time'] = datetime.now().isoformat()

        with open(feedback_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(feedback_data, ensure_ascii=False) + '\n')

        return {"message": "反馈提交成功", "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"反馈提交失败: {str(e)}")


@app.get("/api/classify/categories", response_model=CategoryListResponse, summary="获取所有分类")
async def get_all_categories():
    """
    获取所有可用的二级分类列表
    """
    try:
        classifier = get_classifier()

        # 获取分类和事件类型映射
        categories = classifier.available_categories
        by_event_type = classifier.event_type_mapping

        return CategoryListResponse(
            categories=categories,
            total=len(categories),
            by_event_type=by_event_type if by_event_type else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分类失败: {str(e)}")


@app.get("/api/classify/tag-library", response_model=TagLibraryResponse, summary="获取标签库")
async def get_tag_library():
    """
    获取智能分类的标签库定义
    """
    try:
        classifier = get_classifier()
        tag_groups = []

        for group in classifier.tag_groups:
            tags = [
                {
                    "tag_id": tag.get("id"),
                    "label": tag.get("label"),
                    "group_id": group.get("id"),
                    "color": tag.get("color"),
                    "description": tag.get("description"),
                    "type": tag.get("type", "system")
                }
                for tag in group.get("tags", [])
            ]
            tag_groups.append({
                "group_id": group.get("id"),
                "name": group.get("name"),
                "description": group.get("description"),
                "tags": tags
            })

        return TagLibraryResponse(
            metadata=classifier.tag_library.get("metadata"),
            groups=tag_groups,
            default_recommendations=classifier.tag_library.get("default_recommendations"),
            event_type_recommendations=classifier.tag_library.get("event_type_recommendations"),
            category_recommendations=classifier.tag_library.get("category_recommendations")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取标签库失败: {str(e)}")


@app.get("/api/classify/tags", response_model=TagListResponse, summary="查询标签列表")
async def list_tags(
    group_id: Optional[str] = Query(None, description="标签组ID"),
    search: Optional[str] = Query(None, description="按名称/描述模糊搜索"),
    include_system: bool = Query(False, description="是否包含系统标签")
):
    try:
        tags, stats = _tag_service.list_tags(
            group_id=group_id,
            search=search,
            include_system=include_system
        )
        return TagListResponse(tags=tags, total=len(tags), stats=stats)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取标签失败: {str(e)}")


@app.post("/api/classify/tags", response_model=TagDefinition, summary="创建标签")
async def create_tag(request: TagCreateRequest):
    try:
        record = _tag_service.create_tag(request.dict())
        classifier = get_classifier()
        classifier.reload_tag_library()
        tag = _tag_service.get_tag(record.get('id'))
        return TagDefinition(**tag) if tag else TagDefinition(
            tag_id=record.get('id'),
            label=record.get('label'),
            group_id=record.get('group_id'),
            type="custom"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建标签失败: {str(e)}")


@app.put("/api/classify/tags/{tag_id}", response_model=TagDefinition, summary="更新标签")
async def update_tag(tag_id: str, request: TagUpdateRequest):
    try:
        _tag_service.update_tag(tag_id, request.dict(exclude_unset=True))
        classifier = get_classifier()
        classifier.reload_tag_library()
        tag = _tag_service.get_tag(tag_id)
        if not tag:
            raise HTTPException(status_code=404, detail="标签不存在")
        return TagDefinition(**tag)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新标签失败: {str(e)}")


@app.get("/api/classify/tag-groups", response_model=TagGroupListResponse, summary="查询标签组")
async def list_tag_groups(include_system: bool = Query(True, description="是否包含系统标签组")):
    try:
        groups = _tag_service.list_groups(include_system=include_system)
        return TagGroupListResponse(groups=groups, total=len(groups))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取标签组失败: {str(e)}")


@app.post("/api/classify/tag-groups", response_model=TagGroupListResponse, summary="创建标签组")
async def create_tag_group(request: TagGroupCreateRequest):
    try:
        _tag_service.create_group(request.dict())
        classifier = get_classifier()
        classifier.reload_tag_library()
        groups = _tag_service.list_groups(include_system=True)
        return TagGroupListResponse(groups=groups, total=len(groups))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建标签组失败: {str(e)}")


@app.put("/api/classify/tag-groups/{group_id}", response_model=TagGroupListResponse, summary="更新标签组")
async def update_tag_group(group_id: str, request: TagGroupUpdateRequest):
    try:
        _tag_service.update_group(group_id, request.dict(exclude_unset=True))
        classifier = get_classifier()
        classifier.reload_tag_library()
        groups = _tag_service.list_groups(include_system=True)
        return TagGroupListResponse(groups=groups, total=len(groups))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新标签组失败: {str(e)}")


@app.get("/api/classify/few-shot/{category}", response_model=FewShotExamplesResponse, summary="获取Few-shot示例")
async def get_few_shot_examples(category: str):
    """
    获取指定分类的Few-shot示例
    """
    try:
        classifier = get_classifier()

        if category not in classifier.few_shot_examples:
            raise HTTPException(status_code=404, detail=f"分类 '{category}' 不存在")

        examples = classifier.few_shot_examples[category]

        # 转换为响应格式
        formatted_examples = [
            {
                'category': category,
                'event_description': ex.get('事件描述', ''),
                'event_type': ex.get('事件类型', ''),
                'district': ex.get('区县名称', ''),
                'street': ex.get('镇街名称', '')
            }
            for ex in examples
        ]

        return FewShotExamplesResponse(
            category=category,
            examples=formatted_examples,
            total=len(formatted_examples)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取示例失败: {str(e)}")


@app.get("/api/classify/stats", response_model=ClassificationStatsResponse, summary="获取分类统计")
async def get_classification_stats():
    """
    获取分类统计数据
    """
    try:
        # 从批量任务中统计
        total_predictions = sum(task["processed"] for task in _batch_tasks.values())
        total_success = sum(task["success_count"] for task in _batch_tasks.values())

        # 统计分类分布
        category_dist = {}
        event_type_dist = {}
        recent_predictions = []

        for task in _batch_tasks.values():
            if task.get("results"):
                for result in task["results"][:10]:  # 只取前10个最近结果
                    category = result.get("predicted_category")
                    event_type = result.get("event_type")

                    if category:
                        category_dist[category] = category_dist.get(category, 0) + 1
                    if event_type:
                        event_type_dist[event_type] = event_type_dist.get(event_type, 0) + 1

                    recent_predictions.append(result)

        accuracy = total_success / total_predictions if total_predictions > 0 else 0.0

        # 计算平均置信度
        all_confidences = [
            result.get("confidence", 0.0)
            for task in _batch_tasks.values()
            if task.get("results")
            for result in task["results"]
            if result.get("confidence") is not None
        ]
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

        return ClassificationStatsResponse(
            total_predictions=total_predictions,
            accuracy=accuracy,
            avg_confidence=avg_confidence,
            category_distribution=category_dist,
            event_type_distribution=event_type_dist,
            recent_predictions=recent_predictions[:20]  # 最近20个预测
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计失败: {str(e)}")


# ==================== 分类任务管理 API ====================

@app.get("/api/classify/tasks", response_model=ClassificationTaskListResponse, summary="获取任务列表")
async def get_classification_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """获取分类任务列表"""
    try:
        result = task_service.get_tasks(page=page, page_size=page_size)
        return ClassificationTaskListResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务列表失败: {str(e)}")


@app.post("/api/classify/tasks", response_model=ClassificationTask, summary="创建分类任务")
async def create_classification_task(request: ClassificationTaskCreate):
    """创建新的分类任务"""
    try:
        # 验证任务类型和参数
        if request.task_type == 'classify' and not request.category_id:
            raise HTTPException(status_code=400, detail="分类任务必须指定 category_id")

        if request.task_type == 'tag' and not request.tag_ids:
            raise HTTPException(status_code=400, detail="打标任务必须指定 tag_ids")

        task_id = task_service.create_task(
            name=request.name,
            task_type=request.task_type,
            category_id=request.category_id,
            tag_ids=request.tag_ids,
            created_by=request.created_by
        )

        task = task_service.get_task(task_id)
        return ClassificationTask(**task)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建任务失败: {str(e)}")


@app.post("/api/classify/tasks/{task_id}/upload", summary="上传Excel文件")
async def upload_task_file(
    task_id: str,
    file: UploadFile = File(...)
):
    """上传任务的Excel文件"""
    try:
        # 验证文件类型
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="只支持Excel文件 (.xlsx, .xls)")

        # 读取文件内容
        content = await file.read()

        # 上传并解析文件
        result = task_service.upload_file(task_id, content, file.filename)

        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', '上传失败'))

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传文件失败: {str(e)}")


@app.post("/api/classify/tasks/{task_id}/start", summary="启动任务")
async def start_classification_task(task_id: str):
    """启动分类/打标任务"""
    try:
        task = task_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")

        if task['status'] != 'pending':
            raise HTTPException(status_code=400, detail=f"任务状态为 {task['status']}，无法启动")

        if not task.get('file_name'):
            raise HTTPException(status_code=400, detail="请先上传Excel文件")

        # 异步启动任务
        task_service.start_task(task_id)

        return {"success": True, "message": "任务已启动"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动任务失败: {str(e)}")


@app.get("/api/classify/tasks/{task_id}", response_model=ClassificationTaskDetailResponse, summary="获取任务详情")
async def get_classification_task_detail(
    task_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    """获取任务详情和结果"""
    try:
        result = task_service.get_task_detail(task_id, page=page, page_size=page_size)
        if not result:
            raise HTTPException(status_code=404, detail="任务不存在")

        return ClassificationTaskDetailResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务详情失败: {str(e)}")


@app.delete("/api/classify/tasks/{task_id}", summary="删除任务")
async def delete_classification_task(task_id: str):
    """删除分类任务"""
    try:
        success = task_service.delete_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="任务不存在")

        return {"success": True, "message": "任务已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除任务失败: {str(e)}")


@app.get("/api/classify/tasks/{task_id}/export", summary="导出任务结果")
async def export_task_results(task_id: str):
    """导出任务结果为Excel"""
    try:
        df = task_service.export_results(task_id)
        if df is None:
            raise HTTPException(status_code=404, detail="任务结果不存在")

        # 导出为Excel
        from io import BytesIO
        output = BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)

        task = task_service.get_task(task_id)
        filename = f"{task['name']}_结果.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出结果失败: {str(e)}")


# ==================== AI报告生成系统 API ====================
# 集成 EventReport 报告生成功能

from report_gen.api import projects as report_projects
from report_gen.api import prompts as report_prompts
from report_gen.api import report as report_generation
from report_gen.api import upload as report_upload

# Include EventReport routers with /api prefix
app.include_router(report_projects.router, prefix="/api", tags=["报告-项目管理"])
app.include_router(report_prompts.router, prefix="/api", tags=["报告-Prompt管理"])
app.include_router(report_generation.router, prefix="/api", tags=["报告-生成"])
app.include_router(report_upload.router, prefix="/api", tags=["报告-文件上传"])


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
