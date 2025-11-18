"""Shared constants for chapter definitions and display names."""

from __future__ import annotations

from collections import OrderedDict

# Maintain insertion order to keep chapter sequence consistent across UI and backend
_CHAPTER_ITEMS = [
    ("chapter_1", "一、全区社会治理基本情况"),
    ("chapter_2", "二、高频社会治理问题隐患分析研判"),
    ("chapter_3", "三、社情民意热点问题分析预警"),
    ("chapter_4", "四、事件处置解决情况分析"),
]

# Mapping of chapter identifier to title (with leading numbering)
CHAPTER_TITLES = OrderedDict(_CHAPTER_ITEMS)

# Mapping of chapter identifier to display name without the numeric prefix
CHAPTER_DISPLAY_NAMES = OrderedDict(
    (key, title.split("、", 1)[1] if "、" in title else title)
    for key, title in _CHAPTER_ITEMS
)

# Convenience list of all chapter identifiers in order
ALL_CHAPTERS = list(CHAPTER_TITLES.keys())

