#!/usr/bin/env python3
"""
AI问答服务
负责数据处理、DuckDB集成、向量数据库和DeepSeek API调用
"""

import os
import re
import pandas as pd
import duckdb
import chromadb
from typing import List, Dict, Any, Optional, Tuple
from openai import OpenAI
from datetime import datetime
import json

class AIChatService:
    def __init__(self):
        """初始化AI问答服务"""
        self.client = OpenAI(
            api_key=os.getenv('DEEPSEEK_API_KEY'),
            base_url="https://api.deepseek.com"
        )
        self.db_path = os.path.join(os.path.dirname(__file__), '../data/events.db')
        self.collection_name = "event_descriptions"
        
        # 初始化数据库和向量数据库
        self.init_database()
        self.init_vector_database()
    
    def init_database(self):
        """初始化DuckDB数据库"""
        try:
            # 读取CSV数据 - 修复路径问题
            data_path = os.path.join(os.path.dirname(__file__), '../data/raw_conflict.csv')
            df = pd.read_csv(data_path)
            print(f"✅ 成功加载数据：{len(df)} 条记录")
            
            # 数据清洗和预处理
            df = self.clean_data(df)
            
            # 连接DuckDB并创建表
            db_path = os.path.join(os.path.dirname(__file__), '../data/events.db')
            conn = duckdb.connect(db_path)
            
            # 创建表并插入数据
            conn.execute("DROP TABLE IF EXISTS events")
            conn.execute("""
                CREATE TABLE events AS 
                SELECT * FROM df
            """)
            
            # 创建索引
            conn.execute("CREATE INDEX idx_event_id ON events(事件编号)")
            conn.execute("CREATE INDEX idx_town ON events(镇街名称)")
            conn.execute("CREATE INDEX idx_level ON events(事件级别)")
            conn.execute("CREATE INDEX idx_type ON events(二级分类)")
            conn.execute("CREATE INDEX idx_status ON events(事件状态)")
            
            # 验证数据
            result = conn.execute("SELECT COUNT(*) FROM events").fetchone()
            print(f"✅ 数据库初始化完成，共 {result[0]} 条记录")
            
            conn.close()
            
        except Exception as e:
            print(f"❌ 数据库初始化失败: {e}")
            raise
    
    def clean_data(self, df):
        """数据清洗和预处理"""
        # 处理时间字段
        time_columns = ['上报时间', '最后派发时间', '最后受理时间', '办结时间']
        for col in time_columns:
            if col in df.columns:
                # 处理多种时间格式
                df[col] = pd.to_datetime(df[col], format='%m/%d/%y %H:%M', errors='coerce')
        
        # 创建衍生字段
        if '上报时间' in df.columns:
            df['上报日期'] = df['上报时间'].dt.date
            df['上报年月'] = df['上报时间'].dt.strftime('%Y-%m')
            df['上报小时'] = df['上报时间'].dt.hour
        
        # 计算办理时长
        if '上报时间' in df.columns and '办结时间' in df.columns:
            time_diff = df['办结时间'] - df['上报时间']
            df['办理时长_小时'] = time_diff.dt.total_seconds() / 3600
        
        # 计算受理时长
        if '上报时间' in df.columns and '最后受理时间' in df.columns:
            time_diff = df['最后受理时间'] - df['上报时间']
            df['受理时长_小时'] = time_diff.dt.total_seconds() / 3600
        
        # 处理空值
        df = df.fillna('')
        
        return df
    
    def init_vector_database(self):
        """初始化ChromaDB向量数据库"""
        try:
            # 创建ChromaDB客户端
            chroma_path = os.path.join(os.path.dirname(__file__), '../data/chroma_db')
            self.chroma_client = chromadb.PersistentClient(path=chroma_path)
            
            # 检查集合是否已存在
            try:
                self.collection = self.chroma_client.get_collection(name=self.collection_name)
                # 检查集合是否有数据
                count = self.collection.count()
                if count > 0:
                    print(f"✅ 向量数据库已存在，共 {count} 条记录")
                    return
                else:
                    # 集合存在但无数据，删除重建
                    self.chroma_client.delete_collection(name=self.collection_name)
            except:
                # 集合不存在，继续创建
                pass
            
            # 创建新集合
            self.collection = self.chroma_client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            
            # 读取数据并向量化
            data_path = os.path.join(os.path.dirname(__file__), '../data/raw_conflict.csv')
            df = pd.read_csv(data_path)
            df = self.clean_data(df)
            
            # 准备文档
            documents = []
            metadatas = []
            ids = []
            
            for idx, row in df.iterrows():
                # 组合文本内容
                text_content = f"""
                事件编号: {row.get('事件编号', '')}
                事件描述: {row.get('事件描述', '')}
                镇街: {row.get('镇街名称', '')}
                村社: {row.get('村社名称', '')}
                事件级别: {row.get('事件级别', '')}
                事件类型: {row.get('事件类型', '')}
                二级分类: {row.get('二级分类', '')}
                处置结果: {row.get('处置结果', '')}
                """.strip()
                
                documents.append(text_content)
                metadatas.append({
                    "事件编号": str(row.get('事件编号', '')),
                    "镇街名称": str(row.get('镇街名称', '')),
                    "事件级别": str(row.get('事件级别', '')),
                    "二级分类": str(row.get('二级分类', ''))
                })
                ids.append(f"event_{idx}")
            
            # 批量添加到向量数据库
            batch_size = 100
            for i in range(0, len(documents), batch_size):
                end_idx = min(i + batch_size, len(documents))
                self.collection.add(
                    documents=documents[i:end_idx],
                    metadatas=metadatas[i:end_idx],
                    ids=ids[i:end_idx]
                )
            
            print(f"✅ 向量数据库初始化完成，共 {len(documents)} 条记录")
            
        except Exception as e:
            print(f"❌ 向量数据库初始化失败: {e}")
            raise
    
    def is_sql_query(self, query):
        """判断是否应该使用SQL查询"""
        sql_keywords = [
            # 统计类
            '多少', '数量', '总数', '统计', '计算', '平均', '最大', '最小',
            '排名', '前', '名', 'TOP', 'top', '第一', '第二', '第三',
            '百分比', '占比', '比例', '增长', '变化率', '对比',
            
            # 时间类
            '月份', '日期', '时间', '年', '月', '日', '小时', '天',
            '耗时', '时长', '用时', '超过', '小于', '大于',
            
            # 条件类
            '按', '根据', '分组', '分类', '级别', '状态', '镇街',
            '一级', '二级', '三级', '已办结', '未办结',
            
            # 聚合类
            '所有', '全部', '总共', '合计', '汇总'
        ]
        
        # 检查关键词
        for keyword in sql_keywords:
            if keyword in query:
                return True
        
        return False
    
    def is_vector_query(self, query):
        """判断是否应该使用向量搜索"""
        vector_keywords = [
            # 文本搜索类
            '包含', '涉及', '描述', '提到', '关于', '相关',
            '案例', '事件', '情况', '问题', '纠纷',
            
            # 具体内容类
            '退款', '退钱', '噪音', '停车', '物业', '邻居',
            '消费', '投诉', '举报', '求助',
            
            # 查找类
            '找', '查找', '搜索', '列出', '举例', '例子'
        ]
        
        # 检查关键词
        for keyword in vector_keywords:
            if keyword in query:
                return True
        
        return False
    
    def route_query(self, query):
        """查询路由"""
        print(f"🔍 路由分析: {query}")
        
        # 特殊处理：包含具体事件编号的查询
        if '202505060301' in query or 'YHW202505060301' in query:
            print("  ➡️ 特殊路由: 事件编号查询 -> SQL")
            return 'sql'
        
        # 特殊处理：明确的统计查询
        if any(keyword in query for keyword in ['三级事件', '二级事件', '四级事件', '一级事件']):
            print("  ➡️ 特殊路由: 事件级别统计 -> SQL")
            return 'sql'
        
        # 检查是否为明确的文本搜索查询
        is_vector = self.is_vector_query(query)
        is_sql = self.is_sql_query(query)
        
        print(f"  📊 SQL关键词检查: {is_sql}")
        print(f"  🔍 向量关键词检查: {is_vector}")
        
        # 优先级调整：文本搜索类查询优先使用向量搜索
        if is_vector and not is_sql:
            print("  ➡️ 路由决策: 向量搜索")
            return 'vector'
        
        # 如果同时匹配，根据查询特点决定
        if is_vector and is_sql:
            # 检查是否包含明确的统计需求
            stat_keywords = ['多少', '数量', '总数', '统计', '计算', '排名', '前', '名']
            has_stat = any(kw in query for kw in stat_keywords)
            
            if has_stat:
                print("  ➡️ 路由决策: SQL查询 (含统计需求)")
                return 'sql'
            else:
                print("  ➡️ 路由决策: 向量搜索 (文本搜索优先)")
                return 'vector'
        
        # 纯SQL查询
        if is_sql and not is_vector:
            print("  ➡️ 路由决策: SQL查询")
            return 'sql'
        
        # 默认使用混合查询
        print("  ➡️ 路由决策: 混合查询")
        return 'hybrid'
    
    def get_quick_sql(self, query):
        """为常见查询生成快速SQL"""
        query_lower = query.lower()
        
        # 事件级别统计
        if '三级事件' in query and ('多少' in query or '数量' in query):
            return "SELECT COUNT(*) as 数量 FROM events WHERE 事件级别 = '三级事件'"
        if '二级事件' in query and ('多少' in query or '数量' in query):
            return "SELECT COUNT(*) as 数量 FROM events WHERE 事件级别 = '二级事件'"
        if '四级事件' in query and ('多少' in query or '数量' in query):
            return "SELECT COUNT(*) as 数量 FROM events WHERE 事件级别 = '四级事件'"
        if '一级事件' in query and ('多少' in query or '数量' in query):
            return "SELECT COUNT(*) as 数量 FROM events WHERE 事件级别 = '一级事件'"
            
        # 总数查询 - 排除镇街相关查询
        if any(keyword in query for keyword in ['总数', '总共', '多少条']) and '事件' in query:
            if not any(level in query for level in ['三级', '二级', '四级', '一级']) and '镇街' not in query:
                print(f"🎯 快速SQL匹配: 事件总数查询")
                return "SELECT COUNT(*) as 总数量 FROM events"
        
        # 镇街统计 - 改进匹配逻辑
        if '镇街' in query and any(kw in query for kw in ['前', 'top', '排名', '名']):
            print(f"🎯 快速SQL匹配: 镇街排名查询")
            if '5' in query or '五' in query:
                return "SELECT 镇街名称, COUNT(*) as 事件数量 FROM events GROUP BY 镇街名称 ORDER BY 事件数量 DESC LIMIT 5"
            elif '10' in query or '十' in query:
                return "SELECT 镇街名称, COUNT(*) as 事件数量 FROM events GROUP BY 镇街名称 ORDER BY 事件数量 DESC LIMIT 10"
            else:
                return "SELECT 镇街名称, COUNT(*) as 事件数量 FROM events GROUP BY 镇街名称 ORDER BY 事件数量 DESC LIMIT 5"
        
        # 更广泛的镇街统计匹配
        if '镇街' in query and ('数量' in query or '统计' in query):
            print(f"🎯 快速SQL匹配: 镇街数量统计")
            return "SELECT 镇街名称, COUNT(*) as 事件数量 FROM events GROUP BY 镇街名称 ORDER BY 事件数量 DESC"
            
        return None
    
    def generate_sql(self, query):
        """使用DeepSeek生成SQL查询"""
        try:
            # 先检查是否是常见的快速查询
            quick_sql = self.get_quick_sql(query)
            if quick_sql:
                return quick_sql
            
            # 获取表结构信息
            conn = duckdb.connect(self.db_path)
            schema_info = conn.execute("DESCRIBE events").fetchall()
            conn.close()
            
            columns = [row[0] for row in schema_info]
            
            prompt = f"""
你是一个专业的SQL查询生成器。根据用户的中文查询，生成对应的DuckDB SQL语句。

数据表名：events
可用字段：{', '.join(columns)}

重要注意事项：
1. 使用DuckDB语法，不要使用MySQL函数
2. 日期格式化使用 strftime() 而不是 DATE_FORMAT()
3. 时间差计算使用 EXTRACT(EPOCH FROM (时间1 - 时间2))/3600 而不是 TIMESTAMPDIFF()
4. 当前日期使用 CURRENT_DATE
5. 字段名如果包含特殊字符，用双引号包围，如 "办结职能科室/部门"
6. 只生成一个SELECT查询语句
7. 结果要有意义的列名

常用模式：
- 统计数量：SELECT COUNT(*) as 数量 FROM events WHERE ...
- 按分组统计：SELECT 字段, COUNT(*) as 数量 FROM events GROUP BY 字段 ORDER BY 数量 DESC
- 时间筛选：WHERE strftime('%Y-%m', 上报时间) = '2025-05'
- 排名查询：ORDER BY 数量 DESC LIMIT 5

用户查询：{query}

请直接返回SQL语句，不要包含任何解释文字：
"""

            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            
            sql = response.choices[0].message.content.strip()
            
            # 清理SQL语句
            sql = sql.replace('```sql', '').replace('```', '').strip()
            
            return sql
            
        except Exception as e:
            print(f"❌ SQL生成失败: {e}")
            return None
    
    def execute_sql(self, sql):
        """执行SQL查询"""
        try:
            conn = duckdb.connect(self.db_path)
            
            # 安全检查：只允许SELECT查询
            sql_upper = sql.upper().strip()
            if not sql_upper.startswith('SELECT'):
                return None, "只允许SELECT查询"
            
            # 检查是否包含危险操作
            dangerous_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE']
            for keyword in dangerous_keywords:
                if keyword in sql_upper:
                    return None, f"不允许执行{keyword}操作"
            
            # 执行查询
            result = conn.execute(sql).fetchall()
            columns = [desc[0] for desc in conn.description]
            
            conn.close()
            
            return result, columns
            
        except Exception as e:
            return None, f"SQL执行错误: {str(e)}"
    
    def vector_search(self, query, n_results=5):
        """向量搜索"""
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            return results
            
        except Exception as e:
            print(f"❌ 向量搜索失败: {e}")
            return None
    
    def process_sql_chain(self, query):
        """处理SQL查询链"""
        try:
            # 生成SQL
            sql = self.generate_sql(query)
            if not sql:
                return "抱歉，无法生成SQL查询。"
            
            print(f"🔍 生成的SQL: {sql}")
            
            # 执行SQL
            result, columns = self.execute_sql(sql)
            if result is None:
                return f"查询执行失败: {columns}"
            
            # 格式化结果
            if not result:
                return "查询未返回结果。"
            
            # 使用DeepSeek解释结果
            result_text = self.format_sql_result(result, columns)
            explanation = self.explain_result(query, result_text, sql)
            
            # 保存SQL数据供返回
            self._last_sql_data = {
                "sql": sql,
                "result": result,
                "columns": columns
            }
            
            return explanation
            
        except Exception as e:
            return f"处理SQL查询时出错: {str(e)}"
    
    def process_vector_chain(self, query):
        """处理向量搜索链"""
        try:
            # 向量搜索
            search_results = self.vector_search(query)
            if not search_results or not search_results['documents'][0]:
                return "未找到相关事件记录。"
            
            # 组装上下文
            context = "\n\n".join(search_results['documents'][0])
            
            # 使用DeepSeek生成回答
            prompt = f"""
基于以下事件数据，回答用户的问题。

事件数据：
{context}

用户问题：{query}

请提供准确、详细的回答：
"""

            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"处理向量查询时出错: {str(e)}"
    
    def process_hybrid_chain(self, query):
        """处理混合查询链"""
        try:
            # 先尝试SQL查询
            sql_result = self.process_sql_chain(query)
            
            # 再尝试向量搜索
            vector_result = self.process_vector_chain(query)
            
            # 合并结果
            prompt = f"""
用户查询：{query}

SQL查询结果：
{sql_result}

向量搜索结果：
{vector_result}

请综合以上两种查询结果，为用户提供最准确、最完整的回答：
"""

            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1200
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"处理混合查询时出错: {str(e)}"
    
    def format_sql_result(self, result, columns):
        """格式化SQL查询结果"""
        if not result:
            return "查询无结果"
        
        # 创建表格格式
        formatted = []
        formatted.append(" | ".join(columns))
        formatted.append("-" * (len(" | ".join(columns))))
        
        for row in result[:10]:  # 限制显示前10行
            formatted.append(" | ".join([str(cell) for cell in row]))
        
        if len(result) > 10:
            formatted.append(f"... 还有 {len(result) - 10} 行数据")
        
        return "\n".join(formatted)
    
    def explain_result(self, query, result_text, sql):
        """使用DeepSeek解释查询结果"""
        try:
            prompt = f"""
用户查询：{query}
执行的SQL：{sql}
查询结果：
{result_text}

请用中文解释这个查询结果，要求：
1. 直接回答用户的问题
2. 突出关键数据
3. 语言简洁明了
4. 如果有多行数据，总结主要发现
"""

            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=800
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"结果解释失败: {str(e)}"
    
    def chat(self, query):
        """主要的聊天接口"""
        try:
            # 查询路由
            route = self.route_query(query)
            print(f"🎯 查询路由: {route}")
            
            # 根据路由执行不同的处理链
            if route == 'sql':
                result = self.process_sql_chain(query)
                query_type = "SQL查询"
            elif route == 'vector':
                result = self.process_vector_chain(query)
                query_type = "语义搜索"
            else:
                result = self.process_hybrid_chain(query)
                query_type = "混合查询"
            
            return {
                "answer": result,
                "query_type": query_type,
                "route": route,
                "data": getattr(self, '_last_sql_data', None)
            }
            
        except Exception as e:
            return {
                "answer": f"抱歉，处理您的请求时出现了错误：{str(e)}",
                "query_type": "错误",
                "route": "error"
            }
    
    def get_statistics(self):
        """获取数据统计信息"""
        try:
            conn = duckdb.connect(self.db_path)
            
            # 基础统计
            total_events = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
            
            # 级别分布
            level_stats = conn.execute("""
                SELECT 事件级别, COUNT(*) as 数量 
                FROM events 
                GROUP BY 事件级别 
                ORDER BY 数量 DESC
            """).fetchall()
            
            # 镇街分布（前5）
            town_stats = conn.execute("""
                SELECT 镇街名称, COUNT(*) as 数量 
                FROM events 
                GROUP BY 镇街名称 
                ORDER BY 数量 DESC 
                LIMIT 5
            """).fetchall()
            
            # 类型分布（前5）
            type_stats = conn.execute("""
                SELECT 二级分类, COUNT(*) as 数量 
                FROM events 
                GROUP BY 二级分类 
                ORDER BY 数量 DESC 
                LIMIT 5
            """).fetchall()
            
            conn.close()
            
            return {
                "total_events": total_events,
                "level_distribution": level_stats,
                "top_towns": town_stats,
                "top_types": type_stats
            }
            
        except Exception as e:
            print(f"❌ 获取统计信息失败: {e}")
            return None

# 创建全局实例
ai_chat_service = AIChatService() 