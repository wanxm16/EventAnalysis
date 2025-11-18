#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置文件
包含API密钥、模型参数等配置信息
"""

import os

# 千问API配置
QWEN_CONFIG = {
    'api_key': 'sk-ca284945a9c54d21a46ac63fcdda93bd',
    'base_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'model': 'qwen-plus',  # 使用qwen-plus模型
    'max_tokens': 1000,
    'temperature': 0.1,  # 较低的温度确保输出稳定
    'timeout': 30,  # 请求超时时间（秒）
    'max_retries': 3,  # 最大重试次数
    'retry_delay': 1,  # 重试延迟（秒）
}

# 分类任务配置
CLASSIFICATION_CONFIG = {
    'few_shot_examples_per_category': 3,  # 每个分类的Few-shot示例数量
    'max_context_length': 4000,  # 最大上下文长度
    'batch_size': 10,  # 批处理大小（串行模式使用）
    'confidence_threshold': 0.8,  # 置信度阈值
    'use_concurrent': True,  # 是否使用并发模式
    'max_workers': 20,  # 最大并发线程数（None表示自动）
}

# 文件路径配置
PATHS = {
    'data_dir': 'data',
    'results_dir': 'results',
    'train_data': 'data/train_data.csv',
    'test_data': 'data/test_data.csv',
    'few_shot_examples': 'data/few_shot_examples.json',
    'data_analysis': 'data/data_analysis.json',
    'predictions': 'results/predictions.csv',
    'evaluation_report': 'results/evaluation_report.html',
}

# 日志配置
LOGGING_CONFIG = {
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': 'logs/classifier.log',
}

# 确保必要的目录存在
def ensure_directories():
    """确保必要的目录存在"""
    directories = [
        PATHS['data_dir'],
        PATHS['results_dir'],
        'logs',
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

# 验证配置
def validate_config():
    """验证配置是否正确"""
    # 检查API密钥
    if not QWEN_CONFIG['api_key']:
        raise ValueError("千问API密钥未配置")
    
    # 检查必要文件是否存在
    required_files = [
        PATHS['train_data'],
        PATHS['test_data'],
        PATHS['few_shot_examples'],
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        raise FileNotFoundError(f"缺少必要文件: {missing_files}")
    
    print("配置验证通过")

if __name__ == '__main__':
    ensure_directories()
    validate_config()
