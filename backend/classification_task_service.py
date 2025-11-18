"""分类任务管理服务"""
import json
import uuid
import threading
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from qwen_classifier import QwenClassifier


class ClassificationTaskService:
    """分类任务管理服务"""

    def __init__(self):
        self.data_dir = Path("data/classification")
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.tasks_file = self.data_dir / "tasks.json"
        self.results_dir = self.data_dir / "task_results"
        self.results_dir.mkdir(parents=True, exist_ok=True)

        self.upload_dir = Path("data/classification/uploads")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        # 初始化分类器
        self.classifier = QwenClassifier()

        # 确保任务文件存在
        if not self.tasks_file.exists():
            self._save_tasks([])

    def _load_tasks(self) -> List[Dict]:
        """加载所有任务"""
        try:
            with open(self.tasks_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def _save_tasks(self, tasks: List[Dict]):
        """保存任务列表"""
        with open(self.tasks_file, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2)

    def _load_results(self, task_id: str) -> List[Dict]:
        """加载任务结果"""
        results_file = self.results_dir / f"{task_id}.json"
        if not results_file.exists():
            return []

        try:
            with open(results_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def _save_results(self, task_id: str, results: List[Dict]):
        """保存任务结果"""
        results_file = self.results_dir / f"{task_id}.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    def _update_task(self, task_id: str, updates: Dict):
        """更新任务信息"""
        tasks = self._load_tasks()
        for task in tasks:
            if task['id'] == task_id:
                task.update(updates)
                break
        self._save_tasks(tasks)

    def get_tasks(self, page: int = 1, page_size: int = 20) -> Dict:
        """获取任务列表"""
        tasks = self._load_tasks()

        # 按创建时间倒序排序
        tasks.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        # 分页
        start = (page - 1) * page_size
        end = start + page_size

        return {
            "tasks": tasks[start:end],
            "total": len(tasks)
        }

    def get_task(self, task_id: str) -> Optional[Dict]:
        """获取单个任务"""
        tasks = self._load_tasks()
        for task in tasks:
            if task['id'] == task_id:
                return task
        return None

    def create_task(self, name: str, task_type: str, category_ids: Optional[List[str]] = None,
                   tag_ids: Optional[List[str]] = None, created_by: str = "admin") -> str:
        """创建任务"""
        task_id = str(int(datetime.now().timestamp() * 1000))

        # 获取分类/标签名称
        category_names = None
        tag_names = None

        if task_type == 'classify' and category_ids:
            # category_ids现在直接就是分类名称列表
            category_names = category_ids

        elif task_type == 'tag' and tag_ids:
            # 从tag_library.json获取标签名称
            try:
                tag_library_file = self.data_dir / "tag_library.json"
                if tag_library_file.exists():
                    with open(tag_library_file, 'r', encoding='utf-8') as f:
                        tag_data = json.load(f)
                        tags = tag_data.get('tags', [])
                        tag_names = []
                        for tag_id in tag_ids:
                            for tag in tags:
                                if tag['id'] == tag_id:
                                    tag_names.append(tag['label'])
                                    break
            except Exception:
                pass

        task = {
            "id": task_id,
            "name": name,
            "task_type": task_type,
            "status": "pending",
            "category_ids": category_ids,
            "category_names": category_names,
            "tag_ids": tag_ids,
            "tag_names": tag_names,
            "file_name": "",
            "total_count": 0,
            "processed_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "created_by": created_by,
            "created_at": datetime.now().isoformat(),
            "started_at": None,
            "completed_at": None,
            "error_message": None
        }

        tasks = self._load_tasks()
        tasks.append(task)
        self._save_tasks(tasks)

        return task_id

    def upload_file(self, task_id: str, file_content: bytes, filename: str) -> Dict:
        """上传Excel文件并解析"""
        # 保存文件
        file_path = self.upload_dir / f"{task_id}_{filename}"
        with open(file_path, 'wb') as f:
            f.write(file_content)

        # 解析Excel
        try:
            df = pd.read_excel(file_path)

            # 验证必需的列
            required_columns = ['事件标题', '事件描述']
            missing_columns = [col for col in required_columns if col not in df.columns]

            if missing_columns:
                return {
                    "success": False,
                    "error": f"Excel缺少必需的列: {', '.join(missing_columns)}"
                }

            # 更新任务信息
            self._update_task(task_id, {
                "file_name": filename,
                "total_count": len(df)
            })

            return {
                "success": True,
                "total_count": len(df),
                "preview": df.head(5).to_dict('records')
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"解析Excel失败: {str(e)}"
            }

    def start_task(self, task_id: str):
        """启动任务（异步执行）"""
        # 在后台线程中执行任务
        thread = threading.Thread(target=self._execute_task, args=(task_id,))
        thread.daemon = True
        thread.start()

    def _execute_task(self, task_id: str):
        """执行分类/打标任务"""
        try:
            # 更新任务状态为运行中
            self._update_task(task_id, {
                "status": "running",
                "started_at": datetime.now().isoformat()
            })

            # 获取任务信息
            task = self.get_task(task_id)
            if not task:
                return

            # 读取Excel文件
            file_path = self.upload_dir / task['file_name']
            if not file_path.exists():
                # 尝试带任务ID的文件名
                file_path = self.upload_dir / f"{task_id}_{task['file_name']}"

            if not file_path.exists():
                self._update_task(task_id, {
                    "status": "failed",
                    "error_message": "找不到上传的文件",
                    "completed_at": datetime.now().isoformat()
                })
                return

            df = pd.read_excel(file_path)
            results = []
            success_count = 0
            failed_count = 0

            # 处理每一行
            for idx, row in df.iterrows():
                try:
                    event_title = str(row.get('事件标题', ''))
                    event_description = str(row.get('事件描述', ''))
                    event_id = str(row.get('事件ID', '')) if '事件ID' in row else None
                    event_type = str(row.get('事件类型', '')) if '事件类型' in row else ''

                    if task['task_type'] == 'classify':
                        # 分类任务
                        # 构建符合classifier期望的事件数据格式
                        event_data = {
                            '事件描述': f"{event_title}\n{event_description}" if event_title else event_description,
                            '事件类型': event_type
                        }

                        # 调用分类器，传入用户选择的分类列表
                        custom_categories = task.get('category_names')
                        predicted_category, confidence, reasoning, tags = self.classifier.classify_single(
                            event_data,
                            custom_categories=custom_categories
                        )

                        task_result = {
                            "id": str(uuid.uuid4()),
                            "task_id": task_id,
                            "event_id": event_id,
                            "event_title": event_title,
                            "event_description": event_description,
                            "predicted_category": predicted_category,
                            "predicted_tags": None,
                            "confidence": confidence,
                            "reasoning": reasoning,
                            "status": "success",
                            "error_message": None,
                            "processed_at": datetime.now().isoformat()
                        }
                        success_count += 1

                    else:  # tag
                        # 打标任务
                        # 复用classify_single方法，从返回的tags中提取标签
                        event_data = {
                            '事件描述': f"{event_title}\n{event_description}" if event_title else event_description,
                            '事件类型': event_type
                        }

                        predicted_category, confidence, reasoning, tags = self.classifier.classify_single(event_data)

                        # 提取标签标签
                        matched_tags = [tag['label'] for tag in tags if tag.get('label')]

                        task_result = {
                            "id": str(uuid.uuid4()),
                            "task_id": task_id,
                            "event_id": event_id,
                            "event_title": event_title,
                            "event_description": event_description,
                            "predicted_category": None,
                            "predicted_tags": matched_tags,
                            "confidence": confidence,
                            "reasoning": reasoning,
                            "status": "success",
                            "error_message": None,
                            "processed_at": datetime.now().isoformat()
                        }
                        success_count += 1

                    results.append(task_result)

                except Exception as e:
                    # 单条记录处理失败
                    task_result = {
                        "id": str(uuid.uuid4()),
                        "task_id": task_id,
                        "event_id": event_id if 'event_id' in locals() else None,
                        "event_title": event_title if 'event_title' in locals() else '',
                        "event_description": event_description if 'event_description' in locals() else '',
                        "predicted_category": None,
                        "predicted_tags": None,
                        "confidence": 0.0,
                        "reasoning": "",
                        "status": "failed",
                        "error_message": str(e),
                        "processed_at": datetime.now().isoformat()
                    }
                    results.append(task_result)
                    failed_count += 1

                # 更新进度
                self._update_task(task_id, {
                    "processed_count": idx + 1,
                    "success_count": success_count,
                    "failed_count": failed_count
                })

            # 保存结果
            self._save_results(task_id, results)

            # 更新任务状态为完成
            self._update_task(task_id, {
                "status": "completed",
                "completed_at": datetime.now().isoformat(),
                "success_count": success_count,
                "failed_count": failed_count
            })

        except Exception as e:
            # 任务执行失败
            self._update_task(task_id, {
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.now().isoformat()
            })

    def get_task_detail(self, task_id: str, page: int = 1, page_size: int = 50) -> Optional[Dict]:
        """获取任务详情和结果"""
        task = self.get_task(task_id)
        if not task:
            return None

        results = self._load_results(task_id)

        # 分页
        start = (page - 1) * page_size
        end = start + page_size

        return {
            "task": task,
            "results": results[start:end],
            "total_results": len(results)
        }

    def delete_task(self, task_id: str) -> bool:
        """删除任务"""
        tasks = self._load_tasks()
        original_len = len(tasks)
        tasks = [t for t in tasks if t['id'] != task_id]

        if len(tasks) < original_len:
            self._save_tasks(tasks)

            # 删除结果文件
            results_file = self.results_dir / f"{task_id}.json"
            if results_file.exists():
                results_file.unlink()

            return True

        return False

    def export_results(self, task_id: str) -> Optional[pd.DataFrame]:
        """导出任务结果为DataFrame"""
        results = self._load_results(task_id)
        if not results:
            return None

        # 转换为DataFrame
        df = pd.DataFrame(results)

        # 选择需要的列
        columns = ['event_id', 'event_title', 'event_description',
                  'predicted_category', 'predicted_tags', 'confidence',
                  'reasoning', 'status', 'error_message']

        return df[columns]


# 全局实例
task_service = ClassificationTaskService()
