"""Prompt template management service"""

import copy
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from ..constants import CHAPTER_DISPLAY_NAMES, CHAPTER_TITLES
from .project_manager import ProjectManager


def _timestamp() -> str:
    return datetime.utcnow().isoformat()


def _build_default_templates() -> Dict[str, List[Dict]]:
    now = _timestamp()
    return {
        "chapter_1": [
            {
                "id": "default_chapter_1",
                "name": f"默认模板 - {CHAPTER_DISPLAY_NAMES['chapter_1']}",
                "chapter": "chapter_1",
                "system_prompt": "你是一位专业的社会治理数据分析师，擅长编写结构化的报告。",
                "user_prompt_template": """请根据以下数据生成【全区社会治理基本情况】章节的报告内容。

# 数据
{data_summary}

# 要求
1. 对本月的治理情况进行一个总体的概括说明
2. 生成"全区各级事件上报及办结情况汇总表"（必须包含：分类、统计指标、一级、二级、三级、四级、五级、合计、办结率等列）

# 输出格式
使用Markdown格式，包含标题、段落和表格。表格必须使用标准的Markdown表格格式。

{examples_text}""",
                "is_default": True,
                "created_at": now,
                "updated_at": now
            }
        ],
        "chapter_2": [
            {
                "id": "default_chapter_2",
                "name": f"默认模板 - {CHAPTER_DISPLAY_NAMES['chapter_2']}",
                "chapter": "chapter_2",
                "system_prompt": "你是一位专业的社会治理数据分析师，擅长编写结构化的报告。",
                "user_prompt_template": """请根据以下数据生成【高频社会治理问题隐患分析研判】章节的报告内容。

# 数据
{data_summary}

# 要求
1. 分析高频问题的类型、分布和趋势
2. 识别潜在的风险隐患
3. 提供针对性的建议

# 输出格式
使用Markdown格式，包含标题、段落和必要的表格。

{examples_text}""",
                "is_default": True,
                "created_at": now,
                "updated_at": now
            }
        ],
        "chapter_3": [
            {
                "id": "default_chapter_3",
                "name": f"默认模板 - {CHAPTER_DISPLAY_NAMES['chapter_3']}",
                "chapter": "chapter_3",
                "system_prompt": "你是一位专业的社会治理数据分析师，擅长编写结构化的报告。",
                "user_prompt_template": f"""请根据以下数据生成【{CHAPTER_DISPLAY_NAMES['chapter_3']}】章节的报告内容。

# 数据
{{data_summary}}

# 要求
1. 识别当月社情民意热点问题（不少于 3 个），阐述问题类型、数量、环比趋势及主要诉求点
2. 对每个热点开展风险研判，说明成因、影响范围及潜在风险等级
3. 为每个热点提出可执行的预警或处置建议，建议需明确责任单位、行动措施和时间要求

# 输出格式
- 使用Markdown格式，整体结构需包含“# {CHAPTER_TITLES['chapter_3']}”
- 对每个热点使用二级或三级标题，先描述问题概况，再使用列表或表格呈现关键指标
- 建议部分使用无序列表，确保条目清晰可执行

{{examples_text}}""",
                "is_default": True,
                "created_at": now,
                "updated_at": now
            }
        ],
        "chapter_4": [
            {
                "id": "default_chapter_4",
                "name": f"默认模板 - {CHAPTER_DISPLAY_NAMES['chapter_4']}",
                "chapter": "chapter_4",
                "system_prompt": "你是一位专业的社会治理数据分析师，擅长编写结构化的报告。",
                "user_prompt_template": f"""请根据以下数据生成【{CHAPTER_DISPLAY_NAMES['chapter_4']}】章节的报告内容。

# 数据
{{data_summary}}

# 要求
1. 概括本月事件处置总体情况，包括办结量、办结率、环比变化以及积案治理进展
2. 分析重点单位或街镇的处置表现，指出亮点做法与存在短板
3. 统计积案、新增积案及风险事件情况，给出下一步工作建议（责任单位 + 行动举措 + 时限）

# 输出格式
- 使用Markdown格式，整体结构需包含“# {CHAPTER_TITLES['chapter_4']}”
- 建议按照“总体情况”“重点单位（街镇）表现”“积案治理情况”“工作建议”等小节组织内容
- 如需展示指标对比，可使用Markdown表格或列表，确保格式规范

{{examples_text}}""",
                "is_default": True,
                "created_at": now,
                "updated_at": now
            }
        ]
    }


class PromptManager:
    """Manage prompt templates"""

    @staticmethod
    def _initial_templates(project_id: str) -> Dict[str, List[Dict]]:
        if project_id == ProjectManager.DEFAULT_PROJECT_ID:
            return _build_default_templates()
        return {}

    @staticmethod
    def load_all_templates(project_id: str) -> Dict[str, List[Dict]]:
        """Load all prompt templates for a project"""
        project_id = ProjectManager.resolve_project_id(project_id)
        paths = ProjectManager.ensure_project_dirs(project_id)
        templates_file = paths.prompts_file

        if not templates_file.exists():
            templates = PromptManager._initial_templates(project_id)
            PromptManager._save_all_templates(project_id, templates)
            return templates

        try:
            with open(templates_file, 'r', encoding='utf-8') as file:
                templates = json.load(file)
        except Exception as exc:
            print(f"Warning: Failed to load templates for project {project_id}: {exc}")
            templates = PromptManager._initial_templates(project_id)
            PromptManager._save_all_templates(project_id, templates)
            return templates

        if project_id == ProjectManager.DEFAULT_PROJECT_ID:
            defaults = _build_default_templates()
            updated = False
            for chapter, default_list in defaults.items():
                if chapter not in templates or not templates[chapter]:
                    templates[chapter] = copy.deepcopy(default_list)
                    updated = True
                else:
                    # Ensure default template exists in the list
                    has_default = any(
                        t.get('id') == f"default_{chapter}"
                        for t in templates[chapter]
                    )
                    if not has_default:
                        # Insert default template at the beginning
                        default_template = PromptManager.get_canonical_template(chapter)
                        if default_template:
                            templates[chapter].insert(0, default_template)
                            updated = True

            if updated:
                PromptManager._save_all_templates(project_id, templates)

        return templates

    @staticmethod
    def _save_all_templates(project_id: str, templates: Dict[str, List[Dict]]) -> None:
        paths = ProjectManager.ensure_project_dirs(project_id)
        paths.prompts_dir.mkdir(parents=True, exist_ok=True)
        with open(paths.prompts_file, 'w', encoding='utf-8') as file:
            json.dump(templates, file, ensure_ascii=False, indent=2)

    @staticmethod
    def replace_all_templates(project_id: str, templates: Dict[str, List[Dict]]) -> None:
        """Replace all templates for a project at once."""
        PromptManager._save_all_templates(project_id, templates)

    @staticmethod
    def get_canonical_template(chapter: str) -> Optional[Dict]:
        """Return canonical default template for a chapter."""
        defaults = _build_default_templates()
        canonical_map: Dict[str, Dict[str, str]] = {
            "chapter_1": {
                "name": "默认模板 - 全区社会治理基本情况",
                "system_prompt": "你是一位专业的社会治理数据分析师，擅长撰写规范的政府工作报告，能够准确解读事件数据并用结构化语言呈现分析结果。",
                "user_prompt_template": (
                    "请根据以下数据生成结构完整的《一、全区社会治理基本情况》章节。\n\n"
                    "# 数据\n{data_summary}\n\n"
                    "# 输出结构\n"
                    "## （一）总体概况\n"
                    "- 用 3~4 句总结当月事件总量、环比变化、高价值事件情况等核心结论。\n\n"
                    "## （二）事件流转与办结情况\n"
                    "- 使用 Markdown 表格呈现关键指标：\n"
                    "| 平台/渠道 | 指标 | 一级 | 二级 | 三级 | 四级 | 五级 | 合计 | 办结率 |\n"
                    "|-----------|------|------|------|------|------|------|------|--------|\n"
                    "| 基层智治平台 | 总数 | …… | …… | …… | …… | …… | …… | …… |\n"
                    "| 基层智治平台 | 环比 | …… | …… | …… | …… | …… | …… | / |\n"
                    "| 网格上报 | 总数 | …… | …… | …… | …… | …… | …… | …… |\n"
                    "| 网格上报 | 环比 | …… | …… | …… | …… | …… | …… | / |\n"
                    "| 12345热线 | 总数 | …… | …… | …… | …… | …… | …… | …… |\n"
                    "| 12345热线 | 环比 | …… | …… | …… | …… | …… | …… | / |\n"
                    "| 合计 | 总数 | …… | …… | …… | …… | …… | …… | …… |\n"
                    "| 合计 | 环比 | …… | …… | …… | …… | …… | …… | / |\n\n"
                    "## （三）问题研判与亮点做法\n"
                    "- 总结数据反映出的亮点和短板，各列 2~3 条要点。\n\n"
                    "## （四）下一步工作建议\n"
                    "- 至少列出 3 条建议，以“• 责任单位：…｜措施：…｜时限：…”格式呈现。\n\n"
                    "# 写作要求\n"
                    "- 保持正式、公文化的语言，逻辑清晰。\n"
                    "- 数据引用准确，表格使用标准 Markdown 语法。\n"
                    "- 建议具体可执行。\n\n"
                    "{examples_text}"
                )
            },
            "chapter_2": {
                "name": "默认模板 - 高频社会治理问题隐患分析研判",
                "system_prompt": "你是一位资深社会治理风险分析师，擅长对高频社会治理问题和隐患进行研判、分级预警并提出针对性化解举措。请保持正式、专业的政府公文语气，逻辑清晰、数据准确。",
                "user_prompt_template": (
                    "请根据以下数据生成结构完整的《二、高频社会治理问题隐患分析研判》章节。\n\n"
                    "# 数据\n{data_summary}\n\n"
                    "# 输出结构\n"
                    "## （一）总体态势\n"
                    "- 概括本月高频问题总量、占比及环比/同比变化。\n"
                    "- 使用 Markdown 表格呈现关键指标：\n"
                    "| 问题类型 | 当月数量 | 占比 | 环比 | 风险等级 | 主要诉求 |\n"
                    "|----------|----------|------|------|----------|----------|\n"
                    "| …… | …… | …… | …… | …… | …… |\n\n"
                    "## （二）重点问题风险研判\n"
                    "针对每个主要问题类型，使用“### 1. ……问题”格式展开，内容包括：\n"
                    "- 数据概览（数量、占比、环比/同比变化）\n"
                    "- 风险研判（成因、影响范围、潜在风险等级）\n"
                    "- 典型案例或征兆（使用“如：……”格式）\n\n"
                    "## （三）预警与治理建议\n"
                    "- • 责任单位：……｜措施：……｜时限：……\n"
                    "- • 责任单位：……｜措施：……｜时限：……\n\n"
                    "## （四）综合评估与下一步工作\n"
                    "- 总结整体风险态势、突出问题与下一阶段重点工作方向。\n\n"
                    "# 写作要求\n"
                    "- 语言正式、客观；数据与分析对应一致，不得重复。\n"
                    "- 表格使用标准 Markdown 语法，缺失数据用“/”。\n\n"
                    "{examples_text}"
                )
            },
            "chapter_3": {
                "name": "默认模板 - 社情民意热点问题分析预警",
                "system_prompt": "你是一位专业的舆情研判分析师，擅长基于民意数据进行热点风险预警。请保持政府公文风格，做到结构严谨、数据准确、语言精炼。",
                "user_prompt_template": (
                    "请根据以下数据生成结构完整的《三、社情民意热点问题分析预警》章节。\n\n"
                    "# 数据\n{data_summary}\n\n"
                    "# 输出结构\n"
                    "## （一）总体态势\n"
                    "- 概括整体诉求热点和波动趋势，列出关键数据。\n\n"
                    "## （二）热点问题研判\n"
                    "#### 1. ……热点问题\n"
                    "- 数据概览：……\n"
                    "- 风险研判：……（成因、影响范围、风险等级）\n"
                    "- 典型案例：……\n\n"
                    "## （三）预警建议\n"
                    "- • 责任单位：……｜措施：……｜时限：……\n"
                    "- • ……\n\n"
                    "## （四）综合研判结论\n"
                    "- 总结整体风险态势与下一步预警重点。\n\n"
                    "# 写作要求\n"
                    "- 语言正式、精炼；数据准确。\n\n"
                    "{examples_text}"
                )
            },
            "chapter_4": {
                "name": "默认模板 - 事件处置解决情况分析",
                "system_prompt": "你是一位专业的政府工作报告撰写专家，专注于事件处置解决情况分析。请保持正式、规范的公文语气，善于总结问题并提出可操作的建议。",
                "user_prompt_template": (
                    "请根据以下数据生成结构完整的《四、事件处置解决情况分析》章节。\n\n"
                    "# 数据\n{data_summary}\n\n"
                    "# 输出结构\n"
                    "## （一）总体处置情况\n"
                    "- 概述事件办结数量、办结率、环比变化等核心指标。\n"
                    "- 提供整体办结与积案治理情况，指出亮点与短板。\n\n"
                    "## （二）重点单位（镇街）处置表现\n"
                    "- 使用 Markdown 表格列出关键单位办结量、办结率、环比变化。\n\n"
                    "## （三）积案治理进展\n"
                    "- 描述新增积案、办结积案、存量积案情况，对主要积案类型进行分析。\n\n"
                    "## （四）存在的突出问题\n"
                    "- 列出 2~3 条主要问题，说明表现与影响。\n\n"
                    "## （五）下一步工作建议\n"
                    "- 至少给出 3 条建议，格式为“• 责任单位：……｜措施：……｜时限：……”。\n\n"
                    "# 写作要求\n"
                    "- 语言正式、客观；建议具体可操作。\n\n"
                    "{examples_text}"
                )
            }
        }

        if chapter in canonical_map:
            template = canonical_map[chapter]
            defaults_for_chapter = defaults.get(chapter)
            if defaults_for_chapter:
                canonical = copy.deepcopy(defaults_for_chapter[0])
                canonical.update(template)
                canonical["is_default"] = True
                canonical["id"] = f"default_{chapter}"
                return canonical
            return {
                "id": f"default_{chapter}",
                "name": template.get("name", f"默认模板 - {chapter}"),
                "chapter": chapter,
                "system_prompt": template["system_prompt"],
                "user_prompt_template": template["user_prompt_template"],
                "is_default": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }

        if defaults.get(chapter):
            return copy.deepcopy(defaults[chapter][0])
        return None

    @staticmethod
    def get_templates_by_chapter(project_id: str, chapter: str) -> List[Dict]:
        templates = PromptManager.load_all_templates(project_id)
        return templates.get(chapter, [])

    @staticmethod
    def get_template_by_id(project_id: str, template_id: str) -> Optional[Dict]:
        templates = PromptManager.load_all_templates(project_id)
        for chapter_templates in templates.values():
            for template in chapter_templates:
                if template['id'] == template_id:
                    return template
        return None

    @staticmethod
    def get_default_template(project_id: str, chapter: str) -> Optional[Dict]:
        chapter_templates = PromptManager.get_templates_by_chapter(project_id, chapter)
        if chapter_templates:
            for template in chapter_templates:
                if template.get('is_default'):
                    return template
            return chapter_templates[0]

        if project_id != ProjectManager.DEFAULT_PROJECT_ID:
            default_templates = PromptManager.load_all_templates(ProjectManager.DEFAULT_PROJECT_ID)
            fallback_list = default_templates.get(chapter, [])
            if fallback_list:
                return copy.deepcopy(fallback_list[0])

        return None

    @staticmethod
    def create_template(
        project_id: str,
        chapter: str,
        name: str,
        system_prompt: str,
        user_prompt_template: str,
        is_default: bool = False
    ) -> Dict:
        templates = PromptManager.load_all_templates(project_id)

        template_id = str(uuid.uuid4())
        timestamp = _timestamp()

        if is_default and chapter in templates:
            for template in templates[chapter]:
                template['is_default'] = False

        new_template = {
            "id": template_id,
            "name": name,
            "chapter": chapter,
            "system_prompt": system_prompt,
            "user_prompt_template": user_prompt_template,
            "is_default": is_default,
            "created_at": timestamp,
            "updated_at": timestamp
        }

        if chapter not in templates:
            templates[chapter] = []
        templates[chapter].append(new_template)

        PromptManager._save_all_templates(project_id, templates)
        return new_template

    @staticmethod
    def update_template(
        project_id: str,
        template_id: str,
        name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        user_prompt_template: Optional[str] = None,
        is_default: Optional[bool] = None
    ) -> Optional[Dict]:
        templates = PromptManager.load_all_templates(project_id)

        for chapter, chapter_templates in templates.items():
            for template in chapter_templates:
                if template['id'] == template_id:
                    if name is not None:
                        template['name'] = name
                    if system_prompt is not None:
                        template['system_prompt'] = system_prompt
                    if user_prompt_template is not None:
                        template['user_prompt_template'] = user_prompt_template
                    if is_default is not None:
                        if is_default:
                            for other in chapter_templates:
                                other['is_default'] = False
                        template['is_default'] = is_default

                    template['updated_at'] = _timestamp()
                    PromptManager._save_all_templates(project_id, templates)
                    return template

        return None

    @staticmethod
    def delete_template(project_id: str, template_id: str) -> bool:
        templates = PromptManager.load_all_templates(project_id)

        for chapter, chapter_templates in templates.items():
            for index, template in enumerate(chapter_templates):
                if template['id'] == template_id:
                    if len(chapter_templates) == 1:
                        return False

                    removed = chapter_templates.pop(index)

                    if removed.get('is_default') and chapter_templates:
                        chapter_templates[0]['is_default'] = True

                    PromptManager._save_all_templates(project_id, templates)
                    return True

        return False
