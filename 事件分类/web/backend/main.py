#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FastAPI 后端主程序
事件分类系统Web API
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import json
import pandas as pd
from datetime import datetime
import uuid

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.qwen_classifier import QwenClassifier
from config.config import PATHS

app = FastAPI(title="事件分类系统API", version="1.0.0")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002"],  # React开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局分类器实例
classifier = QwenClassifier()

# 任务存储（实际生产应使用Redis/数据库）
batch_tasks = {}


# ==================== 数据模型 ====================

class SingleEventRequest(BaseModel):
    """单事件分类请求"""
    event_description: str
    event_type: str
    district: str = ""
    street: str = ""


class SingleEventResponse(BaseModel):
    """单事件分类响应"""
    predicted_category: str
    confidence: float
    reasoning: Optional[str] = None
    timestamp: str


class FeedbackRequest(BaseModel):
    """分类结果反馈"""
    event_description: str
    event_type: str
    predicted_category: str
    correct_category: str
    confidence: float


class CategoryConfig(BaseModel):
    """分类配置"""
    category_name: str
    event_types: List[str]
    enabled: bool = True


class FewShotExample(BaseModel):
    """Few-shot示例"""
    category: str
    event_description: str
    event_type: str
    district: str = ""
    street: str = ""


class PromptTemplate(BaseModel):
    """提示词模板"""
    template_name: str
    template_content: str
    variables: List[str]


class BatchTaskStatus(BaseModel):
    """批量任务状态"""
    task_id: str
    status: str  # pending, processing, completed, failed
    total: int
    processed: int
    success_count: int
    results: Optional[List[Dict]] = None
    created_at: str
    completed_at: Optional[str] = None


# ==================== API端点 ====================

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "事件分类系统API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check():
    """健康检查"""
    try:
        # 测试分类器是否正常
        test_event = {
            '事件描述': '测试',
            '事件类型': '矛盾纠纷',
            '区县名称': '',
            '镇街名称': ''
        }
        result, _ = classifier.classify_single(test_event)

        return {
            "status": "healthy",
            "classifier": "ready",
            "categories_count": len(classifier.available_categories)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# ==================== 1. 单事件分类 ====================

@app.post("/api/classify/single", response_model=SingleEventResponse)
async def classify_single_event(request: SingleEventRequest):
    """单事件实时分类"""
    try:
        event_data = {
            '事件描述': request.event_description,
            '事件类型': request.event_type,
            '区县名称': request.district,
            '镇街名称': request.street
        }

        predicted_category, confidence, reasoning = classifier.classify_single(event_data)

        if predicted_category is None:
            raise HTTPException(status_code=500, detail="分类失败，请检查输入或稍后重试")

        return SingleEventResponse(
            predicted_category=predicted_category,
            confidence=confidence,
            reasoning=reasoning,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分类错误: {str(e)}")


# ==================== 2. 批量分类 ====================

def process_batch_classification(task_id: str, file_path: str):
    """后台处理批量分类"""
    try:
        # 读取CSV文件
        df = pd.read_csv(file_path, encoding='utf-8')
        total = len(df)

        batch_tasks[task_id]["status"] = "processing"
        batch_tasks[task_id]["total"] = total

        results = []
        success_count = 0

        for idx, row in df.iterrows():
            event_data = {
                '事件描述': row.get('事件描述', ''),
                '事件类型': row.get('事件类型', ''),
                '区县名称': row.get('区县名称', ''),
                '镇街名称': row.get('镇街名称', '')
            }

            predicted_category, confidence, reasoning = classifier.classify_single(event_data)

            result = {
                'index': idx,
                'event_description': event_data['事件描述'],
                'event_type': event_data['事件类型'],
                'predicted_category': predicted_category,
                'confidence': confidence,
                'reasoning': reasoning,
                'original_category': row.get('二级分类', '')
            }

            results.append(result)

            if predicted_category:
                success_count += 1

            # 更新进度
            batch_tasks[task_id]["processed"] = idx + 1
            batch_tasks[task_id]["success_count"] = success_count

        # 保存结果
        batch_tasks[task_id]["status"] = "completed"
        batch_tasks[task_id]["results"] = results
        batch_tasks[task_id]["completed_at"] = datetime.now().isoformat()

        # 删除临时文件
        os.remove(file_path)

    except Exception as e:
        batch_tasks[task_id]["status"] = "failed"
        batch_tasks[task_id]["error"] = str(e)


@app.post("/api/classify/batch")
async def classify_batch_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """批量分类 - 上传CSV文件"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="仅支持CSV文件")

    # 生成任务ID
    task_id = str(uuid.uuid4())

    # 保存上传的文件
    upload_dir = "web/backend/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{task_id}.csv")

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # 创建任务记录
    batch_tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "total": 0,
        "processed": 0,
        "success_count": 0,
        "created_at": datetime.now().isoformat(),
        "filename": file.filename
    }

    # 添加后台任务
    background_tasks.add_task(process_batch_classification, task_id, file_path)

    return {
        "task_id": task_id,
        "message": "批量分类任务已创建"
    }


@app.get("/api/classify/batch/{task_id}", response_model=BatchTaskStatus)
async def get_batch_status(task_id: str):
    """获取批量分类任务状态"""
    if task_id not in batch_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")

    task = batch_tasks[task_id]

    return BatchTaskStatus(
        task_id=task["task_id"],
        status=task["status"],
        total=task["total"],
        processed=task["processed"],
        success_count=task["success_count"],
        results=task.get("results"),
        created_at=task["created_at"],
        completed_at=task.get("completed_at")
    )


# ==================== 3. 结果反馈 ====================

@app.post("/api/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """提交分类结果反馈（用于模型改进）"""
    try:
        # 保存反馈到文件
        feedback_dir = "web/backend/feedback"
        os.makedirs(feedback_dir, exist_ok=True)

        feedback_file = os.path.join(feedback_dir, "feedback.jsonl")

        feedback_data = {
            "timestamp": datetime.now().isoformat(),
            "event_description": feedback.event_description,
            "event_type": feedback.event_type,
            "predicted_category": feedback.predicted_category,
            "correct_category": feedback.correct_category,
            "confidence": feedback.confidence
        }

        with open(feedback_file, "a", encoding='utf-8') as f:
            f.write(json.dumps(feedback_data, ensure_ascii=False) + "\n")

        return {
            "message": "反馈已保存",
            "feedback_id": str(uuid.uuid4())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存反馈失败: {str(e)}")


# ==================== 4. 分类配置管理 ====================

@app.get("/api/categories")
async def get_categories():
    """获取所有分类"""
    # 从所有事件类型的映射中收集所有唯一的二级分类
    all_categories = set()
    for categories in classifier.event_type_mapping.values():
        all_categories.update(categories)

    categories_list = sorted(list(all_categories))

    return {
        "categories": categories_list,
        "total": len(categories_list)
    }


@app.get("/api/event-types")
async def get_event_types():
    """获取所有事件类型"""
    return {
        "event_types": list(classifier.event_type_mapping.keys()),
        "total": len(classifier.event_type_mapping)
    }


@app.get("/api/categories/mapping")
async def get_category_mapping():
    """获取事件类型和分类的映射关系"""
    return classifier.event_type_mapping


@app.post("/api/categories")
async def add_category(category: CategoryConfig):
    """添加新分类"""
    # TODO: 实现添加新分类到配置文件
    # 需要更新 event_type_category_mapping.json
    return {
        "message": "分类添加功能开发中"
    }


# ==================== 5. Few-shot示例管理 ====================

@app.get("/api/few-shot")
async def get_few_shot_examples():
    """获取所有Few-shot示例"""
    # 返回所有分类的示例数据
    # 格式: { "分类名": [示例1, 示例2, ...], ... }
    return classifier.few_shot_examples


@app.get("/api/few-shot/{category}")
async def get_category_examples(category: str):
    """获取指定分类的Few-shot示例"""
    if category not in classifier.few_shot_examples:
        raise HTTPException(status_code=404, detail="分类不存在")

    return {
        "category": category,
        "examples": classifier.few_shot_examples[category]
    }


@app.post("/api/few-shot")
async def add_few_shot_example(example: FewShotExample):
    """添加Few-shot示例"""
    # TODO: 实现添加示例到 few_shot_examples.json
    return {
        "message": "示例添加功能开发中"
    }


# ==================== 6. 提示词管理 ====================

@app.get("/api/prompts")
async def get_prompt_templates():
    """获取提示词模板"""
    # 从分类器中提取当前提示词构建逻辑
    return {
        "templates": [
            {
                "name": "基础提示词",
                "description": "用于事件分类的基础提示词模板",
                "variables": ["event_description", "event_type", "district", "street", "valid_categories"]
            }
        ]
    }


# ==================== 7. 结果分析 ====================

@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """获取分析摘要"""
    # 读取历史预测结果进行统计
    try:
        if os.path.exists(PATHS['predictions']):
            df = pd.read_csv(PATHS['predictions'])

            total_predictions = len(df)

            # 计算准确率（如果有真实标签）
            if '真实分类' in df.columns:
                accuracy = (df['predicted_category'] == df['真实分类']).sum() / total_predictions
            else:
                accuracy = None

            # 统计各分类预测数量
            category_distribution = df['predicted_category'].value_counts().to_dict()

            # 平均置信度
            avg_confidence = df['confidence'].mean() if 'confidence' in df.columns else None

            return {
                "total_predictions": int(total_predictions),
                "accuracy": float(accuracy) if accuracy else None,
                "avg_confidence": float(avg_confidence) if avg_confidence else None,
                "category_distribution": category_distribution,
                "last_updated": datetime.now().isoformat()
            }
        else:
            return {
                "message": "暂无预测数据"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析错误: {str(e)}")


@app.get("/api/analytics/confusion")
async def get_confusion_matrix():
    """获取混淆矩阵数据"""
    # TODO: 从评估结果中读取混淆矩阵
    return {
        "message": "混淆矩阵功能开发中"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
