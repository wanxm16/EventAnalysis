"""Prompt generator service for creating templates from examples"""

from typing import Optional

from .chapter_parser import ChapterParser
from .data_processor import DataProcessor
from .example_manager import ExampleManager
from .llm_service import LLMService
from .project_manager import ProjectManager
from .prompt_manager import PromptManager


class PromptGenerator:
    """Generate prompt templates by analyzing example documents"""

    def __init__(
        self,
        project_id: str,
        *,
        llm_service: Optional[LLMService] = None,
        data_processor: Optional[DataProcessor] = None,
        example_manager: Optional[ExampleManager] = None,
        chapter_parser: Optional[ChapterParser] = None,
    ):
        self.project_id = ProjectManager.resolve_project_id(project_id)
        self.data_processor = data_processor or DataProcessor()
        self.llm_service = llm_service or LLMService()
        self.example_manager = example_manager or ExampleManager(self.project_id)
        self.chapter_parser = chapter_parser or ChapterParser()

    def generate_from_examples(
        self,
        example_file_ids: list[str],
        chapter_type: str,
        chapter_title: str | None = None
    ) -> dict:
        """Generate prompt template from multiple example documents

        Args:
            example_file_ids: List of example file IDs to analyze
            chapter_type: Chapter type (e.g., "chapter_1", "chapter_2")

        Returns:
            Dictionary containing:
            - system_prompt: Generated system prompt
            - user_prompt_template: Generated user prompt template
            - analyzed_examples: Number of examples analyzed
        """
        if not example_file_ids:
            raise ValueError("At least one example file is required")

        print(f"[PromptGenerator] Generating prompt for {chapter_type} from {len(example_file_ids)} example(s)")

        # Load and extract chapter contents from all examples
        chapter_contents = []

        for file_id in example_file_ids:
            try:
                # Get example file info
                example = self.example_manager.get_example_by_id(file_id)
                if not example:
                    print(f"[PromptGenerator] Warning: Example {file_id} not found, skipping")
                    continue

                file_path = self.example_manager.get_example_file_path(file_id)
                if not file_path:
                    print(f"[PromptGenerator] Warning: File not found for {file_id} ({example['name']}), skipping")
                    continue

                # Read example file
                content = self.data_processor.read_example_file(str(file_path))

                # Parse document into chapters and locate target
                parsed_chapters = self.chapter_parser.parse(content)
                matched_content = None

                if parsed_chapters:
                    if chapter_title:
                        for parsed in parsed_chapters:
                            if parsed.title.strip() == chapter_title.strip():
                                matched_content = parsed.content
                                break
                    if matched_content is None:
                        # Fallback to matching by order using chapter index if names differ
                        project_chapters = ProjectManager.get_chapters(self.project_id)
                        index = next(
                            (i for i, item in enumerate(project_chapters) if item["id"] == chapter_type),
                            None
                        )
                        if index is not None and index < len(parsed_chapters):
                            matched_content = parsed_chapters[index].content

                if matched_content:
                    chapter_contents.append(matched_content)
                    print(f"[PromptGenerator] Extracted {len(matched_content)} chars from {example['name']}")

            except Exception as e:
                print(f"[PromptGenerator] Error processing example {file_id}: {e}")
                continue

        if not chapter_contents:
            raise ValueError("Failed to extract any chapter content from the provided examples")

        print(f"[PromptGenerator] Successfully extracted content from {len(chapter_contents)} example(s)")

        # Analyze examples and generate prompt
        result = self.llm_service.analyze_examples_and_generate_prompt(
            chapter_contents=chapter_contents,
            chapter_type=chapter_type,
            chapter_title=chapter_title
        )

        # Add metadata
        result["analyzed_examples"] = len(chapter_contents)
        result["chapter_type"] = chapter_type

        return result

    def generate_from_all_examples(self, chapter_type: str, chapter_title: str | None = None) -> dict:
        """Generate prompt from all available example documents

        Args:
            chapter_type: Chapter type to generate prompt for

        Returns:
            Dictionary with generated prompt template
        """
        # Get all example file IDs
        examples = self.example_manager.get_all_examples()
        if not examples:
            raise ValueError("No example documents available")

        example_ids = [ex["id"] for ex in examples]
        print(f"[PromptGenerator] Using all {len(example_ids)} available examples")

        return self.generate_from_examples(
            example_file_ids=example_ids,
            chapter_type=chapter_type,
            chapter_title=chapter_title
        )

    def generate_from_chapter_content(self, chapter_type: str, chapter_title: str, content: str) -> dict:
        """Generate prompt template directly from chapter content"""
        if not content.strip():
            raise ValueError("Chapter content is empty")

        result = self.llm_service.analyze_examples_and_generate_prompt(
            chapter_contents=[content],
            chapter_type=chapter_type,
            chapter_title=chapter_title
        )

        result["analyzed_examples"] = 1
        result["chapter_type"] = chapter_type
        return result
