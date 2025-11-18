"""Report generation service"""

import logging
import time
from pathlib import Path
from typing import List, Optional

from .data_processor import DataProcessor
from .example_manager import ExampleManager
from .llm_service import LLMService
from .project_manager import ProjectManager
from .prompt_manager import PromptManager
from .project_storage import ProjectStorage

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generate report chapters using LLM"""

    def __init__(
        self,
        *,
        llm_service: Optional[LLMService] = None,
        data_processor: Optional[DataProcessor] = None,
    ):
        self.data_processor = data_processor or DataProcessor()
        self.llm_service = llm_service or LLMService()

    def generate_chapter(
        self,
        project_id: str,
        chapter_type: str,
        data_file_id: str,
        example_file_ids: Optional[List[str]] = None
    ) -> str:
        """Generate a specific chapter of the report

        Args:
            project_id: Project identifier
            chapter_type: "chapter_1" or "chapter_2"
            data_file_id: Uploaded data file identifier
            example_file_ids: Optional list of example file identifiers

        Returns:
            Generated chapter content in markdown format
        """
        project_id = ProjectManager.resolve_project_id(project_id)
        project_paths = ProjectManager.ensure_project_dirs(project_id)

        data_file_path = None
        for ext in ['.csv']:
            potential_path = project_paths.uploads_dir / f"{data_file_id}{ext}"
            if potential_path.exists():
                data_file_path = str(potential_path)
                break

        if not data_file_path:
            raise ValueError(f"Data file not found: {data_file_id}")

        # Read and process data
        df = self.data_processor.read_csv(data_file_path)
        data_summary = self.data_processor.generate_data_summary(df)

        # Process example files if provided
        examples_context = ""
        if example_file_ids:
            example_manager = ExampleManager(project_id)
            example_paths = []
            for file_id in example_file_ids:
                path = example_manager.get_example_file_path(file_id)
                if path:
                    example_paths.append(str(path))

            if example_paths:
                examples_context = self.data_processor.combine_examples(example_paths, chapter_type)

        # Get default template for the chapter
        template = PromptManager.get_default_template(project_id, chapter_type)
        if not template:
            raise ValueError(f"No template found for chapter: {chapter_type}")

        # Build examples text
        examples_text = ""
        if examples_context:
            examples_text = f"\n\n# 参考示例\n\n{examples_context}"

        # Format user prompt with data and examples
        # Use a safer format method that allows unknown placeholders
        system_prompt = template["system_prompt"]
        user_prompt_template = template["user_prompt_template"]

        # Replace known placeholders
        user_prompt = user_prompt_template.replace("{data_summary}", data_summary)
        user_prompt = user_prompt.replace("{examples_text}", examples_text if examples_text else "")

        logger.info(
            "[ReportGenerator] Generating chapter %s for project %s | data_summary_len=%s examples_len=%s",
            chapter_type,
            project_id,
            len(data_summary),
            len(examples_text)
        )
        start_time = time.perf_counter()

        # Generate chapter using LLM
        chapter_content = self.llm_service.generate_report_chapter(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )

        logger.info(
            "[ReportGenerator] Generated chapter %s for project %s in %.2fs | content_len=%s",
            chapter_type,
            project_id,
            time.perf_counter() - start_time,
            len(chapter_content)
        )

        storage = ProjectStorage(project_id)
        storage.set_generated_content(chapter_type, chapter_content)

        return chapter_content

    def generate_chapter_with_text(
        self,
        project_id: str,
        chapter_type: str,
        data_text: str,
        example_file_ids: Optional[List[str]] = None,
        template_id: Optional[str] = None
    ) -> str:
        """Generate a specific chapter from text data

        Args:
            project_id: Project identifier
            chapter_type: "chapter_1" or "chapter_2"
            data_text: Raw text data (CSV or Markdown)
            example_file_ids: Optional list of example file IDs
            template_id: Optional template ID to use (uses default if not provided)

        Returns:
            Generated chapter content in markdown format
        """
        # Process text data
        data_summary = self.data_processor.generate_data_summary_from_text(data_text)

        project_id = ProjectManager.resolve_project_id(project_id)

        # Process example files if provided
        examples_context = ""
        if example_file_ids:
            example_manager = ExampleManager(project_id)
            example_paths = []
            for file_id in example_file_ids:
                file_path = example_manager.get_example_file_path(file_id)
                if file_path:
                    example_paths.append(str(file_path))

            if example_paths:
                examples_context = self.data_processor.combine_examples(example_paths, chapter_type)

        # Get appropriate template for the chapter
        if template_id:
            print(f"[ReportGen] Using custom template: {template_id}")
            template = PromptManager.get_template_by_id(project_id, template_id)
            if not template:
                raise ValueError(f"Template not found: {template_id}")
            print(f"[ReportGen] Template name: {template['name']}")
        else:
            print(f"[ReportGen] Using default template for chapter: {chapter_type}")
            template = PromptManager.get_default_template(project_id, chapter_type)
            if not template:
                raise ValueError(f"No template found for chapter: {chapter_type}")
            print(f"[ReportGen] Template name: {template['name']}")

        # Build examples text
        examples_text = ""
        if examples_context:
            examples_text = f"\n\n# 参考示例\n\n{examples_context}"

        print(f"[ReportGen] Examples context length: {len(examples_context) if examples_context else 0}")
        print(f"[ReportGen] Examples text length: {len(examples_text)}")
        print(f"[ReportGen] Examples text preview: {examples_text[:100] if examples_text else 'No examples'}")
        print(f"[ReportGen] Data summary length: {len(data_summary)}")

        # Format user prompt with data and examples
        # Use a safer format method that allows unknown placeholders
        system_prompt = template["system_prompt"]
        user_prompt_template = template["user_prompt_template"]

        # Replace known placeholders
        user_prompt = user_prompt_template.replace("{data_summary}", data_summary)
        user_prompt = user_prompt.replace("{examples_text}", examples_text if examples_text else "")

        print(f"[ReportGen] Final user prompt length: {len(user_prompt)}")
        print(f"[ReportGen] User prompt contains '参考示例': {'参考示例' in user_prompt}")

        logger.info(
            "[ReportGenerator] Generating chapter %s for project %s (text input) | data_len=%s examples_len=%s template=%s",
            chapter_type,
            project_id,
            len(data_text),
            len(examples_text),
            template.get("id")
        )
        start_time = time.perf_counter()

        # Generate chapter using LLM
        chapter_content = self.llm_service.generate_report_chapter(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )

        logger.info(
            "[ReportGenerator] Generated (text) chapter %s for project %s in %.2fs | content_len=%s",
            chapter_type,
            project_id,
            time.perf_counter() - start_time,
            len(chapter_content)
        )

        storage = ProjectStorage(project_id)
        storage.set_chapter_data(
            chapter_id=chapter_type,
            input_data=data_text,
            generated_content=chapter_content
        )

        return chapter_content
