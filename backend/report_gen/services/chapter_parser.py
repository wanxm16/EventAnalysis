"""Utilities to parse chapter structures from documents."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


@dataclass
class ParsedChapter:
    """Parsed chapter representation."""

    title: str
    content: str


class ChapterParser:
    """Parse documents into chapters based on headings."""

    # Patterns for different heading styles
    HEADING_PATTERNS = [
        r"^(第[一二三四五六七八九十百千万]+[章节篇部段])[\s　]*(.*)$",
        r"^([一二三四五六七八九十]+[\.、])[\s　]*(.*)$",
        r"^([0-9]+[\.\、])[\s　]*(.*)$",
        r"^(#{1,3})\s+(.*)$",
    ]

    def __init__(self) -> None:
        self._compiled_patterns = [re.compile(pattern) for pattern in self.HEADING_PATTERNS]

    def parse(self, text: str) -> List[ParsedChapter]:
        """Parse the document text into chapters."""
        if not text:
            return []

        lines = text.splitlines()
        candidates: List[tuple[int, str]] = []
        seen_titles: set[str] = set()

        for index, raw_line in enumerate(lines):
            line = raw_line.strip()
            if not line:
                continue

            heading = self._match_heading(line)
            if heading:
                title = heading
                # Skip duplicate consecutive titles to avoid parsing the same chapter multiple times
                # Only add if this exact title hasn't been seen yet
                if title not in seen_titles:
                    candidates.append((index, title))
                    seen_titles.add(title)

        # If no headings detected, consider whole document as single chapter
        if not candidates:
            combined = text.strip()
            if not combined:
                return []
            return [ParsedChapter(title="章节一", content=combined)]

        chapters: List[ParsedChapter] = []
        total_lines = len(lines)

        for idx, (line_index, title) in enumerate(candidates):
            start = line_index + 1  # content starts after heading line
            end = candidates[idx + 1][0] if idx + 1 < len(candidates) else total_lines
            content = "\n".join(lines[start:end]).strip()

            # If content empty, still keep heading but placeholder
            if not content:
                content = ""

            chapters.append(ParsedChapter(title=title.strip(), content=content))

        return chapters

    def _match_heading(self, line: str) -> str | None:
        """Match a heading pattern and normalize title."""
        for pattern in self._compiled_patterns:
            match = pattern.match(line)
            if not match:
                continue

            groups = [g for g in match.groups() if g]

            # For markdown headings (# Title) pattern, groups may include hash prefix
            if match.re.pattern.startswith("^(#{1,3})"):
                # Use the captured title portion (groups[1])
                if len(groups) >= 2:
                    return self._clean_repeated_title(groups[1])
                continue

            # For other patterns, reassemble groups
            if len(groups) >= 2:
                prefix, rest = groups[0], groups[1]
                full_title = f"{prefix}{rest}".strip()
                return self._clean_repeated_title(full_title)
            if len(groups) == 1:
                return self._clean_repeated_title(groups[0].strip())

        return None

    def _clean_repeated_title(self, title: str) -> str:
        """Remove repeated patterns from a title.

        Example: "一、标题一、标题一、标题" -> "一、标题"
        Example: "三、标题三、三、标题标题" -> "三、标题"
        """
        if not title:
            return title

        # Strategy 1: Find the longest common substring that appears multiple times
        # We'll try to find patterns where a base title is repeated with variations

        # First, try exact repetition (fast path)
        length = len(title)
        for segment_len in range(1, length // 2 + 1):
            if length % segment_len == 0:
                segment = title[:segment_len]
                if segment * (length // segment_len) == title:
                    return segment

        # Strategy 2: Look for Chinese chapter prefixes and extract the core title
        # Common patterns: "一、", "二、", "三、", etc.
        import re

        # Find all occurrences of Chinese number prefixes
        chinese_nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

        for num in chinese_nums:
            prefix = f"{num}、"
            if title.startswith(prefix):
                # Count how many times this prefix appears
                prefix_count = title.count(prefix)

                if prefix_count > 1:
                    # Try to extract the unique part after the first prefix
                    after_first_prefix = title[len(prefix):]

                    # Find the shortest segment that when repeated (with variations) forms the rest
                    # Look for the first occurrence of the prefix again
                    next_prefix_pos = after_first_prefix.find(prefix)

                    if next_prefix_pos > 0:
                        # The core title is likely before the next prefix
                        core_title = after_first_prefix[:next_prefix_pos]
                        return prefix + core_title
                    else:
                        # Check if the number itself appears multiple times after the prefix
                        # e.g., "四、事件处置解决情况分析四四" -> should be "四、事件处置解决情况分析"
                        # Find the first occurrence of the number character in the content
                        num_pos = after_first_prefix.find(num)
                        if num_pos > 0:
                            # The core title is likely before this number
                            candidate = after_first_prefix[:num_pos]

                            # Additional check: if there are multiple occurrences of the number,
                            # and they appear consecutively (like "四四"), find the first one
                            # Check if the candidate itself contains the number at the end
                            while candidate and candidate.rstrip().endswith(num):
                                candidate = candidate.rstrip()[:-len(num)]

                            return prefix + candidate

        # Strategy 3: Use a more sophisticated approach - find repeating sequences
        # by checking if removing duplicates from the end produces a valid title
        for cut_point in range(len(title) // 3, len(title)):
            candidate = title[:cut_point]
            # Check if the rest of the title contains similar content
            rest = title[cut_point:]

            # If the candidate appears to be complete (ends with certain characters)
            # and the rest seems like repetition, use the candidate
            if candidate and not rest.startswith(candidate[:min(5, len(candidate))]):
                # Not a simple repetition from this cut point
                continue

            # Simple heuristic: if candidate ends with common endings and rest is shorter
            if len(rest) < len(candidate) * 0.6:
                return candidate

        return title

