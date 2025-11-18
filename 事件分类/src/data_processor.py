#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据处理模块
负责数据清洗、分割和预处理
"""

import csv
import random
import json
from collections import Counter
from typing import List, Dict, Tuple
import os


class DataProcessor:
    """数据处理器类"""
    
    def __init__(self, data_file: str):
        """
        初始化数据处理器
        
        Args:
            data_file: 原始CSV数据文件路径
        """
        self.data_file = data_file
        self.raw_data = []
        self.clean_data = []
        self.train_data = []
        self.test_data = []
        
    def load_data(self) -> None:
        """加载原始数据"""
        print("正在加载原始数据...")
        with open(self.data_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            self.raw_data = list(reader)
        print(f"加载完成，共 {len(self.raw_data)} 条记录")
    
    def clean_data_records(self) -> None:
        """清洗数据，移除缺失二级分类的记录"""
        print("正在清洗数据...")
        self.clean_data = []
        missing_count = 0
        
        for record in self.raw_data:
            # 检查二级分类是否存在且非空
            if record.get('二级分类') and record['二级分类'].strip():
                self.clean_data.append(record)
            else:
                missing_count += 1
        
        print(f"清洗完成，移除 {missing_count} 条缺失二级分类的记录")
        print(f"清洗后数据量：{len(self.clean_data)} 条")
    
    def analyze_categories(self) -> Dict:
        """分析分类分布"""
        print("正在分析分类分布...")
        categories = [record['二级分类'] for record in self.clean_data]
        category_counts = Counter(categories)
        
        analysis = {
            'total_categories': len(category_counts),
            'total_records': len(self.clean_data),
            'category_distribution': dict(category_counts.most_common()),
            'long_tail_categories': [cat for cat, count in category_counts.items() if count < 10]
        }
        
        print(f"总分类数：{analysis['total_categories']}")
        print(f"长尾分类数（样本<10）：{len(analysis['long_tail_categories'])}")
        print("前10个分类分布：")
        for cat, count in list(category_counts.most_common(10)):
            print(f"  {cat}: {count}")
        
        return analysis
    
    def split_data(self, train_ratio: float = 0.8, random_seed: int = 42) -> None:
        """
        分割数据为训练集和测试集
        
        Args:
            train_ratio: 训练集比例，默认0.8
            random_seed: 随机种子，确保结果可复现
        """
        print(f"正在按 {train_ratio:.1%}:{1-train_ratio:.1%} 比例分割数据...")
        
        # 设置随机种子确保可复现
        random.seed(random_seed)
        
        # 按分类进行分层采样，确保每个分类在训练集和测试集中都有代表
        categories = {}
        for record in self.clean_data:
            cat = record['二级分类']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(record)
        
        self.train_data = []
        self.test_data = []
        
        for cat, records in categories.items():
            # 打乱该分类的记录
            random.shuffle(records)
            
            # 计算训练集数量
            train_count = max(1, int(len(records) * train_ratio))
            
            # 分配到训练集和测试集
            self.train_data.extend(records[:train_count])
            self.test_data.extend(records[train_count:])
        
        # 打乱最终的训练集和测试集
        random.shuffle(self.train_data)
        random.shuffle(self.test_data)
        
        print(f"分割完成：")
        print(f"  训练集：{len(self.train_data)} 条")
        print(f"  测试集：{len(self.test_data)} 条")
    
    def save_split_data(self, train_file: str, test_file: str) -> None:
        """
        保存分割后的数据
        
        Args:
            train_file: 训练集文件路径
            test_file: 测试集文件路径
        """
        print("正在保存分割后的数据...")
        
        # 获取字段名
        if not self.train_data:
            raise ValueError("训练数据为空，请先执行数据分割")
        
        fieldnames = self.train_data[0].keys()
        
        # 保存训练集
        with open(train_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(self.train_data)
        
        # 保存测试集
        with open(test_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(self.test_data)
        
        print(f"数据保存完成：")
        print(f"  训练集：{train_file}")
        print(f"  测试集：{test_file}")
    
    def generate_few_shot_examples(self, examples_per_category: int = 3) -> Dict:
        """
        为每个分类生成Few-shot示例（原始版本，按长度排序）

        Args:
            examples_per_category: 每个分类的示例数量

        Returns:
            包含Few-shot示例的字典
        """
        print(f"正在生成Few-shot示例，每个分类 {examples_per_category} 个...")

        # 按分类组织训练数据
        categories = {}
        for record in self.train_data:
            cat = record['二级分类']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(record)

        few_shot_examples = {}

        for cat, records in categories.items():
            # 选择代表性示例（优先选择事件描述较长且信息丰富的）
            sorted_records = sorted(records,
                                  key=lambda x: len(x.get('事件描述', '')),
                                  reverse=True)

            # 取前N个作为示例
            examples = []
            for record in sorted_records[:examples_per_category]:
                example = {
                    '事件描述': record.get('事件描述', ''),
                    '事件类型': record.get('事件类型', ''),
                    '区县名称': record.get('区县名称', ''),
                    '镇街名称': record.get('镇街名称', ''),
                    '二级分类': record.get('二级分类', '')
                }
                examples.append(example)

            few_shot_examples[cat] = examples

        print(f"Few-shot示例生成完成，覆盖 {len(few_shot_examples)} 个分类")
        return few_shot_examples

    def _extract_keywords(self, text: str) -> set:
        """
        提取文本关键词（简单版本，不依赖外部分词库）

        Args:
            text: 输入文本

        Returns:
            关键词集合
        """
        import re

        # 提取2-5字的中文词组
        words = re.findall(r'[\u4e00-\u9fa5]{2,5}', text)

        # 常见停用词
        stopwords = {
            '反映', '希望', '处理', '居民', '群众', '现在', '已经', '表示',
            '发现', '情况', '问题', '事情', '社区', '工作', '进行', '需要',
            '说是', '要求', '通过', '可以', '没有', '这个', '那个', '什么',
            '怎么', '为了', '还是', '就是', '因为', '所以', '如果', '但是',
            '出现', '存在', '造成', '导致', '产生', '形成', '一个', '一些'
        }

        # 过滤停用词，保留2字以上的词
        keywords = {w for w in words if w not in stopwords and len(w) >= 2}

        return keywords

    def _keyword_similarity(self, kw1: set, kw2: set) -> float:
        """
        计算两个关键词集合的相似度（Jaccard系数）

        Args:
            kw1: 关键词集合1
            kw2: 关键词集合2

        Returns:
            相似度分数 [0, 1]
        """
        if not kw1 or not kw2:
            return 0.0

        intersection = len(kw1 & kw2)
        union = len(kw1 | kw2)

        return intersection / union if union > 0 else 0.0

    def generate_few_shot_examples_enhanced(self, examples_per_category: int = 5) -> Dict:
        """
        增强版Few-shot示例生成：使用多样性采样策略

        策略：
        1. 长度适中（50-200字）- 避免过短或过长
        2. 多样性采样 - 使用MMR算法选择关键词差异大的示例
        3. 覆盖不同场景 - 确保示例代表不同的典型情况

        Args:
            examples_per_category: 每个分类的示例数量

        Returns:
            包含Few-shot示例的字典
        """
        print(f"正在生成增强版Few-shot示例，每个分类 {examples_per_category} 个...")
        print("策略：长度适中 + 多样性采样 + 关键词差异化")

        # 按分类组织训练数据
        categories = {}
        for record in self.train_data:
            cat = record['二级分类']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(record)

        few_shot_examples = {}
        diversity_stats = []  # 记录多样性统计

        for cat, records in categories.items():
            if len(records) == 0:
                continue

            # 步骤1：过滤出长度适中的样本（50-200字）
            filtered_records = [
                r for r in records
                if 50 <= len(r.get('事件描述', '')) <= 200
            ]

            # 如果过滤后样本不足，放宽条件到30-250字
            if len(filtered_records) < examples_per_category:
                filtered_records = [
                    r for r in records
                    if 30 <= len(r.get('事件描述', '')) <= 250
                ]

            # 如果还是不足，使用全部样本
            if len(filtered_records) < examples_per_category:
                filtered_records = records

            # 步骤2：为每个样本提取关键词
            samples_with_keywords = []
            for record in filtered_records:
                desc = record.get('事件描述', '')
                keywords = self._extract_keywords(desc)
                samples_with_keywords.append((record, keywords))

            # 步骤3：多样性采样（MMR算法：最大边际相关性）
            selected = []
            remaining = samples_with_keywords.copy()

            if len(remaining) == 0:
                continue

            # 先选择一个描述最长的作为种子（信息量大）
            remaining.sort(key=lambda x: len(x[0].get('事件描述', '')), reverse=True)
            seed = remaining.pop(0)
            selected.append(seed)

            # 迭代选择与已选样本最不相似的样本
            iteration_count = 0
            while len(selected) < examples_per_category and remaining and iteration_count < 100:
                iteration_count += 1

                max_diversity_idx = 0
                max_diversity_score = -1

                for idx, (candidate, cand_kw) in enumerate(remaining):
                    # 计算与已选样本的平均相似度
                    similarities = []
                    for (sel_record, sel_kw) in selected:
                        sim = self._keyword_similarity(cand_kw, sel_kw)
                        similarities.append(sim)

                    # 多样性得分 = 1 - 平均相似度（越不相似越好）
                    avg_similarity = sum(similarities) / len(similarities)
                    diversity_score = 1 - avg_similarity

                    # 加入长度因素：适中长度的样本稍微加分
                    desc_len = len(candidate.get('事件描述', ''))
                    length_bonus = 0.1 if 80 <= desc_len <= 150 else 0.0

                    final_score = diversity_score + length_bonus

                    if final_score > max_diversity_score:
                        max_diversity_score = final_score
                        max_diversity_idx = idx

                selected.append(remaining.pop(max_diversity_idx))

            # 如果样本不足，从剩余中随机补充
            while len(selected) < examples_per_category and remaining:
                selected.append(remaining.pop(0))

            # 转换为标准格式
            examples = []
            for record, keywords in selected:
                example = {
                    '事件描述': record.get('事件描述', ''),
                    '事件类型': record.get('事件类型', ''),
                    '区县名称': record.get('区县名称', ''),
                    '镇街名称': record.get('镇街名称', ''),
                    '二级分类': record.get('二级分类', '')
                }
                examples.append(example)

            few_shot_examples[cat] = examples

            # 统计多样性指标
            if len(examples) >= 2:
                # 计算示例间的平均相似度
                total_sim = 0
                count = 0
                for i in range(len(selected)):
                    for j in range(i + 1, len(selected)):
                        sim = self._keyword_similarity(selected[i][1], selected[j][1])
                        total_sim += sim
                        count += 1

                avg_diversity = 1 - (total_sim / count) if count > 0 else 0
                diversity_stats.append(avg_diversity)

        print(f"增强版Few-shot示例生成完成，覆盖 {len(few_shot_examples)} 个分类")

        if diversity_stats:
            avg_diversity = sum(diversity_stats) / len(diversity_stats)
            print(f"平均多样性得分: {avg_diversity:.3f} (越高越好，范围0-1)")

        return few_shot_examples
    
    def save_few_shot_examples(self, examples: Dict, output_file: str) -> None:
        """
        保存Few-shot示例到JSON文件
        
        Args:
            examples: Few-shot示例字典
            output_file: 输出文件路径
        """
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(examples, f, ensure_ascii=False, indent=2)
        print(f"Few-shot示例已保存到：{output_file}")


def main():
    """主函数，执行数据处理流程"""
    # 初始化数据处理器
    processor = DataProcessor('202507data.csv')
    
    # 执行数据处理流程
    processor.load_data()
    processor.clean_data_records()
    
    # 分析数据分布
    analysis = processor.analyze_categories()
    
    # 分割数据
    processor.split_data(train_ratio=0.8)
    
    # 保存分割后的数据
    os.makedirs('data', exist_ok=True)
    processor.save_split_data('data/train_data.csv', 'data/test_data.csv')
    
    # 生成Few-shot示例（使用增强版方法）
    print("\n" + "="*60)
    print("使用增强版方法生成Few-shot示例")
    print("="*60)
    few_shot_examples = processor.generate_few_shot_examples_enhanced(examples_per_category=5)
    processor.save_few_shot_examples(few_shot_examples, 'data/few_shot_examples.json')

    # 如果需要对比，可以同时生成原始版本
    # few_shot_examples_old = processor.generate_few_shot_examples(examples_per_category=5)
    # processor.save_few_shot_examples(few_shot_examples_old, 'data/few_shot_examples_old.json')
    
    # 保存分析结果
    with open('data/data_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)
    
    print("\n数据处理完成！")
    print("生成的文件：")
    print("  - data/train_data.csv: 训练数据")
    print("  - data/test_data.csv: 测试数据") 
    print("  - data/few_shot_examples.json: Few-shot示例库")
    print("  - data/data_analysis.json: 数据分析结果")


if __name__ == '__main__':
    main()
