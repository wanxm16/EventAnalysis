"""Project chapter data persistence service."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from .project_manager import ProjectManager


class ProjectStorage:
    """Persist user-provided chapter inputs and generated content."""

    DATA_FILE = "data.json"

    def __init__(self, project_id: str):
        self.project_id = ProjectManager.resolve_project_id(project_id)
        paths = ProjectManager.ensure_project_dirs(self.project_id)
        self.root = paths.root
        self.data_file = self.root / self.DATA_FILE

    @property
    def _initial_payload(self) -> Dict[str, Any]:
        return {
            "project_id": self.project_id,
            "updated_at": datetime.utcnow().isoformat(),
            "chapters": {}
        }

    def _load(self) -> Dict[str, Any]:
        if not self.data_file.exists():
            return self._initial_payload
        try:
            with open(self.data_file, "r", encoding="utf-8") as file:
                payload = json.load(file)
        except Exception:
            payload = self._initial_payload
        payload.setdefault("chapters", {})
        return payload

    def _save(self, payload: Dict[str, Any]) -> None:
        payload["updated_at"] = datetime.utcnow().isoformat()
        self.root.mkdir(parents=True, exist_ok=True)
        with open(self.data_file, "w", encoding="utf-8") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2)

    def get_chapter_data(self, chapter_id: str) -> Dict[str, Any]:
        payload = self._load()
        return payload.get("chapters", {}).get(chapter_id, {
            "chapter_id": chapter_id,
            "input_data": "",
            "generated_content": "",
            "updated_at": None
        })

    def set_chapter_data(self, chapter_id: str, input_data: str, generated_content: str | None = None) -> Dict[str, Any]:
        payload = self._load()
        chapters = payload.setdefault("chapters", {})
        entry = chapters.setdefault(chapter_id, {
            "chapter_id": chapter_id,
            "input_data": "",
            "generated_content": "",
            "updated_at": None
        })
        entry["input_data"] = input_data
        if generated_content is not None:
            entry["generated_content"] = generated_content
        entry["updated_at"] = datetime.utcnow().isoformat()
        self._save(payload)
        return entry

    def set_generated_content(self, chapter_id: str, generated_content: str) -> Dict[str, Any]:
        payload = self._load()
        chapters = payload.setdefault("chapters", {})
        entry = chapters.setdefault(chapter_id, {
            "chapter_id": chapter_id,
            "input_data": "",
            "generated_content": "",
            "updated_at": None
        })
        entry["generated_content"] = generated_content
        entry["updated_at"] = datetime.utcnow().isoformat()
        self._save(payload)
        return entry

    def clear_generated_content(self, chapter_id: str | None = None) -> Dict[str, Any]:
        payload = self._load()
        chapters = payload.setdefault("chapters", {})
        cleared: list[str] = []
        now = datetime.utcnow().isoformat()

        def _clear(entry: Dict[str, Any]) -> bool:
            original = entry.get("generated_content", "")
            if original != "":
                entry["generated_content"] = ""
                entry["updated_at"] = now
                return True
            if original is None:
                entry["generated_content"] = ""
                entry["updated_at"] = now
                return True
            return False

        if chapter_id:
            entry = chapters.get(chapter_id)
            if entry and _clear(entry):
                cleared.append(chapter_id)
        else:
            for chapter_key, entry in chapters.items():
                if _clear(entry):
                    cleared.append(chapter_key)

        if cleared:
            self._save(payload)

        return {
            "project_id": self.project_id,
            "cleared_chapters": cleared
        }
