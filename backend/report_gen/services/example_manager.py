"""Example file management service"""

import json
from pathlib import Path
from typing import Dict, List, Optional

from .project_manager import ProjectManager


class ExampleManager:
    """Manage example file metadata within a project"""

    SUPPORTED_EXTENSIONS = ['.md', '.markdown', '.docx', '.doc']

    def __init__(self, project_id: Optional[str] = None):
        self.project_id = ProjectManager.resolve_project_id(project_id)
        self.paths = ProjectManager.ensure_project_dirs(self.project_id)
        self.examples_dir = self.paths.examples_dir
        self.index_file = self.paths.example_index_file

    @classmethod
    def for_project(cls, project_id: Optional[str] = None) -> "ExampleManager":
        """Factory helper to create manager for a given project"""
        return cls(project_id)

    def _load_index(self) -> List[Dict[str, str]]:
        if not self.index_file.exists():
            return []

        try:
            with open(self.index_file, 'r', encoding='utf-8') as file:
                return json.load(file)
        except Exception as exc:
            print(f"Warning: Failed to load example index for project {self.project_id}: {exc}")
            return []

    def _save_index(self, examples: List[Dict[str, str]]) -> None:
        try:
            self.examples_dir.mkdir(parents=True, exist_ok=True)
            with open(self.index_file, 'w', encoding='utf-8') as file:
                json.dump(examples, file, ensure_ascii=False, indent=2)
        except Exception as exc:
            print(f"Error: Failed to save example index for project {self.project_id}: {exc}")
            raise

    def add_example(self, file_id: str, filename: str) -> None:
        """Add an example file to the index"""
        examples = self._load_index()

        if any(example['id'] == file_id for example in examples):
            return

        examples.append({
            "id": file_id,
            "name": filename
        })

        self._save_index(examples)

    def replace_examples(self, items: List[Dict[str, str]]) -> None:
        """Replace index with provided entries."""
        self._save_index(items)

    def remove_example(self, file_id: str) -> None:
        """Remove an example file from the index and delete the actual file"""
        examples = self._load_index()
        examples = [example for example in examples if example['id'] != file_id]
        self._save_index(examples)

        file_path = self.get_example_file_path(file_id)
        if file_path and file_path.exists():
            file_path.unlink()

    def get_all_examples(self) -> List[Dict[str, str]]:
        """Get all example files"""
        return self._load_index()

    def get_example_by_id(self, file_id: str) -> Optional[Dict[str, str]]:
        """Get example file by ID"""
        examples = self._load_index()
        for example in examples:
            if example['id'] == file_id:
                return example
        return None

    def get_example_file_path(self, file_id: str) -> Optional[Path]:
        """Get path to example file for given id if it exists"""
        for ext in self.SUPPORTED_EXTENSIONS:
            potential_path = self.examples_dir / f"{file_id}{ext}"
            if potential_path.exists():
                return potential_path
        return None
