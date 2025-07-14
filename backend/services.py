import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any
import re
import os
from datetime import datetime
import uuid
from models import EventResponse, EventDetailResponse, ClusterEventResponse, PaginatedResponse, FilterOptions, ClusterListResponse, ClusterListPaginatedResponse, ClusterFilterOptions, PersonInfo, PersonSearchQuery, PersonSearchResponse, PersonAnalysis, PersonAnalysisResponse, PersonEvent, PersonDetailResponse, PersonAnalysisQuery, PersonAnalysis, PersonAnalysisResponse, PersonEvent, PersonDetailResponse, PersonAnalysisQuery, ClusterEditOperation, ClusterEditRequest, UndoRequest, EventClusterInfo, ClusterEditResponse, Subscription, SubscriptionCreateRequest, SubscriptionUpdateRequest, SubscriptionListResponse
import json

class EventService:
    def __init__(self):
        """初始化服务，加载数据"""
        self.detail_df = None
        self.cluster_df = None
        self.info_df = None  # 新增报警人信息数据
        self.people_df = None  # 新增人口信息数据
        self.phone_master_df = None  # 新增人员分析数据
        self.raw_conflict_df = None  # 原始事件数据
        self.operations_df = None  # Cluster操作记录数据
        self.load_data()
    
    def reload_operations_data(self):
        """重新加载操作记录数据"""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            operations_path = os.path.join(parent_dir, 'data', 'cluster_operations.json')
            
            if os.path.exists(operations_path):
                with open(operations_path, 'r', encoding='utf-8') as f:
                    operations_list = json.load(f)
                    self.operations_df = pd.DataFrame(operations_list)
                    if not self.operations_df.empty:
                        self.operations_df = self.operations_df.fillna('')
                print(f"重新加载操作记录: {len(self.operations_df)} 条")
            else:
                self.operations_df = pd.DataFrame()
        except Exception as e:
            print(f"重新加载操作记录失败: {e}")
            self.operations_df = pd.DataFrame()
    
    def load_data(self):
        """加载CSV数据文件"""
        try:
            # 获取数据文件路径 - 修复中文路径问题
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            data_dir = os.path.join(parent_dir, 'data')
            
            # 确保data目录存在
            if not os.path.exists(data_dir):
                raise FileNotFoundError(f"数据目录不存在: {data_dir}")
            
            detail_path = os.path.join(data_dir, 'conflict_event_detail.csv')
            cluster_path = os.path.join(data_dir, 'conflict_event.csv')
            info_path = os.path.join(data_dir, 'info_merge.csv')
            people_path = os.path.join(data_dir, 'people_info.csv')
            phone_master_path = os.path.join(data_dir, 'phone_master_index.csv')
            raw_conflict_path = os.path.join(data_dir, 'raw_conflict.csv')
            operations_path = os.path.join(data_dir, 'cluster_operations.json')
            
            # 打印路径信息用于调试
            print(f"数据目录: {data_dir}")
            print(f"详情文件: {detail_path} (存在: {os.path.exists(detail_path)})")
            print(f"聚类文件: {cluster_path} (存在: {os.path.exists(cluster_path)})")
            print(f"原始冲突文件: {raw_conflict_path} (存在: {os.path.exists(raw_conflict_path)})")
            
            # 加载事件详情数据
            try:
                print(f"正在加载事件详情数据: {detail_path}")
                self.detail_df = pd.read_csv(detail_path)
                print(f"✅ 事件详情数据加载成功: {len(self.detail_df)} 行")
            except Exception as e:
                print(f"❌ 事件详情数据加载失败: {e}")
                self.detail_df = pd.DataFrame()
            
            # 加载聚类事件数据  
            try:
                print(f"正在加载聚类事件数据: {cluster_path}")
                self.cluster_df = pd.read_csv(cluster_path)
                print(f"✅ 聚类事件数据加载成功: {len(self.cluster_df)} 行")
            except Exception as e:
                print(f"❌ 聚类事件数据加载失败: {e}")
                self.cluster_df = pd.DataFrame()
            
            # 加载报警人信息数据
            try:
                print(f"正在加载报警人信息数据: {info_path}")
                self.info_df = pd.read_csv(info_path)
                print(f"✅ 报警人信息数据加载成功: {len(self.info_df)} 行")
            except Exception as e:
                print(f"❌ 报警人信息数据加载失败: {e}")
                self.info_df = pd.DataFrame()
            
            # 加载人口信息数据
            try:
                print(f"正在加载人口信息数据: {people_path}")
                self.people_df = pd.read_csv(people_path)
                print(f"✅ 人口信息数据加载成功: {len(self.people_df)} 行")
            except Exception as e:
                print(f"❌ 人口信息数据加载失败: {e}")
                self.people_df = pd.DataFrame()
            
            # 加载人员分析数据
            try:
                print(f"正在加载人员分析数据: {phone_master_path}")
                self.phone_master_df = pd.read_csv(phone_master_path)
                print(f"✅ 人员分析数据加载成功: {len(self.phone_master_df)} 行")
            except Exception as e:
                print(f"❌ 人员分析数据加载失败: {e}")
                self.phone_master_df = pd.DataFrame()
            
            # 数据清洗和预处理
            try:
                print("正在进行数据预处理...")
                self._preprocess_data()
                print("✅ 数据预处理完成")
            except Exception as e:
                print(f"❌ 数据预处理失败: {e}")
                import traceback
                traceback.print_exc()
            
            # 加载原始事件数据
            try:
                if os.path.exists(raw_conflict_path):
                    print(f"正在加载原始事件数据: {raw_conflict_path}")
                    self.raw_conflict_df = pd.read_csv(raw_conflict_path)
                    print(f"✅ 原始事件数据加载成功: {len(self.raw_conflict_df)} 行")
                else:
                    print(f"❌ 原始事件数据文件不存在: {raw_conflict_path}")
                    self.raw_conflict_df = pd.DataFrame()
            except Exception as e:
                print(f"❌ 原始事件数据加载失败: {e}")
                self.raw_conflict_df = pd.DataFrame()
            
            # 加载Cluster操作记录数据
            try:
                if os.path.exists(operations_path):
                    print(f"正在加载操作记录数据: {operations_path}")
                    with open(operations_path, 'r', encoding='utf-8') as f:
                        operations_list = json.load(f)
                        self.operations_df = pd.DataFrame(operations_list)
                    print(f"✅ 操作记录数据加载成功: {len(self.operations_df)} 行")
                else:
                    print(f"操作记录文件不存在，创建空DataFrame: {operations_path}")
                    self.operations_df = pd.DataFrame()
            except Exception as e:
                print(f"❌ 操作记录数据加载失败: {e}")
                self.operations_df = pd.DataFrame()
                
            print(f"数据加载成功: 事件详情 {len(self.detail_df)} 条, 聚类事件 {len(self.cluster_df)} 条, 报警人信息 {len(self.info_df)} 条, 人口信息 {len(self.people_df)} 条, 人员分析 {len(self.phone_master_df)} 条, 原始事件 {len(self.raw_conflict_df)} 条, 操作记录 {len(self.operations_df)} 条")
            
        except Exception as e:
            print(f"数据加载失败: {e}")
            # 创建空的DataFrame作为fallback
            self.detail_df = pd.DataFrame()
            self.cluster_df = pd.DataFrame()
            self.info_df = pd.DataFrame()
            self.people_df = pd.DataFrame()
            self.phone_master_df = pd.DataFrame()
            self.raw_conflict_df = pd.DataFrame()
            self.operations_df = pd.DataFrame()
    
    def _preprocess_data(self):
        """预处理数据"""
        if self.detail_df is not None and not self.detail_df.empty:
            # 处理缺失值
            self.detail_df = self.detail_df.fillna('')
            
            # 确保数字字段的正确类型
            if 'sequence_total' in self.detail_df.columns:
                self.detail_df['sequence_total'] = pd.to_numeric(
                    self.detail_df['sequence_total'], errors='coerce'
                ).fillna(1).astype(int)
        
        if self.cluster_df is not None and not self.cluster_df.empty:
            self.cluster_df = self.cluster_df.fillna('')
        
        if self.info_df is not None and not self.info_df.empty:
            self.info_df = self.info_df.fillna('')
        
        if self.people_df is not None and not self.people_df.empty:
            self.people_df = self.people_df.fillna('')
        
        if self.phone_master_df is not None and not self.phone_master_df.empty:
            self.phone_master_df = self.phone_master_df.fillna('')
            # 确保event_count是数字类型
            if 'event_count' in self.phone_master_df.columns:
                self.phone_master_df['event_count'] = pd.to_numeric(
                    self.phone_master_df['event_count'], errors='coerce'
                ).fillna(0).astype(int)
        
        if self.operations_df is not None and not self.operations_df.empty:
            self.operations_df = self.operations_df.fillna('')
    
    def _get_caller_info(self, event_id: str) -> Optional[str]:
        """获取事件的报警人信息"""
        if self.info_df is None or self.info_df.empty:
            return None
        
        # 查找对应事件的信息
        info_row = self.info_df[self.info_df['event_id'].astype(str) == event_id]
        
        if info_row.empty:
            return None
        
        try:
            extracted_info_str = info_row.iloc[0]['extracted_info']
            if not extracted_info_str or pd.isna(extracted_info_str):
                return None
            
            # 解析JSON
            info_list = json.loads(extracted_info_str)
            
            # 提取报警人信息
            callers = []
            for person in info_list:
                if person.get('role') == '报警人':
                    caller_info = []
                    name = person.get('name')
                    phone = person.get('phone')
                    id_card = person.get('id')
                    
                    if name:
                        caller_info.append(f"姓名: {name}")
                    if phone:
                        caller_info.append(f"电话: {phone}")
                    if id_card:
                        caller_info.append(f"身份证: {id_card}")
                    
                    if caller_info:
                        callers.append(" | ".join(caller_info))
            
            # 如果有多个报警人，用分号分隔
            return "; ".join(callers) if callers else None
            
        except (json.JSONDecodeError, KeyError, Exception) as e:
            print(f"解析报警人信息失败: {event_id}, 错误: {e}")
            return None
    
    def _get_involved_parties_info(self, event_id: str) -> Optional[str]:
        """获取事件的当事人信息（除报警人外的所有人）"""
        if self.info_df.empty:
            return None
        
        # 查找对应事件的信息
        info_row = self.info_df[self.info_df['event_id'].astype(str) == event_id]
        
        if info_row.empty:
            return None
        
        try:
            extracted_info_str = info_row.iloc[0]['extracted_info']
            if not extracted_info_str or pd.isna(extracted_info_str):
                return None
            
            # 解析JSON
            info_list = json.loads(extracted_info_str)
            
            # 提取当事人信息（除报警人外的所有人）
            parties = []
            for person in info_list:
                if person.get('role') != '报警人':  # 除报警人外的所有人
                    party_info = []
                    role = person.get('role', '当事人')
                    name = person.get('name')
                    phone = person.get('phone')
                    id_card = person.get('id')
                    
                    if role and role != '报警人':
                        party_info.append(f"角色: {role}")
                    if name:
                        party_info.append(f"姓名: {name}")
                    if phone:
                        party_info.append(f"电话: {phone}")
                    if id_card:
                        party_info.append(f"身份证: {id_card}")
                    
                    if party_info:
                        parties.append(" | ".join(party_info))
            
            # 如果有多个当事人，用分号分隔
            return "; ".join(parties) if parties else None
            
        except (json.JSONDecodeError, KeyError, Exception) as e:
            print(f"解析当事人信息失败: {event_id}, 错误: {e}")
            return None
    
    def get_events(self, page: int = 1, page_size: int = 20, search: Optional[str] = None,
                   town: Optional[str] = None, level: Optional[str] = None,
                   category: Optional[str] = None, related_events: Optional[str] = None,
                   start_time: Optional[str] = None, end_time: Optional[str] = None) -> PaginatedResponse:
        """获取事件列表（分页）- 基于raw_conflict.csv数据"""
        
        if self.raw_conflict_df.empty:
            return PaginatedResponse(
                items=[], total=0, page=page, page_size=page_size, total_pages=0
            )
        
        df = self.raw_conflict_df.copy()
        
        # 为每个事件获取报警人信息（从info_merge.csv）
        df['报警人信息'] = df['事件编号'].apply(
            lambda x: self._get_caller_info(str(x)) or ''
        )
        
        # 应用搜索过滤
        if search:
            # 转义正则表达式特殊字符，避免搜索包含*等字符时出错
            search_escaped = re.escape(search)
            
            search_condition = (
                df['事件编号'].astype(str).str.contains(search_escaped, case=False, na=False) |
                df['事件描述'].astype(str).str.contains(search_escaped, case=False, na=False) |
                df['处置结果'].astype(str).str.contains(search_escaped, case=False, na=False) |
                df['报警人信息'].astype(str).str.contains(search_escaped, case=False, na=False)
            )
            df = df[search_condition]
        
        # 应用筛选条件
        if town:
            df = df[df['镇街名称'].astype(str).str.contains(town, case=False, na=False)]
        
        if level:
            df = df[df['事件级别'].astype(str).str.contains(level, case=False, na=False)]
        
        if category:
            df = df[df['二级分类'].astype(str).str.contains(category, case=False, na=False)]
        
        # 应用时间筛选
        if start_time or end_time:
            # 解析时间字符串并过滤数据
            try:
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    # 将上报时间转换为datetime类型
                    df['上报时间_parsed'] = pd.to_datetime(df['上报时间'], errors='coerce')
                
                if start_time:
                    try:
                        start_dt = pd.to_datetime(start_time)
                        df = df[df['上报时间_parsed'] >= start_dt]
                    except Exception as e:
                        print(f"解析开始时间失败: {start_time}, 错误: {e}")
                
                if end_time:
                    try:
                        end_dt = pd.to_datetime(end_time)
                        df = df[df['上报时间_parsed'] <= end_dt]
                    except Exception as e:
                        print(f"解析结束时间失败: {end_time}, 错误: {e}")
                        
            except Exception as e:
                print(f"时间筛选失败: {e}")
        
        # 应用相关事件数量筛选 - 需要从cluster_df获取sequence_total信息
        if related_events:
            # 为原始事件添加聚类信息
            if not self.cluster_df.empty:
                # 创建事件编号到sequence_total的映射
                cluster_mapping = {}
                for _, cluster_row in self.cluster_df.iterrows():
                    event_uid = str(cluster_row.get('EventUID', ''))
                    sequence_total = cluster_row.get('sequence_total', 1)
                    
                    # 从detail_df中找到属于此聚类的事件编号
                    if not self.detail_df.empty:
                        cluster_events = self.detail_df[
                            self.detail_df['EventUID'].astype(str) == event_uid
                        ]
                        for _, detail_row in cluster_events.iterrows():
                            event_id = str(detail_row.get('事件编号', ''))
                            cluster_mapping[event_id] = sequence_total
                
                # 为df添加sequence_total列
                df['sequence_total'] = df['事件编号'].map(cluster_mapping).fillna(1)
                
                # 应用筛选
                if related_events == "0":  # 无关联事件
                    df = df[df['sequence_total'] <= 1]
                elif related_events == "1":  # 1个关联事件
                    df = df[df['sequence_total'] == 2]
                elif related_events == "2-5":  # 2-5个关联事件
                    df = df[(df['sequence_total'] >= 3) & (df['sequence_total'] <= 6)]
                elif related_events == "5+":  # 5个以上关联事件
                    df = df[df['sequence_total'] > 6]
        
        # 按上报时间倒序排列
        try:
            # 尝试多种时间格式解析
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                # 如果还没有parsed列，则创建
                if '上报时间_parsed' not in df.columns:
                    df['上报时间_parsed'] = pd.to_datetime(df['上报时间'], errors='coerce')
            df = df.sort_values('上报时间_parsed', ascending=False, na_position='last')
            # 删除临时列
            if '上报时间_parsed' in df.columns:
                df = df.drop(columns=['上报时间_parsed'])
        except Exception as e:
            print(f"排序失败: {e}")
            # 如果时间解析失败，按原始字符串倒序排列
            df = df.sort_values('上报时间', ascending=False, na_position='last')
        
        # 计算分页
        total = len(df)
        total_pages = (total + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        # 获取当前页数据
        page_df = df.iloc[start_idx:end_idx]
        
        # 转换为响应模型
        items = []
        for _, row in page_df.iterrows():
            event_id = str(row.get('事件编号', ''))
            caller_info = str(row.get('报警人信息', ''))  # 使用已经获取的报警人信息
            
            # 从detail_df获取EventUID和其他扩展信息
            event_uid = None
            caller_phone = None
            caller_id = None
            related_events_count = 0
            
            if not self.detail_df.empty:
                detail_row = self.detail_df[self.detail_df['事件编号'] == event_id]
                if not detail_row.empty:
                    first_detail = detail_row.iloc[0]
                    event_uid = str(first_detail.get('EventUID', '')) if first_detail.get('EventUID') else None
                    caller_phone = str(first_detail.get('CallerPhone', '')) if first_detail.get('CallerPhone') else None
                    caller_id = str(first_detail.get('CallerID', '')) if first_detail.get('CallerID') else None
                    
                    # 计算相关事件数：sequence_total - 1
                    sequence_total = first_detail.get('sequence_total', 1)
                    if pd.notna(sequence_total) and sequence_total > 1:
                        related_events_count = int(sequence_total) - 1
            
            event = EventResponse(
                事件编号=event_id,
                事件描述=str(row.get('事件描述', '')),
                镇街名称=str(row.get('镇街名称', '')),
                事件级别=str(row.get('事件级别', '')),
                二级分类=str(row.get('二级分类', '')),
                上报时间=str(row.get('上报时间', '')),
                CallerPhone=caller_phone,
                CallerID=caller_id,
                EventUID=event_uid,
                sequence_total=int(row.get('sequence_total', 1)) if pd.notna(row.get('sequence_total')) else 1,
                相关事件=related_events_count if related_events_count > 0 else None,
                报警人信息=caller_info if caller_info else None
            )
            items.append(event)
        
        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    def get_event_detail(self, event_id: str) -> Optional[EventDetailResponse]:
        """获取事件详情"""
        
        if self.detail_df.empty:
            return None
        
        # 查找事件
        event_row = self.detail_df[self.detail_df['事件编号'].astype(str) == event_id]
        
        if event_row.empty:
            return None
        
        row = event_row.iloc[0]
        
        # 计算相关事件数量
        related_events_count = 0  # 默认为0
        sequence_total = row.get('sequence_total')
        if pd.notna(sequence_total) and sequence_total > 1:
            related_events_count = int(sequence_total) - 1
        
        # 获取报警人信息和当事人信息
        caller_info = self._get_caller_info(event_id)
        involved_parties_info = self._get_involved_parties_info(event_id)
        
        return EventDetailResponse(
            事件编号=str(row.get('事件编号', '')),
            事件描述=str(row.get('事件描述', '')),
            镇街名称=str(row.get('镇街名称', '')),
            村社名称=str(row.get('村社名称', '')) if row.get('村社名称') else None,
            事件级别=str(row.get('事件级别', '')),
            二级分类=str(row.get('二级分类', '')),
            上报时间=str(row.get('上报时间', '')),
            办结时间=str(row.get('办结时间', '')) if row.get('办结时间') else None,
            处置结果=str(row.get('处置结果', '')) if row.get('处置结果') else None,
            EventUID=str(row.get('EventUID', '')) if row.get('EventUID') else None,
            sequence_total=int(sequence_total) if pd.notna(sequence_total) else None,
            related_events_count=related_events_count,
            报警人信息=caller_info,
            当事人信息=involved_parties_info
        )
    
    def get_cluster_detail(self, event_uid: str) -> Optional[ClusterEventResponse]:
        """获取聚类事件详情"""
        
        if self.cluster_df.empty or self.detail_df.empty:
            return None
        
        # 从聚类数据中获取基本信息
        cluster_row = self.cluster_df[self.cluster_df['EventUID'].astype(str) == event_uid]
        
        if cluster_row.empty:
            return None
        
        cluster_info = cluster_row.iloc[0]
        
        # 获取该聚类下的所有事件
        # EventUID在detail_df中直接就是cluster_xxxx格式
        cluster_events = self.detail_df[self.detail_df['EventUID'].astype(str) == event_uid]
        
        if cluster_events.empty:
            return None
        
        # 计算参与人数（该EventUID下所有事件的phone_set中的电话号码去重数量）
        participant_count = self._count_participants_from_events(cluster_events)
        
        # 计算持续时间
        duration_days = self._calculate_duration(cluster_events)
        
        # 构建时间线
        timeline = self._build_timeline(cluster_events)
        
        return ClusterEventResponse(
            EventUID=event_uid,
            Event_description=str(cluster_info.get('cluster_description', '')),
            participant_count=participant_count,
            duration_days=duration_days,
            timeline=timeline,
            first_report_time=str(cluster_info.get('first_report_time', '')),
            last_report_time=str(cluster_info.get('last_report_time', ''))
        )
    
    def _count_participants(self, phone_set: str) -> int:
        """计算参与人数（phone_set中的电话号码数量）"""
        if not phone_set or pd.isna(phone_set):
            return 0
        
        # 使用正则表达式匹配电话号码模式
        phone_pattern = r'\d{3}\*{4}\d{4}'
        phones = re.findall(phone_pattern, str(phone_set))
        return len(set(phones))  # 去重后计数
    
    def _count_participants_from_events(self, events_df: pd.DataFrame) -> int:
        """计算参与人数（该EventUID下所有事件的phone_set中电话号码的去重数量）"""
        all_phones = set()
        
        for _, row in events_df.iterrows():
            phone_set = row.get('phone_set', '')
            if phone_set and pd.notna(phone_set):
                # phone_set可能包含多个电话号码，用中文顿号"、"分隔
                phones = [phone.strip() for phone in str(phone_set).split('、') if phone.strip()]
                all_phones.update(phones)
        
        return len(all_phones)
    
    def _calculate_duration(self, events_df: pd.DataFrame) -> Optional[float]:
        """计算聚类事件持续时间（天）"""
        if events_df.empty:
            return None
        
        try:
            # 获取所有有效的上报时间
            report_times = []
            
            for _, row in events_df.iterrows():
                report_time = row.get('上报时间')
                
                if report_time and not pd.isna(report_time):
                    # 尝试多种时间格式解析
                    try:
                        # 先尝试标准格式
                        parsed_time = pd.to_datetime(report_time, errors='coerce')
                        if pd.notna(parsed_time):
                            report_times.append(parsed_time)
                    except:
                        continue
            
            # 过滤无效时间
            report_times = [t for t in report_times if pd.notna(t)]
            
            if len(report_times) < 1:
                return None
            
            # 如果只有一个事件，持续时间为1天
            if len(report_times) == 1:
                return 1.0
            
            # 计算最早和最晚上报时间
            earliest_report = min(report_times)
            latest_report = max(report_times)
            
            # 计算天数差
            duration = (latest_report - earliest_report).total_seconds() / (24 * 3600)
            
            # 不满1天的算1天
            if duration < 1:
                return 1.0
            else:
                return round(duration + 1, 2)  # 加1是因为当天也要算一天
            
        except Exception as e:
            print(f"计算持续时间出错: {e}")
            return None
    
    def _build_timeline(self, events_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """构建事件时间线"""
        timeline = []
        seen_events = set()  # 用于记录已处理的事件编号，避免重复
        
        for _, row in events_df.iterrows():
            event_id = str(row.get('事件编号', ''))
            
            # 跳过已经处理过的事件
            if event_id in seen_events:
                continue
            
            seen_events.add(event_id)
            
            # 获取报警人信息和当事人信息
            caller_info = self._get_caller_info(event_id)
            involved_parties_info = self._get_involved_parties_info(event_id)
            
            timeline_item = {
                '事件编号': event_id,
                '事件描述': str(row.get('事件描述', '')),
                '上报时间': str(row.get('上报时间', '')),
                '办结时间': str(row.get('办结时间', '')) if row.get('办结时间') else None,
                '处置结果': str(row.get('处置结果', '')) if row.get('处置结果') else None,
                '报警人信息': caller_info,
                '当事人信息': involved_parties_info
            }
            timeline.append(timeline_item)
        
        # 按上报时间排序
        try:
            timeline.sort(key=lambda x: pd.to_datetime(x['上报时间'], errors='coerce') if x['上报时间'] else pd.Timestamp.min)
        except:
            pass  # 如果排序失败，保持原顺序
        
        return timeline
    
    def get_filter_options(self) -> FilterOptions:
        """获取筛选选项"""
        
        if self.detail_df.empty:
            return FilterOptions(towns=[], levels=[], categories=[], related_event_options=[])
        
        # 获取去重的选项
        towns = sorted([str(x) for x in self.detail_df['镇街名称'].dropna().unique() if str(x).strip()])
        levels = sorted([str(x) for x in self.detail_df['事件级别'].dropna().unique() if str(x).strip()])
        categories = sorted([str(x) for x in self.detail_df['二级分类'].dropna().unique() if str(x).strip()])
        
        # 相关事件数量选项（固定选项）
        related_event_options = ["0", "1", "2-5", "5+"]
        
        return FilterOptions(
            towns=towns,
            levels=levels,
            categories=categories,
            related_event_options=related_event_options
        )
    
    def get_cluster_list(self, page: int = 1, page_size: int = 20, search: Optional[str] = None,
                        min_event_count: Optional[int] = None, max_event_count: Optional[int] = None,
                        min_duration: Optional[float] = None, max_duration: Optional[float] = None,
                        first_report_time_start: Optional[str] = None, first_report_time_end: Optional[str] = None,
                        last_report_time_start: Optional[str] = None, last_report_time_end: Optional[str] = None) -> ClusterListPaginatedResponse:
        """获取聚合事件列表（分页）"""
        
        if self.cluster_df.empty:
            return ClusterListPaginatedResponse(
                items=[], total=0, page=page, page_size=page_size, total_pages=0
            )
        
        df = self.cluster_df.copy()
        
        # 应用搜索过滤（对描述进行搜索）
        if search:
            search_condition = df['cluster_description'].astype(str).str.contains(search, case=False, na=False)
            df = df[search_condition]
        
        # 应用事件数量筛选
        if min_event_count is not None:
            df = df[df['record_count'] >= min_event_count]
        
        if max_event_count is not None:
            df = df[df['record_count'] <= max_event_count]
        
        # 应用持续时间筛选
        if min_duration is not None:
            df = df[df['duration_days'] >= min_duration]
        
        if max_duration is not None:
            df = df[df['duration_days'] <= max_duration]

        # 应用首次上报时间筛选
        if first_report_time_start or first_report_time_end:
            df['first_report_time_parsed'] = pd.to_datetime(df['first_report_time'], errors='coerce')
            if first_report_time_start:
                df = df[df['first_report_time_parsed'] >= pd.to_datetime(first_report_time_start)]
            if first_report_time_end:
                df = df[df['first_report_time_parsed'] <= pd.to_datetime(first_report_time_end)]

        # 应用最后上报时间筛选
        if last_report_time_start or last_report_time_end:
            df['last_report_time_parsed'] = pd.to_datetime(df['last_report_time'], errors='coerce')
            if last_report_time_start:
                df = df[df['last_report_time_parsed'] >= pd.to_datetime(last_report_time_start)]
            if last_report_time_end:
                df = df[df['last_report_time_parsed'] <= pd.to_datetime(last_report_time_end)]
        
        # 按record_count倒序排列，然后按duration_days倒序
        df = df.sort_values(['record_count', 'duration_days'], ascending=[False, False])
        
        # 计算分页
        total = len(df)
        total_pages = (total + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        # 获取当前页数据
        page_df = df.iloc[start_idx:end_idx]
        
        # 转换为响应模型
        items = []
        for _, row in page_df.iterrows():
            # 安全地处理数字字段
            record_count = row.get('record_count', 0)
            if pd.isna(record_count) or str(record_count).strip() == '':
                record_count = 0
            else:
                record_count = int(float(record_count))
                
            duration_days = row.get('duration_days', 0)
            if pd.isna(duration_days) or str(duration_days).strip() == '':
                duration_days = None
            else:
                duration_days = float(duration_days)
            
            cluster = ClusterListResponse(
                EventUID=str(row.get('EventUID', '')),
                cluster_description=str(row.get('cluster_description', '')),
                record_count=record_count,
                duration_days=duration_days,
                first_report_time=str(row.get('first_report_time', '')),
                last_report_time=str(row.get('last_report_time', ''))
            )
            items.append(cluster)
        
        return ClusterListPaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    def get_cluster_filter_options(self) -> ClusterFilterOptions:
        """获取聚合事件筛选选项"""
        
        if self.cluster_df.empty:
            return ClusterFilterOptions(
                event_count_ranges=[],
                duration_ranges=[]
            )
        
        # 使用所有记录
        df = self.cluster_df.copy()
        
        if df.empty:
            return ClusterFilterOptions(
                event_count_ranges=[],
                duration_ranges=[]
            )
        
        # 事件数量范围选项
        event_count_ranges = []
        max_count = df['record_count'].max()
        if max_count >= 2:
            event_count_ranges.append("2")
        if max_count >= 3:
            event_count_ranges.append("3-5")
        if max_count >= 6:
            event_count_ranges.append("6-10")
        if max_count > 10:
            event_count_ranges.append("10+")
        
        # 持续时间范围选项
        duration_ranges = []
        max_duration = df['duration_days'].max()
        if pd.notna(max_duration) and max_duration > 0:
            duration_ranges.append("0-1天")
            if max_duration > 1:
                duration_ranges.append("1-7天")
            if max_duration > 7:
                duration_ranges.append("7-30天")
            if max_duration > 30:
                duration_ranges.append("30天以上")
        
        return ClusterFilterOptions(
            event_count_ranges=event_count_ranges,
            duration_ranges=duration_ranges
        )
    
    def get_statistics_report(self) -> Dict[str, Any]:
        """获取统计报告数据"""
        try:
            # 1. 总事件数量 = raw_conflict.csv里事件编码的数量
            total_events = len(self.raw_conflict_df) if not self.raw_conflict_df.empty else 0
            
            # 2. 可定位事件的数量 = conflict_event_detail.csv中phone_flag=has_phone的数量
            located_events = len(self.detail_df[
                self.detail_df['phone_flag'] == 'has_phone'
            ]) if not self.detail_df.empty else 0
            
            # 3. 聚类集合数 = conflict_event.csv中sequence_total>1的事件簇的数量
            cluster_sets = len(self.cluster_df[
                self.cluster_df['sequence_total'] > 1
            ]) if not self.cluster_df.empty else 0
            
            # 4. 涉及人员 = phone_master_index.csv中count(phone)
            total_persons = len(self.phone_master_df) if not self.phone_master_df.empty else 0
            
            # 5. 事件覆盖率 = 可定位事件数量/总事件数量
            event_coverage_rate = (located_events / total_events * 100) if total_events > 0 else 0
            
            # 6. 聚类效率 = conflict_event.csv中sequence_total>1的事件簇中包含的事件数量/聚类集合数
            # 聚类效率 = 事件簇包含的事件的数量/事件簇的数量
            if cluster_sets > 0 and not self.cluster_df.empty:
                clustered_events_total = self.cluster_df[
                    self.cluster_df['sequence_total'] > 1
                ]['sequence_total'].sum()
                cluster_efficiency = clustered_events_total / cluster_sets
            else:
                cluster_efficiency = 0
                clustered_events_total = 0
            
            # 7. 双证齐全 = phone_master_index.csv中既有手机号码又有身份证号码的人的数量
            dual_credentials = 0
            if not self.phone_master_df.empty:
                dual_credentials = len(self.phone_master_df[
                    (self.phone_master_df['phone'].notna()) & 
                    (self.phone_master_df['phone'] != '') &
                    (self.phone_master_df['id_card'].notna()) & 
                    (self.phone_master_df['id_card'] != '')
                ])
            
            # 8. 仅有手机号码 = phone_master_index.csv中仅有手机号码的人数量
            phone_only = 0
            if not self.phone_master_df.empty:
                phone_only = len(self.phone_master_df[
                    (self.phone_master_df['phone'].notna()) & 
                    (self.phone_master_df['phone'] != '') &
                    ((self.phone_master_df['id_card'].isna()) | (self.phone_master_df['id_card'] == ''))
                ])
            
            return {
                "report_date": datetime.now().strftime("%Y年%m月%d日"),
                "core_stats": {
                    "total_events": int(total_events),
                    "located_events": int(located_events),
                    "cluster_sets": int(cluster_sets),
                    "clustered_events": int(clustered_events_total),
                    "total_persons": int(total_persons),
                    "dual_credentials": int(dual_credentials),
                    "phone_only": int(phone_only)
                },
                "rates": {
                    "event_coverage_rate": round(float(event_coverage_rate), 2),
                    "cluster_efficiency": round(float(cluster_efficiency), 1),
                    "dual_credentials_rate": round(float((dual_credentials / total_persons * 100) if total_persons > 0 else 0), 1),
                    "phone_only_rate": round(float((phone_only / total_persons * 100) if total_persons > 0 else 0), 1)
                }
            }
            
        except Exception as e:
            print(f"统计报告生成失败: {e}")
            return {
                "report_date": datetime.now().strftime("%Y年%m月%d日"),
                "core_stats": {
                    "total_events": 0,
                    "located_events": 0,
                    "cluster_sets": 0,
                    "clustered_events": 0,
                    "total_persons": 0,
                    "dual_credentials": 0,
                    "phone_only": 0
                },
                "rates": {
                    "event_coverage_rate": 0,
                    "cluster_efficiency": 0,
                    "dual_credentials_rate": 0,
                    "phone_only_rate": 0
                }
            }
    
    def _mask_id_card(self, id_card: str) -> str:
        """对身份证号码进行脱敏处理"""
        if not id_card or len(id_card) < 6:
            return id_card
        
        if len(id_card) == 18:
            # 18位身份证：保留前4位和后4位，中间10位用*替代
            return id_card[:4] + '*' * 10 + id_card[-4:]
        elif len(id_card) == 15:
            # 15位身份证：保留前3位和后3位，中间9位用*替代
            return id_card[:3] + '*' * 9 + id_card[-3:]
        else:
            # 其他长度：前三分之一和后三分之一保留，中间用*替代
            show_len = len(id_card) // 3
            return id_card[:show_len] + '*' * (len(id_card) - 2 * show_len) + id_card[-show_len:]
    
    def _mask_phone(self, phone: str) -> str:
        """对手机号码进行脱敏处理"""
        if not phone or len(phone) < 7:
            return phone
        
        if len(phone) == 11:
            # 11位手机号：保留前3位和后4位，中间4位用*替代
            return phone[:3] + '*' * 4 + phone[-4:]
        else:
            # 其他长度：保留前3位和后3位，中间用*替代
            return phone[:3] + '*' * (len(phone) - 6) + phone[-3:]
    
    def _match_masked_id_card(self, search_id: str, original_id: str) -> bool:
        """匹配脱敏身份证号码"""
        if not search_id or not original_id:
            return False
        
        # 如果查询的是脱敏格式，尝试匹配
        if '*' in search_id:
            # 按照前四后四的规则进行匹配
            parts = search_id.split('*')
            if len(parts) >= 2:
                prefix = parts[0]  # 前缀
                suffix = parts[-1] # 后缀
                
                # 确保前缀至少4位，后缀至少4位
                if len(prefix) >= 4 and len(suffix) >= 4:
                    return (original_id.startswith(prefix) and 
                           original_id.endswith(suffix) and
                           len(original_id) >= len(prefix) + len(suffix))
        
        # 如果查询的是完整号码，直接匹配
        return search_id == original_id
    
    def _match_masked_phone(self, search_phone: str, original_phone: str) -> bool:
        """匹配脱敏手机号码"""
        if not search_phone or not original_phone:
            return False
        
        # 如果查询的是脱敏格式，尝试匹配
        if '*' in search_phone:
            # 按照前三后四的规则进行匹配
            parts = search_phone.split('*')
            if len(parts) >= 2:
                prefix = parts[0]  # 前缀
                suffix = parts[-1] # 后缀
                
                # 确保前缀至少3位，后缀至少4位
                if len(prefix) >= 3 and len(suffix) >= 4:
                    return (original_phone.startswith(prefix) and 
                           original_phone.endswith(suffix) and
                           len(original_phone) >= len(prefix) + len(suffix))
        
        # 如果查询的是完整号码，直接匹配
        return search_phone == original_phone
    
    def search_people(self, query: PersonSearchQuery) -> PersonSearchResponse:
        """搜索人口信息"""
        if self.people_df.empty:
            return PersonSearchResponse(
                items=[], total=0, page=query.page, page_size=query.page_size, total_pages=0
            )
        
        df = self.people_df.copy()
        
        # 应用搜索条件
        if query.name:
            df = df[df['name_cn'].astype(str).str.contains(query.name, case=False, na=False)]
        
        if query.id_card:
            # 对身份证进行匹配（支持脱敏格式）
            mask = df.apply(lambda row: self._match_masked_id_card(query.id_card, str(row['id_card_no'])), axis=1)
            df = df[mask]
        
        if query.phone:
            # 对手机号进行匹配（支持脱敏格式）
            mask = df.apply(lambda row: self._match_masked_phone(query.phone, str(row['mobile_phone'])), axis=1)
            df = df[mask]
        
        # 计算分页
        total = len(df)
        total_pages = (total + query.page_size - 1) // query.page_size
        start_idx = (query.page - 1) * query.page_size
        end_idx = start_idx + query.page_size
        
        # 获取当前页数据
        page_df = df.iloc[start_idx:end_idx]
        
        # 转换为响应模型
        items = []
        for _, row in page_df.iterrows():
            person = PersonInfo(
                person_id=str(row.get('person_id', '')),
                name_cn=str(row.get('name_cn', '')),
                id_card_no=self._mask_id_card(str(row.get('id_card_no', ''))),
                mobile_phone=self._mask_phone(str(row.get('mobile_phone', ''))),
                gender=str(row.get('gender', '')) if row.get('gender') else None,
                birth_date=str(row.get('birth_date', '')) if row.get('birth_date') else None,
                nationality_code=str(row.get('nationality_code', '')) if row.get('nationality_code') else None,
                ethnicity_code=str(row.get('ethnicity_code', '')) if row.get('ethnicity_code') else None,
                hukou_province=str(row.get('hukou_province', '')) if row.get('hukou_province') else None,
                hukou_city=str(row.get('hukou_city', '')) if row.get('hukou_city') else None,
                hukou_county=str(row.get('hukou_county', '')) if row.get('hukou_county') else None,
                reside_province=str(row.get('reside_province', '')) if row.get('reside_province') else None,
                reside_city=str(row.get('reside_city', '')) if row.get('reside_city') else None,
                reside_county=str(row.get('reside_county', '')) if row.get('reside_county') else None,
                highest_education=str(row.get('highest_education', '')) if row.get('highest_education') else None,
                occupation_code=str(row.get('occupation_code', '')) if row.get('occupation_code') else None,
                employer_name=str(row.get('employer_name', '')) if row.get('employer_name') else None
            )
            items.append(person)
        
        return PersonSearchResponse(
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            total_pages=total_pages
        )
    
    def get_person_detail(self, person_id: str) -> Optional[PersonInfo]:
        """获取人员详细信息"""
        if self.people_df.empty:
            return None
        
        person_row = self.people_df[self.people_df['person_id'].astype(str) == person_id]
        
        if person_row.empty:
            return None
        
        row = person_row.iloc[0]
        
        # 返回详细信息（脱敏处理）
        return PersonInfo(
            person_id=str(row.get('person_id', '')),
            name_cn=str(row.get('name_cn', '')),
            id_card_no=self._mask_id_card(str(row.get('id_card_no', ''))),
            mobile_phone=self._mask_phone(str(row.get('mobile_phone', ''))),
            gender=str(row.get('gender', '')) if row.get('gender') else None,
            birth_date=str(row.get('birth_date', '')) if row.get('birth_date') else None,
            nationality_code=str(row.get('nationality_code', '')) if row.get('nationality_code') else None,
            ethnicity_code=str(row.get('ethnicity_code', '')) if row.get('ethnicity_code') else None,
            hukou_province=str(row.get('hukou_province', '')) if row.get('hukou_province') else None,
            hukou_city=str(row.get('hukou_city', '')) if row.get('hukou_city') else None,
            hukou_county=str(row.get('hukou_county', '')) if row.get('hukou_county') else None,
            reside_province=str(row.get('reside_province', '')) if row.get('reside_province') else None,
            reside_city=str(row.get('reside_city', '')) if row.get('reside_city') else None,
            reside_county=str(row.get('reside_county', '')) if row.get('reside_county') else None,
            highest_education=str(row.get('highest_education', '')) if row.get('highest_education') else None,
            occupation_code=str(row.get('occupation_code', '')) if row.get('occupation_code') else None,
            employer_name=str(row.get('employer_name', '')) if row.get('employer_name') else None
        )
    
    def get_person_analysis(self, query: PersonAnalysisQuery) -> PersonAnalysisResponse:
        """获取人员分析列表（分页）"""
        
        if self.phone_master_df.empty:
            return PersonAnalysisResponse(
                items=[], total=0, page=query.page, page_size=query.page_size, total_pages=0
            )
        
        df = self.phone_master_df.copy()
        
        # 应用搜索过滤
        if query.search:
            search_escaped = re.escape(query.search)
            search_condition = (
                df['name'].astype(str).str.contains(search_escaped, case=False, na=False) |
                df['phone'].astype(str).str.contains(search_escaped, case=False, na=False)
            )
            df = df[search_condition]
        
        # 应用角色筛选
        if query.role:
            df = df[df['primary_role'].astype(str).str.contains(query.role, case=False, na=False)]
        
        # 按event_count倒序排列
        df = df.sort_values('event_count', ascending=False)
        
        # 计算分页
        total = len(df)
        total_pages = (total + query.page_size - 1) // query.page_size
        start_idx = (query.page - 1) * query.page_size
        end_idx = start_idx + query.page_size
        
        # 获取当前页数据
        page_df = df.iloc[start_idx:end_idx]
        
        # 转换为响应模型
        items = []
        for _, row in page_df.iterrows():
            person = PersonAnalysis(
                phone=str(row.get('phone', '')),
                name=str(row.get('name', '')) if row.get('name') else None,
                id_card=str(row.get('id_card', '')) if row.get('id_card') else None,
                primary_role=str(row.get('primary_role', '')) if row.get('primary_role') else None,
                event_count=int(row.get('event_count', 0)),
                name_candidates=str(row.get('name_candidates', '')) if row.get('name_candidates') else None,
                id_candidates=str(row.get('id_candidates', '')) if row.get('id_candidates') else None
            )
            items.append(person)
        
        return PersonAnalysisResponse(
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            total_pages=total_pages
        )
    
    def get_person_analysis_detail(self, phone: str) -> Optional[PersonDetailResponse]:
        """获取人员分析详情"""
        
        if self.phone_master_df.empty:
            return None
        
        # 查找人员信息
        person_row = self.phone_master_df[self.phone_master_df['phone'].astype(str) == phone]
        
        if person_row.empty:
            return None
        
        row = person_row.iloc[0]
        
        # 获取相关事件列表
        related_events_str = str(row.get('related_events', ''))
        events = []
        
        if related_events_str and related_events_str != 'nan':
            try:
                # 解析事件ID列表（格式：['id1', 'id2', ...]）
                import ast
                event_ids = ast.literal_eval(related_events_str)
                
                # 获取每个事件的详细信息
                for event_id in event_ids:
                    event_detail = self.get_event_detail(str(event_id))
                    if event_detail:
                        # 在事件中查找这个人的角色
                        role = self._get_person_role_in_event(phone, str(event_id))
                        
                        event = PersonEvent(
                            事件编号=event_detail.事件编号,
                            事件描述=event_detail.事件描述,
                            上报时间=event_detail.上报时间,
                            办结时间=event_detail.办结时间,
                            处置结果=event_detail.处置结果,
                            role=role
                        )
                        events.append(event)
                        
            except Exception as e:
                print(f"解析相关事件失败: {e}")
        
        # 按时间排序事件
        events.sort(key=lambda x: pd.to_datetime(x.上报时间, errors='coerce') if x.上报时间 else pd.Timestamp.min)
        
        return PersonDetailResponse(
            phone=str(row.get('phone', '')),
            name=str(row.get('name', '')) if row.get('name') else None,
            id_card=str(row.get('id_card', '')) if row.get('id_card') else None,
            primary_role=str(row.get('primary_role', '')) if row.get('primary_role') else None,
            event_count=int(row.get('event_count', 0)),
            name_candidates=str(row.get('name_candidates', '')) if row.get('name_candidates') else None,
            id_candidates=str(row.get('id_candidates', '')) if row.get('id_candidates') else None,
            events=events
        )
    
    def _get_person_role_in_event(self, phone: str, event_id: str) -> Optional[str]:
        """获取人员在特定事件中的角色"""
        if self.info_df.empty:
            return None
        
        # 查找对应事件的信息
        info_row = self.info_df[self.info_df['event_id'].astype(str) == event_id]
        
        if info_row.empty:
            return None
        
        try:
            extracted_info_str = info_row.iloc[0]['extracted_info']
            if not extracted_info_str or pd.isna(extracted_info_str):
                return None
            
            # 解析JSON
            info_list = json.loads(extracted_info_str)
            
            # 查找匹配的手机号
            for person in info_list:
                person_phone = person.get('phone', '')
                if person_phone == phone:
                    return person.get('role', '未知')
                    
        except (json.JSONDecodeError, KeyError, Exception) as e:
            print(f"解析角色信息失败: {event_id}, 错误: {e}")
            return None
        
        return None
    
    def get_person_analysis_roles(self) -> List[str]:
        """获取人员分析中的所有角色选项"""
        if self.phone_master_df.empty:
            return []
        
        roles = self.phone_master_df['primary_role'].dropna().unique()
        return sorted([str(role) for role in roles if str(role).strip()])
    
    # ============ Cluster编辑功能 ============
    
    def get_cluster_operations(self, cluster_id: str) -> List[Dict[str, Any]]:
        """获取指定cluster的操作记录"""
        # 重新加载操作记录数据以确保最新
        self.reload_operations_data()
        
        if self.operations_df.empty:
            return []
        
        # 筛选与指定cluster相关的操作记录
        cluster_operations = self.operations_df[
            (self.operations_df['source_cluster'].astype(str) == cluster_id) |
            (self.operations_df['target_cluster'].astype(str) == cluster_id)
        ]
        
        # 按时间倒序排列
        cluster_operations = cluster_operations.sort_values('timestamp', ascending=False)
        
        operations = []
        for _, row in cluster_operations.iterrows():
            operation = {
                'id': str(row.get('operation_id', '')),
                'type': '删除' if row.get('operation_type') == 'delete' else '添加',
                'eventId': str(row.get('event_id', '')),
                'timestamp': pd.to_datetime(row.get('timestamp')).strftime('%Y-%m-%d %H:%M:%S') if pd.notna(row.get('timestamp')) else '',
                'description': str(row.get('description', ''))
            }
            operations.append(operation)
        
        return operations
    
    def _generate_cluster_id(self) -> str:
        """生成新的cluster ID"""
        # 获取现有的所有cluster ID
        existing_ids = set()
        if not self.cluster_df.empty:
            existing_ids.update(self.cluster_df['EventUID'].astype(str).tolist())
        
        # 生成唯一的cluster ID
        while True:
            new_id = f"cluster_{uuid.uuid4().hex[:8]}"
            if new_id not in existing_ids:
                return new_id
    
    def _save_operation_record(self, operation: ClusterEditOperation) -> None:
        """保存操作记录到JSON文件"""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            operations_path = os.path.join(parent_dir, 'data', 'cluster_operations.json')
            
            # 准备记录数据
            record = {
                'operation_id': operation.operation_id,
                'event_id': operation.event_id,
                'operation_type': operation.operation_type,
                'timestamp': operation.timestamp.isoformat(),
                'operator': operation.operator,
                'source_cluster': operation.source_cluster or '',
                'target_cluster': operation.target_cluster,
                'description': operation.description or ''
            }
            
            # 读取现有的操作记录
            operations_list = []
            if os.path.exists(operations_path):
                try:
                    with open(operations_path, 'r', encoding='utf-8') as f:
                        operations_list = json.load(f)
                except (json.JSONDecodeError, Exception) as e:
                    print(f"读取现有操作记录失败，将创建新文件: {e}")
                    operations_list = []
            
            # 添加新记录
            operations_list.append(record)
            
            # 保存到JSON文件
            with open(operations_path, 'w', encoding='utf-8') as f:
                json.dump(operations_list, f, ensure_ascii=False, indent=2)
            
            # 更新内存中的operations_df
            new_row = pd.DataFrame([record])
            if self.operations_df.empty:
                self.operations_df = new_row
            else:
                self.operations_df = pd.concat([self.operations_df, new_row], ignore_index=True)
                
        except Exception as e:
            print(f"保存操作记录失败: {e}")
            raise
    
    def get_event_cluster_info(self, event_id: str) -> EventClusterInfo:
        """获取事件所属的cluster信息"""
        if self.detail_df.empty:
            return EventClusterInfo(event_id=event_id)
        
        # 查找事件所属的cluster
        event_row = self.detail_df[self.detail_df['事件编号'].astype(str) == event_id]
        
        if event_row.empty:
            return EventClusterInfo(event_id=event_id)
        
        event_uid = str(event_row.iloc[0].get('EventUID', ''))
        
        if not event_uid or event_uid == 'nan':
            return EventClusterInfo(event_id=event_id)
        
        # 获取cluster描述
        cluster_description = None
        if not self.cluster_df.empty:
            cluster_row = self.cluster_df[self.cluster_df['EventUID'].astype(str) == event_uid]
            if not cluster_row.empty:
                cluster_description = str(cluster_row.iloc[0].get('Event_description', ''))
        
        return EventClusterInfo(
            event_id=event_id,
            cluster_id=event_uid,
            cluster_description=cluster_description,
            cluster_url=f"/clusters/{event_uid}"
        )
    
    def remove_event_from_cluster(self, request: ClusterEditRequest) -> ClusterEditResponse:
        """从cluster中删除事件，使其变成独立事件"""
        try:
            # 获取事件当前的cluster信息
            event_cluster_info = self.get_event_cluster_info(request.event_id)
            
            if not event_cluster_info.cluster_id:
                return ClusterEditResponse(
                    success=False,
                    message="事件不属于任何cluster，无法删除"
                )
            
            source_cluster = event_cluster_info.cluster_id
            
            # 获取事件详情
            event_detail = self.get_event_detail(request.event_id)
            if not event_detail:
                return ClusterEditResponse(
                    success=False,
                    message="找不到指定的事件"
                )
            
            # 将事件的EventUID设置为空字符串，表示不属于任何cluster
            mask = self.detail_df['事件编号'].astype(str) == request.event_id
            self.detail_df.loc[mask, 'EventUID'] = ''
            
            # 更新原cluster的sequence_total和record_count
            source_mask = self.cluster_df['EventUID'].astype(str) == source_cluster
            if source_mask.any():
                current_total = self.cluster_df.loc[source_mask, 'sequence_total'].iloc[0]
                new_total = max(0, current_total - 1)
                
                # 如果原cluster中没有事件了，删除cluster
                if new_total == 0:
                    self.cluster_df = self.cluster_df[~source_mask]
                else:
                    self.cluster_df.loc[source_mask, 'sequence_total'] = new_total
                    # 同时更新record_count
                    self.cluster_df.loc[source_mask, 'record_count'] = new_total
            
            # 保存更新后的数据
            self._save_dataframes()
            
            # 记录操作
            operation = ClusterEditOperation(
                operation_id=str(uuid.uuid4()),
                operation_type="delete",
                event_id=request.event_id,
                source_cluster=source_cluster,
                target_cluster="",  # 空字符串表示不属于任何cluster
                operator=request.operator,
                timestamp=datetime.now(),
                description=f"事件 {request.event_id} 从cluster {source_cluster} 中删除，现在为独立事件"
            )
            
            self._save_operation_record(operation)
            
            return ClusterEditResponse(
                success=True,
                message=f"事件已从cluster {source_cluster} 中删除，现在为独立事件",
                operation_id=operation.operation_id,
                new_cluster_id=""  # 空字符串表示不属于任何cluster
            )
            
        except Exception as e:
            return ClusterEditResponse(
                success=False,
                message=f"删除事件失败: {str(e)}"
            )
    
    def add_event_to_cluster(self, request: ClusterEditRequest) -> ClusterEditResponse:
        """将事件添加到指定cluster"""
        try:
            if not request.target_cluster:
                return ClusterEditResponse(
                    success=False,
                    message="必须指定目标cluster"
                )
            
            # 检查事件是否存在（先检查detail_df，如果不存在则从raw_conflict_df中添加）
            event_exists_in_detail = not self.detail_df.empty and not self.detail_df[self.detail_df['事件编号'].astype(str) == request.event_id].empty
            
            if not event_exists_in_detail:
                # 检查事件是否存在于raw_conflict_df中
                if self.raw_conflict_df.empty or self.raw_conflict_df[self.raw_conflict_df['事件编号'].astype(str) == request.event_id].empty:
                    return ClusterEditResponse(
                        success=False,
                        message=f"事件 {request.event_id} 不存在"
                    )
                
                # 从raw_conflict_df中获取事件信息，添加到detail_df
                raw_event = self.raw_conflict_df[self.raw_conflict_df['事件编号'].astype(str) == request.event_id].iloc[0]
                
                # 创建新的detail记录
                new_detail_row = {
                    'EventUID': request.target_cluster,
                    'phone_set': '',
                    'CallPhone_E': '',
                    'CallerPhone': '',
                    'CallerID': '',
                    'CounterpartyPhone': '',
                    'CounterpartyID': '',
                    'CallerFlag': '',
                    'phone_flag': 'no_phone',
                    'sequence_total': 1,
                    'sequence_position': 1,
                    '事件编号': request.event_id,
                    '事件描述': raw_event.get('事件描述', ''),
                    '区县名称': raw_event.get('区县名称', ''),
                    '镇街名称': raw_event.get('镇街名称', ''),
                    '村社名称': raw_event.get('村社名称', ''),
                    '网格名称': raw_event.get('网格名称', ''),
                    '事件级别': raw_event.get('事件级别', ''),
                    '事件类型': raw_event.get('事件类型', ''),
                    '二级分类': raw_event.get('二级分类', ''),
                    '四条跑道': raw_event.get('四条跑道', ''),
                    '标注类型': raw_event.get('标注类型', ''),
                    '事件状态': raw_event.get('事件状态', ''),
                    '事件详细状态': raw_event.get('事件详细状态', ''),
                    '上报时间': raw_event.get('上报时间', ''),
                    '最后派发时间': raw_event.get('最后派发时间', ''),
                    '最后受理时间': raw_event.get('最后受理时间', ''),
                    '办结时间': raw_event.get('办结时间', ''),
                    '处置结果': raw_event.get('处置结果', ''),
                    '办结职能科室/部门': raw_event.get('办结职能科室/部门', ''),
                    '上报人': raw_event.get('上报人', ''),
                    '网格类型': raw_event.get('网格类型', ''),
                    '数据来源': raw_event.get('数据来源', ''),
                    '所属组织': raw_event.get('所属组织', '')
                }
                
                # 添加到detail_df
                new_row_df = pd.DataFrame([new_detail_row])
                if self.detail_df.empty:
                    self.detail_df = new_row_df
                else:
                    self.detail_df = pd.concat([self.detail_df, new_row_df], ignore_index=True)
                
                source_cluster = None  # 新添加的事件没有源cluster
            else:
                # 获取事件当前的cluster信息
                event_cluster_info = self.get_event_cluster_info(request.event_id)
                source_cluster = event_cluster_info.cluster_id
                
                # 如果事件已经在目标cluster中
                if source_cluster == request.target_cluster:
                    return ClusterEditResponse(
                        success=False,
                        message="事件已经在目标cluster中"
                    )
                
                # 更新detail_df中的EventUID
                mask = self.detail_df['事件编号'].astype(str) == request.event_id
                self.detail_df.loc[mask, 'EventUID'] = request.target_cluster
            
            # 检查目标cluster是否存在
            target_mask = self.cluster_df['EventUID'].astype(str) == request.target_cluster
            if not target_mask.any():
                return ClusterEditResponse(
                    success=False,
                    message="目标cluster不存在"
                )
            
            # 更新目标cluster的sequence_total和record_count
            current_total = self.cluster_df.loc[target_mask, 'sequence_total'].iloc[0]
            new_total = current_total + 1
            self.cluster_df.loc[target_mask, 'sequence_total'] = new_total
            self.cluster_df.loc[target_mask, 'record_count'] = new_total
            
            # 如果事件原来属于其他cluster，需要更新原cluster的sequence_total
            if source_cluster and source_cluster != request.target_cluster:
                source_mask = self.cluster_df['EventUID'].astype(str) == source_cluster
                if source_mask.any():
                    source_total = self.cluster_df.loc[source_mask, 'sequence_total'].iloc[0]
                    new_source_total = max(1, source_total - 1)
                    self.cluster_df.loc[source_mask, 'sequence_total'] = new_source_total
                    self.cluster_df.loc[source_mask, 'record_count'] = new_source_total
                    
                    # 如果原cluster只剩0个事件，删除cluster
                    if new_source_total == 0:
                        self.cluster_df = self.cluster_df[~source_mask]
            
            # 保存更新后的数据
            self._save_dataframes()
            
            # 记录操作
            operation_type = "add"
            description = f"事件 {request.event_id} 添加到cluster {request.target_cluster}"
            if source_cluster:
                description += f"（从cluster {source_cluster} 移动）"
            else:
                description += "（原本不属于任何cluster）"
            
            operation = ClusterEditOperation(
                operation_id=str(uuid.uuid4()),
                operation_type=operation_type,
                event_id=request.event_id,
                source_cluster=source_cluster,
                target_cluster=request.target_cluster,
                operator=request.operator,
                timestamp=datetime.now(),
                description=description
            )
            
            self._save_operation_record(operation)
            
            return ClusterEditResponse(
                success=True,
                message=description,
                operation_id=operation.operation_id
            )
            
        except Exception as e:
            return ClusterEditResponse(
                success=False,
                message=f"添加事件失败: {str(e)}"
            )
    
    def undo_cluster_operation(self, request: UndoRequest) -> ClusterEditResponse:
        """撤销cluster操作"""
        try:
            if self.operations_df.empty:
                return ClusterEditResponse(
                    success=False,
                    message="没有找到操作记录"
                )
            
            # 查找操作记录
            operation_row = self.operations_df[
                self.operations_df['operation_id'].astype(str) == request.operation_id
            ]
            
            if operation_row.empty:
                return ClusterEditResponse(
                    success=False,
                    message="操作记录不存在"
                )
            
            operation = operation_row.iloc[0]
            operation_type = str(operation.get('operation_type', ''))
            event_id = str(operation.get('event_id', ''))
            source_cluster = str(operation.get('source_cluster', ''))
            target_cluster = str(operation.get('target_cluster', ''))
            
            # 执行反向操作
            if operation_type == "delete":
                # 撤销删除：将独立事件添加回原cluster
                if source_cluster and source_cluster != 'nan':
                    undo_request = ClusterEditRequest(
                        operation="add_event",
                        event_id=event_id,
                        operator=request.operator,
                        target_cluster=source_cluster
                    )
                    result = self.add_event_to_cluster(undo_request)
                    return result
                else:
                    return ClusterEditResponse(
                        success=False,
                        message="无法撤销：原cluster信息不完整"
                    )
                    
            elif operation_type == "add":
                # 撤销添加：将事件从target_cluster移除
                if source_cluster and source_cluster != 'nan':
                    # 移回原cluster
                    undo_request = ClusterEditRequest(
                        operation="add_event",
                        event_id=event_id,
                        operator=request.operator,
                        target_cluster=source_cluster
                    )
                    return self.add_event_to_cluster(undo_request)
                else:
                    # 创建新的独立cluster
                    undo_request = ClusterEditRequest(
                        operation="remove_event",
                        event_id=event_id,
                        operator=request.operator
                    )
                    return self.remove_event_from_cluster(undo_request)
            
            return ClusterEditResponse(
                success=False,
                message=f"不支持的操作类型: {operation_type}"
            )
            
        except Exception as e:
            return ClusterEditResponse(
                success=False,
                message=f"撤销操作失败: {str(e)}"
            )
    
    def _save_dataframes(self) -> None:
        """保存DataFrame到CSV文件"""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            
            # 保存detail_df
            detail_path = os.path.join(parent_dir, 'data', 'conflict_event_detail.csv')
            self.detail_df.to_csv(detail_path, index=False, encoding='utf-8')
            
            # 保存cluster_df
            cluster_path = os.path.join(parent_dir, 'data', 'conflict_event.csv')
            self.cluster_df.to_csv(cluster_path, index=False, encoding='utf-8')
            
        except Exception as e:
            print(f"保存数据文件失败: {e}")
            raise
    
    # ============ 订阅管理功能 ============
    
    def get_subscriptions_file_path(self) -> str:
        """获取订阅文件路径"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        return os.path.join(parent_dir, 'data', 'subscriptions.json')
    
    def load_subscriptions(self) -> List[Subscription]:
        """加载订阅列表"""
        try:
            subscriptions_path = self.get_subscriptions_file_path()
            if os.path.exists(subscriptions_path):
                with open(subscriptions_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return [Subscription(**sub) for sub in data]
            return []
        except Exception as e:
            print(f"加载订阅列表失败: {e}")
            return []
    
    def save_subscriptions(self, subscriptions: List[Subscription]) -> None:
        """保存订阅列表"""
        try:
            subscriptions_path = self.get_subscriptions_file_path()
            # 确保目录存在
            os.makedirs(os.path.dirname(subscriptions_path), exist_ok=True)
            
            # 转换为字典列表保存
            data = [sub.model_dump() for sub in subscriptions]
            with open(subscriptions_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存订阅列表失败: {e}")
            raise
    
    def get_all_subscriptions(self) -> SubscriptionListResponse:
        """获取所有订阅"""
        subscriptions = self.load_subscriptions()
        return SubscriptionListResponse(subscriptions=subscriptions)
    
    def create_subscription(self, request: SubscriptionCreateRequest) -> Subscription:
        """创建新订阅"""
        try:
            # 生成唯一ID
            subscription_id = str(int(datetime.now().timestamp() * 1000))
            
            # 创建订阅对象
            subscription = Subscription(
                id=subscription_id,
                name=request.name,
                description=request.description or "无描述",
                filters=request.filters,
                searchParams=request.searchParams,
                tags=request.tags,
                createTime=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                enabled=True
            )
            
            # 加载现有订阅
            subscriptions = self.load_subscriptions()
            
            # 添加新订阅
            subscriptions.append(subscription)
            
            # 保存
            self.save_subscriptions(subscriptions)
            
            return subscription
            
        except Exception as e:
            print(f"创建订阅失败: {e}")
            raise
    
    def update_subscription(self, subscription_id: str, request: SubscriptionUpdateRequest) -> Subscription:
        """更新订阅"""
        try:
            subscriptions = self.load_subscriptions()
            
            # 查找目标订阅
            target_subscription = None
            for sub in subscriptions:
                if sub.id == subscription_id:
                    target_subscription = sub
                    break
            
            if not target_subscription:
                raise ValueError(f"订阅不存在: {subscription_id}")
            
            # 更新字段
            if request.name is not None:
                target_subscription.name = request.name
            if request.description is not None:
                target_subscription.description = request.description
            if request.enabled is not None:
                target_subscription.enabled = request.enabled
            
            # 保存
            self.save_subscriptions(subscriptions)
            
            return target_subscription
            
        except Exception as e:
            print(f"更新订阅失败: {e}")
            raise
    
    def delete_subscription(self, subscription_id: str) -> bool:
        """删除订阅"""
        try:
            subscriptions = self.load_subscriptions()
            
            # 过滤掉要删除的订阅
            updated_subscriptions = [sub for sub in subscriptions if sub.id != subscription_id]
            
            if len(updated_subscriptions) == len(subscriptions):
                raise ValueError(f"订阅不存在: {subscription_id}")
            
            # 保存
            self.save_subscriptions(updated_subscriptions)
            
            return True
            
        except Exception as e:
            print(f"删除订阅失败: {e}")
            raise

# 创建全局服务实例
event_service = EventService() 