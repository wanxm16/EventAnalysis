"""分类树管理服务"""
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional


class CategoryTreeService:
    """分类树管理服务"""

    def __init__(self):
        self.data_dir = Path("data/classification")
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.trees_file = self.data_dir / "category_trees.json"

        # 确保文件存在
        if not self.trees_file.exists():
            self._save_trees([])

    def _load_trees(self) -> List[Dict]:
        """加载所有分类树"""
        try:
            with open(self.trees_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def _save_trees(self, trees: List[Dict]):
        """保存分类树列表"""
        with open(self.trees_file, 'w', encoding='utf-8') as f:
            json.dump(trees, f, ensure_ascii=False, indent=2)

    def _count_nodes(self, tree: List[Dict]) -> int:
        """递归计算节点总数"""
        count = 0
        for node in tree:
            count += 1
            if node.get('children'):
                count += self._count_nodes(node['children'])
        return count

    def _find_node(self, tree: List[Dict], node_id: str) -> Optional[Dict]:
        """在树中查找节点"""
        for node in tree:
            if node['id'] == node_id:
                return node
            if node.get('children'):
                found = self._find_node(node['children'], node_id)
                if found:
                    return found
        return None

    def _remove_node(self, tree: List[Dict], node_id: str) -> bool:
        """从树中删除节点（包括其所有子节点）"""
        for i, node in enumerate(tree):
            if node['id'] == node_id:
                tree.pop(i)
                return True
            if node.get('children'):
                if self._remove_node(node['children'], node_id):
                    return True
        return False

    def _get_node_level(self, tree: List[Dict], node_id: str, current_level: int = 0) -> int:
        """获取节点层级"""
        for node in tree:
            if node['id'] == node_id:
                return current_level + 1
            if node.get('children'):
                level = self._get_node_level(node['children'], node_id, current_level + 1)
                if level > 0:
                    return level
        return 0

    def get_all_trees(self) -> Dict:
        """获取所有分类树"""
        trees = self._load_trees()

        # 添加节点计数
        for t in trees:
            t['node_count'] = self._count_nodes(t.get('tree', []))

        # 按更新时间倒序排序
        trees.sort(key=lambda x: x.get('updated_at', ''), reverse=True)

        return {
            "trees": trees,
            "total": len(trees)
        }

    def get_tree(self, tree_id: str) -> Optional[Dict]:
        """获取单个分类树"""
        trees = self._load_trees()
        for t in trees:
            if t['id'] == tree_id:
                t['node_count'] = self._count_nodes(t.get('tree', []))
                return t
        return None

    def create_tree(self, name: str, description: Optional[str]) -> str:
        """创建分类树"""
        tree_id = str(int(datetime.now().timestamp() * 1000))
        now = datetime.now().isoformat()

        new_tree = {
            "id": tree_id,
            "name": name,
            "description": description,
            "tree": [],  # 空树
            "created_at": now,
            "updated_at": now
        }

        trees = self._load_trees()
        trees.append(new_tree)
        self._save_trees(trees)

        return tree_id

    def update_tree(self, tree_id: str, name: Optional[str] = None,
                    description: Optional[str] = None) -> bool:
        """更新分类树基本信息"""
        trees = self._load_trees()

        for t in trees:
            if t['id'] == tree_id:
                if name is not None:
                    t['name'] = name
                if description is not None:
                    t['description'] = description
                t['updated_at'] = datetime.now().isoformat()

                self._save_trees(trees)
                return True

        return False

    def delete_tree(self, tree_id: str) -> bool:
        """删除分类树"""
        trees = self._load_trees()
        original_len = len(trees)

        trees = [t for t in trees if t['id'] != tree_id]

        if len(trees) < original_len:
            self._save_trees(trees)
            return True

        return False

    def add_node(self, tree_id: str, name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """添加节点到分类树

        Args:
            tree_id: 分类树ID
            name: 节点名称
            parent_id: 父节点ID，None表示根节点

        Returns:
            新节点的ID，如果失败返回None
        """
        trees = self._load_trees()

        for t in trees:
            if t['id'] == tree_id:
                tree = t.get('tree', [])

                # 生成新节点ID
                node_id = str(int(datetime.now().timestamp() * 1000))

                # 确定节点层级
                if parent_id is None:
                    # 根节点
                    level = 1
                    new_node = {
                        "id": node_id,
                        "name": name,
                        "level": level,
                        "parent_id": None,
                        "children": []
                    }
                    tree.append(new_node)
                else:
                    # 查找父节点
                    parent = self._find_node(tree, parent_id)
                    if not parent:
                        return None

                    # 检查层级限制（最多3级）
                    parent_level = parent['level']
                    if parent_level >= 3:
                        return None  # 超过最大层级

                    level = parent_level + 1
                    new_node = {
                        "id": node_id,
                        "name": name,
                        "level": level,
                        "parent_id": parent_id,
                        "children": []
                    }

                    if 'children' not in parent:
                        parent['children'] = []
                    parent['children'].append(new_node)

                t['updated_at'] = datetime.now().isoformat()
                self._save_trees(trees)
                return node_id

        return None

    def update_node(self, tree_id: str, node_id: str, name: str) -> bool:
        """更新节点名称"""
        trees = self._load_trees()

        for t in trees:
            if t['id'] == tree_id:
                tree = t.get('tree', [])
                node = self._find_node(tree, node_id)

                if node:
                    node['name'] = name
                    t['updated_at'] = datetime.now().isoformat()
                    self._save_trees(trees)
                    return True

        return False

    def delete_node(self, tree_id: str, node_id: str) -> bool:
        """删除节点（包括所有子节点）"""
        trees = self._load_trees()

        for t in trees:
            if t['id'] == tree_id:
                tree = t.get('tree', [])

                if self._remove_node(tree, node_id):
                    t['updated_at'] = datetime.now().isoformat()
                    self._save_trees(trees)
                    return True

        return False

    def get_flat_categories(self, tree_id: str) -> List[str]:
        """获取分类树的扁平化分类列表（用于分类任务）"""
        tree_data = self.get_tree(tree_id)
        if not tree_data:
            return []

        categories = []

        def flatten(nodes: List[Dict], prefix: str = ""):
            for node in nodes:
                # 构建完整路径，如 "一级分类/二级分类/三级分类"
                if prefix:
                    full_name = f"{prefix}/{node['name']}"
                else:
                    full_name = node['name']

                categories.append(full_name)

                if node.get('children'):
                    flatten(node['children'], full_name)

        flatten(tree_data.get('tree', []))
        return categories


# 全局实例
category_tree_service = CategoryTreeService()
