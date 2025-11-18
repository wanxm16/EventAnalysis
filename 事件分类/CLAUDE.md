# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an event classification system (事件分类系统) that uses Qwen LLM (千问大模型) for automated categorization of 28,500+ event records from Haishu District into 145 secondary classification categories. The system employs few-shot learning, prompt engineering, and intelligent alias mapping to achieve ~54-56% accuracy on real-world data.

**Key Innovation**: The system implements event-type-based classification restriction, limiting predictions to valid secondary categories based on the primary event type (事件类型), significantly improving accuracy and reducing invalid predictions.

## Common Commands

### Environment Setup
```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install requests pandas numpy matplotlib seaborn scikit-learn
```

### Data Processing
```bash
# Process raw data and generate train/test splits, few-shot examples
python3 src/data_processor.py
```

This generates:
- `data/train_data.csv` (70% split, ~18,462 records)
- `data/test_data.csv` (30% split, ~7,983 records)
- `data/few_shot_examples.json` (5 examples per category)
- `data/data_analysis.json` (statistical analysis)

### Running Classification

```bash
# Full test on all test data (~3-5 hours, ~8,000 samples)
python3 src/main.py --mode full

# Quick test with sample size (recommended for testing)
python3 src/main.py --mode quick --sample-size 100

# Single prediction demo
python3 src/main.py --mode single

# Concurrent mode control
python3 src/main.py --mode full --concurrent --workers 20  # Enable concurrent with 20 threads
python3 src/main.py --mode full --no-concurrent            # Force serial processing
```

**Important**: The `--skip-existing` flag is enabled by default. To force re-prediction, delete `results/predictions.csv`.

### Testing Individual Modules
```bash
# Test API connection
python3 src/qwen_classifier.py

# Test data processing
python3 src/data_processor.py

# Test evaluation module
python3 src/evaluator.py
```

## Architecture

### Core Processing Pipeline

The system follows a 4-stage pipeline:

1. **Data Processing** (`src/data_processor.py`)
   - Loads raw CSV data from `202507data.csv`
   - Cleans records (removes entries without secondary classification)
   - Performs stratified train/test split (80/20) ensuring each category is represented in both sets
   - Generates few-shot examples by selecting longest, most informative descriptions per category

2. **Classification** (`src/qwen_classifier.py`)
   - **Event Type Mapping**: Loads `data/event_type_category_mapping.json` which maps 29 event types to their valid secondary categories (~20-30 categories per event type)
   - **Prompt Construction**: Dynamically builds prompts with:
     - Current event type and valid secondary categories (not all 145)
     - 5 most relevant few-shot examples (selected from valid categories only)
     - Strict output format requirements
     - Contrastive learning guidelines for high-confusion category pairs
   - **5-Layer Fuzzy Matching** (only within valid categories):
     - Layer 1: Alias mapping (`category_aliases.json`) - handles common non-standard names
     - Layer 2: Exact match (case-insensitive)
     - Layer 3: Substring containment
     - Layer 4: Keyword overlap (≥50% threshold)
     - Layer 5: Edit distance similarity (≥70% threshold)
   - **Concurrent Processing**: Supports parallel API calls (default: 20 threads) for faster batch processing

3. **Evaluation** (`src/evaluator.py`)
   - Calculates accuracy, precision, recall, F1 scores (macro and weighted)
   - Per-category performance analysis
   - Generates confusion matrix (top 20 categories)
   - Creates visualizations: confusion matrix PNG, category performance bar chart
   - Produces comprehensive HTML report with actionable insights

4. **Main Orchestration** (`src/main.py`)
   - Integrates all modules
   - Handles three modes: full/quick/single
   - Manages prediction caching (skips existing results by default)
   - Progress tracking and error handling

### Key Data Files

- **`data/event_type_category_mapping.json`**: Critical file mapping each of 29 event types (矛盾纠纷, 城市管理, 消防安全, etc.) to their valid secondary categories. This restriction is the core innovation preventing cross-category misclassifications.

- **`data/category_aliases.json`**: Maps 15 common model output variants to standard names (e.g., "占道经营" → "街面秩序", "租赁纠纷" → "债务纠纷"). Reduces WARNING logs by 90%+.

- **`data/few_shot_examples.json`**: Contains 5 representative examples per category (145 categories × 5 = 725 examples), prioritizing longer, information-rich descriptions.

### Configuration

All settings are centralized in `config/config.py`:

- **`QWEN_CONFIG`**: API credentials, model selection (`qwen-plus`), temperature (0.1 for stability), timeout, retry logic
- **`CLASSIFICATION_CONFIG`**: Few-shot count, batch size, concurrent mode settings, thread pool size
- **`PATHS`**: All file paths for data and results

**Security Note**: `config/config.py` contains API key. Never commit real keys to version control.

## Architecture Highlights

### Event Type Restriction System
The system's key innovation is restricting secondary classification predictions based on primary event type:

- **Training Phase**: `data_processor.py` builds mapping from 18,462 training records
- **Prediction Phase**: `qwen_classifier.py` filters available categories before prompt construction
- **Example**: "矛盾纠纷" events can only be classified into 28 related categories (债务纠纷, 劳动人事纠纷, etc.), not all 145

This reduces the classification space from 145 options to ~20-30 per event, dramatically improving accuracy.

### Intelligent Alias Mapping (v2.0)
Model outputs often use non-standard phrasing. The alias system handles this:
- "占道经营" (unofficial term used by model) → "街面秩序" (standard category)
- "占道、堵塞、封闭消防通道" (verbose model output) → "占用、堵塞、封闭消防通道、消防登高场地" (standard category)

Previously caused 114 WARNINGs; now causes 0-2 WARNINGs on full dataset.

### 5-Layer Fuzzy Matching
When the model output doesn't exactly match a category name, the system applies progressive fuzzy matching:
1. Check if it's a known alias → instant mapping
2. Try exact match (case-insensitive)
3. Check substring containment
4. Calculate keyword overlap score
5. Compute edit distance similarity

Critical: All matching is constrained to the valid categories for that event type.

### Concurrent Processing
By default, the system uses `ThreadPoolExecutor` with 20 threads to parallelize API calls:
- Progress tracking with thread-safe locks
- Ordered result collection (maintains original sequence)
- Automatic retry on API failures (3 attempts with 1s delay)
- Configurable via `--workers` flag or `config.py`

Can be disabled for debugging with `--no-concurrent` flag.

## Performance Characteristics

**Latest (v2.5):**
- Accuracy: 54-56% on full dataset (45% on quick test)
- Prediction success rate: 99.95%+ (nearly zero API failures)
- WARNING count: 0-2 (down from 114 in v2.0)
- Processing speed: ~2-3 seconds per sample (serial), faster with concurrent mode

**Evolution:**
- v1.0: 40% accuracy, 2-3 WARNINGs
- v2.0: 50% accuracy, 5-10 WARNINGs (added alias mapping)
- v2.5: 54-56% accuracy, 0-2 WARNINGs (enhanced few-shot, contrastive learning)

## Output Files

After running classification:
- `results/predictions.csv`: Event ID, description, true label, predicted label, confidence
- `results/evaluation_report.html`: Interactive report with all metrics, per-category analysis, improvement suggestions
- `results/confusion_matrix.png`: Heatmap of top 20 categories
- `results/category_performance.png`: Bar chart comparing precision/recall/F1 per category

## Development Notes

### API Rate Limiting
The Qwen API may have rate limits. The system handles this with:
- Configurable retry logic (3 attempts, 1s delay)
- 0.5s sleep between batches in serial mode
- Concurrent mode can be tuned via `max_workers` to avoid overwhelming the API

### Adding New Aliases
To handle new model output variants:
1. Check WARNING logs after full run (look for "预测分类 'X' 不在事件类型 'Y' 的有效分类中")
2. Edit `data/category_aliases.json` to add mapping: `"model_output": "standard_category"`
3. Re-run classification

### Adjusting Few-Shot Examples
To change the number of examples per category:
1. Edit `examples_per_category` in `src/data_processor.py` line 230
2. Re-run: `python3 src/data_processor.py`
3. This regenerates `data/few_shot_examples.json`

### Prompt Engineering
The prompt template is in `qwen_classifier.py:_build_prompt()`. Key sections:
- Event type declaration
- Valid categories list (dynamically filtered)
- 5 few-shot examples (selected from valid categories)
- Contrastive learning notes for high-confusion pairs (e.g., "街面秩序" vs "市容环境")
- Strict output format rules (6 requirements + 2 self-check questions)

Modifications to the prompt should maintain these structural elements.

## Known Issues and Limitations

1. **Accuracy Ceiling**: 54-56% accuracy is the current best. Further improvements require:
   - More/better few-shot examples per category
   - Fine-tuning the Qwen model on this domain
   - Handling long-tail categories (some have <10 training samples)

2. **Long Tail Categories**: 145 total categories, but distribution is heavily skewed. Some rare categories have very low F1 scores (<0.1).

3. **Cost**: Each API call incurs cost. Full test (7,983 samples) can be expensive. Always use `--mode quick` for testing.

4. **Chinese Font Warnings**: Matplotlib may warn about missing Chinese fonts. This doesn't affect functionality, just aesthetics. Plots still render correctly.

## Documentation

The `docs/` directory contains 27 detailed documents (in Chinese):
- **docs/00-文档导航.md**: Documentation index
- **docs/【重要】优化摘要.md**: Optimization summary (recommended first read)
- **docs/v2.5优化效果报告.md**: Latest version report
- **docs/运行指南.md**: Comprehensive running guide
- **docs/❓常见问题FAQ.md**: FAQ
- **docs/WARNING日志详解.md**: Explanation of WARNING logs
- **docs/基于事件类型的分类限制说明.md**: Event type restriction feature details
- **docs/别名映射表用途详解.md**: Alias mapping explanation
- And 19 more covering optimization strategies, performance analysis, architecture decisions

Refer to these docs for detailed explanations of design decisions and troubleshooting.
