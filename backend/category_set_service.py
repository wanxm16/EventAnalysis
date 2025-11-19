"""分类集合管理服务"""
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional


class CategorySetService:
    """分类集合管理服务"""

    def __init__(self):
        self.data_dir = Path("data/classification")
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.sets_file = self.data_dir / "category_sets.json"

        # 确保文件存在
        if not self.sets_file.exists():
            self._save_sets([])

    def _load_sets(self) -> List[Dict]:
        """加载所有分类集合"""
        try:
            with open(self.sets_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def _save_sets(self, sets: List[Dict]):
        """保存分类集合列表"""
        with open(self.sets_file, 'w', encoding='utf-8') as f:
            json.dump(sets, f, ensure_ascii=False, indent=2)

    def get_all_sets(self) -> Dict:
        """获取所有分类集合"""
        sets = self._load_sets()

        # 添加category_count字段
        for s in sets:
            s['category_count'] = len(s.get('categories', []))

        # 按更新时间倒序排序
        sets.sort(key=lambda x: x.get('updated_at', ''), reverse=True)

        return {
            "sets": sets,
            "total": len(sets)
        }

    def get_set(self, set_id: str) -> Optional[Dict]:
        """获取单个分类集合"""
        sets = self._load_sets()
        for s in sets:
            if s['id'] == set_id:
                s['category_count'] = len(s.get('categories', []))
                return s
        return None

    def create_set(self, name: str, description: Optional[str], categories: List[str]) -> str:
        """创建分类集合"""
        set_id = str(int(datetime.now().timestamp() * 1000))
        now = datetime.now().isoformat()

        new_set = {
            "id": set_id,
            "name": name,
            "description": description,
            "categories": categories,
            "created_at": now,
            "updated_at": now
        }

        sets = self._load_sets()
        sets.append(new_set)
        self._save_sets(sets)

        return set_id

    def update_set(self, set_id: str, name: Optional[str] = None,
                   description: Optional[str] = None,
                   categories: Optional[List[str]] = None) -> bool:
        """更新分类集合"""
        sets = self._load_sets()

        for s in sets:
            if s['id'] == set_id:
                if name is not None:
                    s['name'] = name
                if description is not None:
                    s['description'] = description
                if categories is not None:
                    s['categories'] = categories
                s['updated_at'] = datetime.now().isoformat()

                self._save_sets(sets)
                return True

        return False

    def delete_set(self, set_id: str) -> bool:
        """删除分类集合"""
        sets = self._load_sets()
        original_len = len(sets)

        sets = [s for s in sets if s['id'] != set_id]

        if len(sets) < original_len:
            self._save_sets(sets)
            return True

        return False


# 全局实例
category_set_service = CategorySetService()
