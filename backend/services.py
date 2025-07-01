import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any
import re
import os
from datetime import datetime
from models import EventResponse, EventDetailResponse, ClusterEventResponse, PaginatedResponse, FilterOptions, ClusterListResponse, ClusterListPaginatedResponse, ClusterFilterOptions
import json

class EventService:
    def __init__(self):
        """初始化服务，加载数据"""
        self.detail_df = None
        self.cluster_df = None
        self.info_df = None  # 新增报警人信息数据
        self.load_data()
    
    def load_data(self):
        """加载CSV数据文件"""
        try:
            # 获取数据文件路径
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            
            detail_path = os.path.join(parent_dir, 'data', 'conflict_event_detail.csv')
            cluster_path = os.path.join(parent_dir, 'data', 'conflict_event.csv')
            info_path = os.path.join(parent_dir, 'data', 'info_merge.csv')
            
            # 加载事件详情数据
            self.detail_df = pd.read_csv(detail_path)
            
            # 加载聚类事件数据  
            self.cluster_df = pd.read_csv(cluster_path)
            
            # 加载报警人信息数据
            self.info_df = pd.read_csv(info_path)
            
            # 数据清洗和预处理
            self._preprocess_data()
            
            print(f"数据加载成功: 事件详情 {len(self.detail_df)} 条, 聚类事件 {len(self.cluster_df)} 条, 报警人信息 {len(self.info_df)} 条")
            
        except Exception as e:
            print(f"数据加载失败: {e}")
            # 创建空的DataFrame作为fallback
            self.detail_df = pd.DataFrame()
            self.cluster_df = pd.DataFrame()
            self.info_df = pd.DataFrame()
    
    def _preprocess_data(self):
        """预处理数据"""
        if not self.detail_df.empty:
            # 处理缺失值
            self.detail_df = self.detail_df.fillna('')
            
            # 确保数字字段的正确类型
            if 'sequence_total' in self.detail_df.columns:
                self.detail_df['sequence_total'] = pd.to_numeric(
                    self.detail_df['sequence_total'], errors='coerce'
                ).fillna(1).astype(int)
        
        if not self.cluster_df.empty:
            self.cluster_df = self.cluster_df.fillna('')
        
        if not self.info_df.empty:
            self.info_df = self.info_df.fillna('')
    
    def _get_caller_info(self, event_id: str) -> Optional[str]:
        """获取事件的报警人信息"""
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
                   category: Optional[str] = None, related_events: Optional[str] = None) -> PaginatedResponse:
        """获取事件列表（分页）"""
        
        if self.detail_df.empty:
            return PaginatedResponse(
                items=[], total=0, page=page, page_size=page_size, total_pages=0
            )
        
        df = self.detail_df.copy()
        
        # 应用搜索过滤
        if search:
            # 为每个事件获取报警人信息用于搜索
            df_with_caller = df.copy()
            df_with_caller['报警人信息_搜索'] = df_with_caller['事件编号'].apply(
                lambda x: self._get_caller_info(str(x)) or ''
            )
            
            search_condition = (
                df_with_caller['事件编号'].astype(str).str.contains(search, case=False, na=False) |
                df_with_caller['事件描述'].astype(str).str.contains(search, case=False, na=False) |
                df_with_caller['处置结果'].astype(str).str.contains(search, case=False, na=False) |
                df_with_caller['CallerPhone'].astype(str).str.contains(search, case=False, na=False) |
                df_with_caller['CallerID'].astype(str).str.contains(search, case=False, na=False) |
                df_with_caller['报警人信息_搜索'].astype(str).str.contains(search, case=False, na=False)
            )
            df = df_with_caller[search_condition].drop(columns=['报警人信息_搜索'])
        
        # 应用筛选条件
        if town:
            df = df[df['镇街名称'].astype(str).str.contains(town, case=False, na=False)]
        
        if level:
            df = df[df['事件级别'].astype(str).str.contains(level, case=False, na=False)]
        
        if category:
            df = df[df['二级分类'].astype(str).str.contains(category, case=False, na=False)]
        
        # 应用相关事件数量筛选
        if related_events:
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
            df['上报时间_parsed'] = pd.to_datetime(df['上报时间'], errors='coerce')
            df = df.sort_values('上报时间_parsed', ascending=False, na_position='last')
            df = df.drop(columns=['上报时间_parsed'])  # 删除临时列
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
            caller_info = self._get_caller_info(event_id)
            
            event = EventResponse(
                事件编号=event_id,
                事件描述=str(row.get('事件描述', '')),
                镇街名称=str(row.get('镇街名称', '')),
                事件级别=str(row.get('事件级别', '')),
                二级分类=str(row.get('二级分类', '')),
                上报时间=str(row.get('上报时间', '')),
                CallerPhone=str(row.get('CallerPhone', '')) if row.get('CallerPhone') else None,
                CallerID=str(row.get('CallerID', '')) if row.get('CallerID') else None,
                EventUID=str(row.get('EventUID', '')) if row.get('EventUID') else None,
                sequence_total=int(row.get('sequence_total', 1)) if pd.notna(row.get('sequence_total')) else None,
                报警人信息=caller_info
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
        
        for _, row in events_df.iterrows():
            event_id = str(row.get('事件编号', ''))
            
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
                        min_duration: Optional[float] = None, max_duration: Optional[float] = None) -> ClusterListPaginatedResponse:
        """获取聚合事件列表（分页）"""
        
        if self.cluster_df.empty:
            return ClusterListPaginatedResponse(
                items=[], total=0, page=page, page_size=page_size, total_pages=0
            )
        
        df = self.cluster_df.copy()
        
        # 只显示record_count > 1的记录
        df = df[df['record_count'] > 1]
        
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
            cluster = ClusterListResponse(
                EventUID=str(row.get('EventUID', '')),
                cluster_description=str(row.get('cluster_description', '')),
                record_count=int(row.get('record_count', 0)),
                duration_days=float(row.get('duration_days', 0)) if pd.notna(row.get('duration_days')) else None,
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
        
        # 只考虑record_count > 1的记录
        df = self.cluster_df[self.cluster_df['record_count'] > 1]
        
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

# 创建全局服务实例
event_service = EventService() 