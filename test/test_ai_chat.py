#!/usr/bin/env python3
"""
AI问答功能测试脚本
测试基于raw_conflict.csv的各种查询场景
"""

from ai_chat_service import ai_chat_service
import json

def test_sql_queries():
    """测试SQL类型查询"""
    print("🧪 测试SQL查询功能...")
    print("=" * 50)
    
    # 测试用例（基于需求文档中的40个query）
    sql_test_cases = [
        "海曙区总共有多少条事件记录？",
        "5月6日发生在月湖街道的事件有几起？",
        "三级事件总共有多少条？",
        "按镇街统计事件数量，前5名是？",
        "消费纠纷类型的事件有多少条？",
        "平均办理时长是多少小时？"
    ]
    
    for i, query in enumerate(sql_test_cases, 1):
        print(f"\n📝 测试 {i}: {query}")
        print("-" * 30)
        
        try:
            result = ai_chat_service.chat(query)
            
            if result['success']:
                print(f"✅ 成功")
                print(f"查询类型: {result['query_type']}")
                print(f"回复: {result['message']}")
                
                if result['data'] and 'sql' in result['data']:
                    print(f"生成SQL: {result['data']['sql']}")
            else:
                print(f"❌ 失败: {result['message']}")
                
        except Exception as e:
            print(f"❌ 异常: {e}")
    
    print("\n" + "=" * 50)

def test_vector_queries():
    """测试向量搜索查询"""
    print("🧪 测试向量搜索功能...")
    print("=" * 50)
    
    vector_test_cases = [
        "有哪些退钱相关的事件案例？",
        "包含退款的事件有哪些？",
        "涉及噪音的事件描述",
        "停车纠纷的案例",
        "处置结果包含满意的事件"
    ]
    
    for i, query in enumerate(vector_test_cases, 1):
        print(f"\n📝 测试 {i}: {query}")
        print("-" * 30)
        
        try:
            result = ai_chat_service.chat(query)
            
            if result['success']:
                print(f"✅ 成功")
                print(f"查询类型: {result['query_type']}")
                print(f"回复: {result['message'][:200]}...")  # 截取前200字符
            else:
                print(f"❌ 失败: {result['message']}")
                
        except Exception as e:
            print(f"❌ 异常: {e}")
    
    print("\n" + "=" * 50)

def test_statistics():
    """测试统计信息"""
    print("🧪 测试统计信息功能...")
    print("=" * 50)
    
    try:
        stats = ai_chat_service.get_statistics()
        
        print(f"📊 数据统计:")
        print(f"- 总事件数: {stats.get('total_events', 0)}")
        
        print(f"- 前5个镇街:")
        for item in stats.get('by_town', [])[:5]:
            print(f"  * {item['name']}: {item['count']} 条")
        
        print(f"- 事件级别分布:")
        for item in stats.get('by_level', []):
            print(f"  * {item['level']}: {item['count']} 条")
        
        print(f"- 前5个分类:")
        for item in stats.get('by_category', [])[:5]:
            print(f"  * {item['category']}: {item['count']} 条")
            
    except Exception as e:
        print(f"❌ 统计信息获取失败: {e}")
    
    print("\n" + "=" * 50)

def test_complex_queries():
    """测试复杂查询"""
    print("🧪 测试复杂查询...")
    print("=" * 50)
    
    complex_test_cases = [
        "相比4月份，5月份总事件量增长了多少？",
        "办理时长超过24小时的二级事件有多少？",
        "月湖街道和白云街道的消费纠纷数量对比",
        "5月份每天的事件上报量趋势",
        "哪个镇街的平均办理时间最长？"
    ]
    
    for i, query in enumerate(complex_test_cases, 1):
        print(f"\n📝 测试 {i}: {query}")
        print("-" * 30)
        
        try:
            result = ai_chat_service.chat(query)
            
            if result['success']:
                print(f"✅ 成功")
                print(f"查询类型: {result['query_type']}")
                print(f"回复: {result['message'][:150]}...")  # 截取前150字符
            else:
                print(f"❌ 失败: {result['message']}")
                
        except Exception as e:
            print(f"❌ 异常: {e}")
    
    print("\n" + "=" * 50)

def main():
    """主测试函数"""
    print("🚀 开始AI问答功能全面测试\n")
    
    # 检查服务状态
    if not ai_chat_service.data_loaded:
        print("❌ AI问答服务未就绪，请检查数据加载")
        return
    
    print("✅ AI问答服务就绪，开始测试...\n")
    
    # 运行各项测试
    test_statistics()
    test_sql_queries()
    test_vector_queries()
    test_complex_queries()
    
    print("🎉 AI问答功能测试完成！")
    print("\n💡 如果大部分测试通过，说明系统基本可用")
    print("💡 如果部分测试失败，可能需要调整SQL生成提示词或查询路由逻辑")

if __name__ == "__main__":
    main() 