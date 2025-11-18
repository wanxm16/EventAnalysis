"""Data processing service for CSV files and text data"""

import pandas as pd
from pathlib import Path
from typing import Dict, Any
from io import StringIO


class DataProcessor:
    """Process CSV data and generate summaries for LLM"""

    @staticmethod
    def read_csv(file_path: str) -> pd.DataFrame:
        """Read CSV file into DataFrame"""
        try:
            df = pd.read_csv(file_path)
            return df
        except Exception as e:
            raise ValueError(f"Failed to read CSV file: {str(e)}")

    @staticmethod
    def parse_text_data(text: str) -> pd.DataFrame:
        """Parse text data (CSV, TSV, or Markdown) into DataFrame

        Args:
            text: Text data in CSV, TSV, or Markdown table format

        Returns:
            pandas DataFrame
        """
        # Try parsing as tab-separated values first (common format from Excel)
        try:
            # First try without header
            df_no_header = pd.read_csv(StringIO(text), sep='\t', header=None)
            if len(df_no_header.columns) > 1:
                # Check if first row contains numeric values (indicating no header)
                first_row = df_no_header.iloc[0]
                numeric_count = sum(pd.to_numeric(first_row, errors='coerce').notna())

                # If more than half of the first row is numeric, treat as no header
                if numeric_count > len(first_row) / 2:
                    # Generate generic column names
                    df_no_header.columns = [f'列{i+1}' for i in range(len(df_no_header.columns))]
                    return df_no_header
                else:
                    # Try with header
                    df = pd.read_csv(StringIO(text), sep='\t')
                    if len(df.columns) > 1:
                        return df
        except Exception:
            pass

        # Try parsing as comma-separated CSV
        try:
            # First try without header
            df_no_header = pd.read_csv(StringIO(text), header=None)
            if len(df_no_header.columns) > 1:
                # Check if first row contains numeric values (indicating no header)
                first_row = df_no_header.iloc[0]
                numeric_count = sum(pd.to_numeric(first_row, errors='coerce').notna())

                # If more than half of the first row is numeric, treat as no header
                if numeric_count > len(first_row) / 2:
                    # Generate generic column names
                    df_no_header.columns = [f'列{i+1}' for i in range(len(df_no_header.columns))]
                    return df_no_header
                else:
                    # Try with header
                    df = pd.read_csv(StringIO(text))
                    if len(df.columns) > 0:
                        return df
        except Exception:
            pass

        # Try parsing as markdown table
        try:
            lines = [line.strip() for line in text.strip().split('\n') if line.strip()]

            # Remove markdown table separator lines (e.g., |---|---|)
            lines = [line for line in lines if not all(c in '|-: ' for c in line)]

            # Parse header and data
            if len(lines) < 2:
                raise ValueError("Not enough data rows")

            # Convert markdown table to CSV-like format
            csv_lines = []
            for line in lines:
                # Remove leading/trailing pipes and split
                cells = [cell.strip() for cell in line.strip('|').split('|')]
                csv_lines.append(','.join(cells))

            csv_text = '\n'.join(csv_lines)
            df = pd.read_csv(StringIO(csv_text))
            return df
        except Exception as e:
            raise ValueError(f"Failed to parse text data: {str(e)}")

    @staticmethod
    def generate_data_summary_from_text(text: str) -> str:
        """Generate data summary directly from text

        Args:
            text: Raw text data (CSV or Markdown)

        Returns:
            Formatted string summary
        """
        try:
            df = DataProcessor.parse_text_data(text)
            return DataProcessor.generate_data_summary(df)
        except Exception:
            # If parsing fails, return the raw text
            return f"## 原始数据\n\n```\n{text}\n```"

    @staticmethod
    def generate_data_summary(df: pd.DataFrame) -> str:
        """Generate a text summary of the DataFrame for LLM

        Args:
            df: pandas DataFrame with event data

        Returns:
            Formatted string summary of the data
        """
        summary_parts = []

        # Basic info
        summary_parts.append(f"## 数据概览\n")
        summary_parts.append(f"- 总记录数：{len(df)}")
        summary_parts.append(f"- 字段列表：{', '.join(df.columns.tolist())}\n")

        # Show first few rows as example
        summary_parts.append(f"## 数据示例（前5条）\n")
        summary_parts.append(df.head(5).to_markdown(index=False))

        # Basic statistics for numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            summary_parts.append(f"\n## 数值字段统计\n")
            summary_parts.append(df[numeric_cols].describe().to_markdown())

        # Value counts for categorical columns (limit to top 10)
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            summary_parts.append(f"\n## 分类字段分布\n")
            for col in categorical_cols[:5]:  # Limit to first 5 categorical columns
                value_counts = df[col].value_counts().head(10)
                summary_parts.append(f"\n### {col}\n")
                summary_parts.append(value_counts.to_markdown())

        # Full data as CSV for LLM to parse
        summary_parts.append(f"\n## 完整数据（CSV格式）\n")
        summary_parts.append("```csv")
        summary_parts.append(df.to_csv(index=False))
        summary_parts.append("```")

        return "\n".join(summary_parts)

    @staticmethod
    def read_example_file(file_path: str) -> str:
        """Read example file (Markdown or Word)

        Args:
            file_path: Path to example file

        Returns:
            Content of the file as text
        """
        try:
            # Check file extension
            if file_path.endswith(('.md', '.markdown')):
                # Read markdown file
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            elif file_path.endswith(('.docx', '.doc')):
                # Read Word file
                from docx import Document
                doc = Document(file_path)

                # Extract all text from paragraphs and tables
                text_parts = []

                # Use the simpler paragraph.text approach to avoid duplication
                for para in doc.paragraphs:
                    if para.text.strip():
                        text_parts.append(para.text)

                # Handle tables separately
                for table in doc.tables:
                    # Create markdown table
                    rows = []
                    for i, row in enumerate(table.rows):
                        cells = [cell.text.strip() if cell.text else '' for cell in row.cells]
                        rows.append('| ' + ' | '.join(cells) + ' |')

                        # Add separator after header row
                        if i == 0:
                            rows.append('| ' + ' | '.join(['---'] * len(cells)) + ' |')

                    text_parts.append('\n'.join(rows))

                return '\n\n'.join(text_parts)
            else:
                raise ValueError(f"Unsupported file format: {file_path}")

        except Exception as e:
            raise ValueError(f"Failed to read example file: {str(e)}")

    @staticmethod
    def _extract_chapter_from_example(content: str, chapter_type: str) -> str:
        """Extract specific chapter content from example document

        Args:
            content: Full example document content
            chapter_type: "chapter_1" or "chapter_2"

        Returns:
            Extracted chapter content
        """
        import re

        # Define chapter patterns for different types
        chapter_patterns = {
            "chapter_1": [
                r"一、\s*全区社会治理基本情况.*?(?=二、|三、|四、|$)",
                r"第一章.*?(?=第二章|第三章|第四章|$)",
                r"1\.\s*全区社会治理基本情况.*?(?=2\.|3\.|4\.|$)",
            ],
            "chapter_2": [
                r"二、\s*高频社会治理问题隐患分析研判.*?(?=三、|四、|$)",
                r"第二章.*?(?=第三章|第四章|$)",
                r"2\.\s*高频.*?(?=3\.|4\.|$)",
            ],
            "chapter_3": [
                r"三、\s*社情民意热点问题分析预警.*?(?=四、|五、|$)",
                r"第三章.*?(?=第四章|第五章|$)",
                r"3\.\s*社情民意.*?(?=4\.|5\.|$)",
            ],
            "chapter_4": [
                r"四、\s*事件处置解决情况分析.*?(?=五、|$)",
                r"第四章.*?(?=第五章|$)",
                r"4\.\s*事件处置.*",
            ]
        }

        # Try to extract the specific chapter
        if chapter_type in chapter_patterns:
            for pattern in chapter_patterns[chapter_type]:
                match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
                if match:
                    extracted = match.group(0).strip()
                    print(f"[DataProcessor] Extracted chapter content length: {len(extracted)}")
                    return extracted

        # If no specific chapter found, return full content
        print(f"[DataProcessor] No specific chapter found, using full content")
        return content

    @staticmethod
    def combine_examples(example_paths: list[str], chapter_type: str = None) -> str:
        """Combine multiple example files into one context

        Args:
            example_paths: List of paths to example files
            chapter_type: Optional chapter type to extract specific section

        Returns:
            Combined example content
        """
        if not example_paths:
            return ""

        examples = []
        for i, path in enumerate(example_paths, 1):
            try:
                content = DataProcessor.read_example_file(path)

                # Extract specific chapter if chapter_type is provided
                if chapter_type:
                    content = DataProcessor._extract_chapter_from_example(content, chapter_type)

                examples.append(f"### 示例 {i}\n\n{content}")
            except Exception as e:
                print(f"Warning: Failed to read example file {path}: {e}")
                continue

        return "\n\n---\n\n".join(examples) if examples else ""
