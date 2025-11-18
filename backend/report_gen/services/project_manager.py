"""Project management service"""

import json
import shutil
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any


@dataclass
class ProjectPaths:
    """Filesystem paths for a project"""

    root: Path
    examples_dir: Path
    uploads_dir: Path
    prompts_dir: Path
    prompts_file: Path
    example_index_file: Path
    chapters_file: Path


class ProjectManager:
    """Manage projects and related filesystem structure"""

    DEFAULT_PROJECT_ID = "default"
    DEFAULT_PROJECT_NAME = "事件月报"

    PROJECTS_DIR = Path("projects")
    INDEX_FILE = PROJECTS_DIR / "index.json"

    LEGACY_EXAMPLES_DIR = Path("examples")
    LEGACY_UPLOADS_DIR = Path("uploads")
    LEGACY_PROMPTS_DIR = Path("prompts")
    LEGACY_BACKEND_PROMPTS_FILE = Path("backend/prompts/templates.json")

    @classmethod
    def resolve_project_id(cls, project_id: Optional[str]) -> str:
        """Return provided project_id or default if None/empty"""
        return project_id or cls.DEFAULT_PROJECT_ID

    @classmethod
    def ensure_initialized(cls) -> None:
        """Ensure project directory and default project exist"""
        cls.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

        if not cls.INDEX_FILE.exists():
            default_project = cls._build_project_entry(
                cls.DEFAULT_PROJECT_ID,
                cls.DEFAULT_PROJECT_NAME
            )
            cls._save_projects([default_project])
        else:
            projects = cls._load_projects_raw()
            if not any(project["id"] == cls.DEFAULT_PROJECT_ID for project in projects):
                default_project = cls._build_project_entry(
                    cls.DEFAULT_PROJECT_ID,
                    cls.DEFAULT_PROJECT_NAME
                )
                projects.insert(0, default_project)
                cls._save_projects(projects)

    @classmethod
    def _load_projects_raw(cls) -> List[Dict[str, Any]]:
        """Load raw projects list without initialization checks"""
        try:
            with open(cls.INDEX_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    @classmethod
    def _save_projects(cls, projects: List[Dict[str, Any]]) -> None:
        """Persist project list to disk"""
        cls.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
        with open(cls.INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(projects, f, ensure_ascii=False, indent=2)

    @classmethod
    def _build_project_entry(cls, project_id: str, name: str) -> Dict[str, Any]:
        """Construct a project entry dictionary"""
        now = datetime.utcnow().isoformat()
        return {
            "id": project_id,
            "name": name,
            "created_at": now,
            "updated_at": now
        }

    @classmethod
    def list_projects(cls) -> List[Dict[str, Any]]:
        """Return all projects"""
        cls.ensure_initialized()
        return cls._load_projects_raw()

    @classmethod
    def get_project(cls, project_id: str) -> Dict[str, Any]:
        """Fetch project by id or raise ValueError"""
        cls.ensure_initialized()
        projects = cls._load_projects_raw()
        for project in projects:
            if project["id"] == project_id:
                return project
        raise ValueError(f"Project not found: {project_id}")

    @classmethod
    def create_project(cls, name: str) -> Dict[str, Any]:
        """Create a new project with the given name"""
        if not name or not name.strip():
            raise ValueError("Project name is required")

        cls.ensure_initialized()

        project_id = str(uuid.uuid4())
        entry = cls._build_project_entry(project_id, name.strip())

        projects = cls._load_projects_raw()
        projects.append(entry)
        cls._save_projects(projects)

        cls.ensure_project_dirs(project_id)
        return entry

    @classmethod
    def delete_project(cls, project_id: str) -> Dict[str, Any]:
        """Delete a project and its associated files"""
        if not project_id:
            raise ValueError("Project ID is required")

        cls.ensure_initialized()

        project_id = cls.resolve_project_id(project_id)
        if project_id == cls.DEFAULT_PROJECT_ID:
            raise ValueError("默认项目不可删除")

        projects = cls._load_projects_raw()
        remaining = [project for project in projects if project["id"] != project_id]

        if len(remaining) == len(projects):
            raise ValueError(f"Project not found: {project_id}")

        cls._save_projects(remaining)

        # Remove project directory if it exists
        project_root = cls.PROJECTS_DIR / project_id
        if project_root.exists():
            shutil.rmtree(project_root, ignore_errors=True)

        return {"id": project_id}

    @classmethod
    def ensure_project_dirs(cls, project_id: str) -> ProjectPaths:
        """Ensure project-specific directories exist and migrate legacy data if needed"""
        cls.ensure_initialized()
        project_id = cls.resolve_project_id(project_id)

        # Validate project exists
        cls.get_project(project_id)

        root = cls.PROJECTS_DIR / project_id
        examples_dir = root / "examples"
        uploads_dir = root / "uploads"
        prompts_dir = root / "prompts"
        prompts_file = prompts_dir / "templates.json"
        example_index_file = examples_dir / "index.json"
        chapters_file = root / "chapters.json"

        root.mkdir(parents=True, exist_ok=True)

        # Examples directory (with migration)
        if project_id == cls.DEFAULT_PROJECT_ID and cls.LEGACY_EXAMPLES_DIR.exists():
            if not examples_dir.exists():
                examples_dir.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(cls.LEGACY_EXAMPLES_DIR), str(examples_dir))
        examples_dir.mkdir(parents=True, exist_ok=True)

        # Uploads directory (with migration)
        if project_id == cls.DEFAULT_PROJECT_ID and cls.LEGACY_UPLOADS_DIR.exists():
            if not uploads_dir.exists():
                uploads_dir.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(cls.LEGACY_UPLOADS_DIR), str(uploads_dir))
        uploads_dir.mkdir(parents=True, exist_ok=True)

        # Prompts directory (with migration of files)
        if project_id == cls.DEFAULT_PROJECT_ID:
            legacy_prompts_candidates = [
                cls.LEGACY_PROMPTS_DIR / "templates.json",
                cls.LEGACY_BACKEND_PROMPTS_FILE
            ]
            for candidate in legacy_prompts_candidates:
                if candidate.exists() and not prompts_file.exists():
                    prompts_dir.mkdir(parents=True, exist_ok=True)
                    prompts_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(candidate), str(prompts_file))
        prompts_dir.mkdir(parents=True, exist_ok=True)

        # Ensure chapters file
        if not chapters_file.exists():
            from ..constants import CHAPTER_TITLES

            if project_id == cls.DEFAULT_PROJECT_ID:
                default_chapters = [
                    {
                        "id": chapter_id,
                        "title": title,
                        "order": index
                    }
                    for index, (chapter_id, title) in enumerate(CHAPTER_TITLES.items())
                ]
            else:
                default_chapters = []

            chapters_file.write_text(
                json.dumps(default_chapters, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )

        return ProjectPaths(
            root=root,
            examples_dir=examples_dir,
            uploads_dir=uploads_dir,
            prompts_dir=prompts_dir,
            prompts_file=prompts_file,
            example_index_file=example_index_file,
            chapters_file=chapters_file
        )

    @classmethod
    def get_project_paths(cls, project_id: str) -> ProjectPaths:
        """Return filesystem paths for a project"""
        cls.ensure_initialized()
        project_id = cls.resolve_project_id(project_id)

        return cls.ensure_project_dirs(project_id)

    @classmethod
    def get_chapters(cls, project_id: str) -> List[Dict[str, Any]]:
        """Load chapters metadata for a project"""
        paths = cls.get_project_paths(project_id)
        try:
            with open(paths.chapters_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    @classmethod
    def save_chapters(cls, project_id: str, chapters: List[Dict[str, Any]]) -> None:
        """Persist chapters metadata for a project"""
        paths = cls.get_project_paths(project_id)
        with open(paths.chapters_file, "w", encoding="utf-8") as f:
            json.dump(chapters, f, ensure_ascii=False, indent=2)

    @classmethod
    def update_project(cls, project_id: str, **fields: Any) -> Dict[str, Any]:
        """Update project metadata fields and return updated entry."""
        cls.ensure_initialized()
        projects = cls._load_projects_raw()
        updated_entry = None

        for project in projects:
            if project["id"] == project_id:
                project.update(fields)
                project["updated_at"] = datetime.utcnow().isoformat()
                updated_entry = project
                break

        if not updated_entry:
            raise ValueError(f"Project not found: {project_id}")

        cls._save_projects(projects)
        return updated_entry
