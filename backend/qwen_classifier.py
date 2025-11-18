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
from typing import List, Dict, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from tag_service import merge_tag_library


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
        self.custom_tag_file = os.path.join(self.data_dir, 'custom_tags.json')

        # 确保数据目录存在
        os.makedirs(self.data_dir, exist_ok=True)

        # 加载配置数据
        self._ensure_custom_tag_storage()

        self.few_shot_examples = self._load_few_shot_examples()
        self.available_categories = list(self.few_shot_examples.keys()) if self.few_shot_examples else []
        self.event_type_mapping = self._load_event_type_mapping()
        self.category_aliases = self._load_category_aliases()
        self.tag_library = self._load_tag_library()
        self._apply_tag_library(self.tag_library)

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

    def _ensure_custom_tag_storage(self) -> None:
        """确保自定义标签文件存在"""
        if not os.path.exists(self.custom_tag_file):
            with open(self.custom_tag_file, 'w', encoding='utf-8') as fp:
                json.dump({"groups": [], "tags": []}, fp, ensure_ascii=False, indent=2)

    def _load_custom_tags(self) -> Dict:
        """加载自定义标签数据"""
        try:
            if not os.path.exists(self.custom_tag_file):
                self._ensure_custom_tag_storage()
            with open(self.custom_tag_file, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
                data.setdefault('groups', [])
                data.setdefault('tags', [])
                return data
        except Exception as e:
            self.logger.error(f"加载自定义标签失败: {e}")
            return {"groups": [], "tags": []}

    def _apply_tag_library(self, tag_library: Dict) -> None:
        """应用标签库数据到实例属性"""
        self.tag_groups = tag_library.get('tag_groups', [])
        self.tag_catalog = {
            tag['id']: tag
            for group in self.tag_groups
            for tag in group.get('tags', [])
        }
        self.tag_catalog_by_label = {
            tag.get('label'): tag
            for tag in self.tag_catalog.values()
            if tag.get('label')
        }
        self.event_type_tag_map = tag_library.get('event_type_recommendations', {})
        self.category_tag_map = tag_library.get('category_recommendations', {})
        self.default_tag_ids = tag_library.get('default_recommendations', [])

    def reload_tag_library(self) -> None:
        """重新加载标签库配置"""
        self.tag_library = self._load_tag_library()
        self._apply_tag_library(self.tag_library)

    def _load_tag_library(self) -> Dict:
        """加载并合并系统标签库与自定义标签"""
        try:
            file_path = os.path.join(self.data_dir, 'tag_library.json')
            system_data = {}
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    system_data = json.load(f)
            else:
                self.logger.warning(f"标签库文件不存在: {file_path}")

            custom_data = self._load_custom_tags()
            return merge_tag_library(system_data, custom_data, include_inactive=False)
        except Exception as e:
            self.logger.error(f"加载标签库失败: {e}")
            return {"tag_groups": []}

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

    def _get_tag_candidates(self, event_type: str = "", valid_categories: Optional[List[str]] = None) -> List[Dict]:
        """
        根据事件类型和候选分类获取推荐标签列表
        """
        candidate_ids: List[str] = []

        if event_type and event_type in self.event_type_tag_map:
            candidate_ids.extend(self.event_type_tag_map[event_type])

        if valid_categories:
            for category in valid_categories[:3]:
                candidate_ids.extend(self.category_tag_map.get(category, []))

        candidate_ids.extend(self.default_tag_ids)

        # 去重并保留顺序
        unique_ids = []
        for tag_id in candidate_ids:
            if tag_id not in unique_ids:
                unique_ids.append(tag_id)

        tags = [
            self.tag_catalog[tag_id]
            for tag_id in unique_ids
            if tag_id in self.tag_catalog
        ]

        # 限制展示数量，避免提示词过长
        return tags[:12]

    def _format_tag_candidates_for_prompt(self, tags: List[Dict]) -> str:
        """构造提示词中的标签说明"""
        if not tags:
            return "暂无预置标签，请根据事件描述自行拟合3-5个中文标签。"

        formatted = []
        for tag in tags:
            label = tag.get('label', tag.get('id'))
            tag_id = tag.get('id')
            description = tag.get('description', '')
            formatted.append(f"- {tag_id}（{label}）：{description}")

        return "\n".join(formatted)

    def _build_prompt(self, event_description: str, event_type: str = "") -> str:
        """
        构建分类与标签提示词
        """
        valid_categories = self._get_valid_categories_for_event_type(event_type)
        tag_candidates = self._get_tag_candidates(event_type, valid_categories)

        prompt = [
            "你是一个专业的事件分类与标签标注专家，需要根据事件描述完成以下任务：",
            "1. 从候选的二级分类中选择最合适的一个分类；",
            "2. 结合标签库给出3-5个最能反映事件属性的标签。"
        ]

        prompt.append(f"\n当前事件类型：{event_type if event_type else '未指定'}")
        prompt.append("可选的二级分类（必须从中选择一个）：")
        for idx, category in enumerate(valid_categories[:30], start=1):
            prompt.append(f"{idx}. {category}")

        tag_text = self._format_tag_candidates_for_prompt(tag_candidates)
        prompt.append("\n常用标签（TagID：含义），请选择最贴切的3-5个标签，可复用也可补充新的：")
        prompt.append(tag_text)

        if self.few_shot_examples and valid_categories:
            prompt.append("\n以下是参考示例：")
            example_count = 0
            for category in valid_categories[:5]:
                examples = self.few_shot_examples.get(category, [])
                if examples and example_count < 5:
                    example = examples[0]
                    prompt.append(f"【分类：{category}】事件描述：{example.get('事件描述', '')}")
                    example_count += 1

        prompt.append("\n请分析下方事件描述，并严格输出合法的 JSON：")
        prompt.append(json.dumps({
            "category": "<二级分类名称>",
            "category_confidence": 0.0,
            "tags": [
                {"id": "tag_id", "confidence": 0.0, "reason": "简要原因"}
            ],
            "summary": "一句话解释分类依据"
        }, ensure_ascii=False, indent=2))

        prompt.append("注意：")
        prompt.append("1. category 必须来自候选分类；")
        prompt.append("2. tags 至少提供3个，最多5个，id 使用上方提供的 tag_id，若新增标签请给出中文名称；")
        prompt.append("3. 置信度为0-1之间的小数；")
        prompt.append("4. 只输出 JSON，不要额外文字。")

        prompt.append(f"\n事件描述：{event_description}")

        return "\n".join(prompt)

    def _build_custom_prompt(self, event_description: str, event_type: str, valid_categories: List[str], tag_candidates: List[Dict]) -> str:
        """
        构建使用自定义分类的提示词
        """
        prompt = [
            "你是一个专业的事件分类与标签标注专家，需要根据事件描述完成以下任务：",
            "1. 从候选的二级分类中选择最合适的一个分类；",
            "2. 结合标签库给出3-5个最能反映事件属性的标签。"
        ]

        prompt.append(f"\n当前事件类型：{event_type if event_type else '未指定'}")
        prompt.append("可选的二级分类（必须从中选择一个）：")
        for idx, category in enumerate(valid_categories[:30], start=1):
            prompt.append(f"{idx}. {category}")

        tag_text = self._format_tag_candidates_for_prompt(tag_candidates)
        prompt.append("\n常用标签（TagID：含义），请选择最贴切的3-5个标签，可复用也可补充新的：")
        prompt.append(tag_text)

        if self.few_shot_examples and valid_categories:
            prompt.append("\n以下是参考示例：")
            example_count = 0
            for category in valid_categories[:5]:
                examples = self.few_shot_examples.get(category, [])
                if examples and example_count < 5:
                    example = examples[0]
                    prompt.append(f"【分类：{category}】事件描述：{example.get('事件描述', '')}")
                    example_count += 1

        prompt.append("\n请分析下方事件描述，并严格输出合法的 JSON：")
        prompt.append(json.dumps({
            "category": "<二级分类名称>",
            "category_confidence": 0.0,
            "tags": [
                {"id": "tag_id", "confidence": 0.0, "reason": "简要原因"}
            ],
            "summary": "一句话解释分类依据"
        }, ensure_ascii=False, indent=2))

        prompt.append("注意：")
        prompt.append("1. category 必须来自候选分类；")
        prompt.append("2. tags 至少提供3个，最多5个，id 使用上方提供的 tag_id，若新增标签请给出中文名称；")
        prompt.append("3. 置信度为0-1之间的小数；")
        prompt.append("4. 只输出 JSON，不要额外文字。")

        prompt.append(f"\n事件描述：{event_description}")

        return "\n".join(prompt)

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

    def _clip_confidence(self, value: Any, default: float = 0.8) -> float:
        """将置信度裁剪为0-1之间"""
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            return default
        confidence = max(0.0, min(confidence, 1.0))
        return confidence

    def _extract_json_block(self, text: str) -> Optional[str]:
        """从模型输出中提取JSON片段"""
        if not text:
            return None

        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            return text[start:end + 1]
        return None

    def _normalize_tag_suggestions(self, tag_entries: Any) -> List[Dict[str, Any]]:
        """将模型输出的标签转换为统一结构"""
        if not tag_entries:
            return []

        normalized = []
        seen_ids = set()

        if isinstance(tag_entries, dict):
            tag_entries = [tag_entries]

        for entry in tag_entries:
            tag_id = None
            label = None
            confidence = 0.75
            reason = ""

            if isinstance(entry, str):
                tag_id = entry.strip()
            elif isinstance(entry, dict):
                tag_id = entry.get('id') or entry.get('tag_id')
                label = entry.get('label') or entry.get('name')
                reason = entry.get('reason') or entry.get('note') or ''
                confidence = entry.get('confidence') or entry.get('score') or 0.75

                # 如果模型错误地输出百分比
                if isinstance(confidence, (int, float)) and confidence > 1:
                    confidence = confidence / 100.0
            else:
                continue

            if not tag_id and label:
                tag_meta = self.tag_catalog_by_label.get(label)
                if tag_meta:
                    tag_id = tag_meta['id']

            tag_meta = self.tag_catalog.get(tag_id) if tag_id else None

            if not tag_meta and label:
                tag_meta = self.tag_catalog_by_label.get(label)

            resolved_id = tag_meta['id'] if tag_meta else (tag_id or label)
            resolved_label = tag_meta.get('label') if tag_meta else (label or tag_id)

            if not resolved_id or resolved_id in seen_ids:
                continue

            seen_ids.add(resolved_id)

            normalized.append({
                'tag_id': resolved_id,
                'label': resolved_label,
                'confidence': self._clip_confidence(confidence),
                'reason': reason or (tag_meta.get('description') if tag_meta else "模型推荐"),
                'source': 'ai_suggestion' if tag_meta else 'ai_custom'
            })

        return normalized[:5]

    def _build_default_tag_suggestions(self, event_type: str, predicted_category: Optional[str] = None) -> List[Dict[str, Any]]:
        """在模型未输出标签时提供兜底标签"""
        candidates = self._get_tag_candidates(
            event_type,
            [predicted_category] if predicted_category else None
        )
        suggestions = []
        for tag in candidates[:3]:
            suggestions.append({
                'tag_id': tag.get('id'),
                'label': tag.get('label', tag.get('id')),
                'confidence': 0.6,
                'reason': "策略推荐",
                'source': 'system'
            })
        return suggestions

    def _parse_model_output(
        self,
        raw_output: str,
        valid_categories: List[str],
        event_type: str
    ) -> Optional[Tuple[Optional[str], float, str, List[Dict[str, Any]]]]:
        """解析模型输出，返回分类和标签结果"""
        if not raw_output:
            return None

        data = None
        try:
            data = json.loads(raw_output)
        except json.JSONDecodeError:
            json_block = self._extract_json_block(raw_output)
            if json_block:
                try:
                    data = json.loads(json_block)
                except json.JSONDecodeError:
                    self.logger.warning("JSON解析失败，尝试回退到纯文本匹配")
                    data = None

        if not isinstance(data, dict):
            return None

        category_text = data.get('category') or data.get('predicted_category')
        predicted_category = self._match_category(category_text or "", valid_categories) if category_text else None

        confidence = self._clip_confidence(data.get('category_confidence') or data.get('confidence') or 0.8)
        summary = data.get('summary') or data.get('reasoning') or f"模型输出: {raw_output}"
        tags = self._normalize_tag_suggestions(data.get('tags') or data.get('tag_suggestions'))

        if not tags:
            tags = self._build_default_tag_suggestions(event_type, predicted_category)

        return predicted_category, confidence, summary, tags

    def classify_single(self, event_data: Dict, custom_categories: Optional[List[str]] = None) -> Tuple[Optional[str], float, Optional[str], List[Dict[str, Any]]]:
        """
        单事件分类

        Args:
            event_data: 事件数据字典，包含 '事件描述' 和 '事件类型'
            custom_categories: 可选的自定义分类列表，用于限制分类范围

        Returns:
            (predicted_category, confidence, reasoning, tags)
        """
        event_description = event_data.get('事件描述', '')
        event_type = event_data.get('事件类型', '')

        if not event_description:
            self.logger.warning("事件描述为空")
            return None, 0.0, "事件描述为空", []

        # 获取有效分类 - 优先使用自定义分类
        if custom_categories:
            valid_categories = custom_categories
        else:
            valid_categories = self._get_valid_categories_for_event_type(event_type)

        # 构建提示词（传入自定义分类作为event_type的替代）
        if custom_categories:
            # 临时修改_build_prompt的行为以使用自定义分类
            tag_candidates = self._get_tag_candidates(event_type, valid_categories)
            prompt = self._build_custom_prompt(event_description, event_type, valid_categories, tag_candidates)
        else:
            prompt = self._build_prompt(event_description, event_type)

        # 调用API
        raw_output = self._call_qwen_api(prompt)

        if not raw_output:
            return None, 0.0, "API调用失败", []

        parsed_result = self._parse_model_output(raw_output, valid_categories, event_type)

        if parsed_result:
            return parsed_result

        # 如果无法解析JSON，则退回到旧的匹配逻辑
        predicted_category = self._match_category(raw_output, valid_categories)

        if predicted_category:
            confidence = 0.95 if raw_output.strip() == predicted_category else 0.80
            tags = self._build_default_tag_suggestions(event_type, predicted_category)
            return predicted_category, confidence, f"模型输出: {raw_output}", tags

        self.logger.warning(f"无法匹配分类，模型输出: {raw_output}")
        return None, 0.0, f"无法匹配，模型输出: {raw_output}", []

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
                    predicted_category, confidence, reasoning, tags = future.result()
                    results.append({
                        'index': idx,
                        'event': events[idx],
                        'predicted_category': predicted_category,
                        'confidence': confidence,
                        'reasoning': reasoning,
                        'tags': tags
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
                        'reasoning': f"分类失败: {str(e)}",
                        'tags': []
                    })

        # 按索引排序
        results.sort(key=lambda x: x['index'])
        return results
