# Few-shot示例优化方案 - 完整分析

## 🔍 当前Few-shot的问题

### 问题1: 选择策略过于简单

**当前策略**（`data_processor.py` 第175-178行）：
```python
# 优先选择事件描述较长且信息丰富的
sorted_records = sorted(records, 
                       key=lambda x: len(x.get('事件描述', '')), 
                       reverse=True)
```

**问题**: 
- ❌ 只按长度排序
- ❌ 长的不一定有代表性
- ❌ 可能选到边缘案例

**案例**:
```
街面秩序的3个示例都是超长描述（312字、277字、185字）
但内容是: 树木问题、装修纠纷、卖药...
这些不是"街面秩序"的典型案例！
```

### 问题2: 示例数量太少

**当前**: 每个分类3个示例

**不足**:
```
3个示例要代表整个分类
  街面秩序: 3个示例 / 3832个样本 (0.08%)
  
覆盖不全:
  街面秩序包含: 占道(13%)、摊贩(15%)、垃圾(41%)、卫生(20%)...
  3个示例无法涵盖所有子类型
```

### 问题3: 缺乏区分度

**街面秩序 vs 市容环境的关键词重叠**：

| 关键词 | 街面秩序中 | 市容环境中 | 重叠度 |
|--------|-----------|-----------|--------|
| 垃圾 | 41.1% | 84.8% | 高 ⚠️ |
| 卫生 | 19.9% | 54.6% | 高 ⚠️ |
| 占道 | 13.4% | 0% | 区分 ✅ |
| 摊贩 | 15.3% | 0% | 区分 ✅ |
| 绿化 | ? | 9.8% | 区分 ✅ |

**问题**: 
- "垃圾"、"卫生"这两个词在两个分类中都高频
- 如果示例都是关于垃圾的，模型很难区分
- 需要选择更具**区分度**的示例

### 问题4: 缺少对比学习

**当前**: 每个分类独立展示示例

**问题**: 对于易混淆的分类，缺少对比

**例如**:
```
当前只展示:
  街面秩序的示例
  
缺少:
  街面秩序 vs 市容环境的对比
  明确指出两者的区别
```

---

## 🚀 优化方案

### 方案1: 改进示例选择策略（推荐）⭐⭐⭐⭐⭐

#### 1.1 多样化选择

**目标**: 选择能代表分类多个子类型的示例

```python
def generate_few_shot_examples_v2(self, examples_per_category: int = 5):
    """
    改进的Few-shot示例生成
    """
    for cat, records in categories.items():
        examples = []
        
        # 策略1: 按关键特征分组
        if cat == '街面秩序':
            # 选择不同子类型的代表
            groups = {
                '占道': [r for r in records if '占道' in r['事件描述'] or '摊贩' in r['事件描述']],
                '停车': [r for r in records if '停车' in r['事件描述'] or '违停' in r['事件描述']],
                '秩序': [r for r in records if '秩序' in r['事件描述']],
                '其他': records
            }
            
            # 从各组选择代表
            for group_name, group_records in groups.items():
                if group_records:
                    # 选择中等长度的（50-150字）
                    medium = [r for r in group_records if 50 <= len(r['事件描述']) <= 150]
                    if medium:
                        examples.append(medium[0])
                    if len(examples) >= examples_per_category:
                        break
        
        # 策略2: 长度多样化
        else:
            # 短、中、长各选一些
            short = [r for r in records if len(r['事件描述']) < 80]
            medium = [r for r in records if 80 <= len(r['事件描述']) < 200]
            long = [r for r in records if len(r['事件描述']) >= 200]
            
            examples.extend(medium[:2])  # 优先中等长度
            examples.extend(short[:1])
            examples.extend(long[:2])
            
        few_shot_examples[cat] = examples[:examples_per_category]
```

**预期提升**: +2-3%准确率

#### 1.2 基于TF-IDF选择代表性示例

```python
from sklearn.feature_extraction.text import TfidfVectorizer

def select_representative_examples(records, n=5):
    """
    使用TF-IDF选择最具代表性的示例
    """
    descriptions = [r['事件描述'] for r in records]
    
    # 计算TF-IDF
    vectorizer = TfidfVectorizer(max_features=100)
    tfidf_matrix = vectorizer.fit_transform(descriptions)
    
    # 计算每个文档与类别中心的距离
    center = tfidf_matrix.mean(axis=0)
    distances = [
        cosine_similarity(tfidf_matrix[i], center)
        for i in range(len(records))
    ]
    
    # 选择最接近中心的N个（最具代表性）
    top_indices = np.argsort(distances)[-n:]
    
    return [records[i] for i in top_indices]
```

**预期提升**: +1-2%准确率

---

### 方案2: 增加示例数量⭐⭐⭐⭐⭐

**当前**: 3个示例/分类

**改进**: 5-7个示例/分类

```python
# 修改 src/data_processor.py 第230行
processor.generate_few_shot_examples(examples_per_category=5)
```

**优点**:
- ✅ 实施最简单（改1个数字）
- ✅ 覆盖更全面
- ✅ 预期提升1-2%

**缺点**:
- ⚠️ 提示词变长（+token成本）
- ⚠️ 可能超过某些模型的上下文限制

**预期提升**: +1-2%准确率

---

### 方案3: 添加对比学习示例⭐⭐⭐⭐

**针对高混淆分类对**:

```python
def _build_prompt_with_contrast(self, event_description, event_type, valid_categories):
    """
    添加对比学习的提示词
    """
    # ... 原有逻辑 ...
    
    # 为易混淆分类添加对比说明
    if '街面秩序' in valid_categories and '市容环境' in valid_categories:
        prompt += "\n📌 注意区分：\n"
        prompt += "• 街面秩序: 关注秩序和通行（占道、违停、流动摊贩）\n"
        prompt += "  示例: '流动摊贩占道经营' → 街面秩序\n"
        prompt += "\n"
        prompt += "• 市容环境: 关注环境和卫生（垃圾、绿化、清洁）\n"
        prompt += "  示例: '小区垃圾未清理' → 市容环境\n"
        prompt += "\n"
    
    if '电气线路问题' in valid_categories and '电动车违规充电' in valid_categories:
        prompt += "\n📌 注意区分：\n"
        prompt += "• 电气线路问题: 线路本身问题（私拉乱接、老化裸露）\n"
        prompt += "• 电动车违规充电: 充电行为问题（室内充电、飞线充电）\n"
        prompt += "\n"
```

**预期提升**: +2-3%准确率（针对高混淆分类）

---

### 方案4: 动态示例选择⭐⭐⭐⭐

**当前**: 固定使用前3个（最长的）

**改进**: 根据待分类事件动态选择最相关的示例

```python
def _select_dynamic_examples(self, event_description, category, n=3):
    """
    动态选择与当前事件最相关的示例
    """
    all_examples = self.few_shot_examples[category]
    
    # 计算相似度
    from difflib import SequenceMatcher
    similarities = []
    for ex in all_examples:
        sim = SequenceMatcher(None, event_description, ex['事件描述']).ratio()
        similarities.append((sim, ex))
    
    # 选择最相似的N个
    similarities.sort(reverse=True)
    return [ex for sim, ex in similarities[:n]]
```

**预期提升**: +1-2%准确率

---

### 方案5: 增加负例示例⭐⭐⭐

**当前**: 只展示正例（该分类的示例）

**改进**: 同时展示负例（易混淆分类的示例）

```python
prompt += "\n✅ 正例示例（属于街面秩序）：\n"
prompt += "  '流动摊贩占道经营' → 街面秩序\n"
prompt += "\n❌ 负例示例（不属于街面秩序）：\n"
prompt += "  '小区垃圾未清理' → 市容环境（不是街面秩序）\n"
prompt += "  '绿化带需要修剪' → 园林绿化（不是街面秩序）\n"
```

**预期提升**: +1-2%准确率

---

## 📊 各方案对比

| 方案 | 实施难度 | 预期提升 | 成本增加 | ROI | 推荐度 |
|------|---------|---------|---------|-----|--------|
| 1.1 多样化选择 | 中 | +2-3% | 0 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 1.2 TF-IDF选择 | 高 | +1-2% | 0 | ⭐⭐⭐ | ⭐⭐⭐ |
| 2 增加数量(5个) | 低 | +1-2% | +token | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 3 对比学习 | 中 | +2-3% | +token | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 4 动态选择 | 高 | +1-2% | +计算 | ⭐⭐⭐ | ⭐⭐⭐ |
| 5 负例示例 | 中 | +1-2% | +token | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 推荐组合方案

### 快速优化组合（1-2小时，+3-5%）

```
方案2（增加到5个）
  +
方案3（添加对比说明）
  =
预期准确率: 50% → 53-55%
```

**实施步骤**:

#### Step 1: 增加示例数量
```bash
# 重新生成Few-shot示例
python3 -c "
from src.data_processor import DataProcessor

processor = DataProcessor('202507data.csv')
processor.load_data()
processor.clean_data_records()
processor.split_data(train_ratio=0.8)

# 从3个增加到5个
examples = processor.generate_few_shot_examples(examples_per_category=5)
processor.save_few_shot_examples(examples, 'data/few_shot_examples.json')
"
```

#### Step 2: 添加对比学习
```python
# 修改 src/qwen_classifier.py 的 _build_prompt 方法
# 在第175行之前添加对比说明
```

#### Step 3: 测试验证
```bash
python3 src/main.py --mode quick --sample-size 100
```

---

## 💻 具体实施代码

### 优化1: 增加到5个示例（最简单）

```bash
cd /Users/Meng/project/事件分类

# 备份当前示例
cp data/few_shot_examples.json data/few_shot_examples_v1.json

# 生成新示例（5个/分类）
python3 << 'EOF'
from src.data_processor import DataProcessor
import os

processor = DataProcessor('202507data.csv')
processor.load_data()
processor.clean_data_records()
processor.split_data(train_ratio=0.8, random_seed=42)

# 生成5个示例/分类
examples = processor.generate_few_shot_examples(examples_per_category=5)
processor.save_few_shot_examples(examples, 'data/few_shot_examples.json')

print("✅ Few-shot示例已更新为5个/分类")
EOF
```

### 优化2: 添加对比学习到提示词

```python
# 文件: src/qwen_classifier.py
# 位置: 第174行之后添加

def _build_prompt(self, event_description, event_type, ...):
    # ... 现有代码 ...
    
    # 在 "添加待分类的事件" 之前插入对比说明
    
    # 为高混淆分类对添加对比说明
    if event_type == "城市管理":
        if '街面秩序' in valid_categories and '市容环境' in valid_categories:
            prompt += "\n📌 分类区分要点：\n"
            prompt += "• 街面秩序：关注秩序和通行\n"
            prompt += "  - 关键词：占道、违停、流动摊贩、堵塞通道\n"
            prompt += "  - 典型事件：'流动摊贩占道经营' → 街面秩序\n"
            prompt += "\n"
            prompt += "• 市容环境：关注环境和卫生\n"
            prompt += "  - 关键词：垃圾、卫生、绿化、清洁\n"
            prompt += "  - 典型事件：'小区垃圾未清理' → 市容环境\n"
            prompt += "\n"
    
    elif event_type == "消防安全":
        if '电气线路问题（私拉乱接、老化裸露）' in valid_categories and '电动车违规充电' in valid_categories:
            prompt += "\n📌 分类区分要点：\n"
            prompt += "• 电气线路问题：线路本身的问题\n"
            prompt += "  - 关键词：私拉乱接、老化、裸露、电线\n"
            prompt += "\n"
            prompt += "• 电动车违规充电：充电行为问题\n"
            prompt += "  - 关键词：充电、电瓶车、飞线\n"
            prompt += "\n"
    
    # ... 继续原有代码 ...
```

---

## 📊 预期效果

### 优化前（当前v2.0）

```
准确率: 50%
├─ 街面秩序: 85%错误率
├─ 突发事件: 99%错误率  
└─ 电气线路问题: 91%错误率
```

### 优化后（v2.5预估）

**仅增加示例到5个**:
```
准确率: 50% → 51-52% (+1-2%)
├─ 街面秩序: 85% → 80%错误率
├─ 突发事件: 99% → 95%错误率
└─ 电气线路问题: 91% → 85%错误率
```

**增加示例 + 对比学习**:
```
准确率: 50% → 53-55% (+3-5%)
├─ 街面秩序: 85% → 70%错误率 ⭐
├─ 突发事件: 99% → 90%错误率
└─ 电气线路问题: 91% → 75%错误率 ⭐
```

---

## 🎯 具体问题分析

### 街面秩序的Few-shot问题

**当前3个示例的内容**:
1. 树木生长茂密的问题（312字）- ❌ 不典型
2. 装修雨棚纠纷（277字）- ❌ 不典型
3. 卖药摊贩（185字）- ✅ 相关

**问题**: 
- 只有1个与"占道经营"相关
- 另外2个是边缘案例
- 模型学不到"街面秩序=占道经营"的模式

**改进后（5个示例）应该包含**:
1. 流动摊贩占道经营 ✅ 典型
2. 车辆违规停放 ✅ 典型
3. 跨门经营堵通道 ✅ 典型
4. 摊贩影响交通 ✅ 典型
5. 街面秩序维护 ✅ 覆盖其他

---

## 📋 完整优化计划

### Phase 1: 快速改进（30分钟）

**任务1**: 增加示例到5个
```bash
# 重新生成Few-shot示例
python3 src/data_processor.py
# 修改第230行的参数: examples_per_category=5
```

**任务2**: 测试对比
```bash
python3 src/main.py --mode quick --sample-size 100
# 对比准确率变化
```

**预期**: +1-2%准确率

### Phase 2: 添加对比学习（1-2小时）

**任务**: 修改提示词，添加区分要点

**预期**: 在Phase 1基础上再+1-2%

### Phase 3: 高级优化（2-3小时）

**任务**: 实现多样化选择策略

**预期**: 在Phase 2基础上再+1-2%

**总预期**: +3-6%准确率（50% → 53-56%）

---

## ✅ 立即可执行的优化

### 最简单的（推荐先做）

**修改1行代码**:

```python
# 文件: src/data_processor.py
# 行号: 230

# 从这行：
few_shot_examples = processor.generate_few_shot_examples(examples_per_category=3)

# 改为：
few_shot_examples = processor.generate_few_shot_examples(examples_per_category=5)
```

**然后重新运行**:
```bash
# 重新生成Few-shot示例
python3 src/data_processor.py

# 测试效果
python3 src/main.py --mode quick --sample-size 100
```

**预期**: 准确率从40.4%提升到41-42%（快速测试）

---

## 💡 总结回答

### 您的问题：Few-shot是否可以优化？

**答案**: ✅ **绝对可以！而且优化空间很大！**

### 当前Few-shot的问题

1. ❌ 示例数量太少（3个）
2. ❌ 选择策略太简单（只按长度）
3. ❌ 缺乏多样性（可能都是边缘案例）
4. ❌ 缺少对比学习（易混淆分类没有区分说明）
5. ❌ 缺少区分度（关键特征不突出）

### 优化潜力

| 优化项 | 难度 | 时间 | 预期提升 | ROI |
|--------|------|------|---------|-----|
| 增加到5个 | ⭐ | 30分钟 | +1-2% | ⭐⭐⭐⭐⭐ |
| 对比学习 | ⭐⭐ | 1-2小时 | +2-3% | ⭐⭐⭐⭐⭐ |
| 多样化选择 | ⭐⭐⭐ | 2-3小时 | +2-3% | ⭐⭐⭐⭐ |
| 动态选择 | ⭐⭐⭐⭐ | 半天 | +1-2% | ⭐⭐⭐ |
| **组合优化** | **⭐⭐** | **2-3小时** | **+4-7%** | **⭐⭐⭐⭐⭐** |

### 我的建议

**立即执行**:
1. ✅ 增加示例到5个（最简单，30分钟）
2. ✅ 添加对比学习（1-2小时）

**预期效果**:
- 准确率: 50% → 53-55% (+3-5%)
- 街面秩序错误率: 85% → 70% (-15%)

**要不要我现在帮您实施？** 😊

