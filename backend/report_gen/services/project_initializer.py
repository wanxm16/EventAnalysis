"""Project initialization helper."""

from __future__ import annotations

from datetime import datetime
import uuid
from pathlib import Path
from typing import Optional

from ..utils import save_upload_file
from .project_manager import ProjectManager
from .example_manager import ExampleManager
from .data_processor import DataProcessor
from .chapter_parser import ChapterParser
from .prompt_generator import PromptGenerator
from .prompt_manager import PromptManager


class ProjectInitializer:
    """Encapsulate logic for seeding a project from a reference document."""

    @staticmethod
    def initialize_from_bytes(project_id: str, file_bytes: bytes, filename: str) -> dict:
        """Initialize project from uploaded bytes."""
        paths = ProjectManager.get_project_paths(project_id)

        ProjectInitializer._clear_examples_dir(paths.examples_dir)

        file_id, saved_path = save_upload_file(file_bytes, filename, str(paths.examples_dir))
        ExampleManager(project_id).replace_examples([{"id": file_id, "name": filename}])

        return ProjectInitializer._generate_from_file(
            project_id=project_id,
            file_path=Path(saved_path),
            filename=filename,
            file_id=file_id
        )

    @staticmethod
    def initialize_from_existing_file(project_id: str, file_id: str, file_path: str, filename: str) -> dict:
        """Initialize project using a file that has already been stored."""
        paths = ProjectManager.get_project_paths(project_id)

        ProjectInitializer._clear_examples_dir(paths.examples_dir)

        stored_path = Path(file_path)
        # Ensure file resides in project examples directory
        if stored_path.parent != paths.examples_dir:
            raise ValueError("Example file is not located in the project's examples directory")

        ExampleManager(project_id).replace_examples([{"id": file_id, "name": filename}])

        return ProjectInitializer._generate_from_file(
            project_id=project_id,
            file_path=stored_path,
            filename=filename,
            file_id=file_id
        )

    @staticmethod
    def _clear_examples_dir(examples_dir: Path) -> None:
        examples_dir.mkdir(parents=True, exist_ok=True)
        for existing in examples_dir.glob('*'):
            if existing.is_file():
                existing.unlink()

    @staticmethod
    def _generate_from_file(project_id: str, file_path: Path, filename: str, file_id: str) -> dict:
        data_processor = DataProcessor()
        parser = ChapterParser()
        prompt_generator = PromptGenerator(project_id)

        text_content = data_processor.read_example_file(str(file_path))
        parsed_chapters = parser.parse(text_content)

        if not parsed_chapters:
            raise ValueError("未在文档中识别到章节，请检查文档格式")

        chapters_payload = []
        templates_payload: dict[str, list[dict]] = {}

        for index, parsed in enumerate(parsed_chapters):
            chapter_id = f"chapter_{index + 1}"
            chapter_title = parsed.title.strip() or f"章节{index + 1}"
            chapters_payload.append({
                "id": chapter_id,
                "title": chapter_title,
                "order": index
            })

            prompt_result = prompt_generator.generate_from_chapter_content(
                chapter_type=chapter_id,
                chapter_title=chapter_title,
                content=parsed.content or chapter_title
            )

            timestamp = datetime.utcnow().isoformat()
            templates_payload[chapter_id] = [{
                "id": str(uuid.uuid4()),
                "name": f"AI 生成 - {chapter_title}",
                "chapter": chapter_id,
                "system_prompt": prompt_result["system_prompt"],
                "user_prompt_template": prompt_result["user_prompt_template"],
                "is_default": True,
                "created_at": timestamp,
                "updated_at": timestamp
            }]

        ProjectManager.save_chapters(project_id, chapters_payload)
        PromptManager.replace_all_templates(project_id, templates_payload)
        ProjectManager.update_project(project_id)

        return {
            "success": True,
            "project_id": project_id,
            "chapters": chapters_payload,
            "templates_generated": len(templates_payload),
            "example_file_id": file_id,
            "filename": filename
        }

