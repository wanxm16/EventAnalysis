#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主程序
整合数据处理、分类预测和评估功能
"""

import os
import sys
import time
import argparse
from typing import List, Dict

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import PATHS, ensure_directories, validate_config
from src.qwen_classifier import QwenClassifier
from src.evaluator import ClassificationEvaluator


def run_classification_pipeline(test_sample_size: int = None, skip_existing: bool = True,
                               use_concurrent: bool = None, max_workers: int = None,
                               input_file: str = None):
    """
    运行完整的分类流水线

    Args:
        test_sample_size: 测试样本数量限制，None表示使用全部测试数据
        skip_existing: 是否跳过已存在的预测结果
        use_concurrent: 是否使用并发模式，None表示使用配置文件设置
        max_workers: 最大并发线程数，None表示使用配置文件设置或自动
        input_file: 输入测试数据文件路径，None表示使用配置文件中的默认路径
    """
    print("=" * 60)
    print("事件分类系统 - 完整流水线")
    print("=" * 60)
    
    # 确保目录存在
    ensure_directories()
    
    # 验证配置
    try:
        validate_config()
    except Exception as e:
        print(f"配置验证失败: {e}")
        return
    
    # 初始化分类器
    print("\n1. 初始化千问分类器...")
    classifier = QwenClassifier()
    
    # 测试API连接
    if not classifier.test_api_connection():
        print("❌ API连接失败，请检查配置")
        return
    
    # 加载测试数据
    print("\n2. 加载测试数据...")
    evaluator = ClassificationEvaluator()

    # 使用指定的输入文件或默认路径
    test_data_path = input_file if input_file else PATHS['test_data']
    print(f"   数据文件: {test_data_path}")
    test_data = evaluator.load_test_data(test_data_path)
    
    # 限制测试样本数量（用于快速测试）
    if test_sample_size and test_sample_size < len(test_data):
        test_data = test_data[:test_sample_size]
        print(f"   限制测试样本数量为: {test_sample_size}")
    
    # 检查是否已有预测结果
    predictions_file = PATHS['predictions']
    if skip_existing and os.path.exists(predictions_file):
        print(f"   发现已存在的预测结果: {predictions_file}")
        print("   跳过预测步骤，直接进行评估...")
        
        # 加载已有预测结果
        predictions = evaluator.load_predictions(predictions_file)
        
        # 确保预测结果数量与测试数据匹配
        if len(predictions) != len(test_data):
            print(f"   ⚠️ 预测结果数量({len(predictions)})与测试数据({len(test_data)})不匹配")
            print("   重新进行预测...")
            predictions = None
    else:
        predictions = None
    
    # 进行分类预测
    if predictions is None:
        print("\n3. 开始分类预测...")
        
        # 从配置获取并发设置（如果未指定）
        from config.config import CLASSIFICATION_CONFIG
        if use_concurrent is None:
            use_concurrent = CLASSIFICATION_CONFIG.get('use_concurrent', True)
        if max_workers is None:
            max_workers = CLASSIFICATION_CONFIG.get('max_workers', None)
        
        # 显示运行模式
        if use_concurrent:
            print(f"   运行模式: 并发（线程数: {max_workers if max_workers else '自动'}）")
        else:
            print("   运行模式: 串行")
        
        start_time = time.time()
        
        predictions = classifier.classify_batch(
            test_data, 
            max_workers=max_workers,
            use_concurrent=use_concurrent
        )
        
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"   预测完成，耗时: {elapsed:.2f} 秒 ({elapsed/60:.1f} 分钟)")
        if len(test_data) > 0:
            print(f"   平均速度: {elapsed/len(test_data):.2f} 秒/样本")
        
        # 保存预测结果
        print("\n4. 保存预测结果...")
        evaluator.save_predictions_csv(test_data, predictions, predictions_file)
    
    # 评估性能
    print("\n5. 评估分类性能...")
    
    # 提取真实标签和预测结果
    true_labels = [data['二级分类'] for data in test_data]
    predicted_labels = [pred[0] for pred in predictions]  # 预测分类
    confidences = [pred[1] for pred in predictions]       # 置信度
    
    # 计算整体指标
    metrics = evaluator.calculate_metrics(true_labels, predicted_labels, confidences)
    
    # 分析各分类性能
    category_stats = evaluator.analyze_per_category(true_labels, predicted_labels)
    
    # 打印主要指标
    print("\n📊 主要性能指标:")
    print(f"   准确率: {metrics['accuracy']:.4f}")
    print(f"   宏平均F1: {metrics['macro_f1']:.4f}")
    print(f"   加权平均F1: {metrics['weighted_f1']:.4f}")
    print(f"   预测成功率: {metrics['prediction_success_rate']:.4f}")
    print(f"   平均置信度: {metrics['average_confidence']:.4f}")
    print(f"   有效预测数: {metrics['valid_predictions']}/{metrics['total_samples']}")
    
    # 显示表现最好和最差的分类
    sorted_categories = sorted(category_stats.items(), 
                             key=lambda x: x[1]['f1'], reverse=True)
    
    print("\n🏆 表现最好的5个分类:")
    for i, (category, stats) in enumerate(sorted_categories[:5]):
        print(f"   {i+1}. {category}: F1={stats['f1']:.4f}, 样本数={stats['true_count']}")
    
    print("\n⚠️ 表现最差的5个分类:")
    for i, (category, stats) in enumerate(sorted_categories[-5:]):
        print(f"   {i+1}. {category}: F1={stats['f1']:.4f}, 样本数={stats['true_count']}")
    
    # 生成可视化图表
    print("\n6. 生成可视化图表...")
    
    # 混淆矩阵
    cm, top_labels = evaluator.generate_confusion_matrix(true_labels, predicted_labels, top_n=20)
    if len(cm) > 0:
        evaluator.plot_confusion_matrix(cm, top_labels, 'results/confusion_matrix.png')
    
    # 分类性能图
    evaluator.plot_category_performance(category_stats, 'results/category_performance.png')
    
    # 生成HTML报告
    print("\n7. 生成评估报告...")
    evaluator.generate_html_report(metrics, category_stats, PATHS['evaluation_report'])
    
    print("\n✅ 分类流水线执行完成！")
    print("\n📁 生成的文件:")
    print(f"   - {predictions_file}: 预测结果CSV")
    print(f"   - {PATHS['evaluation_report']}: HTML评估报告")
    print("   - results/confusion_matrix.png: 混淆矩阵图")
    print("   - results/category_performance.png: 分类性能图")
    
    return metrics, category_stats


def run_quick_test(sample_size: int = 100, use_concurrent: bool = True, input_file: str = None):
    """
    运行快速测试

    Args:
        sample_size: 测试样本数量
        use_concurrent: 是否使用并发模式
        input_file: 输入测试数据文件路径
    """
    print(f"🚀 运行快速测试 (样本数: {sample_size})")

    # 临时修改预测结果文件路径，避免覆盖完整测试结果
    original_predictions = PATHS['predictions']
    PATHS['predictions'] = 'results/quick_test_predictions.csv'

    try:
        metrics, _ = run_classification_pipeline(
            test_sample_size=sample_size,
            skip_existing=False,
            use_concurrent=use_concurrent,
            input_file=input_file
        )
        
        print(f"\n🎯 快速测试结果:")
        print(f"   准确率: {metrics['accuracy']:.4f}")
        print(f"   F1分数: {metrics['macro_f1']:.4f}")
        
    finally:
        # 恢复原始路径
        PATHS['predictions'] = original_predictions


def run_single_prediction():
    """运行单个事件预测示例"""
    print("🔍 单个事件预测示例")
    
    # 初始化分类器
    classifier = QwenClassifier()
    
    # 测试事件
    test_events = [
        {
            '事件描述': '居民反映小区业主房子涉嫌违建，希望社区处理',
            '事件类型': '矛盾纠纷',
            '区县名称': '海曙区',
            '镇街名称': '高桥镇'
        },
        {
            '事件描述': '电瓶车乱停目前已经劝离',
            '事件类型': '城市管理',
            '区县名称': '海曙区',
            '镇街名称': '横街镇'
        },
        {
            '事件描述': '因为租房问题有纠纷，称住的环境和当时发的视频不一致',
            '事件类型': '矛盾纠纷',
            '区县名称': '海曙区',
            '镇街名称': '白云街道'
        }
    ]
    
    for i, event in enumerate(test_events, 1):
        print(f"\n示例 {i}:")
        print(f"   事件描述: {event['事件描述']}")
        print(f"   事件类型: {event['事件类型']}")
        
        result, confidence = classifier.classify_single(event)
        print(f"   预测分类: {result}")
        print(f"   置信度: {confidence:.4f}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='事件分类系统')
    parser.add_argument('--mode', choices=['full', 'quick', 'single'], default='full',
                       help='运行模式: full(完整测试), quick(快速测试), single(单个预测)')
    parser.add_argument('--input-file', type=str, default=None,
                       help='输入测试数据文件路径（默认使用配置文件中的路径）')
    parser.add_argument('--sample-size', type=int, default=100,
                       help='快速测试的样本数量')
    parser.add_argument('--skip-existing', action='store_true', default=True,
                       help='跳过已存在的预测结果')
    parser.add_argument('--concurrent', action='store_true', default=None,
                       help='启用并发模式（默认根据配置文件）')
    parser.add_argument('--no-concurrent', dest='concurrent', action='store_false',
                       help='禁用并发模式，使用串行处理')
    parser.add_argument('--workers', type=int, default=None,
                       help='并发线程数（默认20，None表示自动）')

    args = parser.parse_args()

    try:
        if args.mode == 'full':
            run_classification_pipeline(
                skip_existing=args.skip_existing,
                use_concurrent=args.concurrent,
                max_workers=args.workers,
                input_file=args.input_file
            )
        elif args.mode == 'quick':
            run_quick_test(args.sample_size, input_file=args.input_file)
        elif args.mode == 'single':
            run_single_prediction()
        
    except KeyboardInterrupt:
        print("\n\n⏹️ 用户中断执行")
    except Exception as e:
        print(f"\n❌ 执行出错: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()

