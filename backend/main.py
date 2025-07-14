from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn
from contextlib import asynccontextmanager
from datetime import datetime

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
    ChatQuery,
    ChatResponse, 
    ChatStatistics,
    ClusterEditRequest,
    UndoRequest,
    EventClusterInfo,
    ClusterEditResponse,
    Subscription,
    SubscriptionCreateRequest,
    SubscriptionUpdateRequest,
    SubscriptionListResponse
)
from services import event_service

# 全局变量存储AI聊天服务实例
ai_chat_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global ai_chat_service
    # 启动时
    try:
        print("🔄 正在初始化AI聊天服务...")
        from ai_chat_service import AIChatService
        ai_chat_service = AIChatService()
        print("✅ AI聊天服务初始化完成")
    except Exception as e:
        print(f"❌ AI聊天服务初始化失败: {e}")
        # 不阻止应用启动，但记录错误
        ai_chat_service = None
    
    yield  # 应用运行
    
    # 关闭时
    print("🔄 正在关闭AI聊天服务...")

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
    import os
    
    # 检查服务状态文件是否存在
    service_file = "../.service_status"
    service_active = os.path.exists(service_file)
    
    return {
        "status": "healthy" if service_active else "stopping",
        "service_active": service_active,
        "message": "API is running normally" if service_active else "Service is stopping"
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

# 显式处理OPTIONS请求
@app.options("/api/chat")
async def chat_options():
    """处理CORS预检请求"""
    return {"message": "OK"}

# AI问答API端点
@app.post("/api/chat", response_model=ChatResponse, summary="AI问答接口")
async def chat(query: ChatQuery):
    """
    AI问答接口，支持自然语言查询事件数据
    
    - **message**: 用户的问题或查询内容
    - **conversation_id**: 可选的对话ID，用于上下文追踪
    """
    try:
        # 检查AI聊天服务是否已初始化
        if ai_chat_service is None:
            raise HTTPException(status_code=503, detail="AI聊天服务未初始化")
        
        # 调用AI问答服务
        result = ai_chat_service.chat(query.message)
        
        # 转换为响应模型
        return ChatResponse(
            success=True,
            message=result['answer'],
            query_type=result.get('query_type'),
            conversation_id=query.conversation_id,
            data=result.get('data')
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI问答处理失败: {str(e)}")

@app.get("/api/chat/statistics", response_model=ChatStatistics, summary="获取数据统计信息")
async def get_chat_statistics():
    """
    获取AI问答系统的数据统计信息
    """
    try:
        if ai_chat_service is None:
            raise HTTPException(status_code=503, detail="AI聊天服务未初始化")
        
        stats = ai_chat_service.get_statistics()
        
        return ChatStatistics(
            total_events=stats.get('total_events', 0),
            by_town=stats.get('by_town', []),
            by_level=stats.get('by_level', []),
            by_category=stats.get('by_category', [])
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")

@app.get("/api/chat/health", summary="AI问答健康检查")
async def chat_health_check():
    """AI问答系统健康检查"""
    try:
        if ai_chat_service is None:
            return {
                "status": "error",
                "message": "AI聊天服务未初始化",
                "data_loaded": False
            }
        
        return {
            "status": "healthy",
            "message": "AI问答系统运行正常",
            "data_loaded": True
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"AI问答系统异常: {str(e)}",
            "data_loaded": False
        }

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
        
        # 重新初始化AI聊天服务
        global ai_chat_service
        try:
            print("🔄 重新初始化AI聊天服务...")
            from ai_chat_service import AIChatService
            ai_chat_service = AIChatService()
            print("✅ AI聊天服务重新初始化完成")
        except Exception as e:
            print(f"❌ AI聊天服务重新初始化失败: {e}")
            ai_chat_service = None
        
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

@app.post("/api/reinit-ai", summary="重新初始化AI聊天服务")
async def reinit_ai_service():
    """
    重新初始化AI聊天服务，用于修复AI服务初始化失败的问题
    """
    try:
        global ai_chat_service
        
        print("🔄 开始重新初始化AI聊天服务...")
        
        # 先释放旧的服务实例
        ai_chat_service = None
        
        # 重新导入和初始化
        from ai_chat_service import AIChatService
        ai_chat_service = AIChatService()
        
        print("✅ AI聊天服务重新初始化成功")
        
        # 测试服务是否正常
        stats = ai_chat_service.get_statistics()
        
        return {
            "success": True,
            "message": "AI聊天服务重新初始化成功",
            "timestamp": datetime.now().isoformat(),
            "stats": {
                "total_events": stats.get('total_events', 0),
                "service_available": True
            }
        }
        
    except Exception as e:
        print(f"❌ AI聊天服务重新初始化失败: {e}")
        ai_chat_service = None
        return {
            "success": False,
            "message": f"AI聊天服务重新初始化失败: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "stats": {
                "total_events": 0,
                "service_available": False
            }
        }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 