import json
import os
import re
import uuid
from copy import deepcopy
from datetime import datetime
from typing import Dict, List, Optional, Tuple

DEFAULT_GROUP_LIMIT = 20

def _now_iso() -> str:
    return datetime.now().isoformat()


def _slugify(value: str) -> str:
    if not value:
        return uuid.uuid4().hex[:8]
    slug = re.sub(r'[^0-9a-zA-Z]+', '_', value.strip().lower()).strip('_')
    return slug or uuid.uuid4().hex[:8]


def _load_json(file_path: str, default: Optional[Dict] = None) -> Dict:
    if not os.path.exists(file_path):
        return default or {}
    try:
        with open(file_path, 'r', encoding='utf-8') as fp:
            return json.load(fp)
    except json.JSONDecodeError:
        return default or {}


def _ensure_custom_storage(file_path: str) -> None:
    if os.path.exists(file_path):
        return
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as fp:
        json.dump({"groups": [], "tags": []}, fp, ensure_ascii=False, indent=2)


def merge_tag_library(
    system_data: Dict,
    custom_data: Dict,
    include_inactive: bool = True
) -> Dict:
    """合并系统标签库和自定义标签库"""
    tag_groups: List[Dict] = []
    group_map: Dict[str, Dict] = {}

    system_groups = deepcopy(system_data.get('tag_groups', []) if system_data else [])
    custom_groups = deepcopy(custom_data.get('groups', []) if custom_data else [])
    custom_tags = deepcopy(custom_data.get('tags', []) if custom_data else [])

    def ensure_group(group_id: str, name: str, description: str = "", source: str = "system", extra: Optional[Dict] = None) -> Dict:
        if group_id in group_map:
            return group_map[group_id]
        entry = {
            "id": group_id,
            "group_id": group_id,
            "name": name,
            "description": description or "",
            "source": source,
            "type": source,
            "order": (extra or {}).get("order", 100 if source == "system" else 200),
            "max_tags": (extra or {}).get("max_tags"),
            "editable": source != "system",
            "tags": []
        }
        group_map[group_id] = entry
        tag_groups.append(entry)
        return entry

    for group in system_groups:
        group_id = group.get('id') or group.get('group_id')
        if not group_id:
            continue
        meta = {
            "order": group.get('order', 50),
            "max_tags": group.get('max_tags')
        }
        entry = ensure_group(group_id, group.get('name', group_id), group.get('description', ''), "system", meta)
        for tag in group.get('tags', []):
            if not include_inactive and tag.get('status') not in (None, 'active'):
                continue
            entry['tags'].append({
                "id": tag.get('id'),
                "tag_id": tag.get('id'),
                "label": tag.get('label'),
                "color": tag.get('color'),
                "description": tag.get('description'),
                "group_id": group_id,
                "group_name": entry['name'],
                "type": tag.get('type', 'system'),
                "source": "system",
                "editable": False,
                "created_at": tag.get('created_at'),
                "updated_at": tag.get('updated_at')
            })

    for group in custom_groups:
        group_id = group.get('id') or group.get('group_id')
        if not group_id:
            continue
        ensure_group(
            group_id,
            group.get('name', group_id),
            group.get('description', ''),
            "custom",
            {
                "order": group.get('order', 200),
                "max_tags": group.get('max_tags')
            }
        )

    for tag in custom_tags:
        group_id = tag.get('group_id')
        if not group_id:
            continue
        group_entry = ensure_group(group_id, group_id, source="custom")
        group_entry['tags'].append({
            "id": tag.get('id'),
            "tag_id": tag.get('id'),
            "label": tag.get('label'),
            "color": tag.get('color'),
            "description": tag.get('description'),
            "group_id": group_id,
            "group_name": group_entry['name'],
            "type": tag.get('type', 'custom'),
            "source": "custom",
            "editable": True,
            "created_at": tag.get('created_at'),
            "updated_at": tag.get('updated_at')
        })

    for group in tag_groups:
        # 排序：常用标签优先
        group['tags'].sort(key=lambda item: item.get('label', ''))
        group['tag_count'] = len(group['tags'])
        group['active_tag_count'] = group['tag_count']

    tag_groups.sort(key=lambda g: (g.get('order', 100), g.get('name', '')))

    return {
        "metadata": system_data.get('metadata') if system_data else None,
        "tag_groups": tag_groups,
        "default_recommendations": system_data.get('default_recommendations', []) if system_data else [],
        "event_type_recommendations": system_data.get('event_type_recommendations', {}) if system_data else {},
        "category_recommendations": system_data.get('category_recommendations', {}) if system_data else {}
    }


class TagService:
    """标签管理服务（针对自定义标签）"""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.system_file = os.path.join(self.data_dir, 'tag_library.json')
        self.custom_file = os.path.join(self.data_dir, 'custom_tags.json')
        os.makedirs(self.data_dir, exist_ok=True)
        _ensure_custom_storage(self.custom_file)

    def _load_custom_data(self) -> Dict:
        data = _load_json(self.custom_file, {"groups": [], "tags": []})
        data.setdefault('groups', [])
        data.setdefault('tags', [])
        return data

    def _save_custom_data(self, data: Dict) -> None:
        with open(self.custom_file, 'w', encoding='utf-8') as fp:
            json.dump(data, fp, ensure_ascii=False, indent=2)

    def _find_custom_tag(self, data: Dict, tag_id: str) -> Tuple[int, Optional[Dict]]:
        for idx, tag in enumerate(data.get('tags', [])):
            if tag.get('id') == tag_id:
                return idx, tag
        return -1, None

    def _find_custom_group(self, data: Dict, group_id: str) -> Tuple[int, Optional[Dict]]:
        for idx, group in enumerate(data.get('groups', [])):
            if group.get('id') == group_id:
                return idx, group
        return -1, None

    def get_combined_library(self, include_inactive: bool = True) -> Dict:
        system_data = _load_json(self.system_file, {})
        custom_data = self._load_custom_data()
        return merge_tag_library(system_data, custom_data, include_inactive=include_inactive)

    def list_groups(self, include_system: bool = True) -> List[Dict]:
        library = self.get_combined_library(include_inactive=True)
        groups = []
        for group in library.get('tag_groups', []):
            if not include_system and group.get('source') == 'system':
                continue
            groups.append(group)
        return groups

    def list_tags(
        self,
        group_id: Optional[str] = None,
        search: Optional[str] = None,
        include_system: bool = False
    ) -> Tuple[List[Dict], Dict[str, int]]:
        library = self.get_combined_library(include_inactive=True)
        tags: List[Dict] = []
        stats = {
            "total": 0
        }
        keyword = search.lower() if search else None

        for group in library.get('tag_groups', []):
            if not include_system and group.get('source') == 'system':
                continue
            for tag in group.get('tags', []):
                if group_id and tag.get('group_id') != group_id:
                    continue
                if keyword:
                    haystack = f"{tag.get('label', '')} {tag.get('description', '')}".lower()
                    if keyword not in haystack:
                        continue
                enriched = dict(tag)
                enriched['group_name'] = group.get('name')
                tags.append(enriched)

                stats['total'] += 1

        return tags, stats

    def _validate_group_exists(self, group_id: str) -> Dict:
        library = self.get_combined_library(include_inactive=True)
        for group in library.get('tag_groups', []):
            if group.get('id') == group_id:
                return group
        raise ValueError(f"标签组 {group_id} 不存在")

    def _group_capacity_left(self, data: Dict, group_id: str, exclude_tag_id: Optional[str] = None) -> int:
        idx, group = self._find_custom_group(data, group_id)
        limit = (group or {}).get('max_tags') or DEFAULT_GROUP_LIMIT
        if not group:
            limit = DEFAULT_GROUP_LIMIT

        active_custom = 0
        for tag in data.get('tags', []):
            if tag.get('group_id') != group_id:
                continue
            if exclude_tag_id and tag.get('id') == exclude_tag_id:
                continue
            active_custom += 1
        return max(limit - active_custom, 0)

    def _ensure_label_unique(self, data: Dict, label: str, exclude_tag_id: Optional[str] = None) -> None:
        existing_labels = set()
        library = self.get_combined_library(include_inactive=True)
        for group in library.get('tag_groups', []):
            for tag in group.get('tags', []):
                if exclude_tag_id and tag.get('id') == exclude_tag_id:
                    continue
                existing_labels.add(tag.get('label', '').strip().lower())
        if label.strip().lower() in existing_labels:
            raise ValueError(f"标签[{label}]已存在")

    def create_tag(self, payload: Dict) -> Dict:
        data = self._load_custom_data()
        label = payload.get('label', '').strip()
        if not label:
            raise ValueError("标签名称不能为空")

        group_id = payload.get('group_id')
        if not group_id:
            raise ValueError("必须指定标签组")

        self._validate_group_exists(group_id)
        capacity = self._group_capacity_left(data, group_id)
        if capacity <= 0:
            raise ValueError("该标签组的自定义标签已达上限")

        self._ensure_label_unique(data, label)
        tag_id = payload.get('tag_id') or f"custom_{_slugify(label)}"
        now = _now_iso()

        record = {
            "id": tag_id,
            "label": label,
            "group_id": group_id,
            "color": payload.get('color') or "#1890ff",
            "description": payload.get('description', ''),
            "type": "custom",
            "created_at": now,
            "updated_at": now
        }

        data['tags'].append(record)
        self._save_custom_data(data)
        return record

    def update_tag(self, tag_id: str, payload: Dict) -> Dict:
        data = self._load_custom_data()
        idx, target = self._find_custom_tag(data, tag_id)
        if idx == -1:
            raise ValueError("仅支持修改自定义标签")

        new_label = payload.get('label', target.get('label', '')).strip()
        if not new_label:
            raise ValueError("标签名称不能为空")

        new_group_id = payload.get('group_id', target.get('group_id'))
        self._validate_group_exists(new_group_id)

        if new_group_id != target.get('group_id'):
            capacity = self._group_capacity_left(data, new_group_id)
            if capacity <= 0:
                raise ValueError("目标标签组的自定义标签已达上限")

        if new_label.lower() != target.get('label', '').lower():
            self._ensure_label_unique(data, new_label, exclude_tag_id=tag_id)

        target.update({
            "label": new_label,
            "group_id": new_group_id,
            "color": payload.get('color', target.get('color')),
            "description": payload.get('description', target.get('description')),
            "updated_at": _now_iso()
        })
        data['tags'][idx] = target
        self._save_custom_data(data)
        return target

    def create_group(self, payload: Dict) -> Dict:
        data = self._load_custom_data()
        name = payload.get('name', '').strip()
        if not name:
            raise ValueError("标签组名称不能为空")
        group_id = payload.get('group_id') or _slugify(name)
        # 确保唯一
        for group in self.get_combined_library(include_inactive=True).get('tag_groups', []):
            if group.get('id') == group_id:
                raise ValueError("标签组ID已存在")
            if group.get('name') == name:
                raise ValueError("标签组名称已存在")
        record = {
            "id": group_id,
            "name": name,
            "description": payload.get('description', ''),
            "type": "custom",
            "max_tags": payload.get('max_tags') or DEFAULT_GROUP_LIMIT,
            "order": payload.get('order', 200),
            "created_at": _now_iso(),
            "updated_at": _now_iso()
        }
        data['groups'].append(record)
        self._save_custom_data(data)
        return record

    def update_group(self, group_id: str, payload: Dict) -> Dict:
        data = self._load_custom_data()
        idx, group = self._find_custom_group(data, group_id)
        if idx == -1:
            raise ValueError("仅支持修改自定义标签组")
        group.update({
            "name": payload.get('name', group.get('name')),
            "description": payload.get('description', group.get('description')),
            "max_tags": payload.get('max_tags', group.get('max_tags', DEFAULT_GROUP_LIMIT)),
            "order": payload.get('order', group.get('order', 200)),
            "updated_at": _now_iso()
        })
        data['groups'][idx] = group
        self._save_custom_data(data)
        return group

    def get_tag(self, tag_id: str) -> Optional[Dict]:
        library = self.get_combined_library(include_inactive=True)
        for group in library.get('tag_groups', []):
            for tag in group.get('tags', []):
                if tag.get('id') == tag_id:
                    enriched = dict(tag)
                    enriched['group_name'] = group.get('name')
                    return enriched
        return None

    def get_group(self, group_id: str) -> Optional[Dict]:
        library = self.get_combined_library(include_inactive=True)
        for group in library.get('tag_groups', []):
            if group.get('id') == group_id:
                return group
        return None
