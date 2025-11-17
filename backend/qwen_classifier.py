#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
千问分类器模块
基于千问大模型实现事件分类功能
集成到事件分析系统
"""

import json
import time
import logging
import requests
import os
from typing import List, Dict, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock


class QwenClassifier:
    """千问分类器类"""

    def __init__(self, config_path=None):
        """初始化分类器"""
        # 从环境变量或配置文件加载API密钥
        self.api_key = os.getenv('QWEN_API_KEY', '')
        self.base_url = os.getenv('QWEN_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
        self.model = os.getenv('QWEN_MODEL', 'qwen-plus')
        self.max_tokens = int(os.getenv('QWEN_MAX_TOKENS', '1000'))
        self.temperature = float(os.getenv('QWEN_TEMPERATURE', '0.1'))
        self.timeout = int(os.getenv('QWEN_TIMEOUT', '30'))
        self.max_retries = int(os.getenv('QWEN_MAX_RETRIES', '3'))
        self.retry_delay = int(os.getenv('QWEN_RETRY_DELAY', '1'))

        # 设置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

        # 数据文件路径
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        self.data_dir = os.path.join(parent_dir, 'data', 'classification')

        # 确保数据目录存在
        os.makedirs(self.data_dir, exist_ok=True)

        # 加载配置数据
        self.few_shot_examples = self._load_few_shot_examples()
        self.available_categories = list(self.few_shot_examples.keys()) if self.few_shot_examples else []
        self.event_type_mapping = self._load_event_type_mapping()
        self.category_aliases = self._load_category_aliases()

        # 并发控制
        self.progress_lock = Lock()
        self.processed_count = 0

        self.logger.info(f"千问分类器初始化完成")
        self.logger.info(f"支持 {len(self.available_categories)} 个分类")
        self.logger.info(f"加载了 {len(self.event_type_mapping)} 种事件类型的映射关系")

    def _load_few_shot_examples(self) -> Dict:
        """加载Few-shot示例"""
        try:
            file_path = os.path.join(self.data_dir, 'few_shot_examples.json')
            if not os.path.exists(file_path):
                self.logger.warning(f"Few-shot示例文件不存在: {file_path}")
                return {}
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"加载Few-shot示例失败: {e}")
            return {}

    def _load_event_type_mapping(self) -> Dict:
        """加载事件类型到二级分类的映射关系"""
        try:
            file_path = os.path.join(self.data_dir, 'event_type_category_mapping.json')
            if not os.path.exists(file_path):
                self.logger.warning(f"事件类型映射文件不存在: {file_path}")
                return {}
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"加载事件类型映射失败: {e}")
            return {}

    def _load_category_aliases(self) -> Dict:
        """加载分类别名映射"""
        try:
            file_path = os.path.join(self.data_dir, 'category_aliases.json')
            if not os.path.exists(file_path):
                self.logger.warning(f"分类别名文件不存在: {file_path}")
                return {}
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"加载分类别名失败: {e}")
            return {}

    def _get_valid_categories_for_event_type(self, event_type: str) -> List[str]:
        """
        根据事件类型获取有效的二级分类列表

        Args:
            event_type: 事件类型

        Returns:
            该事件类型下允许的二级分类列表
        """
        if not event_type or not self.event_type_mapping:
            return self.available_categories

        valid_categories = self.event_type_mapping.get(event_type, [])

        if not valid_categories:
            self.logger.warning(f"未找到事件类型 '{event_type}' 的映射关系，使用所有分类")
            return self.available_categories

        return valid_categories

    def _build_prompt(self, event_description: str, event_type: str = "") -> str:
        """
        构建分类提示词

        Args:
            event_description: 事件描述
            event_type: 事件类型

        Returns:
            构建好的提示词
        """
        valid_categories = self._get_valid_categories_for_event_type(event_type)

        prompt = f"""你是一个专业的事件分类专家，需要根据事件描述将事件分类到正确的二级分类中。

当前事件类型：{event_type if event_type else '未指定'}

该事件类型下可选的二级分类包括：
"""

        categories_list = "、".join(valid_categories[:30])  # 限制显示前30个分类
        prompt += f"{categories_list}\n\n"

        # 添加Few-shot示例（选择最相关的5个）
        if self.few_shot_examples and valid_categories:
            prompt += "以下是一些参考示例：\n\n"
            example_count = 0
            for category in valid_categories[:5]:  # 只显示前5个分类的示例
                examples = self.few_shot_examples.get(category, [])
                if examples and example_count < 5:
                    example = examples[0]  # 取第一个示例
                    prompt += f"【分类：{category}】\n"
                    prompt += f"事件描述：{example.get('事件描述', '')}\n\n"
                    example_count += 1

        # 添加待分类事件
        prompt += f"现在请分类以下事件：\n\n"
        prompt += f"事件描述：{event_description}\n\n"
        prompt += f"输出要求：\n"
        prompt += f"1. 只输出最匹配的二级分类名称\n"
        prompt += f"2. 必须从上述可选分类中选择一个\n"
        prompt += f"3. 不要输出任何解释或其他内容\n\n"
        prompt += f"二级分类："

        return prompt

    def _call_qwen_api(self, prompt: str) -> Optional[str]:
        """
        调用千问API

        Args:
            prompt: 提示词

        Returns:
            API返回的分类结果
        """
        if not self.api_key:
            self.logger.error("未配置QWEN_API_KEY，无法调用分类服务")
            return None

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

        data = {
            'model': self.model,
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'temperature': self.temperature,
            'max_tokens': self.max_tokens
        }

        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=self.timeout
                )

                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content'].strip()
                    return content
                else:
                    self.logger.warning(f"API调用失败 (状态码 {response.status_code}): {response.text}")

            except requests.exceptions.Timeout:
                self.logger.warning(f"API调用超时 (尝试 {attempt + 1}/{self.max_retries})")
            except Exception as e:
                self.logger.error(f"API调用异常: {e}")

            if attempt < self.max_retries - 1:
                time.sleep(self.retry_delay)

        return None

    def _match_category(self, predicted_text: str, valid_categories: List[str]) -> Optional[str]:
        """
        将模型输出匹配到标准分类
        使用5层智能匹配算法

        Args:
            predicted_text: 模型输出文本
            valid_categories: 有效分类列表

        Returns:
            匹配的标准分类名称
        """
        predicted_text = predicted_text.strip()

        # Layer 1: 别名映射
        if predicted_text in self.category_aliases:
            mapped = self.category_aliases[predicted_text]
            if mapped in valid_categories:
                return mapped

        # Layer 2: 完全匹配
        if predicted_text in valid_categories:
            return predicted_text

        # Layer 3: 包含匹配
        for category in valid_categories:
            if predicted_text in category or category in predicted_text:
                return category

        # Layer 4: 关键词匹配（简化版）
        predicted_keywords = set(predicted_text)
        best_match = None
        best_score = 0

        for category in valid_categories:
            category_keywords = set(category)
            overlap = len(predicted_keywords & category_keywords)
            score = overlap / max(len(predicted_keywords), len(category_keywords))

            if score > best_score and score >= 0.5:
                best_score = score
                best_match = category

        if best_match:
            return best_match

        # Layer 5: 相似度匹配（简化版 - 使用编辑距离）
        def levenshtein_distance(s1, s2):
            if len(s1) < len(s2):
                return levenshtein_distance(s2, s1)
            if len(s2) == 0:
                return len(s1)

            previous_row = range(len(s2) + 1)
            for i, c1 in enumerate(s1):
                current_row = [i + 1]
                for j, c2 in enumerate(s2):
                    insertions = previous_row[j + 1] + 1
                    deletions = current_row[j] + 1
                    substitutions = previous_row[j] + (c1 != c2)
                    current_row.append(min(insertions, deletions, substitutions))
                previous_row = current_row

            return previous_row[-1]

        best_match = None
        best_similarity = 0

        for category in valid_categories:
            distance = levenshtein_distance(predicted_text, category)
            max_len = max(len(predicted_text), len(category))
            similarity = 1 - (distance / max_len) if max_len > 0 else 0

            if similarity > best_similarity and similarity >= 0.7:
                best_similarity = similarity
                best_match = category

        return best_match

    def classify_single(self, event_data: Dict) -> Tuple[Optional[str], float, Optional[str]]:
        """
        单事件分类

        Args:
            event_data: 事件数据字典，包含 '事件描述' 和 '事件类型'

        Returns:
            (predicted_category, confidence, reasoning) 三元组
        """
        event_description = event_data.get('事件描述', '')
        event_type = event_data.get('事件类型', '')

        if not event_description:
            self.logger.warning("事件描述为空")
            return None, 0.0, "事件描述为空"

        # 构建提示词
        prompt = self._build_prompt(event_description, event_type)

        # 调用API
        raw_output = self._call_qwen_api(prompt)

        if not raw_output:
            return None, 0.0, "API调用失败"

        # 获取有效分类
        valid_categories = self._get_valid_categories_for_event_type(event_type)

        # 匹配分类
        predicted_category = self._match_category(raw_output, valid_categories)

        if predicted_category:
            # 简单的置信度估计：完全匹配为0.95，模糊匹配为0.80
            confidence = 0.95 if raw_output.strip() == predicted_category else 0.80
            return predicted_category, confidence, f"模型输出: {raw_output}"
        else:
            self.logger.warning(f"无法匹配分类，模型输出: {raw_output}")
            return None, 0.0, f"无法匹配，模型输出: {raw_output}"

    def classify_batch(self, events: List[Dict], max_workers: int = 10) -> List[Dict]:
        """
        批量事件分类（并发）

        Args:
            events: 事件列表
            max_workers: 最大并发线程数

        Returns:
            分类结果列表
        """
        results = []
        total = len(events)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_event = {
                executor.submit(self.classify_single, event): idx
                for idx, event in enumerate(events)
            }

            for future in as_completed(future_to_event):
                idx = future_to_event[future]
                try:
                    predicted_category, confidence, reasoning = future.result()
                    results.append({
                        'index': idx,
                        'event': events[idx],
                        'predicted_category': predicted_category,
                        'confidence': confidence,
                        'reasoning': reasoning
                    })

                    with self.progress_lock:
                        self.processed_count += 1
                        self.logger.info(f"进度: {self.processed_count}/{total}")

                except Exception as e:
                    self.logger.error(f"事件 {idx} 分类失败: {e}")
                    results.append({
                        'index': idx,
                        'event': events[idx],
                        'predicted_category': None,
                        'confidence': 0.0,
                        'reasoning': f"分类失败: {str(e)}"
                    })

        # 按索引排序
        results.sort(key=lambda x: x['index'])
        return results
