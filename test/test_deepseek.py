#!/usr/bin/env python3
"""
DeepSeek API 测试脚本
测试基础对话、Function Calling 和 SQL 生成能力
"""

import os
from openai import OpenAI

class DeepSeekTester:
    def __init__(self):
        """初始化DeepSeek客户端"""
        # 使用提供的API Key
        api_key = "sk-9b31446d564c46a2b1593be7804f4376"
        
        # DeepSeek API配置
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        
    def test_basic_chat(self):
        """测试基础对话能力"""
        print("🧪 测试基础对话能力...")
        
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个数据分析助手，专门处理中文数据查询。"},
                    {"role": "user", "content": "你好，请简单介绍一下你的能力。"}
                ],
                max_tokens=500,
                temperature=0.1
            )
            
            result = response.choices[0].message.content
            print(f"✅ 基础对话测试成功:")
            print(f"回复: {result}\n")
            return True
            
        except Exception as e:
            print(f"❌ 基础对话测试失败: {e}\n")
            return False
    
    def test_sql_generation(self):
        """测试SQL生成能力"""
        print("🧪 测试SQL生成能力...")
        
        # 模拟事件数据表结构
        schema_info = """
        表名: events
        字段说明:
        - 事件编号 (VARCHAR): 主键，如YHW202505060301
        - 事件描述 (TEXT): 事件的详细描述
        - 镇街名称 (VARCHAR): 所属镇街
        - 事件级别 (VARCHAR): 一级事件、二级事件、三级事件
        - 二级分类 (VARCHAR): 消费纠纷、邻里纠纷、债务纠纷等
        - 上报时间 (DATETIME): 事件上报时间
        - 办结时间 (DATETIME): 事件办结时间
        - 处置结果 (TEXT): 处置结果描述
        """
        
        query_text = "查询5月6日发生在月湖街道的三级事件数量"
        
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": f"""你是一个SQL生成专家。
                    根据用户的中文查询需求，生成对应的SQL语句。
                    
                    数据库表结构如下：
                    {schema_info}
                    
                    请只返回SQL语句，不要包含其他解释文字。"""},
                    {"role": "user", "content": query_text}
                ],
                max_tokens=200,
                temperature=0.1
            )
            
            sql_result = response.choices[0].message.content.strip()
            print(f"✅ SQL生成测试成功:")
            print(f"查询: {query_text}")
            print(f"生成SQL: {sql_result}\n")
            return True
            
        except Exception as e:
            print(f"❌ SQL生成测试失败: {e}\n")
            return False
    
    def test_function_calling(self):
        """测试Function Calling能力"""
        print("🧪 测试Function Calling能力...")
        
        # 定义测试函数
        functions = [
            {
                "name": "query_events",
                "description": "查询事件数据",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "town": {
                            "type": "string",
                            "description": "镇街名称筛选"
                        },
                        "level": {
                            "type": "string", 
                            "description": "事件级别筛选"
                        },
                        "date": {
                            "type": "string",
                            "description": "日期筛选，格式YYYY-MM-DD"
                        }
                    },
                    "required": ["date"]
                }
            }
        ]
        
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个数据查询助手，可以调用函数查询事件数据。"},
                    {"role": "user", "content": "请查询5月6日在月湖街道发生的三级事件"}
                ],
                functions=functions,
                function_call="auto",
                max_tokens=500,
                temperature=0.1
            )
            
            message = response.choices[0].message
            
            if hasattr(message, 'function_call') and message.function_call:
                print(f"✅ Function Calling测试成功:")
                print(f"调用函数: {message.function_call.name}")
                print(f"参数: {message.function_call.arguments}\n")
                return True
            else:
                print(f"⚠️ Function Calling未触发，普通回复: {message.content}\n")
                return False
            
        except Exception as e:
            print(f"❌ Function Calling测试失败: {e}\n")
            return False
    
    def test_data_analysis(self):
        """测试数据分析理解能力"""
        print("🧪 测试数据分析理解能力...")
        
        sample_data = """
        以下是一些事件数据样例：
        1. 事件编号: YHW202505060301, 描述: 客人因为退钱的事情在店里影响营业, 镇街: 月湖街道, 级别: 三级事件, 分类: 消费纠纷
        2. 事件编号: BYW202505060007, 描述: 租车公司油钱退款纠纷, 镇街: 白云街道, 级别: 二级事件, 分类: 债务纠纷
        3. 事件编号: YHW202505070102, 描述: 邻居噪音影响休息, 镇街: 月湖街道, 级别: 三级事件, 分类: 邻里纠纷
        """
        
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个数据分析专家，擅长从事件数据中提取洞察。"},
                    {"role": "user", "content": f"请分析以下事件数据，总结主要特点和规律：\n{sample_data}"}
                ],
                max_tokens=300,
                temperature=0.2
            )
            
            analysis = response.choices[0].message.content
            print(f"✅ 数据分析测试成功:")
            print(f"分析结果: {analysis}\n")
            return True
            
        except Exception as e:
            print(f"❌ 数据分析测试失败: {e}\n")
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始DeepSeek API能力测试\n")
        print("=" * 50)
        
        results = []
        
        # 执行各项测试
        results.append(("基础对话", self.test_basic_chat()))
        results.append(("SQL生成", self.test_sql_generation()))
        results.append(("Function Calling", self.test_function_calling()))
        results.append(("数据分析", self.test_data_analysis()))
        
        # 汇总结果
        print("=" * 50)
        print("📊 测试结果汇总:")
        print("-" * 30)
        
        passed = 0
        for test_name, result in results:
            status = "✅ 通过" if result else "❌ 失败"
            print(f"{test_name:15} : {status}")
            if result:
                passed += 1
        
        print("-" * 30)
        print(f"总体结果: {passed}/{len(results)} 项测试通过")
        
        if passed >= 3:
            print("🎉 DeepSeek API基本可用，可以进行下一步开发！")
        elif passed >= 2:
            print("⚠️ DeepSeek API部分功能可用，可能需要调整策略。")
        else:
            print("❌ DeepSeek API存在问题，需要检查配置或考虑其他方案。")
        
        return passed >= 2

if __name__ == "__main__":
    tester = DeepSeekTester()
    tester.run_all_tests() 