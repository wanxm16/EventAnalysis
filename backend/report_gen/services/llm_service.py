"""LLM service for calling DeepSeek API"""

from __future__ import annotations

from typing import Optional

from openai import OpenAI

from ..config import Settings, get_settings
from ..constants import CHAPTER_DISPLAY_NAMES


class LLMService:
    """Service for interacting with DeepSeek LLM"""

    def __init__(self, settings: Optional[Settings] = None):
        resolved_settings = settings or get_settings()

        if not resolved_settings.deepseek_api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in environment variables")

        self.api_key = resolved_settings.deepseek_api_key
        self.base_url = resolved_settings.deepseek_base_url
        self.model = resolved_settings.deepseek_model

        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=60.0  # 60 seconds timeout
        )

    def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """Generate response from LLM

        Args:
            system_prompt: System prompt setting the context
            user_prompt: User prompt with specific task
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response

        Returns:
            Generated text response
        """
        try:
            print(f"[LLM] Calling API with model: {self.model}")
            print(f"[LLM] System prompt length: {len(system_prompt)}")
            print(f"[LLM] User prompt length: {len(user_prompt)}")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )

            print(f"[LLM] Response received, length: {len(response.choices[0].message.content)}")
            return response.choices[0].message.content

        except Exception as e:
            print(f"[LLM] Error: {type(e).__name__}: {str(e)}")
            raise RuntimeError(f"LLM API call failed: {str(e)}")

    def _fix_markdown_tables(self, content: str) -> str:
        """Fix malformed markdown tables and HTML tags

        Args:
            content: Original content with potentially malformed tables

        Returns:
            Content with fixed table formatting
        """
        import re

        # First, replace HTML line breaks with actual line breaks in table cells
        # Replace <br> tags with space (since they're meant to break lines within cells)
        content = re.sub(r'<br\s*/?>\s*', ' ', content, flags=re.IGNORECASE)

        # Remove other common HTML tags that might appear
        content = re.sub(r'</?[a-z]+[^>]*>', '', content, flags=re.IGNORECASE)

        lines = []
        for line in content.split('\n'):
            # Detect if this line contains a markdown table separator (|---|---|)
            # If found, split the line into separate table rows
            if '|' in line and ('---' in line or line.count('|') > 6):
                # This might be a compressed table
                # Split by the pattern: | text1 | text2 | ... | immediately followed by | text1 | text2 |
                # Look for |---|---| pattern which indicates table separator

                # Find all positions of table separator pattern
                separator_pattern = r'\|[\s-]+\|'

                if re.search(separator_pattern, line):
                    # This line contains table content, split it properly
                    # Strategy: find | followed by | and treat as row boundaries
                    # More specifically: find patterns like "| ... | | ... |"

                    # Simple approach: look for || which indicates end of one row and start of another
                    fixed_line = line.replace('||', '|\n|')

                    # Also handle cases where there's | | (with space)
                    fixed_line = re.sub(r'\|\s+\|', '|\n|', fixed_line)

                    lines.extend(fixed_line.split('\n'))
                else:
                    lines.append(line)
            else:
                lines.append(line)

        return '\n'.join(lines)

    def generate_report_chapter(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> str:
        """Generate a report chapter with appropriate settings

        Args:
            system_prompt: System prompt
            user_prompt: User prompt with data

        Returns:
            Generated chapter content in markdown
        """
        # Use lower temperature for more consistent, factual output
        response = self.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=4000
        )

        # Fix markdown table formatting
        return self._fix_markdown_tables(response)

    def analyze_examples_and_generate_prompt(
        self,
        chapter_contents: list[str],
        chapter_type: str,
        chapter_title: str | None = None
    ) -> dict:
        """Analyze example documents and generate prompt template

        Args:
            chapter_contents: List of chapter contents from example documents
            chapter_type: Type of chapter (e.g., "chapter_1", "chapter_2")

        Returns:
            Dictionary with 'system_prompt' and 'user_prompt_template'
        """
        # Build analysis prompt
        chapter_name = chapter_title or CHAPTER_DISPLAY_NAMES.get(chapter_type, chapter_type)

        # Combine all examples
        examples_text = "\n\n---\n\n".join([
            f"### 示例 {i+1}\n\n{content}"
            for i, content in enumerate(chapter_contents)
        ])

        system_prompt = """你是一位专业的提示词工程师，擅长分析文档风格并生成高质量的 AI 提示词模板。"""

        user_prompt = f"""请分析以下"{chapter_name}"章节的多个示例文档，并生成一个完整的 prompt 模板。

# 示例文档

{examples_text}

# 分析任务

请仔细分析以上示例，提取以下特征：

1. **写作风格和语气**：正式程度、专业性、语言特点
2. **内容组织结构**：标题层级、段落组织、逻辑顺序
3. **数据呈现方式**：表格格式、列表形式、数据可视化方法
4. **必须包含的关键信息点**：哪些内容是必不可少的
5. **篇幅和详细程度**：内容的详细程度、篇幅控制
6. **格式规范**：Markdown 使用规范、表格格式要求

# 生成要求

基于以上分析，请生成两个部分：

## 1. system_prompt
设定 AI 的角色、能力和基本要求。应该包括：
- AI 的专业身份定位
- 主要职责和能力
- 基本的写作要求

## 2. user_prompt_template
具体的任务指令模板。必须包括：
- 明确的任务描述
- 详细的格式要求（基于示例分析）
- 关键信息点的列举
- 数据呈现规范
- **重要**：必须包含 `{{data_summary}}` 占位符（用于插入数据摘要）
- **重要**：必须包含 `{{examples_text}}` 占位符（用于插入参考示例）
- 质量要求和注意事项

# 输出格式

请严格按照以下 JSON 格式输出（不要有任何额外的文字说明）：

```json
{{
  "system_prompt": "你的 system_prompt 内容...",
  "user_prompt_template": "你的 user_prompt_template 内容，必须包含 {{{{data_summary}}}} 和 {{{{examples_text}}}} 占位符..."
}}
```

注意：
1. 输出必须是有效的 JSON 格式
2. user_prompt_template 中必须包含 `{{{{data_summary}}}}` 和 `{{{{examples_text}}}}` 两个占位符
3. 基于示例的实际风格生成，不要泛泛而谈
4. 确保生成的 prompt 能够引导 AI 生成与示例风格一致的内容
"""

        print(f"[PromptGen] Analyzing {len(chapter_contents)} example(s) for {chapter_type}")
        print(f"[PromptGen] Total example content length: {len(examples_text)}")

        # Call LLM with higher temperature for creative prompt generation
        response = self.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7,
            max_tokens=4000
        )

        print(f"[PromptGen] Generated response length: {len(response)}")

        # Parse JSON response
        import json
        import re

        # Try to extract JSON from code block if present
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object directly
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                raise ValueError("Failed to extract JSON from LLM response")

        try:
            result = json.loads(json_str)

            # Validate required fields
            if "system_prompt" not in result or "user_prompt_template" not in result:
                raise ValueError("Generated prompt missing required fields")

            # Validate placeholders in user_prompt_template
            if "{data_summary}" not in result["user_prompt_template"]:
                print("[PromptGen] Warning: {data_summary} placeholder not found, adding it")
                result["user_prompt_template"] += "\n\n{data_summary}"

            if "{examples_text}" not in result["user_prompt_template"]:
                print("[PromptGen] Warning: {examples_text} placeholder not found, adding it")
                result["user_prompt_template"] += "\n\n{examples_text}"

            print(f"[PromptGen] Successfully generated prompt template")
            print(f"[PromptGen] System prompt length: {len(result['system_prompt'])}")
            print(f"[PromptGen] User prompt template length: {len(result['user_prompt_template'])}")

            return result

        except json.JSONDecodeError as e:
            print(f"[PromptGen] JSON parsing error: {e}")
            print(f"[PromptGen] Response content: {response[:500]}")
            raise ValueError(f"Failed to parse JSON from LLM response: {e}")
