#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
评估模块
计算分类性能指标，生成评估报告
"""

import csv
import json
import numpy as np
import pandas as pd
from collections import Counter, defaultdict
from typing import List, Dict, Tuple
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import PATHS


class ClassificationEvaluator:
    """分类评估器"""
    
    def __init__(self):
        """初始化评估器"""
        self.true_labels = []
        self.predicted_labels = []
        self.confidences = []
        self.category_stats = {}
        
    def load_test_data(self, test_file: str) -> List[Dict]:
        """
        加载测试数据
        
        Args:
            test_file: 测试数据文件路径
            
        Returns:
            测试数据列表
        """
        test_data = []
        with open(test_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            test_data = list(reader)
        
        print(f"加载测试数据完成，共 {len(test_data)} 条")
        return test_data
    
    def load_predictions(self, predictions_file: str) -> List[Tuple[str, float]]:
        """
        加载预测结果
        
        Args:
            predictions_file: 预测结果文件路径
            
        Returns:
            预测结果列表 [(predicted_category, confidence), ...]
        """
        predictions = []
        with open(predictions_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                predicted = row.get('predicted_category', '')
                confidence = float(row.get('confidence', 0.0))
                predictions.append((predicted, confidence))
        
        print(f"加载预测结果完成，共 {len(predictions)} 条")
        return predictions
    
    def calculate_metrics(self, true_labels: List[str], predicted_labels: List[str], 
                         confidences: List[float]) -> Dict:
        """
        计算评估指标
        
        Args:
            true_labels: 真实标签列表
            predicted_labels: 预测标签列表
            confidences: 置信度列表
            
        Returns:
            评估指标字典
        """
        self.true_labels = true_labels
        self.predicted_labels = predicted_labels
        self.confidences = confidences
        
        # 过滤掉预测失败的样本（None值）
        valid_indices = [i for i, pred in enumerate(predicted_labels) if pred is not None]
        
        if not valid_indices:
            return {
                'accuracy': 0.0,
                'macro_precision': 0.0,
                'macro_recall': 0.0,
                'macro_f1': 0.0,
                'weighted_precision': 0.0,
                'weighted_recall': 0.0,
                'weighted_f1': 0.0,
                'prediction_success_rate': 0.0,
                'average_confidence': 0.0,
                'total_samples': len(true_labels),
                'valid_predictions': 0
            }
        
        valid_true = [true_labels[i] for i in valid_indices]
        valid_pred = [predicted_labels[i] for i in valid_indices]
        valid_conf = [confidences[i] for i in valid_indices]
        
        # 基础指标
        accuracy = accuracy_score(valid_true, valid_pred)
        
        # 精确率、召回率、F1分数
        precision, recall, f1, support = precision_recall_fscore_support(
            valid_true, valid_pred, average=None, zero_division=0
        )
        
        # 宏平均和加权平均
        macro_precision = np.mean(precision)
        macro_recall = np.mean(recall)
        macro_f1 = np.mean(f1)
        
        weighted_precision = np.average(precision, weights=support)
        weighted_recall = np.average(recall, weights=support)
        weighted_f1 = np.average(f1, weights=support)
        
        # 预测成功率和平均置信度
        prediction_success_rate = len(valid_indices) / len(true_labels)
        average_confidence = np.mean(valid_conf) if valid_conf else 0.0
        
        metrics = {
            'accuracy': accuracy,
            'macro_precision': macro_precision,
            'macro_recall': macro_recall,
            'macro_f1': macro_f1,
            'weighted_precision': weighted_precision,
            'weighted_recall': weighted_recall,
            'weighted_f1': weighted_f1,
            'prediction_success_rate': prediction_success_rate,
            'average_confidence': average_confidence,
            'total_samples': len(true_labels),
            'valid_predictions': len(valid_indices)
        }
        
        return metrics
    
    def analyze_per_category(self, true_labels: List[str], predicted_labels: List[str]) -> Dict:
        """
        按分类分析性能
        
        Args:
            true_labels: 真实标签列表
            predicted_labels: 预测标签列表
            
        Returns:
            每个分类的性能统计
        """
        # 获取所有分类
        all_categories = list(set(true_labels + [p for p in predicted_labels if p is not None]))
        
        category_stats = {}
        
        for category in all_categories:
            # 计算该分类的TP, FP, FN
            tp = sum(1 for t, p in zip(true_labels, predicted_labels) 
                    if t == category and p == category)
            fp = sum(1 for t, p in zip(true_labels, predicted_labels) 
                    if t != category and p == category)
            fn = sum(1 for t, p in zip(true_labels, predicted_labels) 
                    if t == category and p != category)
            
            # 计算精确率、召回率、F1分数
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
            
            # 样本数量
            true_count = true_labels.count(category)
            pred_count = sum(1 for p in predicted_labels if p == category)
            
            category_stats[category] = {
                'precision': precision,
                'recall': recall,
                'f1': f1,
                'true_count': true_count,
                'predicted_count': pred_count,
                'tp': tp,
                'fp': fp,
                'fn': fn
            }
        
        return category_stats
    
    def generate_confusion_matrix(self, true_labels: List[str], predicted_labels: List[str], 
                                top_n: int = 20) -> np.ndarray:
        """
        生成混淆矩阵
        
        Args:
            true_labels: 真实标签列表
            predicted_labels: 预测标签列表
            top_n: 显示前N个最常见的分类
            
        Returns:
            混淆矩阵
        """
        # 过滤掉预测失败的样本
        valid_pairs = [(t, p) for t, p in zip(true_labels, predicted_labels) if p is not None]
        
        if not valid_pairs:
            return np.array([])
        
        valid_true, valid_pred = zip(*valid_pairs)
        
        # 获取最常见的分类
        all_labels = list(set(valid_true + valid_pred))
        label_counts = Counter(valid_true)
        top_labels = [label for label, _ in label_counts.most_common(top_n)]
        
        # 生成混淆矩阵
        cm = confusion_matrix(valid_true, valid_pred, labels=top_labels)
        
        return cm, top_labels
    
    def plot_confusion_matrix(self, cm: np.ndarray, labels: List[str], 
                            save_path: str = None) -> None:
        """
        绘制混淆矩阵图
        
        Args:
            cm: 混淆矩阵
            labels: 标签列表
            save_path: 保存路径
        """
        plt.figure(figsize=(12, 10))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=labels, yticklabels=labels)
        plt.title('混淆矩阵 (前20个分类)')
        plt.xlabel('预测分类')
        plt.ylabel('真实分类')
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"混淆矩阵图已保存到: {save_path}")
        
        plt.close()
    
    def plot_category_performance(self, category_stats: Dict, save_path: str = None) -> None:
        """
        绘制分类性能图
        
        Args:
            category_stats: 分类统计数据
            save_path: 保存路径
        """
        # 按F1分数排序，取前20个
        sorted_categories = sorted(category_stats.items(), 
                                 key=lambda x: x[1]['f1'], reverse=True)[:20]
        
        categories = [item[0] for item in sorted_categories]
        precisions = [item[1]['precision'] for item in sorted_categories]
        recalls = [item[1]['recall'] for item in sorted_categories]
        f1s = [item[1]['f1'] for item in sorted_categories]
        
        x = np.arange(len(categories))
        width = 0.25
        
        plt.figure(figsize=(15, 8))
        plt.bar(x - width, precisions, width, label='精确率', alpha=0.8)
        plt.bar(x, recalls, width, label='召回率', alpha=0.8)
        plt.bar(x + width, f1s, width, label='F1分数', alpha=0.8)
        
        plt.xlabel('分类')
        plt.ylabel('性能指标')
        plt.title('各分类性能对比 (前20个按F1分数排序)')
        plt.xticks(x, categories, rotation=45, ha='right')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"分类性能图已保存到: {save_path}")
        
        plt.close()
    
    def generate_html_report(self, metrics: Dict, category_stats: Dict, 
                           output_file: str) -> None:
        """
        生成HTML评估报告
        
        Args:
            metrics: 整体评估指标
            category_stats: 分类统计数据
            output_file: 输出文件路径
        """
        html_content = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>事件分类模型评估报告</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .metrics {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }}
        .metric-card {{ background-color: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
        .metric-label {{ color: #7f8c8d; margin-top: 5px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .good {{ color: #27ae60; }}
        .medium {{ color: #f39c12; }}
        .poor {{ color: #e74c3c; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>事件分类模型评估报告</h1>
        <p>基于千问大模型的事件二级分类性能评估</p>
    </div>
    
    <h2>整体性能指标</h2>
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-value">{metrics['accuracy']:.3f}</div>
            <div class="metric-label">准确率</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{metrics['macro_f1']:.3f}</div>
            <div class="metric-label">宏平均F1</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{metrics['weighted_f1']:.3f}</div>
            <div class="metric-label">加权平均F1</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{metrics['prediction_success_rate']:.3f}</div>
            <div class="metric-label">预测成功率</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{metrics['average_confidence']:.3f}</div>
            <div class="metric-label">平均置信度</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{metrics['valid_predictions']}</div>
            <div class="metric-label">有效预测数</div>
        </div>
    </div>
    
    <h2>详细指标</h2>
    <table>
        <tr>
            <th>指标</th>
            <th>宏平均</th>
            <th>加权平均</th>
        </tr>
        <tr>
            <td>精确率</td>
            <td>{metrics['macro_precision']:.4f}</td>
            <td>{metrics['weighted_precision']:.4f}</td>
        </tr>
        <tr>
            <td>召回率</td>
            <td>{metrics['macro_recall']:.4f}</td>
            <td>{metrics['weighted_recall']:.4f}</td>
        </tr>
        <tr>
            <td>F1分数</td>
            <td>{metrics['macro_f1']:.4f}</td>
            <td>{metrics['weighted_f1']:.4f}</td>
        </tr>
    </table>
    
    <h2>各分类性能统计 (前30个)</h2>
    <table>
        <tr>
            <th>分类</th>
            <th>精确率</th>
            <th>召回率</th>
            <th>F1分数</th>
            <th>真实样本数</th>
            <th>预测样本数</th>
        </tr>
"""
        
        # 按F1分数排序显示前30个分类
        sorted_categories = sorted(category_stats.items(), 
                                 key=lambda x: x[1]['f1'], reverse=True)[:30]
        
        for category, stats in sorted_categories:
            f1_class = "good" if stats['f1'] > 0.7 else "medium" if stats['f1'] > 0.4 else "poor"
            html_content += f"""
        <tr>
            <td>{category}</td>
            <td>{stats['precision']:.4f}</td>
            <td>{stats['recall']:.4f}</td>
            <td class="{f1_class}">{stats['f1']:.4f}</td>
            <td>{stats['true_count']}</td>
            <td>{stats['predicted_count']}</td>
        </tr>"""
        
        html_content += """
    </table>
    
    <h2>模型分析</h2>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
        <h3>性能总结</h3>
        <ul>"""
        
        if metrics['accuracy'] > 0.8:
            html_content += "<li>✅ 模型整体准确率较高，分类效果良好</li>"
        elif metrics['accuracy'] > 0.6:
            html_content += "<li>⚠️ 模型准确率中等，有改进空间</li>"
        else:
            html_content += "<li>❌ 模型准确率较低，需要优化</li>"
        
        if metrics['prediction_success_rate'] > 0.9:
            html_content += "<li>✅ 预测成功率高，模型稳定性好</li>"
        else:
            html_content += "<li>⚠️ 部分样本预测失败，需要检查API稳定性</li>"
        
        good_categories = sum(1 for stats in category_stats.values() if stats['f1'] > 0.7)
        total_categories = len(category_stats)
        
        html_content += f"<li>📊 {good_categories}/{total_categories} 个分类F1分数超过0.7</li>"
        
        html_content += """
        </ul>
    </div>
    
    <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 5px;">
        <h3>改进建议</h3>
        <ul>
            <li>对于F1分数较低的分类，可以增加Few-shot示例数量</li>
            <li>优化提示词模板，增加更多上下文信息</li>
            <li>对长尾分类进行特殊处理，如合并相似分类</li>
            <li>考虑使用更大的模型或进行微调</li>
        </ul>
    </div>
</body>
</html>"""
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"HTML评估报告已生成: {output_file}")
    
    def save_predictions_csv(self, test_data: List[Dict], predictions: List[Tuple], 
                           output_file: str) -> None:
        """
        保存预测结果到CSV文件
        
        Args:
            test_data: 测试数据
            predictions: 预测结果
            output_file: 输出文件路径
        """
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ['事件编号', '事件描述', '真实分类', 'predicted_category', 'confidence']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for i, (data, (pred, conf)) in enumerate(zip(test_data, predictions)):
                writer.writerow({
                    '事件编号': data.get('事件编号', f'test_{i}'),
                    '事件描述': data.get('事件描述', ''),
                    '真实分类': data.get('二级分类', ''),
                    'predicted_category': pred if pred else 'FAILED',
                    'confidence': conf
                })
        
        print(f"预测结果已保存到: {output_file}")


def main():
    """测试函数"""
    evaluator = ClassificationEvaluator()
    
    # 这里可以添加测试代码
    print("评估模块初始化完成")


if __name__ == '__main__':
    main()

