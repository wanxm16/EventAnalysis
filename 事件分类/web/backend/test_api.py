#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 API 接口
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """测试健康检查"""
    print("\n=== 测试健康检查 ===")
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")

def test_categories():
    """测试获取分类"""
    print("\n=== 测试获取所有分类 ===")
    response = requests.get(f"{BASE_URL}/api/categories")
    print(f"状态码: {response.status_code}")
    data = response.json()
    print(f"分类总数: {data['total']}")
    print(f"前10个分类: {data['categories'][:10]}")

def test_event_types():
    """测试获取事件类型"""
    print("\n=== 测试获取事件类型 ===")
    response = requests.get(f"{BASE_URL}/api/event-types")
    print(f"状态码: {response.status_code}")
    data = response.json()
    print(f"事件类型总数: {data['total']}")
    print(f"事件类型列表: {data['event_types']}")

def test_category_mapping():
    """测试获取映射关系"""
    print("\n=== 测试获取分类映射 ===")
    response = requests.get(f"{BASE_URL}/api/categories/mapping")
    print(f"状态码: {response.status_code}")
    data = response.json()
    print(f"映射数量: {len(data)} 个事件类型")
    # 显示第一个映射
    if data:
        first_type = list(data.keys())[0]
        print(f"示例 - {first_type}: {data[first_type][:5]}...")

def test_few_shot():
    """测试获取Few-shot示例"""
    print("\n=== 测试获取Few-shot示例 ===")
    response = requests.get(f"{BASE_URL}/api/few-shot")
    print(f"状态码: {response.status_code}")
    data = response.json()
    print(f"分类数量: {len(data)}")

    # 显示第一个分类的示例
    if data:
        first_category = list(data.keys())[0]
        examples = data[first_category]
        print(f"\n示例分类: {first_category}")
        print(f"示例数量: {len(examples)}")
        if examples:
            print(f"第一个示例:")
            print(f"  事件描述: {examples[0].get('事件描述', '')[:50]}...")
            print(f"  事件类型: {examples[0].get('事件类型', '')}")
            print(f"  二级分类: {examples[0].get('二级分类', '')}")

def test_single_classify():
    """测试单事件分类"""
    print("\n=== 测试单事件分类 ===")

    test_data = {
        "event_description": "居民反映小区内有流动摊贩占道经营，影响居民通行",
        "event_type": "城市管理",
        "district": "海曙区",
        "street": "古林镇"
    }

    response = requests.post(f"{BASE_URL}/api/classify/single", json=test_data)
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"预测分类: {data['predicted_category']}")
        print(f"置信度: {data['confidence']}")
        print(f"时间戳: {data['timestamp']}")
    else:
        print(f"错误: {response.text}")

if __name__ == "__main__":
    try:
        print("开始测试 API 接口...")

        # test_health()
        test_categories()
        test_event_types()
        test_category_mapping()
        test_few_shot()
        # test_single_classify()  # 需要API密钥

        print("\n✅ 所有测试完成！")

    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到服务器，请确保后端服务已启动")
        print("   启动命令: cd web/backend && python main.py")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
