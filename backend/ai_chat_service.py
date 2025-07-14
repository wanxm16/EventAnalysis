#!/usr/bin/env python3
"""
AI问答服务
负责数据处理、DuckDB集成、向量数据库和AI API调用
支持多种AI服务提供商配置
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
import logging
from functools import wraps, lru_cache
import time
import hashlib

# 导入AI配置管理器
from ai_config import get_ai_config, is_ai_available, AIProvider

class AIChatService:
    def __init__(self):
        """初始化AI问答服务"""
        # 设置日志
        self.setup_logging()
        
        # 检查AI配置
        if not is_ai_available():
            raise ValueError("AI服务配置未找到。请检查ai_config.env文件或环境变量配置")
        
        # 获取AI配置
        self.ai_config = get_ai_config()
        if not self.ai_config:
            raise ValueError("AI配置获取失败")
        
        # 初始化AI客户端
        self.client = OpenAI(
            api_key=self.ai_config.api_key,
            base_url=self.ai_config.base_url,
            timeout=self.ai_config.timeout
        )
        
        self.logger.info(f"✅ AI服务初始化成功: {self.ai_config.provider.value} - {self.ai_config.model}")
        
        self.db_path = os.path.join(os.path.dirname(__file__), '../data/events.db')
        self.collection_name = "event_descriptions"
        
        # 初始化缓存
        self.query_cache = {}
        self.cache_max_size = 100
        
        # 初始化数据库和向量数据库
        self.init_database()
        self.init_vector_database()
        
        # 初始化元数据
        self.init_metadata()
        
        # 定义Function Calling工具
        self.setup_functions()
    
    def setup_logging(self):
        """设置日志"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def log_performance(func):
        """性能监控装饰器"""
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            start_time = time.time()
            try:
                result = func(self, *args, **kwargs)
                elapsed = time.time() - start_time
                self.logger.info(f"{func.__name__} 执行成功，耗时: {elapsed:.2f}s")
                return result
            except Exception as e:
                elapsed = time.time() - start_time
                self.logger.error(f"{func.__name__} 执行失败，耗时: {elapsed:.2f}s，错误: {str(e)}")
                raise
        return wrapper
    
    def setup_functions(self):
        """设置Function Calling工具"""
        self.functions = [
            {
                "type": "function",
                "function": {
                    "name": "execute_sql_query",
                    "description": "执行SQL查询并返回结构化结果，用于统计分析类查询和具体事件编号查询。当用户提供具体事件编号时优先使用此函数",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sql": {
                                "type": "string",
                                "description": "DuckDB SQL查询语句，必须是SELECT查询。对于事件编号查询使用：SELECT * FROM events WHERE 事件编号 = '具体编号'"
                            },
                            "query_purpose": {
                                "type": "string",
                                "description": "查询目的说明，如'查询事件编号DQIW202505240002的详细信息'"
                            }
                        },
                        "required": ["sql", "query_purpose"]
                    }
                }
            },
            {
                "type": "function", 
                "function": {
                    "name": "analyze_time_data",
                    "description": "分析时间相关数据，如处理时长、逾期事件等",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "analysis_type": {
                                "type": "string",
                                "enum": ["duration", "overtime", "trend"],
                                "description": "分析类型：duration-时长分析，overtime-逾期分析，trend-趋势分析"
                            },
                            "time_field": {
                                "type": "string",
                                "description": "时间字段名称，如'办理时长_小时'"
                            },
                            "threshold": {
                                "type": "number",
                                "description": "阈值，如逾期小时数"
                            }
                        },
                        "required": ["analysis_type"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_events_semantic",
                    "description": "使用语义搜索查找相关事件，用于文本内容查询",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query_text": {
                                "type": "string",
                                "description": "搜索文本，如'噪音投诉'"
                            },
                            "result_count": {
                                "type": "integer",
                                "default": 5,
                                "description": "返回结果数量"
                            }
                        },
                        "required": ["query_text"]
                    }
                }
            }
        ]
    
    def init_metadata(self):
        """初始化元数据管理"""
        self.metadata = {
            "table_schema": {
                "events": {
                    "description": "事件主表",
                    "columns": {}
                }
            },
            "enums": {
                "事件级别": ["一级事件", "二级事件", "三级事件", "四级事件"],
                "事件状态": ["待处理", "处理中", "已办结", "已关闭"]
            },
            "business_rules": {
                "overtime_threshold": 24,  # 24小时视为逾期
                "priority_levels": {
                    "一级事件": 1,
                    "二级事件": 2, 
                    "三级事件": 3,
                    "四级事件": 4
                }
            }
        }
        
        # 动态获取表结构
        try:
            conn = duckdb.connect(self.db_path)
            schema_info = conn.execute("DESCRIBE events").fetchall()
            for row in schema_info:
                col_name, col_type = row[0], row[1]
                self.metadata["table_schema"]["events"]["columns"][col_name] = {
                    "type": col_type,
                    "description": self._get_column_description(col_name)
                }
            conn.close()
            self.logger.info("元数据初始化完成")
        except Exception as e:
            self.logger.error(f"元数据初始化失败: {e}")
    
    def _get_column_description(self, col_name):
        """获取字段描述"""
        descriptions = {
            "事件编号": "事件的唯一标识符",
            "事件描述": "事件的详细描述内容",
            "镇街名称": "事件发生的镇街",
            "村社名称": "事件发生的村社",
            "事件级别": "事件的重要性级别",
            "二级分类": "事件的具体分类",
            "上报时间": "事件首次上报的时间",
            "办结时间": "事件处理完成的时间",
            "处置结果": "事件的最终处理结果",
            "办理时长_小时": "从上报到办结的时长（小时）",
            "受理时长_小时": "从上报到受理的时长（小时）"
        }
        return descriptions.get(col_name, "")
    
    @log_performance
    def execute_sql_query(self, sql: str, query_purpose: str) -> Dict[str, Any]:
        """Function Calling: 执行SQL查询"""
        try:
            result, columns = self.execute_sql(sql)
            if result is None:
                return {"error": columns, "data": None}
            
            return {
                "success": True,
                "data": result,
                "columns": columns,
                "row_count": len(result),
                "purpose": query_purpose
            }
        except Exception as e:
            return {"error": str(e), "data": None}
    
    @log_performance 
    def analyze_time_data(self, analysis_type: str, time_field: str = None, threshold: float = None) -> Dict[str, Any]:
        """Function Calling: 时间数据分析"""
        try:
            conn = duckdb.connect(self.db_path)
            
            if analysis_type == "duration":
                # 处理时长分析
                sql = """
                SELECT 
                    AVG(办理时长_小时) as 平均时长,
                    MIN(办理时长_小时) as 最短时长,
                    MAX(办理时长_小时) as 最长时长,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 办理时长_小时) as 中位数时长,
                    COUNT(*) as 总数量
                FROM events 
                WHERE 办理时长_小时 IS NOT NULL
                """
            elif analysis_type == "overtime":
                # 逾期分析
                threshold = threshold or self.metadata["business_rules"]["overtime_threshold"]
                sql = f"""
                SELECT 
                    COUNT(*) as 逾期数量,
                    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM events WHERE 办理时长_小时 IS NOT NULL) as 逾期率,
                    AVG(办理时长_小时) as 平均逾期时长
                FROM events 
                WHERE 办理时长_小时 > {threshold}
                """
            elif analysis_type == "trend":
                # 趋势分析
                sql = """
                SELECT 
                    上报年月,
                    COUNT(*) as 事件数量,
                    AVG(办理时长_小时) as 平均处理时长
                FROM events 
                WHERE 上报年月 IS NOT NULL
                GROUP BY 上报年月
                ORDER BY 上报年月
                """
            
            result = conn.execute(sql).fetchall()
            columns = [desc[0] for desc in conn.description]
            conn.close()
            
            return {
                "success": True,
                "analysis_type": analysis_type,
                "data": result,
                "columns": columns,
                "threshold": threshold
            }
            
        except Exception as e:
            return {"error": str(e), "data": None}
    
    @log_performance
    def search_events_semantic(self, query_text: str, result_count: int = 5) -> Dict[str, Any]:
        """Function Calling: 语义搜索"""
        try:
            search_results = self.vector_search(query_text, result_count)
            if not search_results or not search_results['documents'][0]:
                return {"error": "未找到相关事件", "data": None}
            
            return {
                "success": True,
                "query": query_text,
                "documents": search_results['documents'][0],
                "metadatas": search_results['metadatas'][0],
                "count": len(search_results['documents'][0])
            }
            
        except Exception as e:
            return {"error": str(e), "data": None}
    
    @log_performance
    def execute_pandas_analysis(self, analysis_request: str) -> Dict[str, Any]:
        """Function Calling: Pandas数据分析"""
        try:
            # 读取数据到DataFrame
            conn = duckdb.connect(self.db_path)
            df = conn.execute("SELECT * FROM events").df()
            conn.close()
            
            # 生成Pandas代码
            pandas_code = self.generate_pandas_code(analysis_request, df)
            if not pandas_code:
                return {"error": "无法生成Pandas分析代码", "data": None}
            
            # 执行代码
            result = self.execute_pandas_code(pandas_code, df)
            
            return {
                "success": True,
                "analysis_request": analysis_request,
                "code": pandas_code,
                "result": result
            }
            
        except Exception as e:
            return {"error": str(e), "data": None}
    
    def generate_pandas_code(self, analysis_request: str, df: pd.DataFrame) -> str:
        """生成Pandas分析代码"""
        try:
            # 获取DataFrame信息
            df_info = {
                "columns": list(df.columns),
                "shape": df.shape,
                "dtypes": df.dtypes.to_dict(),
                "sample": df.head(2).to_dict()
            }
            
            prompt = f"""
你是Pandas数据分析专家。根据用户需求生成Python Pandas代码。

数据信息：
- 行数：{df_info['shape'][0]}
- 列数：{df_info['shape'][1]}
- 字段列表：{', '.join(df_info['columns'])}

用户分析需求：{analysis_request}

代码要求：
1. 数据已加载为df变量
2. 只返回可执行的Python代码
3. 结果保存到result变量
4. 处理异常情况和空值
5. 代码要简洁高效

生成的代码示例：
```python
# 计算逾期事件分析
threshold = 24  # 24小时阈值
result = {{
    'total_events': len(df),
    'overtime_events': len(df[df['办理时长_小时'] > threshold]),
    'overtime_rate': len(df[df['办理时长_小时'] > threshold]) / len(df) * 100,
    'avg_duration': df['办理时长_小时'].mean()
}}
```

请生成代码：
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=600
            )
            
            code = response.choices[0].message.content.strip()
            
            # 清理代码
            code = code.replace('```python', '').replace('```', '').strip()
            
            return code
            
        except Exception as e:
            self.logger.error(f"Pandas代码生成失败: {e}")
            return None
    
    def execute_pandas_code(self, code: str, df: pd.DataFrame):
        """安全执行Pandas代码"""
        try:
            # 安全检查：禁止危险操作
            dangerous_keywords = [
                'import', 'exec', 'eval', 'open', 'file', 'write',
                'delete', 'remove', 'os.', 'sys.', 'subprocess',
                '__import__', 'globals', 'locals'
            ]
            
            for keyword in dangerous_keywords:
                if keyword in code:
                    raise ValueError(f"代码包含禁止的操作: {keyword}")
            
            # 准备执行环境
            local_vars = {
                'df': df.copy(),
                'pd': pd,
                'np': __import__('numpy'),
                'datetime': datetime,
                'result': None
            }
            
            # 执行代码
            exec(code, {"__builtins__": {}}, local_vars)
            
            result = local_vars.get('result')
            if result is None:
                raise ValueError("代码执行后result变量为空")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Pandas代码执行失败: {e}")
            raise
    
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
        """初始化增强的ChromaDB向量数据库"""
        try:
            # 创建ChromaDB客户端
            chroma_path = os.path.join(os.path.dirname(__file__), '../data/chroma_db')
            self.chroma_client = chromadb.PersistentClient(path=chroma_path)
            
            # 检查集合是否已存在
            try:
                self.collection = self.chroma_client.get_collection(name=self.collection_name)
                count = self.collection.count()
                if count > 0:
                    self.logger.info(f"向量数据库已存在，共 {count} 条记录")
                    return
                else:
                    self.chroma_client.delete_collection(name=self.collection_name)
            except:
                pass
            
            # 创建增强的集合配置
            self.collection = self.chroma_client.create_collection(
                name=self.collection_name,
                metadata={
                    "hnsw:space": "cosine",
                    "hnsw:construction_ef": 200,
                    "hnsw:M": 16
                }
            )
            
            # 读取数据并创建增强文档
            data_path = os.path.join(os.path.dirname(__file__), '../data/raw_conflict.csv')
            df = pd.read_csv(data_path)
            df = self.clean_data(df)
            
            documents, metadatas, ids = self.build_enhanced_documents(df)
            
            # 批量添加到向量数据库
            self.batch_add_documents(documents, metadatas, ids)
            
            self.logger.info(f"增强向量数据库初始化完成，共 {len(documents)} 条记录")
            
        except Exception as e:
            self.logger.error(f"向量数据库初始化失败: {e}")
            raise
    
    def build_enhanced_documents(self, df):
        """构建增强的文档表示"""
        documents = []
        metadatas = []
        ids = []
        
        for idx, row in df.iterrows():
            # 增强的文档构建：结构化信息 + 语义信息
            structured_info = self.build_structured_text(row)
            semantic_info = self.build_semantic_text(row)
            keyword_info = self.extract_keywords(row)
            
            # 组合文档
            full_document = f"""
{structured_info}

语义描述：
{semantic_info}

关键词：{', '.join(keyword_info)}
            """.strip()
            
            documents.append(full_document)
            
            # 增强的元数据
            enhanced_metadata = {
                "事件编号": str(row.get('事件编号', '')),
                "镇街名称": str(row.get('镇街名称', '')),
                "事件级别": str(row.get('事件级别', '')),
                "二级分类": str(row.get('二级分类', '')),
                "上报时间": str(row.get('上报时间', '')),
                "事件状态": str(row.get('事件状态', '')),
                "关键词": ','.join(keyword_info),
                "text_length": len(full_document),
                "has_result": 1 if pd.notna(row.get('处置结果')) else 0
            }
            
            metadatas.append(enhanced_metadata)
            ids.append(f"event_{idx}")
        
        return documents, metadatas, ids
    
    def build_structured_text(self, row):
        """构建结构化文本"""
        return f"""事件编号：{row.get('事件编号', '')}
事件描述：{row.get('事件描述', '')}
发生地点：{row.get('镇街名称', '')} {row.get('村社名称', '')}
事件级别：{row.get('事件级别', '')}
事件分类：{row.get('事件类型', '')} / {row.get('二级分类', '')}
处置结果：{row.get('处置结果', '')}"""
    
    def build_semantic_text(self, row):
        """构建语义文本"""
        description = str(row.get('事件描述', ''))
        result = str(row.get('处置结果', ''))
        
        # 提取关键信息
        semantic_text = f"{description}"
        if result and result != 'nan':
            semantic_text += f" 处理结果：{result}"
        
        return semantic_text
    
    def extract_keywords(self, row):
        """提取关键词"""
        keywords = []
        
        # 从描述中提取关键词
        description = str(row.get('事件描述', ''))
        result = str(row.get('处置结果', ''))
        
        # 预定义关键词集合
        keyword_patterns = {
            '噪音': ['噪音', '噪声', '吵闹', '扰民'],
            '停车': ['停车', '车位', '违停', '乱停'],
            '物业': ['物业', '小区', '业主', '管理'],
            '投诉': ['投诉', '举报', '反映'],
            '退款': ['退款', '退钱', '退费', '返还'],
            '纠纷': ['纠纷', '争议', '冲突', '矛盾'],
            '维修': ['维修', '修理', '故障', '损坏'],
            '环境': ['环境', '卫生', '清洁', '垃圾'],
            '安全': ['安全', '危险', '隐患', '事故']
        }
        
        text_content = f"{description} {result}".lower()
        
        for category, patterns in keyword_patterns.items():
            if any(pattern in text_content for pattern in patterns):
                keywords.append(category)
        
        # 添加分类信息
        if row.get('镇街名称'):
            keywords.append(f"区域:{row.get('镇街名称')}")
        if row.get('事件级别'):
            keywords.append(f"级别:{row.get('事件级别')}")
        
        return keywords
    
    def batch_add_documents(self, documents, metadatas, ids):
        """批量添加文档到向量数据库"""
        batch_size = 50  # 减小批次大小以提高稳定性
        total_batches = (len(documents) + batch_size - 1) // batch_size
        
        for i in range(0, len(documents), batch_size):
            end_idx = min(i + batch_size, len(documents))
            batch_num = i // batch_size + 1
            
            try:
                self.collection.add(
                    documents=documents[i:end_idx],
                    metadatas=metadatas[i:end_idx],
                    ids=ids[i:end_idx]
                )
                self.logger.info(f"批次 {batch_num}/{total_batches} 添加完成")
                
            except Exception as e:
                self.logger.error(f"批次 {batch_num} 添加失败: {e}")
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
    
    def intelligent_route_query(self, query):
        """智能查询路由（使用LLM分类器）"""
        try:
            route_prompt = f"""
你是查询路由专家。分析用户查询，判断最佳处理方式。

查询类型定义：
1. **statistical** - 统计分析类查询
   - 关键词：多少、数量、统计、排名、平均、最大、最小、占比、百分比
   - 示例：海曙区三级事件有多少？镇街排名前5？

2. **semantic** - 语义搜索类查询  
   - 关键词：包含、涉及、描述、案例、举例、相关
   - 示例：包含噪音投诉的案例、退款纠纷相关事件

3. **temporal** - 时间分析类查询
   - 关键词：时长、耗时、逾期、趋势、同比、环比
   - 示例：平均处理时长、逾期事件分析

4. **hybrid** - 混合查询
   - 需要结合统计和语义搜索
   - 示例：噪音投诉事件的数量统计

用户查询：{query}

请返回JSON格式：
{{
    "route": "statistical/semantic/temporal/hybrid",
    "confidence": 0.8,
    "reasoning": "选择原因"
}}
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[{"role": "user", "content": route_prompt}],
                temperature=0.1,
                max_tokens=200
            )
            
            try:
                result = json.loads(response.choices[0].message.content)
                route = result.get("route", "hybrid")
                confidence = result.get("confidence", 0.5)
                reasoning = result.get("reasoning", "")
                
                self.logger.info(f"智能路由结果: {route} (置信度: {confidence})")
                self.logger.info(f"路由原因: {reasoning}")
                
                # 转换为系统内部路由类型
                route_mapping = {
                    "statistical": "function_calling",
                    "temporal": "function_calling", 
                    "semantic": "vector",
                    "hybrid": "hybrid"
                }
                
                return route_mapping.get(route, "hybrid"), confidence, reasoning
                
            except json.JSONDecodeError:
                self.logger.warning("LLM路由响应格式错误，使用规则路由")
                return self.rule_based_route(query), 0.5, "LLM解析失败，使用规则路由"
            
        except Exception as e:
            self.logger.error(f"智能路由失败: {e}")
            return self.rule_based_route(query), 0.3, "智能路由异常，使用规则路由"
    
    def rule_based_route(self, query):
        """基于规则的查询路由（备用方案）"""
        self.logger.info(f"🔍 规则路由分析: {query}")
        
        # 最高优先级：检查是否包含事件编号
        import re
        event_id_patterns = [
            r'[A-Z]{2,4}W?\d{12}',  # 匹配如DQIW202505240002的格式
            r'[A-Z]{3,4}\d{12}',    # 匹配如YHW202505060301的格式
        ]
        
        for pattern in event_id_patterns:
            if re.search(pattern, query.upper()):
                self.logger.info("  ➡️ 规则路由: Function Calling (事件编号查询)")
                return 'function_calling'
        
        # 高优先级：Function Calling模式
        function_calling_keywords = [
            # 统计类
            '多少', '数量', '总数', '统计', '计算', '平均', '最大', '最小',
            '排名', '前', '名', 'TOP', 'top', '第一', '第二', '第三',
            '百分比', '占比', '比例', '增长', '变化率', '对比',
            
            # 时间类  
            '时长', '耗时', '用时', '逾期', '超过', '小于', '大于',
            '趋势', '同比', '环比', '移动平均',
            
            # 具体查询
            '什么内容', '是什么', '内容', '详情', '具体'
        ]
        
        # 语义搜索关键词
        semantic_keywords = [
            '包含', '涉及', '描述', '提到', '关于', '相关',
            '案例', '情况', '问题', '纠纷', '举例', '例子',
            '退款', '退钱', '噪音', '停车', '物业', '邻居',
            '消费', '投诉', '举报', '求助'
        ]
        
        # 检查Function Calling匹配
        has_function_calling = any(kw in query for kw in function_calling_keywords)
        has_semantic = any(kw in query for kw in semantic_keywords)
        
        # 特殊规则
        if any(event_level in query for event_level in ['三级事件', '二级事件', '四级事件', '一级事件']):
            self.logger.info("  ➡️ 规则路由: Function Calling (事件级别统计)")
            return 'function_calling'
        
        if '镇街' in query and any(kw in query for kw in ['排名', '统计', '数量', '前']):
            self.logger.info("  ➡️ 规则路由: Function Calling (镇街统计)")
            return 'function_calling'
        
        # 优先级判断
        if has_function_calling and not has_semantic:
            self.logger.info("  ➡️ 规则路由: Function Calling")
            return 'function_calling'
        
        if has_semantic and not has_function_calling:
            self.logger.info("  ➡️ 规则路由: 向量搜索")
            return 'vector'
        
        if has_function_calling and has_semantic:
            # 检查是否有明确的统计需求
            stat_priority = any(kw in query for kw in ['多少', '数量', '统计', '排名'])
            if stat_priority:
                self.logger.info("  ➡️ 规则路由: Function Calling (统计优先)")
                return 'function_calling'
            else:
                self.logger.info("  ➡️ 规则路由: 混合查询")
                return 'hybrid'
        
        # 默认
        self.logger.info("  ➡️ 规则路由: 混合查询 (默认)")
        return 'hybrid'
    
    def route_query(self, query):
        """查询路由主入口"""
        # 使用智能路由
        route, confidence, reasoning = self.intelligent_route_query(query)
        
        # 如果置信度较低，使用规则路由验证
        if confidence < 0.7:
            rule_route = self.rule_based_route(query)
            if rule_route != route:
                self.logger.warning(f"路由不一致：智能路由={route}, 规则路由={rule_route}")
                # 选择更保守的路由
                if rule_route == 'function_calling':
                    route = rule_route
        
        return route
    
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
    
    def generate_optimized_function_calling(self, query):
        """优化的Function Calling - 一次性完成路由+执行"""
        try:
            # 构建优化的系统提示 - 一次性完成所有操作
            system_prompt = f"""
你是海曙区事件分析系统的AI专家。请直接完成以下任务：
1. 分析用户查询意图
2. 选择最适合的函数
3. 生成准确的参数
4. 一次性返回完整结果

数据表结构：
{json.dumps(self.metadata["table_schema"], ensure_ascii=False, indent=2)}

枚举值：
{json.dumps(self.metadata["enums"], ensure_ascii=False, indent=2)}

业务规则：
{json.dumps(self.metadata["business_rules"], ensure_ascii=False, indent=2)}

**函数选择规则**
1. **事件编号查询** → execute_sql_query
   - 格式：SELECT * FROM events WHERE 事件编号 = '具体编号'
2. **统计分析查询** → execute_sql_query  
   - 数量统计、排名、占比、平均值等
3. **时间相关分析** → analyze_time_data
   - 处理时长、逾期分析、趋势分析
4. **文本内容搜索** → search_events_semantic
   - 查找包含特定内容的事件案例

**优化要求**
- 直接选择最合适的函数，不要多轮对话
- 生成高质量的SQL或参数
- 优先使用快速查询模板

请根据用户查询直接选择函数并提供参数。
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"用户查询：{query}"}
                ],
                tools=self.functions,
                tool_choice="auto",
                temperature=0.1
            )
            
            return response
            
        except Exception as e:
            self.logger.error(f"优化Function Calling失败: {e}")
            return None
    
    def generate_advanced_sql(self, query):
        """生成高级SQL查询（窗口函数、时间序列等）"""
        advanced_patterns = {
            "同比": """
                SELECT 
                    镇街名称,
                    COUNT(*) as 本期数量,
                    LAG(COUNT(*), 12) OVER (PARTITION BY 镇街名称 ORDER BY 上报年月) as 去年同期,
                    (COUNT(*) - LAG(COUNT(*), 12) OVER (PARTITION BY 镇街名称 ORDER BY 上报年月)) * 100.0 / 
                    LAG(COUNT(*), 12) OVER (PARTITION BY 镇街名称 ORDER BY 上报年月) as 同比增长率
                FROM events 
                WHERE 上报年月 IS NOT NULL
                GROUP BY 镇街名称, 上报年月
                ORDER BY 上报年月 DESC, 本期数量 DESC
            """,
            "环比": """
                SELECT 
                    上报年月,
                    COUNT(*) as 本月数量,
                    LAG(COUNT(*), 1) OVER (ORDER BY 上报年月) as 上月数量,
                    (COUNT(*) - LAG(COUNT(*), 1) OVER (ORDER BY 上报年月)) * 100.0 / 
                    LAG(COUNT(*), 1) OVER (ORDER BY 上报年月) as 环比增长率
                FROM events 
                WHERE 上报年月 IS NOT NULL
                GROUP BY 上报年月
                ORDER BY 上报年月 DESC
            """,
            "移动平均": """
                SELECT 
                    上报年月,
                    COUNT(*) as 月度数量,
                    AVG(COUNT(*)) OVER (ORDER BY 上报年月 ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as 三月移动平均
                FROM events 
                WHERE 上报年月 IS NOT NULL
                GROUP BY 上报年月
                ORDER BY 上报年月
            """,
            "累计统计": """
                SELECT 
                    上报年月,
                    COUNT(*) as 月度数量,
                    SUM(COUNT(*)) OVER (ORDER BY 上报年月) as 累计数量
                FROM events 
                WHERE 上报年月 IS NOT NULL
                GROUP BY 上报年月
                ORDER BY 上报年月
            """
        }
        
        # 检查查询是否匹配高级模式
        for pattern, sql_template in advanced_patterns.items():
            if pattern in query:
                return sql_template
        
        # 如果没有匹配到高级模式，使用增强的SQL生成
        return self.generate_enhanced_sql(query)
    
    def generate_enhanced_sql(self, query):
        """增强的SQL生成（替代原generate_sql方法）"""
        try:
            # 先检查快速查询
            quick_sql = self.get_enhanced_quick_sql(query)
            if quick_sql:
                return quick_sql
            
            # 使用更详细的prompt
            columns_info = []
            for col_name, col_info in self.metadata["table_schema"]["events"]["columns"].items():
                columns_info.append(f"{col_name} ({col_info['type']}) - {col_info['description']}")
            
            prompt = f"""
你是专业的DuckDB SQL查询生成器。根据用户查询生成高质量SQL。

表结构：events
字段信息：
{chr(10).join(columns_info)}

枚举值约束：
- 事件级别：{', '.join(self.metadata['enums']['事件级别'])}
- 事件状态：{', '.join(self.metadata['enums']['事件状态'])}

DuckDB语法要点：
1. 时间格式化：strftime('%Y-%m', 上报时间) 
2. 时间差计算：EXTRACT(EPOCH FROM (办结时间 - 上报时间))/3600 AS 办理小时数
3. 百分位数：PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 字段)
4. 窗口函数：ROW_NUMBER() OVER (PARTITION BY 镇街名称 ORDER BY COUNT(*) DESC)
5. 正则匹配：WHERE 字段 ~ '正则表达式'

高级查询模式：
- 排名：SELECT *, ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as 排名
- 占比：COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as 占比
- 时间趋势：GROUP BY 上报年月 ORDER BY 上报年月
- 分类汇总：GROUP BY ROLLUP(镇街名称, 事件级别)

用户查询：{query}

生成的SQL要求：
1. 使用有意义的列别名
2. 结果按相关性排序
3. 限制返回行数（LIMIT 100）
4. 只返回SQL语句，无其他文字

SQL：
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=800
            )
            
            sql = response.choices[0].message.content.strip()
            sql = sql.replace('```sql', '').replace('```', '').strip()
            
            return sql
            
        except Exception as e:
            self.logger.error(f"增强SQL生成失败: {e}")
            return None
    
    def get_enhanced_quick_sql(self, query):
        """增强的快速SQL模板"""
        query_lower = query.lower()
        
        # 检查是否包含具体的事件编号
        event_id_patterns = [
            r'[A-Z]{2,4}W?\d{12}',  # 匹配如DQIW202505240002的格式
            r'[A-Z]{3,4}\d{12}',    # 匹配如YHW202505060301的格式
        ]
        
        import re
        for pattern in event_id_patterns:
            matches = re.findall(pattern, query.upper())
            if matches:
                event_id = matches[0]
                self.logger.info(f"检测到事件编号: {event_id}")
                return f"SELECT * FROM events WHERE 事件编号 = '{event_id}'"
        
        # 检查事件分类查询
        category_sql = self.get_category_query_sql(query)
        if category_sql:
            return category_sql
        
        # 更多的快速SQL模板
        templates = {
            # 基础统计
            "总数": "SELECT COUNT(*) as 事件总数 FROM events",
            "总共有多少": "SELECT COUNT(*) as 事件总数 FROM events",
            
            # 事件级别统计
            "三级事件数量": "SELECT COUNT(*) as 三级事件数量 FROM events WHERE 事件级别 = '三级事件'",
            "二级事件数量": "SELECT COUNT(*) as 二级事件数量 FROM events WHERE 事件级别 = '二级事件'",
            "四级事件数量": "SELECT COUNT(*) as 四级事件数量 FROM events WHERE 事件级别 = '四级事件'",
            "一级事件数量": "SELECT COUNT(*) as 一级事件数量 FROM events WHERE 事件级别 = '一级事件'",
            
            # 镇街统计
            "镇街排名": """
                SELECT 镇街名称, COUNT(*) as 事件数量,
                       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM events), 2) as 占比
                FROM events 
                GROUP BY 镇街名称 
                ORDER BY 事件数量 DESC 
                LIMIT 10
            """,
            "镇街统计": """
                SELECT 镇街名称, COUNT(*) as 事件数量
                FROM events 
                GROUP BY 镇街名称 
                ORDER BY 事件数量 DESC
            """,
            
            # 时间分析
            "月度趋势": """
                SELECT 上报年月, COUNT(*) as 事件数量
                FROM events 
                WHERE 上报年月 IS NOT NULL
                GROUP BY 上报年月 
                ORDER BY 上报年月 DESC
                LIMIT 12
            """,
            "处理时长分析": """
                SELECT 
                    AVG(办理时长_小时) as 平均处理时长,
                    MIN(办理时长_小时) as 最短时长,
                    MAX(办理时长_小时) as 最长时长,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 办理时长_小时) as 中位数时长
                FROM events 
                WHERE 办理时长_小时 IS NOT NULL
            """,
            
            # 分类统计
            "事件分类": """
                SELECT 二级分类, COUNT(*) as 数量
                FROM events 
                GROUP BY 二级分类 
                ORDER BY 数量 DESC 
                LIMIT 10
            """,
            "级别分布": """
                SELECT 事件级别, COUNT(*) as 数量,
                       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM events), 2) as 占比
                FROM events 
                GROUP BY 事件级别 
                ORDER BY 数量 DESC
            """
        }
        
        # 匹配模板
        for key, sql in templates.items():
            if key in query:
                self.logger.info(f"匹配快速SQL模板: {key}")
                return sql
        
        # 复合条件匹配
        if ("镇街" in query and any(kw in query for kw in ["前", "top", "排名"])):
            if any(num in query for num in ["5", "五"]):
                return "SELECT 镇街名称, COUNT(*) as 事件数量 FROM events GROUP BY 镇街名称 ORDER BY 事件数量 DESC LIMIT 5"
            elif any(num in query for num in ["10", "十"]):
                return "SELECT 镇街名称, COUNT(*) as 事件数量 FROM events GROUP BY 镇街名称 ORDER BY 事件数量 DESC LIMIT 10"
        
        return None
    
    def get_category_query_sql(self, query):
        """事件分类查询SQL生成"""
        # 事件分类映射表
        category_mapping = {
            # 精确匹配
            '劳动纠纷': '劳动人事（就业）纠纷',
            '劳动人事纠纷': '劳动人事（就业）纠纷',
            '劳资纠纷': '劳动人事（就业）纠纷',
            '就业纠纷': '劳动人事（就业）纠纷',
            '消费纠纷': '消费纠纷',
            '经济纠纷': '经济纠纷',
            '邻里纠纷': '邻里纠纷',
            '物业纠纷': '物业管理纠纷',
            '物业管理纠纷': '物业管理纠纷',
            '债务纠纷': '债务纠纷',
            '公共秩序纠纷': '公共秩序纠纷',
            '家庭纠纷': '家庭婚姻纠纷',
            '婚姻纠纷': '家庭婚姻纠纷',
            '家庭婚姻纠纷': '家庭婚姻纠纷',
            '治安纠纷': '治安隐患纠纷',
            '治安隐患纠纷': '治安隐患纠纷',
            '其他纠纷': '其他纠纷'
        }
        
        # 检查是否包含数量查询关键词
        count_keywords = ['多少', '数量', '统计', '总数', '有多少']
        has_count_query = any(keyword in query for keyword in count_keywords)
        
        if not has_count_query:
            return None
        
        # 尝试匹配分类
        for query_key, db_category in category_mapping.items():
            if query_key in query:
                self.logger.info(f"匹配到事件分类查询: {query_key} -> {db_category}")
                return f"SELECT COUNT(*) as {query_key}数量 FROM events WHERE 二级分类 = '{db_category}'"
        
        # 模糊匹配
        if '纠纷' in query:
            # 检查是否有更具体的关键词
            for query_key, db_category in category_mapping.items():
                if any(word in query for word in query_key.replace('纠纷', '').split()):
                    if query_key.replace('纠纷', '') in query:
                        self.logger.info(f"模糊匹配到事件分类: {query_key} -> {db_category}")
                        return f"SELECT COUNT(*) as {query_key}数量 FROM events WHERE 二级分类 = '{db_category}'"
        
        return None
    
    def get_category_query_sql(self, query):
        """事件分类查询SQL生成"""
        # 事件分类映射表
        category_mapping = {
            # 精确匹配
            '劳动纠纷': '劳动人事（就业）纠纷',
            '劳动人事纠纷': '劳动人事（就业）纠纷',
            '劳资纠纷': '劳动人事（就业）纠纷',
            '就业纠纷': '劳动人事（就业）纠纷',
            '消费纠纷': '消费纠纷',
            '经济纠纷': '经济纠纷',
            '邻里纠纷': '邻里纠纷',
            '物业纠纷': '物业管理纠纷',
            '物业管理纠纷': '物业管理纠纷',
            '债务纠纷': '债务纠纷',
            '公共秩序纠纷': '公共秩序纠纷',
            '家庭纠纷': '家庭婚姻纠纷',
            '婚姻纠纷': '家庭婚姻纠纷',
            '家庭婚姻纠纷': '家庭婚姻纠纷',
            '治安纠纷': '治安隐患纠纷',
            '治安隐患纠纷': '治安隐患纠纷',
            '其他纠纷': '其他纠纷'
        }
        
        # 检查是否包含数量查询关键词
        count_keywords = ['多少', '数量', '统计', '总数', '有多少']
        has_count_query = any(keyword in query for keyword in count_keywords)
        
        if not has_count_query:
            return None
        
        # 尝试匹配分类
        for query_key, db_category in category_mapping.items():
            if query_key in query:
                self.logger.info(f"匹配到事件分类查询: {query_key} -> {db_category}")
                return f"SELECT COUNT(*) as {query_key}数量 FROM events WHERE 二级分类 = '{db_category}'"
        
        # 模糊匹配
        if '纠纷' in query:
            # 检查是否有更具体的关键词
            for query_key, db_category in category_mapping.items():
                if any(word in query for word in query_key.replace('纠纷', '').split()):
                    if query_key.replace('纠纷', '') in query:
                        self.logger.info(f"模糊匹配到事件分类: {query_key} -> {db_category}")
                        return f"SELECT COUNT(*) as {query_key}数量 FROM events WHERE 二级分类 = '{db_category}'"
        
        return None
    
    def get_cache_key(self, query_type, query_content):
        """生成缓存键"""
        content = f"{query_type}:{query_content}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    def get_cached_result(self, cache_key):
        """获取缓存结果"""
        if cache_key in self.query_cache:
            cached_data = self.query_cache[cache_key]
            # 检查缓存是否过期（10分钟）
            if time.time() - cached_data['timestamp'] < 600:
                self.logger.info(f"🎯 缓存命中: {cache_key[:8]}...")
                return cached_data['result']
            else:
                # 清理过期缓存
                del self.query_cache[cache_key]
        return None
    
    def set_cached_result(self, cache_key, result):
        """设置缓存结果"""
        # 限制缓存大小
        if len(self.query_cache) >= self.cache_max_size:
            # 删除最老的缓存
            oldest_key = min(self.query_cache.keys(), 
                           key=lambda k: self.query_cache[k]['timestamp'])
            del self.query_cache[oldest_key]
        
        self.query_cache[cache_key] = {
            'result': result,
            'timestamp': time.time()
        }
        self.logger.info(f"💾 缓存保存: {cache_key[:8]}...")
    
    def execute_sql(self, sql):
        """执行SQL查询（带缓存）"""
        try:
            # 检查缓存
            cache_key = self.get_cache_key('sql', sql)
            cached_result = self.get_cached_result(cache_key)
            if cached_result:
                return cached_result['result'], cached_result['columns']
            
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
            
            # 缓存结果
            self.set_cached_result(cache_key, {'result': result, 'columns': columns})
            
            return result, columns
            
        except Exception as e:
            return None, f"SQL执行错误: {str(e)}"
    
    def enhanced_vector_search(self, query, n_results=5, filters=None):
        """增强的向量搜索"""
        try:
            # 查询扩展
            expanded_query = self.expand_query(query)
            
            # 构建搜索参数
            search_params = {
                "query_texts": [expanded_query],
                "n_results": min(n_results * 2, 20),  # 多获取一些候选
                "include": ["documents", "metadatas", "distances"]
            }
            
            # 添加过滤器
            if filters:
                search_params["where"] = filters
            
            # 执行搜索
            results = self.collection.query(**search_params)
            
            # 后处理和重排序
            processed_results = self.post_process_search_results(
                results, query, n_results
            )
            
            return processed_results
            
        except Exception as e:
            self.logger.error(f"增强向量搜索失败: {e}")
            return None
    
    def expand_query(self, query):
        """查询扩展"""
        # 同义词扩展
        synonyms = {
            '噪音': ['噪音', '噪声', '吵闹', '扰民'],
            '停车': ['停车', '车位', '违停', '乱停'],
            '投诉': ['投诉', '举报', '反映', '申诉'],
            '退款': ['退款', '退钱', '退费', '返还'],
            '纠纷': ['纠纷', '争议', '冲突', '矛盾'],
            '物业': ['物业', '小区', '业主', '管理'],
            '维修': ['维修', '修理', '故障', '损坏']
        }
        
        expanded_terms = [query]
        
        for key, values in synonyms.items():
            if key in query:
                expanded_terms.extend(values)
        
        return ' '.join(expanded_terms)
    
    def post_process_search_results(self, results, original_query, n_results):
        """后处理搜索结果"""
        if not results or not results['documents'][0]:
            return results
        
        documents = results['documents'][0]
        metadatas = results['metadatas'][0]
        distances = results['distances'][0]
        
        # 计算增强相似度分数
        enhanced_scores = []
        for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
            score = self.calculate_enhanced_score(
                doc, meta, original_query, dist
            )
            enhanced_scores.append((i, score))
        
        # 按增强分数重排序
        enhanced_scores.sort(key=lambda x: x[1], reverse=True)
        
        # 构建重排序后的结果
        reranked_results = {
            'documents': [[]],
            'metadatas': [[]],
            'distances': [[]]
        }
        
        for i, score in enhanced_scores[:n_results]:
            reranked_results['documents'][0].append(documents[i])
            reranked_results['metadatas'][0].append(metadatas[i])
            reranked_results['distances'][0].append(distances[i])
        
        return reranked_results
    
    def calculate_enhanced_score(self, document, metadata, query, distance):
        """计算增强相似度分数"""
        # 基础分数（距离转换为相似度）
        base_score = 1 - distance
        
        # 关键词匹配加权
        keyword_score = self.calculate_keyword_match_score(document, query)
        
        # 元数据相关性加权
        metadata_score = self.calculate_metadata_relevance(metadata, query)
        
        # 文档质量分数
        quality_score = self.calculate_document_quality(document, metadata)
        
        # 综合分数
        final_score = (
            base_score * 0.5 +
            keyword_score * 0.3 +
            metadata_score * 0.1 +
            quality_score * 0.1
        )
        
        return final_score
    
    def calculate_keyword_match_score(self, document, query):
        """计算关键词匹配分数"""
        doc_lower = document.lower()
        query_lower = query.lower()
        
        # 完全匹配
        exact_matches = sum(1 for word in query_lower.split() if word in doc_lower)
        
        # 部分匹配
        partial_matches = 0
        for word in query_lower.split():
            if len(word) > 2:
                for doc_word in doc_lower.split():
                    if word in doc_word or doc_word in word:
                        partial_matches += 0.5
        
        total_query_words = len(query_lower.split())
        if total_query_words == 0:
            return 0
        
        return (exact_matches + partial_matches) / total_query_words
    
    def calculate_metadata_relevance(self, metadata, query):
        """计算元数据相关性分数"""
        score = 0
        
        # 检查查询中是否包含镇街、级别等信息
        if '镇街' in query or any(town in query for town in ['月湖', '江厦', '南门']):
            town = metadata.get('镇街名称', '')
            if any(t in query for t in [town] if t):
                score += 0.3
        
        if any(level in query for level in ['一级', '二级', '三级', '四级']):
            level = metadata.get('事件级别', '')
            if any(l in query for l in [level] if l):
                score += 0.2
        
        # 关键词匹配
        keywords = metadata.get('关键词', '').split(',')
        for keyword in keywords:
            if keyword and keyword in query:
                score += 0.1
        
        return min(score, 1.0)  # 限制最大值为1
    
    def calculate_document_quality(self, document, metadata):
        """计算文档质量分数"""
        score = 0.5  # 基础分数
        
        # 文档长度
        text_length = metadata.get('text_length', 0)
        if text_length > 100:
            score += 0.2
        
        # 是否有处置结果
        has_result = metadata.get('has_result', 0)
        if has_result:
            score += 0.3
        
        return min(score, 1.0)
    
    def vector_search(self, query, n_results=5):
        """向量搜索（保持向后兼容）"""
        result = self.enhanced_vector_search(query, n_results)
        return result
    
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
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=self.ai_config.max_tokens
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
                model=self.ai_config.model,
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
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=800
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"结果解释失败: {str(e)}"
    
    def chat(self, query):
        """优化的聊天接口 - 高质量展示 + 性能优化"""
        try:
            start_time = time.time()
            
            # 检查完整查询缓存
            cache_key = self.get_cache_key('chat', query)
            cached_result = self.get_cached_result(cache_key)
            if cached_result:
                elapsed_time = time.time() - start_time
                cached_result['elapsed_time'] = elapsed_time
                cached_result['cached'] = True
                return cached_result
            
            # 先尝试快速查询匹配（但使用高质量展示）
            fast_result = self.try_fast_query_match(query)
            if fast_result:
                elapsed_time = time.time() - start_time
                result = {
                    "answer": fast_result,
                    "query_type": "快速查询",
                    "route": "fast",
                    "elapsed_time": elapsed_time,
                    "data": getattr(self, '_last_sql_data', None)
                }
                self.set_cached_result(cache_key, result)
                return result
            
            # 使用规则路由（更快）
            route = self.rule_based_route(query)
            self.logger.info(f"🎯 查询路由: {route}")
            
            # 根据路由执行不同的处理链
            if route == 'function_calling':
                # 判断是否需要高质量解释
                if self.needs_quality_explanation(query):
                    result = self.process_optimized_function_calling(query)
                    query_type = "优化Function Calling"
                else:
                    result = self.process_optimized_function_calling(query)
                    query_type = "优化Function Calling"
            elif route == 'vector':
                result = self.process_cached_vector_search(query)
                query_type = "增强语义搜索"
            elif route == 'hybrid':
                result = self.process_optimized_hybrid_chain(query)
                query_type = "优化混合查询"
            else:
                # 备用：使用增强SQL查询
                result = self.process_enhanced_sql_chain(query)
                query_type = "增强SQL查询"
            
            elapsed_time = time.time() - start_time
            self.logger.info(f"查询处理完成，耗时: {elapsed_time:.2f}s")
            
            final_result = {
                "answer": result,
                "query_type": query_type,
                "route": route,
                "elapsed_time": elapsed_time,
                "data": getattr(self, '_last_sql_data', None)
            }
            
            # 缓存结果
            self.set_cached_result(cache_key, final_result)
            
            return final_result
            
        except Exception as e:
            self.logger.error(f"聊天接口错误: {e}")
            return {
                "answer": f"抱歉，处理您的请求时出现了错误：{str(e)}",
                "query_type": "错误",
                "route": "error"
            }
    
    def needs_quality_explanation(self, query):
        """判断是否需要高质量解释"""
        # 复杂查询需要高质量解释
        complex_keywords = [
            '分析', '对比', '趋势', '变化', '增长', '下降',
            '原因', '建议', '推荐', '解释', '说明',
            '为什么', '怎么办', '如何', '怎么样'
        ]
        
        # 单纯的数量查询不需要复杂解释
        simple_keywords = [
            '多少', '数量', '总数', '统计', '排名'
        ]
        
        has_complex = any(keyword in query for keyword in complex_keywords)
        has_simple = any(keyword in query for keyword in simple_keywords)
        
        # 如果只有简单关键词没有复杂关键词，则不需要复杂解释
        if has_simple and not has_complex:
            return False
        
        # 其他情况需要高质量解释
        return True
    
    def process_optimized_function_calling(self, query):
        """优化的Function Calling处理 - 合并API调用"""
        try:
            # 检查缓存
            cache_key = self.get_cache_key('function_calling', query)
            cached_result = self.get_cached_result(cache_key)
            if cached_result:
                return cached_result
            
            # 使用优化的Function Calling
            response = self.generate_optimized_function_calling(query)
            
            if not response or not response.choices[0].message.tool_calls:
                # 如果没有工具调用，使用快速SQL查询
                return self.process_fast_sql_query(query)
            
            # 执行函数调用
            tool_call = response.choices[0].message.tool_calls[0]
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            self.logger.info(f"执行函数: {function_name}")
            self.logger.info(f"参数: {function_args}")
            
            # 调用相应的函数
            if function_name == "execute_sql_query":
                func_result = self.execute_sql_query(**function_args)
            elif function_name == "analyze_time_data":
                func_result = self.analyze_time_data(**function_args)
            elif function_name == "search_events_semantic":
                func_result = self.search_events_semantic(**function_args)
            else:
                return f"未知的函数调用: {function_name}"
            
            # 如果函数执行失败
            if "error" in func_result:
                return f"函数执行失败: {func_result['error']}"
            
            # 使用快速结果解释
            explanation = self.explain_function_result_fast(query, function_name, func_result)
            
            # 缓存结果
            self.set_cached_result(cache_key, explanation)
            
            return explanation
            
        except Exception as e:
            self.logger.error(f"优化Function Calling处理失败: {e}")
            return f"优化Function Calling处理失败: {str(e)}"
    
    def process_enhanced_vector_chain(self, query):
        """处理增强语义搜索链"""
        try:
            # 使用增强向量搜索
            search_results = self.enhanced_vector_search(query, n_results=6)
            if not search_results or not search_results['documents'][0]:
                return "未找到相关事件记录。"
            
            # 构建增强上下文
            context = self.build_enhanced_context(search_results, query)
            
            # 使用DeepSeek生成高质量回答
            prompt = f"""
基于以下搜索结果，为用户提供准确、详细的回答。

用户问题：{query}

搜索结果：
{context}

回答要求：
1. 直接回答用户问题
2. 引用具体的事件案例
3. 提供事件编号以便追溯
4. 总结主要发现
5. 语言简洁明了

请提供高质量的回答：
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1200
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"增强语义搜索处理失败: {str(e)}"
    
    def process_enhanced_hybrid_chain(self, query):
        """处理增强混合查询链"""
        try:
            # 并行执行Function Calling和向量搜索
            func_result = self.process_function_calling_chain(query)
            vector_result = self.process_enhanced_vector_chain(query)
            
            # 合并结果
            prompt = f"""
用户查询：{query}

Function Calling结果：
{func_result}

语义搜索结果：
{vector_result}

请综合以上两种查询结果，为用户提供最准确、最完整的回答：
1. 如果两个结果互补，请整合信息
2. 如果两个结果冲突，请以Function Calling为准
3. 突出关键数据和具体案例
4. 语言简洁专业
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"增强混合查询处理失败: {str(e)}"
    
    def process_enhanced_sql_chain(self, query):
        """处理增强SQL查询链"""
        try:
            # 尝试高级SQL生成
            sql = self.generate_advanced_sql(query)
            if not sql:
                sql = self.generate_enhanced_sql(query)
            
            if not sql:
                return "抱歉，无法生成SQL查询。"
            
            self.logger.info(f"🔍 生成的增强SQL: {sql}")
            
            # 执行SQL
            result, columns = self.execute_sql(sql)
            if result is None:
                return f"查询执行失败: {columns}"
            
            if not result:
                return "查询未返回结果。"
            
            # 使用增强的结果解释
            result_text = self.format_sql_result(result, columns)
            explanation = self.explain_result_with_cot(query, result_text, sql)
            
            # 保存数据
            self._last_sql_data = {
                "sql": sql,
                "result": result,
                "columns": columns
            }
            
            return explanation
            
        except Exception as e:
            return f"增强SQL查询处理失败: {str(e)}"
    
    def explain_function_result(self, query, function_name, func_result):
        """解释函数执行结果"""
        try:
            prompt = f"""
用户查询：{query}
执行函数：{function_name}
函数结果：{json.dumps(func_result, ensure_ascii=False, indent=2)}

请用中文解释这个函数执行结果，要求：
1. 直接回答用户的问题
2. 突出关键数据和发现
3. 提供Chain-of-Thought推理过程
4. 说明数据来源的可靠性
5. 语言专业简洁

请提供详细的解释：
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=self.ai_config.max_tokens
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"结果解释失败: {str(e)}"
    
    def explain_result_with_cot(self, query, result_text, sql):
        """带Chain-of-Thought推理的结果解释"""
        try:
            prompt = f"""
用户查询：{query}
执行的SQL：{sql}
查询结果：
{result_text}

请用中文解释这个查询结果，使用Chain-of-Thought推理方式：

**思考过程：**
1. 用户想了解什么？
2. SQL查询做了什么？
3. 数据显示了什么？
4. 可以得出什么结论？

**回答要求：**
1. 展示推理过程
2. 强调数据来源可靠（来自系统计算，非编造）
3. 突出关键发现
4. 提供具体数字
5. 语言专业准确

请提供完整的分析：
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=self.ai_config.max_tokens
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"推理解释失败: {str(e)}"
    
    def build_enhanced_context(self, search_results, query):
        """构建增强上下文"""
        context_parts = []
        
        documents = search_results['documents'][0]
        metadatas = search_results['metadatas'][0]
        distances = search_results['distances'][0]
        
        for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
            similarity = 1 - dist
            context_parts.append(f"""
**事件 {i+1}** (相似度: {similarity:.3f})
{doc}
""")
        
        return "\n".join(context_parts)
    
    def try_fast_query_match(self, query):
        """尝试快速查询匹配 - 无需API调用"""
        try:
            # 检查快速SQL模板
            quick_sql = self.get_enhanced_quick_sql(query)
            if quick_sql:
                self.logger.info(f"🚀 快速查询匹配: {query}")
                result, columns = self.execute_sql(quick_sql)
                if result is not None:
                    # 简单格式化结果
                    return self.format_quick_result(result, columns, query)
            return None
        except Exception as e:
            self.logger.error(f"快速查询匹配失败: {e}")
            return None
    
    def format_quick_result(self, result, columns, query):
        """快速格式化结果 - 高质量展示"""
        if not result:
            return "查询未返回结果。"
        
        # 单个数值结果的高质量展示
        if len(columns) == 1 and len(result) == 1:
            value = result[0][0]
            if '总数' in query or '多少' in query:
                # 提取查询主题
                subject = query.replace('多少', '').replace('总数', '').replace('？', '').replace('?', '').strip()
                return f"根据系统统计，{subject}共有 **{value:,}** 条事件记录。"
            elif '三级事件' in query:
                return f"根据系统统计，三级事件共有 **{value:,}** 条记录。"
            elif '二级事件' in query:
                return f"根据系统统计，二级事件共有 **{value:,}** 条记录。"
            elif '一级事件' in query:
                return f"根据系统统计，一级事件共有 **{value:,}** 条记录。"
            elif '四级事件' in query:
                return f"根据系统统计，四级事件共有 **{value:,}** 条记录。"
            else:
                return f"查询结果：**{value:,}**。"
        
        # 多行结果的高质量展示
        if '排名' in query or '前' in query:
            lines = []
            total_count = sum(row[1] for row in result if len(row) >= 2)
            
            if '镇街' in query:
                lines.append(f"根据系统统计，镇街事件数量排名情况如下：\n")
            else:
                lines.append(f"根据系统统计，排名情况如下：\n")
            
            for i, row in enumerate(result[:5], 1):
                if len(row) >= 2:
                    count = row[1]
                    percentage = (count / total_count * 100) if total_count > 0 else 0
                    lines.append(f"{i}. **{row[0]}**: {count:,} 条 ({percentage:.1f}%)")
            
            if len(result) > 5:
                lines.append(f"\n... 还有 {len(result) - 5} 个项目")
            
            return "\n".join(lines)
        
        # 默认格式化 - 使用更好的表格展示
        return self.format_enhanced_sql_result(result, columns)
    
    def format_enhanced_sql_result(self, result, columns):
        """增强的SQL结果格式化"""
        if not result:
            return "查询未返回结果。"
        
        # 单列结果
        if len(columns) == 1:
            lines = [f"**{columns[0]}**"]
            for i, row in enumerate(result[:10], 1):
                lines.append(f"{i}. {row[0]}")
            return "\n".join(lines)
        
        # 双列结果
        if len(columns) == 2:
            lines = [f"**{columns[0]} - {columns[1]}**\n"]
            for i, row in enumerate(result[:10], 1):
                lines.append(f"{i}. **{row[0]}**: {row[1]}")
            return "\n".join(lines)
        
        # 多列结果 - 使用表格格式
        lines = []
        lines.append(" | ".join([f"**{col}**" for col in columns]))
        lines.append("-" * (len(" | ".join(columns)) + 10))
        
        for row in result[:10]:
            lines.append(" | ".join([str(cell) for cell in row]))
        
        if len(result) > 10:
            lines.append(f"\n... 还有 {len(result) - 10} 行数据")
        
        return "\n".join(lines)
    
    def process_fast_sql_query(self, query):
        """快速SQL查询处理"""
        try:
            # 尝试快速查询
            fast_result = self.try_fast_query_match(query)
            if fast_result:
                return fast_result
            
            # 使用增强SQL生成
            sql = self.generate_enhanced_sql(query)
            if not sql:
                return "抱歉，无法生成SQL查询。"
            
            result, columns = self.execute_sql(sql)
            if result is None:
                return f"查询执行失败: {columns}"
            
            if not result:
                return "查询未返回结果。"
            
            # 简化结果解释
            return self.format_quick_result(result, columns, query)
            
        except Exception as e:
            return f"快速SQL查询处理失败: {str(e)}"
    
    def process_cached_vector_search(self, query):
        """缓存语义搜索处理 - 高质量展示"""
        try:
            # 检查缓存
            cache_key = self.get_cache_key('vector', query)
            cached_result = self.get_cached_result(cache_key)
            if cached_result:
                return cached_result
            
            # 执行向量搜索
            search_results = self.enhanced_vector_search(query, n_results=5)
            if not search_results or not search_results['documents'][0]:
                return "未找到相关事件记录。"
            
            # 高质量结果处理
            documents = search_results['documents'][0]
            metadatas = search_results['metadatas'][0]
            distances = search_results['distances'][0]
            
            result_lines = [f"根据语义搜索，找到 **{len(documents)}** 个相关事件：\n"]
            
            for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances), 1):
                event_id = meta.get('事件编号', '')
                town = meta.get('镇街名称', '')
                level = meta.get('事件级别', '')
                similarity = (1 - dist) * 100
                
                # 提取事件描述
                desc_start = doc.find('事件描述：')
                if desc_start != -1:
                    desc_end = doc.find('\n', desc_start)
                    if desc_end == -1:
                        desc_end = desc_start + 150
                    description = doc[desc_start + 5:desc_end].strip()
                else:
                    description = doc[:120] + "..."
                
                # 提取处置结果
                result_start = doc.find('处置结果：')
                if result_start != -1:
                    result_end = doc.find('\n', result_start)
                    if result_end == -1:
                        result_end = result_start + 100
                    disposal_result = doc[result_start + 5:result_end].strip()
                    if disposal_result and disposal_result != '':
                        disposal_info = f"\n   处置结果: {disposal_result}"
                    else:
                        disposal_info = ""
                else:
                    disposal_info = ""
                
                result_lines.append(f"**{i}. 事件编号: {event_id}** (相似度: {similarity:.1f}%)")
                result_lines.append(f"   地点: {town} | 级别: {level}")
                result_lines.append(f"   描述: {description}{disposal_info}")
                result_lines.append("")
            
            result = "\n".join(result_lines)
            
            # 缓存结果
            self.set_cached_result(cache_key, result)
            
            return result
            
        except Exception as e:
            return f"语义搜索处理失败: {str(e)}"
    
    def process_optimized_hybrid_chain(self, query):
        """优化的混合查询处理"""
        try:
            # 检查缓存
            cache_key = self.get_cache_key('hybrid', query)
            cached_result = self.get_cached_result(cache_key)
            if cached_result:
                return cached_result
            
            # 先试快速查询
            fast_result = self.try_fast_query_match(query)
            if fast_result:
                return fast_result
            
            # 执行优化的Function Calling
            func_result = self.process_optimized_function_calling(query)
            
            # 如果需要补充信息，执行向量搜索
            if any(keyword in query for keyword in ['案例', '举例', '具体', '包含']):
                vector_result = self.process_cached_vector_search(query)
                result = f"{func_result}\n\n相关案例：\n{vector_result}"
            else:
                result = func_result
            
            # 缓存结果
            self.set_cached_result(cache_key, result)
            
            return result
            
        except Exception as e:
            return f"优化混合查询处理失败: {str(e)}"
    
    def explain_function_result_fast(self, query, function_name, func_result):
        """快速函数结果解释 - 保持高质量展示"""
        try:
            # 检查缓存
            cache_key = self.get_cache_key('explain', f"{function_name}:{query}:{str(func_result)[:100]}")
            cached_result = self.get_cached_result(cache_key)
            if cached_result:
                return cached_result
            
            # 对于简单的单数值结果，使用快速处理
            if function_name == "execute_sql_query":
                data = func_result.get('data', [])
                columns = func_result.get('columns', [])
                
                if not data:
                    return "查询未返回结果。"
                
                # 单个数值结果的简单处理
                if len(columns) == 1 and len(data) == 1:
                    value = data[0][0]
                    if '总数' in query or '多少' in query:
                        result = f"根据系统统计，{query.replace('多少', '').replace('总数', '').replace('？', '').replace('?', '').strip()}共有 **{value}** 条事件记录。"
                    else:
                        result = f"查询结果：{value}。"
                    
                    self.set_cached_result(cache_key, result)
                    return result
                
                # 对于复杂结果，使用AI生成高质量解释
                return self.generate_quality_explanation(query, function_name, func_result)
            
            # 其他函数类型使用高质量解释
            return self.generate_quality_explanation(query, function_name, func_result)
            
        except Exception as e:
            return f"结果解释失败: {str(e)}"    
    
    def generate_quality_explanation(self, query, function_name, func_result):
        """生成高质量的结果解释"""
        try:
            # 检查缓存
            cache_key = self.get_cache_key('quality_explain', f"{function_name}:{query}:{str(func_result)[:100]}")
            cached_result = self.get_cached_result(cache_key)
            if cached_result:
                return cached_result
            
            # 构建优化的提示词
            prompt = f"""
你是海曙区事件分析系统的专业分析师。请根据以下信息提供专业、准确的分析报告。

**用户查询**：{query}
**执行函数**：{function_name}
**数据结果**：{json.dumps(func_result, ensure_ascii=False, indent=2)}

**回答要求**：
1. 直接回答用户的问题
2. 突出关键数据和发现（使用**粗体**标记重要数字）
3. 提供简洁的分析解释
4. 如果有排名数据，请按列表形式展示
5. 语言专业简洁，强调数据来源可靠

**示例格式**：
根据系统统计，海曙区事件数量排名前5名的镇街如下：

1. **月湖街道**: 1,245条事件
2. **江厦街道**: 1,123条事件
3. **南门街道**: 987条事件

请提供类似的专业分析：
"""

            response = self.client.chat.completions.create(
                model=self.ai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=self.ai_config.max_tokens
            )
            
            result = response.choices[0].message.content
            
            # 缓存结果
            self.set_cached_result(cache_key, result)
            
            return result
            
        except Exception as e:
            # 如果AI解释失败，使用基本格式化
            self.logger.error(f"高质量解释失败: {e}")
            return self.fallback_format_result(query, function_name, func_result)
    
    def fallback_format_result(self, query, function_name, func_result):
        """备用的结果格式化"""
        try:
            if function_name == "execute_sql_query":
                data = func_result.get('data', [])
                columns = func_result.get('columns', [])
                
                if not data:
                    return "查询未返回结果。"
                
                # 单个数值结果
                if len(columns) == 1 and len(data) == 1:
                    value = data[0][0]
                    return f"根据系统统计，结果为：**{value}**。"
                
                # 多行结果
                if '排名' in query or '前' in query:
                    lines = [f"根据系统统计，结果如下：\n"]
                    for i, row in enumerate(data[:10], 1):
                        if len(row) >= 2:
                            lines.append(f"{i}. **{row[0]}**: {row[1]} 条")
                    return "\n".join(lines)
                
                # 默认格式化
                return self.format_sql_result(data, columns)
            
            # 其他函数类型
            return json.dumps(func_result, ensure_ascii=False, indent=2)
            
        except Exception as e:
            return f"结果格式化失败: {str(e)}"
    
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