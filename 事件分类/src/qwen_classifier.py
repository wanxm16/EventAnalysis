#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
千问分类器模块
基于千问大模型实现事件分类功能
"""

import json
import time
import logging
import requests
import sys
import os
from typing import List, Dict, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import QWEN_CONFIG, CLASSIFICATION_CONFIG


class QwenClassifier:
    """千问分类器类"""
    
    def __init__(self):
        """初始化分类器"""
        self.api_key = QWEN_CONFIG['api_key']
        self.base_url = QWEN_CONFIG['base_url']
        self.model = QWEN_CONFIG['model']
        self.max_tokens = QWEN_CONFIG['max_tokens']
        self.temperature = QWEN_CONFIG['temperature']
        self.timeout = QWEN_CONFIG['timeout']
        self.max_retries = QWEN_CONFIG['max_retries']
        self.retry_delay = QWEN_CONFIG['retry_delay']
        
        # 设置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # 加载Few-shot示例
        self.few_shot_examples = self._load_few_shot_examples()
        self.available_categories = list(self.few_shot_examples.keys())
        
        # 加载事件类型到二级分类的映射
        self.event_type_mapping = self._load_event_type_mapping()
        
        # 加载分类别名映射
        self.category_aliases = self._load_category_aliases()
        
        # 并发控制
        self.progress_lock = Lock()  # 进度显示的线程锁
        self.processed_count = 0     # 已处理数量
        
        self.logger.info(f"千问分类器初始化完成，支持 {len(self.available_categories)} 个分类")
        self.logger.info(f"加载了 {len(self.event_type_mapping)} 种事件类型的映射关系")
        self.logger.info(f"加载了 {len(self.category_aliases)} 个分类别名映射")
    
    def _load_few_shot_examples(self) -> Dict:
        """加载Few-shot示例"""
        try:
            with open('data/few_shot_examples.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            self.logger.error("Few-shot示例文件未找到")
            return {}
        except json.JSONDecodeError as e:
            self.logger.error(f"Few-shot示例文件格式错误: {e}")
            return {}
    
    def _load_event_type_mapping(self) -> Dict:
        """加载事件类型到二级分类的映射关系"""
        try:
            with open('data/event_type_category_mapping.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            self.logger.warning("事件类型映射文件未找到，将不限制分类范围")
            return {}
        except json.JSONDecodeError as e:
            self.logger.error(f"事件类型映射文件格式错误: {e}")
            return {}
    
    def _load_category_aliases(self) -> Dict:
        """加载分类别名映射"""
        try:
            with open('data/category_aliases.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            self.logger.warning("分类别名文件未找到，将不使用别名映射")
            return {}
        except json.JSONDecodeError as e:
            self.logger.error(f"分类别名文件格式错误: {e}")
            return {}
    
    def _get_valid_categories_for_event_type(self, event_type: str) -> List[str]:
        """
        根据事件类型获取有效的二级分类列表
        
        Args:
            event_type: 事件类型
            
        Returns:
            该事件类型下允许的二级分类列表
        """
        if not event_type or not self.event_type_mapping:
            # 如果没有事件类型或没有映射关系，返回所有分类
            return self.available_categories
        
        # 获取该事件类型对应的二级分类
        valid_categories = self.event_type_mapping.get(event_type, [])
        
        if not valid_categories:
            self.logger.warning(f"未找到事件类型 '{event_type}' 的映射关系，使用所有分类")
            return self.available_categories
        
        return valid_categories
    
    def _build_prompt(self, event_description: str, event_type: str = "", 
                     district: str = "", street: str = "") -> str:
        """
        构建分类提示词
        
        Args:
            event_description: 事件描述
            event_type: 事件类型
            district: 区县名称
            street: 镇街名称
            
        Returns:
            构建好的提示词
        """
        # 根据事件类型限定可用分类
        valid_categories = self._get_valid_categories_for_event_type(event_type)
        
        # 基础提示词模板
        prompt = f"""你是一个专业的事件分类专家，需要根据事件描述将事件分类到正确的二级分类中。

当前事件类型：{event_type if event_type else '未指定'}

该事件类型下可选的二级分类包括：
"""
        
        # 添加该事件类型下的可用分类
        categories_list = "、".join(valid_categories)
        prompt += f"{categories_list}\n\n"
        
        # 添加Few-shot示例（使用动态选择策略）
        prompt += "以下是一些最相关的分类示例：\n\n"

        # 【优化4】根据候选分类数量动态调整Few-shot示例数量
        num_valid_categories = len(valid_categories)
        if num_valid_categories <= 10:
            few_shot_count = 3  # 候选少，减少示例避免过拟合
        elif num_valid_categories <= 30:
            few_shot_count = 5  # 中等候选数，使用标准数量
        elif num_valid_categories <= 60:
            few_shot_count = 7  # 候选较多，增加示例帮助区分
        else:
            few_shot_count = 8  # 候选很多，需要更多示例

        # 使用增强版动态示例选择
        selected_examples = self._select_relevant_examples_enhanced(
            event_description, event_type, valid_categories, top_k=few_shot_count
        )

        for i, (category, example) in enumerate(selected_examples):
            prompt += f"示例 {i+1}：\n"
            prompt += f"事件描述：{example['事件描述']}\n"
            prompt += f"事件类型：{example['事件类型']}\n"
            prompt += f"区县：{example['区县名称']}\n"
            prompt += f"镇街：{example['镇街名称']}\n"
            prompt += f"二级分类：{example['二级分类']}\n\n"
        
        # 【优化1.1】为高混淆分类对添加详细的对比学习说明
        confusion_pairs_added = False

        # 【优化5】核心混淆对1：街面秩序 vs 市容环境 (481错误，23.1%！最严重问题)
        if '街面秩序' in valid_categories and '市容环境' in valid_categories:
            if not confusion_pairs_added:
                prompt += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                prompt += "📌 【重要】易混淆分类辨析指南\n"
                prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                confusion_pairs_added = True

            prompt += "🔥🔥🔥 【绝对强制规则】街面秩序 vs 市容环境 (最高优先级！必须严格执行！)\n\n"

            prompt += "【第1步：强制关键词检查】\n"
            prompt += "⚠️ 如事件描述中包含以下任一关键词 → 100%选择「街面秩序」，禁止选市容环境：\n"
            prompt += "  🚫 占道、占用、摊贩、小贩、商贩、流动摊位\n"
            prompt += "  🚫 违停、乱停、停车、停放、车辆\n"
            prompt += "  🚫 堵塞、阻碍、影响通行、妨碍通行\n"
            prompt += "  🚫 跨门、出店、超出店面、店外经营\n"
            prompt += "  🚫 设摊、摆摊、摆放桌椅、占用公共空间\n\n"

            prompt += "【第2步：市容环境极严格限制】\n"
            prompt += "✅ 市容环境 - 必须同时满足以下3个条件（缺一不可）：\n"
            prompt += "  条件1：事件中**完全没有**第1步中的任何关键词\n"
            prompt += "  条件2：事件**仅涉及**环境卫生问题（垃圾、污物、清洁、卫生）\n"
            prompt += "  条件3：不涉及任何物体占用公共空间\n\n"

            prompt += "【街面秩序】- 优先选择（默认选项）\n"
            prompt += "  ✓ 强制选择条件（满足任一即选）：\n"
            prompt += "    • 涉及占道、摊贩、违停、堵塞、跨门等任一关键词\n"
            prompt += "    • 物体占用公共空间（即使同时提到垃圾/卫生）\n"
            prompt += "    • 影响通行或交通\n"
            prompt += "    • 商户经营行为（跨门、出店、占道经营等）\n"
            prompt += "  ✓ 典型案例：\n"
            prompt += "    ✅ \"流动摊贩占道经营，影响市容\" → 街面秩序（有\"占道\"必选）\n"
            prompt += "    ✅ \"车辆违规停放，周边垃圾多\" → 街面秩序（有\"停放\"必选）\n"
            prompt += "    ✅ \"商户跨门经营，地面脏乱\" → 街面秩序（有\"跨门\"必选）\n"
            prompt += "    ✅ \"小贩摆摊，地上有垃圾\" → 街面秩序（有\"摆摊\"必选）\n\n"

            prompt += "【市容环境】- 极严格限制（极少情况）\n"
            prompt += "  ✓ 仅适用场景（同时满足）：\n"
            prompt += "    • 纯粹的垃圾/卫生/清洁问题\n"
            prompt += "    • 无任何占道/违停/摊贩/堵塞等词\n"
            prompt += "    • 无物体占用空间\n"
            prompt += "  ✓ 典型案例：\n"
            prompt += "    ✅ \"路边垃圾未清理\" → 市容环境（纯卫生问题）\n"
            prompt += "    ✅ \"公园环境脏乱\" → 市容环境（纯卫生问题）\n"
            prompt += "    ✅ \"卫生死角需清理\" → 市容环境（纯卫生问题）\n"
            prompt += "  ✗ 严禁选择市容环境的情况：\n"
            prompt += "    ❌ \"摊贩占道，地面有垃圾\" → 街面秩序（有\"占道\"）\n"
            prompt += "    ❌ \"车辆乱停，影响市容\" → 街面秩序（有\"乱停\"）\n"
            prompt += "    ❌ \"商户出店经营，卫生差\" → 街面秩序（有\"出店\"）\n\n"

            prompt += "🚨 严重警告：\n"
            prompt += "  1. 如包含\"占道\"\"违停\"\"摊贩\"\"堵塞\"\"跨门\"任一词 → 禁止选市容环境\n"
            prompt += "  2. 如同时涉及占用空间和卫生 → 100%选择街面秩序\n"
            prompt += "  3. 不确定时 → 优先选择街面秩序\n"
            prompt += "  4. 市容环境的选择率不应超过20%\n\n"

        # 核心混淆对2：突发事件 vs 公用设施 (占7.8%错误)
        if '突发事件' in valid_categories and '公用设施' in valid_categories:
            if not confusion_pairs_added:
                prompt += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                prompt += "📌 【重要】易混淆分类辨析指南\n"
                prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                confusion_pairs_added = True

            prompt += "🔍 突发事件 vs 公用设施：\n\n"
            prompt += "【突发事件】- 关键判断：紧急、危险、立即处理、安全隐患\n"
            prompt += "  ✓ 核心特征：破损严重、安全隐患、紧急、危险、倾斜、坍塌\n"
            prompt += "  ✓ 典型词汇：严重破损、安全隐患、紧急处理、存在危险\n"
            prompt += "  ✓ 正面案例：\n"
            prompt += "    - \"XX路店铺外围严重破损，对行人造成严重安全隐患\" → 突发事件\n"
            prompt += "    - \"井盖缺失，存在安全隐患\" → 突发事件\n"
            prompt += "\n"
            prompt += "【公用设施】- 关键判断：日常维护、设施维修、功能性问题\n"
            prompt += "  ✓ 核心特征：路灯、井盖、道路、需维修、不亮、损坏（非严重）\n"
            prompt += "  ✓ 典型词汇：路灯不亮、设施损坏、需要维修、铺板破损\n"
            prompt += "  ✓ 正面案例：\n"
            prompt += "    - \"路灯不亮，需要维修\" → 公用设施\n"
            prompt += "    - \"下水道铺板破损需要维修\" → 公用设施\n"
            prompt += "\n"

        # 【优化7】核心混淆对3：经济纠纷决策树 (117错误：经济纠纷召回率仅3.09%)
        economic_dispute_categories = ['经济纠纷', '消费纠纷', '债务纠纷', '劳动人事（就业）纠纷']
        economic_in_valid = [cat for cat in economic_dispute_categories if cat in valid_categories]
        if len(economic_in_valid) >= 2:
            if not confusion_pairs_added:
                prompt += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                prompt += "📌 【重要】易混淆分类辨析指南\n"
                prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                confusion_pairs_added = True

            prompt += "🔥🔥 【绝对强制规则】经济类纠纷分类（最高优先级！必须严格执行！）\n\n"

            prompt += "【强制决策流程】严格按以下顺序逐级判断，匹配即停止，不可跳级！\n\n"

            if '消费纠纷' in valid_categories:
                prompt += "【第1优先级：消费纠纷】- 购买商品/服务的纠纷（强制优先）\n"
                prompt += "⚠️ 如事件描述中包含以下任一关键词 → 100%选择「消费纠纷」：\n"
                prompt += "  🛒 购买、买到、消费、采购、订购\n"
                prompt += "  🛒 商家、店铺、商户、卖家、商店\n"
                prompt += "  🛒 产品、商品、货物、物品\n"
                prompt += "  🛒 服务质量、商品质量、产品质量\n"
                prompt += "  🛒 退款、退货、退费、换货\n"
                prompt += "  🛒 网购、快递、外卖、网约车、电商\n"
                prompt += "  🛒 消费者、顾客（与商家/店铺组合）\n"
                prompt += "  ✓ 强制案例（100%选此）：\n"
                prompt += "    ✅ \"补胎把轮胎弄坏了\" → 消费纠纷（购买服务）\n"
                prompt += "    ✅ \"网约车收费不合理\" → 消费纠纷（购买服务）\n"
                prompt += "    ✅ \"办理手机套餐被骗\" → 消费纠纷（购买服务）\n"
                prompt += "    ✅ \"购买商品质量问题\" → 消费纠纷（购买商品）\n"
                prompt += "    ✅ \"商家服务态度差\" → 消费纠纷（商家服务）\n"
                prompt += "  ✗ 负例（禁止选消费纠纷）：\n"
                prompt += "    ❌ \"要求赔偿损失\"（无购买/商家） → 经济纠纷\n"
                prompt += "    ❌ \"邻居损坏财物\"（无购买行为） → 经济纠纷\n\n"

            if '劳动人事（就业）纠纷' in valid_categories:
                prompt += "【第2优先级：劳动人事（就业）纠纷】- 劳资、工作相关\n"
                prompt += "⚠️ 如事件描述中包含以下任一关键词 → 100%选择「劳动人事（就业）纠纷」（必须无消费关键词）：\n"
                prompt += "  💼 工资、薪水、薪资、薪酬、报酬\n"
                prompt += "  💼 拖欠工资、欠薪、欠工资\n"
                prompt += "  💼 加班、加班费、工作时间、超时工作\n"
                prompt += "  💼 劳资、用工、雇佣、雇工\n"
                prompt += "  💼 招聘、就业、求职、应聘\n"
                prompt += "  💼 劳动合同、劳务合同、用工合同\n"
                prompt += "  💼 社保、公积金、五险一金\n"
                prompt += "  💼 辞退、开除、解雇、裁员\n"
                prompt += "  ✓ 强制案例（100%选此）：\n"
                prompt += "    ✅ \"公司拖欠工资\" → 劳动人事纠纷\n"
                prompt += "    ✅ \"加班不给加班费\" → 劳动人事纠纷\n"
                prompt += "    ✅ \"招聘信息与实际不符\" → 劳动人事纠纷\n"
                prompt += "    ✅ \"单位未缴纳社保\" → 劳动人事纠纷\n"
                prompt += "  ⚠️ 如同时有消费关键词 → 选第1优先级消费纠纷\n\n"

            if '债务纠纷' in valid_categories:
                prompt += "【第3优先级：债务纠纷】- 借贷、欠款纠纷\n"
                prompt += "⚠️ 如事件描述中包含以下任一关键词 → 100%选择「债务纠纷」（必须无消费/劳动关键词）：\n"
                prompt += "  💰 欠钱、欠款、欠债\n"
                prompt += "  💰 债务、债权、债主\n"
                prompt += "  💰 借钱、借款、贷款\n"
                prompt += "  💰 还钱、还款、偿还\n"
                prompt += "  💰 催债、讨债、追债\n"
                prompt += "  💰 欠条、借条、借据\n"
                prompt += "  ✓ 强制案例（100%选此）：\n"
                prompt += "    ✅ \"朋友借钱不还\" → 债务纠纷\n"
                prompt += "    ✅ \"欠款问题需处理\" → 债务纠纷\n"
                prompt += "    ✅ \"催讨欠款无果\" → 债务纠纷\n"
                prompt += "  ⚠️ 如同时有消费/劳动关键词 → 选对应优先级更高的分类\n\n"

            if '经济纠纷' in valid_categories:
                prompt += "【第4优先级：经济纠纷】- 其他经济利益纠纷（兜底分类）\n"
                prompt += "⚠️ 适用条件（必须同时满足）：\n"
                prompt += "  条件1：事件涉及经济利益、赔偿、财物损失\n"
                prompt += "  条件2：**完全没有**上述3类的任何强制关键词\n"
                prompt += "  条件3：不属于消费、劳动、债务中的任何一类\n"
                prompt += "  ✓ 适用关键词（无上述3类关键词时）：\n"
                prompt += "    • 赔偿、索赔、赔款、经济损失\n"
                prompt += "    • 经济利益、利益冲突、财产纠纷\n"
                prompt += "    • 损坏财物、破坏财产\n"
                prompt += "  ✓ 强制案例（100%选此）：\n"
                prompt += "    ✅ \"邻居损坏财物要求赔偿\"（无购买/工资/借款） → 经济纠纷\n"
                prompt += "    ✅ \"施工损坏房屋索赔\"（无购买/工资/借款） → 经济纠纷\n"
                prompt += "    ✅ \"财产分割争议\"（无购买/工资/借款） → 经济纠纷\n"
                prompt += "  ✗ 负例（禁止选经济纠纷）：\n"
                prompt += "    ❌ \"商家赔偿商品损失\" → 消费纠纷（有\"商家\"）\n"
                prompt += "    ❌ \"公司赔偿工伤\" → 劳动人事纠纷（有\"公司\"+工伤）\n"
                prompt += "    ❌ \"欠钱不还要赔偿\" → 债务纠纷（有\"欠钱\"）\n\n"

            prompt += "🚨 严重警告（强制执行，绝不例外）：\n"
            prompt += "  1. 看到\"购买\"\"商家\"\"商品\"\"服务质量\" → 立即选消费纠纷\n"
            prompt += "  2. 看到\"工资\"\"加班\"\"劳动合同\" → 立即选劳动人事纠纷\n"
            prompt += "  3. 看到\"欠钱\"\"借款\"\"债务\" → 立即选债务纠纷\n"
            prompt += "  4. 只有以上关键词全无，且涉及赔偿/经济损失 → 才选经济纠纷\n"
            prompt += "  5. 严格按1→2→3→4优先级，不可跳级！匹配即停止！\n"
            prompt += "  6. 边界案例：\"赔偿\"无\"购买\" → 经济纠纷；\"赔偿\"+\"购买\" → 消费纠纷\n\n"

        # 核心混淆对4：消防相关分类
        if '其他消防安全隐患' in valid_categories and '出租房设施安全问题' in valid_categories:
            if not confusion_pairs_added:
                prompt += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                prompt += "📌 【重要】易混淆分类辨析指南\n"
                prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                confusion_pairs_added = True

            prompt += "🔍 消防安全分类区分：\n\n"
            prompt += "【出租房设施安全问题】- 明确提到出租房/出租公寓\n"
            prompt += "  ✓ 关键词：出租房、出租公寓、租房\n"
            prompt += "  ✓ 案例：\"对出租房进行消防检查\"\n\n"
            prompt += "【其他消防安全隐患】- 一般消防检查/隐患排查\n"
            prompt += "  ✓ 关键词：消防检查、消防隐患、消防设备、商铺检查\n"
            prompt += "  ✓ 案例：\"对店铺进行消防安全检查\"\n\n"

        # 【优化6】特殊规则：储存危险物品 (100错误：77→消防通道，23→其他消防隐患)
        dangerous_storage_categories = ['储存危险物品', '占用、堵塞、封闭消防通道、消防登高场地', '其他消防安全隐患']
        dangerous_in_valid = [cat for cat in dangerous_storage_categories if cat in valid_categories]
        if len(dangerous_in_valid) >= 2 and '储存危险物品' in valid_categories:
            if not confusion_pairs_added:
                prompt += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                prompt += "📌 【重要】易混淆分类辨析指南\n"
                prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                confusion_pairs_added = True

            prompt += "🔥🔥 【绝对强制触发】储存危险物品识别（最高优先级！必须严格执行！）\n\n"

            prompt += "【第1步：关键词自动触发检查】\n"
            prompt += "⚠️ 如事件描述中包含以下任一关键词 → 100%选择「储存危险物品」，禁止选其他消防分类：\n"
            prompt += "  🔥 气瓶、煤气罐、燃气瓶、液化气瓶、氧气瓶、乙炔瓶\n"
            prompt += "  🔥 煤气、燃气、液化气、氧气、乙炔\n"
            prompt += "  🔥 危险品、易燃品、易爆品、易燃易爆\n"
            prompt += "  🔥 化学品、化学物品、化工原料\n"
            prompt += "  🔥 汽油、柴油、酒精、油漆、稀释剂、溶剂\n"
            prompt += "  🔥 可燃物、易燃物、可燃液体、易燃液体\n"
            prompt += "  🔥 储存、存放、堆放、放置（与上述危险品词组合）\n\n"

            prompt += "【第2步：消防分类决策优先级】\n"
            prompt += "🚨 严格按以下优先级判断（从上到下）：\n\n"

            prompt += "【第1优先级：储存危险物品】- 强制优先（有危险品关键词立即选择）\n"
            prompt += "  ✓ 触发条件（满足任一立即选择）：\n"
            prompt += "    • 提到气瓶、煤气罐、燃气瓶、液化气等\n"
            prompt += "    • 提到危险品、易燃品、易爆品、化学品等\n"
            prompt += "    • 提到汽油、柴油、酒精、油漆等\n"
            prompt += "    • 储存/存放/堆放 + 上述任一危险品\n"
            prompt += "  ✓ 强制案例（100%选此）：\n"
            prompt += "    ✅ \"店铺内储存多个气瓶\" → 储存危险物品\n"
            prompt += "    ✅ \"楼道堆放煤气罐\" → 储存危险物品\n"
            prompt += "    ✅ \"存放易燃化学品\" → 储存危险物品\n"
            prompt += "    ✅ \"违规存放液化气瓶\" → 储存危险物品\n"
            prompt += "    ✅ \"仓库有油漆、稀释剂\" → 储存危险物品\n"
            prompt += "  ⚠️ 即使同时提到消防通道或其他消防问题，只要有危险品关键词 → 仍选储存危险物品\n\n"

            prompt += "【第2优先级：占用、堵塞、封闭消防通道、消防登高场地】\n"
            prompt += "  ✓ 适用条件（必须无危险品关键词）：\n"
            prompt += "    • 提到消防通道、疏散通道、安全出口、消防登高场地\n"
            prompt += "    • 提到占用、堵塞、封闭、阻挡通道\n"
            prompt += "  ⚠️ 如同时有危险品关键词 → 选第1优先级\n\n"

            prompt += "【第3优先级：其他消防安全隐患】\n"
            prompt += "  ✓ 适用条件（兜底分类）：\n"
            prompt += "    • 无危险品关键词\n"
            prompt += "    • 无消防通道堵塞\n"
            prompt += "    • 一般消防检查、消防器材、灭火器、烟感等\n\n"

            prompt += "🚨 严重警告：\n"
            prompt += "  1. 看到\"气瓶\"\"煤气罐\"\"液化气\"\"危险品\"\"易燃\"\"易爆\" → 立即选储存危险物品\n"
            prompt += "  2. 储存危险物品的识别优先级高于所有其他消防分类\n"
            prompt += "  3. 不确定时，如有任何危险品词汇 → 优先选储存危险物品\n\n"

        # 【优化2】核心混淆对5：综合拉练 vs 行业拉练 (168错误，7.29%)
        if '综合拉练' in valid_categories and '行业拉练' in valid_categories:
            if not confusion_pairs_added:
                prompt += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                prompt += "📌 【重要】易混淆分类辨析指南\n"
                prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                confusion_pairs_added = True

            prompt += "🚨 【严格限制】综合拉练 vs 行业拉练 (必读！)\n\n"

            prompt += "【判断规则】优先选择「综合拉练」，除非明确是行业专项检查\n\n"

            prompt += "【行业拉练】- ⚠️ 极严格限制！仅限明确的行业专项检查\n"
            prompt += "  ✓ 必备特征（需同时满足）：\n"
            prompt += "    1. 明确提到「行业」或具体行业名称（餐饮、建筑、化工等）\n"
            prompt += "    2. 专项检查/行业联合排查/行业整治\n"
            prompt += "    3. 涉及特定行业的监管部门（市场监管、住建、应急等）\n"
            prompt += "  ✓ 正例（极少！）：\n"
            prompt += "    ✅ \"开展餐饮行业专项检查\" → 行业拉练\n"
            prompt += "    ✅ \"住建、应急等部门联合开展建筑行业安全检查\" → 行业拉练\n"
            prompt += "  ✗ 负例（绝大多数情况）：\n"
            prompt += "    ❌ \"小候鸟走访\" → 综合拉练\n"
            prompt += "    ❌ \"电动车检查\" → 综合拉练\n"
            prompt += "    ❌ \"安全隐患排查\" → 综合拉练\n"
            prompt += "    ❌ \"消防检查\" → 综合拉练\n"
            prompt += "    ❌ \"综合巡查\" → 综合拉练\n\n"

            prompt += "【综合拉练】- 默认选项（几乎所有走访、检查、巡查）\n"
            prompt += "  ✓ 包括但不限于：\n"
            prompt += "    • 小候鸟走访（最典型）\n"
            prompt += "    • 各类安全检查（消防、电动车、出租房等）\n"
            prompt += "    • 常规巡查和排查\n"
            prompt += "    • 走访正常、对象正常\n"
            prompt += "  ✓ 关键原则：只要不是明确的行业专项检查，都选综合拉练\n\n"

            prompt += "⚠️ 严重警告：行业拉练的误判率极高！如不确定，请选择「综合拉练」\n\n"

        if confusion_pairs_added:
            prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        
        # 添加待分类的事件
        prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        prompt += "📋 待分类事件\n"
        prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        prompt += f"事件描述：{event_description}\n"
        if event_type:
            prompt += f"事件类型：{event_type}\n"
        if district:
            prompt += f"区县：{district}\n"
        if street:
            prompt += f"镇街：{street}\n"

        # 【优化6】添加推理过程要求和决策树
        prompt += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        prompt += "🎯 分类决策流程（请严格遵循）\n"
        prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

        prompt += "第一步：提取事件核心特征\n"
        prompt += "  • 事件的主要问题是什么？（如：占道、垃圾、充电、纠纷等）\n"
        prompt += "  • 涉及的关键对象？（如：电瓶车、流动摊贩、垃圾、设施等）\n"
        prompt += "  • 影响的主要方面？（如：通行、卫生、安全等）\n\n"

        prompt += "第二步：匹配分类判断依据\n"
        prompt += "  • 如果涉及【占道、摊贩、堵塞、违停、影响通行】 → 优先考虑「街面秩序」\n"
        prompt += "  • 如果涉及【垃圾、卫生、清洁、环境脏乱】 → 优先考虑「市容环境」\n"
        prompt += "  • 如果涉及【严重破损、紧急危险、安全隐患（严重）】 → 优先考虑「突发事件」\n"
        prompt += "  • 如果涉及【路灯、设施维修、日常维护】 → 优先考虑「公用设施」\n"
        prompt += "  • 如果涉及【出租房/出租公寓】 → 优先考虑「出租房设施安全问题」\n"
        prompt += "  • 如果涉及【小候鸟、走访正常】 → 优先考虑「综合拉练」\n"
        prompt += "  • 如果涉及【购买商品/服务纠纷】 → 优先考虑「消费纠纷」\n"
        prompt += "  • 如果涉及【工资、加班、劳资】 → 优先考虑「劳动人事（就业）纠纷」\n"
        prompt += "  • 如果涉及【欠钱、债务】 → 优先考虑「债务纠纷」\n\n"

        prompt += "第三步：参考上述示例进行最终判断\n"
        prompt += "  • 对比事件描述与示例的相似度\n"
        prompt += "  • 如有易混淆分类，重点查看【辨析指南】\n"
        prompt += "  • 确保分类来自候选列表，且完全一致\n\n"

        prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        prompt += "⚠️ 输出格式要求（严格执行）\n"
        prompt += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

        prompt += "输出要求：\n"
        prompt += "1. ✅ 必须以JSON格式输出，包含「分类」和「依据」两个字段\n"
        prompt += "2. ✅「分类」必须严格从候选分类列表中选择，完全一致、一字不差\n"
        prompt += "3. ✅「依据」需简明扼要说明分类理由（1-2句话，50字以内）\n"
        prompt += "4. ❌ 禁止输出多个分类或复合分类\n\n"

        prompt += "输出格式示例：\n"
        prompt += '{"分类": "街面秩序", "依据": "事件描述中提到占道经营和流动摊贩，影响了街面通行秩序"}\n\n'

        prompt += "自我检查清单：\n"
        prompt += "□ 分类是否在候选列表中？\n"
        prompt += "□ 是否使用JSON格式输出？\n"
        prompt += "□ 是否包含分类和依据两个字段？\n"
        prompt += "□ 依据是否简明扼要（50字以内）？\n\n"

        prompt += "现在请以JSON格式输出该事件的二级分类和依据："
        
        return prompt
    
    def _select_relevant_categories(self, event_description: str, event_type: str, 
                                   valid_categories: List[str]) -> List[str]:
        """
        选择与当前事件最相关的分类（限制在有效分类范围内）
        
        Args:
            event_description: 事件描述
            event_type: 事件类型
            valid_categories: 该事件类型下的有效分类列表
            
        Returns:
            相关分类列表
        """
        # 简单的关键词匹配策略
        relevant_categories = []
        
        # 根据事件类型优先选择（仅在有效分类范围内）
        if event_type:
            for category in valid_categories:
                examples = self.few_shot_examples.get(category, [])
                for example in examples:
                    if example.get('事件类型') == event_type:
                        if category not in relevant_categories:
                            relevant_categories.append(category)
                        break
        
        # 根据关键词匹配（仅在有效分类范围内）
        keywords_in_description = event_description.lower()
        for category in valid_categories:
            if category not in relevant_categories:
                # 检查分类名称是否在描述中
                if category.lower() in keywords_in_description:
                    relevant_categories.append(category)
        
        # 如果相关分类不足，从有效分类中随机选择一些
        if len(relevant_categories) < 3 and len(valid_categories) > 0:
            remaining = [c for c in valid_categories if c not in relevant_categories]
            import random
            random.shuffle(remaining)
            relevant_categories.extend(remaining[:max(3 - len(relevant_categories), 5)])
        
        return relevant_categories

    def _extract_keywords_simple(self, text: str) -> set:
        """
        简单关键词提取（不依赖外部分词库）

        Args:
            text: 输入文本

        Returns:
            关键词集合
        """
        import re

        # 提取2-5字的中文词组
        words = re.findall(r'[\u4e00-\u9fa5]{2,5}', text)

        # 高频停用词
        stopwords = {
            '反映', '希望', '处理', '居民', '群众', '现在', '已经', '表示',
            '发现', '情况', '问题', '事情', '社区', '工作', '进行', '需要',
            '说是', '要求', '通过', '可以', '没有', '这个', '那个', '什么',
            '怎么', '为了', '还是', '就是', '因为', '所以', '如果', '但是',
            '出现', '存在', '造成', '导致', '产生', '形成', '一个', '一些'
        }

        keywords = {w for w in words if w not in stopwords and len(w) >= 2}
        return keywords

    def _calculate_similarity(self, test_desc: str, test_keywords: set,
                             example_desc: str, example_keywords: set,
                             event_type: str, example_event_type: str) -> float:
        """
        计算综合相似度

        考虑因素：
        1. 关键词重叠度（权重0.5）
        2. 事件类型匹配（权重0.3）
        3. 描述长度相似度（权重0.1）
        4. 特殊词汇匹配（权重0.1）

        Args:
            test_desc: 测试事件描述
            test_keywords: 测试事件关键词
            example_desc: 示例事件描述
            example_keywords: 示例事件关键词
            event_type: 测试事件类型
            example_event_type: 示例事件类型

        Returns:
            综合相似度得分 [0, 1]
        """
        score = 0.0

        # 因素1：关键词重叠度（Jaccard系数）
        if test_keywords and example_keywords:
            intersection = len(test_keywords & example_keywords)
            union = len(test_keywords | example_keywords)
            keyword_sim = intersection / union if union > 0 else 0.0
            score += 0.5 * keyword_sim

        # 因素2：事件类型匹配
        if event_type and example_event_type:
            if event_type == example_event_type:
                score += 0.3

        # 因素3：长度相似度（避免过长或过短）
        len_ratio = min(len(test_desc), len(example_desc)) / max(len(test_desc), len(example_desc))
        score += 0.1 * len_ratio

        # 因素4：特殊词汇匹配（高权重词）
        special_words = ['纠纷', '违建', '占道', '充电', '垃圾', '噪音', '停车', '绿化',
                        '堵塞', '通道', '消防', '电瓶车', '电线', '安全', '隐患']
        test_special = {w for w in special_words if w in test_desc}
        example_special = {w for w in special_words if w in example_desc}
        if test_special and example_special:
            special_sim = len(test_special & example_special) / len(test_special | example_special)
            score += 0.1 * special_sim

        return score

    def _select_relevant_examples_enhanced(self, event_description: str, event_type: str,
                                          valid_categories: List[str], top_k: int = 5) -> List[Tuple[str, Dict]]:
        """
        增强版示例选择：为每个相关分类选择最相似的示例（动态选择）

        策略：
        1. 遍历所有有效分类
        2. 对每个分类，从5个示例中选择与测试事件最相似的1个
        3. 按相似度排序，返回top_k个(分类, 最佳示例)对

        Args:
            event_description: 测试事件描述
            event_type: 测试事件类型
            valid_categories: 有效分类列表
            top_k: 返回前k个最相关的示例

        Returns:
            [(category, best_example), ...] 最多top_k个
        """
        # 提取测试事件的关键词
        test_keywords = self._extract_keywords_simple(event_description)

        # 为每个有效分类计算最佳示例和相似度
        category_scores = []

        for category in valid_categories:
            examples = self.few_shot_examples.get(category, [])
            if not examples:
                continue

            # 计算该分类下每个示例与测试事件的相似度
            best_score = -1
            best_example = None

            for example in examples:  # 遍历该分类的所有5个示例
                example_desc = example.get('事件描述', '')
                example_keywords = self._extract_keywords_simple(example_desc)

                # 计算多维度相似度
                score = self._calculate_similarity(
                    test_desc=event_description,
                    test_keywords=test_keywords,
                    example_desc=example_desc,
                    example_keywords=example_keywords,
                    event_type=event_type,
                    example_event_type=example.get('事件类型', '')
                )

                if score > best_score:
                    best_score = score
                    best_example = example

            if best_example:
                category_scores.append((category, best_example, best_score))

        # 按相似度排序，返回top_k个
        category_scores.sort(key=lambda x: x[2], reverse=True)

        # 返回格式：[(category, example), ...]
        return [(cat, example) for cat, example, _ in category_scores[:top_k]]

    def _call_api(self, prompt: str) -> Optional[str]:
        """
        调用千问API
        
        Args:
            prompt: 提示词
            
        Returns:
            API响应结果，失败返回None
        """
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': self.model,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'max_tokens': self.max_tokens,
            'temperature': self.temperature
        }
        
        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if 'choices' in result and len(result['choices']) > 0:
                        content = result['choices'][0]['message']['content'].strip()
                        return content
                    else:
                        self.logger.error(f"API响应格式错误: {result}")
                        return None
                else:
                    self.logger.error(f"API请求失败，状态码: {response.status_code}, 响应: {response.text}")
                    
            except requests.exceptions.Timeout:
                self.logger.warning(f"API请求超时，尝试 {attempt + 1}/{self.max_retries}")
            except requests.exceptions.RequestException as e:
                self.logger.error(f"API请求异常: {e}")
            
            if attempt < self.max_retries - 1:
                time.sleep(self.retry_delay)
        
        return None
    
    def classify_single(self, event_data: Dict) -> Tuple[Optional[str], float, Optional[str]]:
        """
        对单个事件进行分类

        Args:
            event_data: 事件数据字典

        Returns:
            (预测分类, 置信度, 分类依据)
        """
        event_description = event_data.get('事件描述', '')
        event_type = event_data.get('事件类型', '')
        district = event_data.get('区县名称', '')
        street = event_data.get('镇街名称', '')

        if not event_description:
            self.logger.warning("事件描述为空")
            return None, 0.0, None

        # 构建提示词
        prompt = self._build_prompt(event_description, event_type, district, street)

        # 调用API
        result = self._call_api(prompt)

        if result is None:
            return None, 0.0, None

        # 解析JSON结果
        predicted_category = None
        reasoning = None

        try:
            # 尝试解析JSON
            import json
            result_json = json.loads(result.strip())
            predicted_category = result_json.get('分类', '').strip()
            reasoning = result_json.get('依据', '').strip()
        except json.JSONDecodeError:
            # 如果JSON解析失败，尝试回退到旧格式（纯文本）
            self.logger.warning(f"JSON解析失败，回退到纯文本模式: {result}")
            predicted_category = result.strip()
            reasoning = "（分类依据未提供）"

        if not predicted_category:
            return None, 0.0, None

        # 获取该事件类型下的有效分类
        valid_categories = self._get_valid_categories_for_event_type(event_type)

        # 验证预测结果是否在有效分类中
        if predicted_category in valid_categories:
            confidence = 0.9  # 如果分类正确，给予较高置信度
        else:
            # 尝试模糊匹配（仅在有效分类范围内）
            best_match = self._fuzzy_match(predicted_category, valid_categories)
            if best_match:
                predicted_category = best_match
                confidence = 0.7  # 模糊匹配的置信度较低
            else:
                self.logger.warning(f"预测分类 '{predicted_category}' 不在事件类型 '{event_type}' 的有效分类中")
                return None, 0.0, None

        return predicted_category, confidence, reasoning
    
    def _fuzzy_match(self, predicted_category: str, valid_categories: List[str]) -> Optional[str]:
        """
        增强的模糊匹配分类名称（限制在有效分类范围内）
        
        Args:
            predicted_category: 预测的分类名称
            valid_categories: 有效的分类列表
            
        Returns:
            匹配的分类名称，无匹配返回None
        """
        predicted_lower = predicted_category.lower()
        
        # Step 1: 别名映射（优先级最高）
        if predicted_category in self.category_aliases:
            alias_target = self.category_aliases[predicted_category]
            if alias_target in valid_categories:
                self.logger.debug(f"别名匹配成功: '{predicted_category}' → '{alias_target}'")
                return alias_target
        
        # Step 2: 完全匹配（忽略大小写）
        for category in valid_categories:
            if category.lower() == predicted_lower:
                return category
        
        # Step 3: 包含匹配
        for category in valid_categories:
            if predicted_lower in category.lower() or category.lower() in predicted_lower:
                self.logger.debug(f"包含匹配成功: '{predicted_category}' → '{category}'")
                return category
        
        # Step 4: 关键词匹配（检查主要关键词）
        # 提取预测分类的关键词
        pred_keywords = set(predicted_category.replace('、', ' ').replace('（', ' ').replace('）', ' ').split())
        
        best_match = None
        best_score = 0
        
        for category in valid_categories:
            cat_keywords = set(category.replace('、', ' ').replace('（', ' ').replace('）', ' ').split())
            
            # 计算关键词重叠数
            overlap = len(pred_keywords & cat_keywords)
            if overlap > 0:
                score = overlap / max(len(pred_keywords), len(cat_keywords))
                if score > best_score:
                    best_score = score
                    best_match = category
        
        if best_score >= 0.5:  # 至少50%的关键词匹配
            self.logger.debug(f"关键词匹配成功: '{predicted_category}' → '{best_match}' (相似度: {best_score:.2f})")
            return best_match
        
        # Step 5: 编辑距离匹配（对于相近的长分类名）
        try:
            from difflib import SequenceMatcher
            
            best_match = None
            best_ratio = 0
            
            for category in valid_categories:
                ratio = SequenceMatcher(None, predicted_lower, category.lower()).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_match = category
            
            if best_ratio >= 0.7:  # 至少70%相似度
                self.logger.debug(f"相似度匹配成功: '{predicted_category}' → '{best_match}' (相似度: {best_ratio:.2f})")
                return best_match
        except ImportError:
            pass
        
        return None
    
    def _classify_single_with_progress(self, event: Dict, event_idx: int, total: int) -> Tuple[Optional[str], float]:
        """
        对单个事件进行分类（带进度显示）
        
        Args:
            event: 事件数据
            event_idx: 事件索引
            total: 总数量
            
        Returns:
            (预测分类, 置信度)
        """
        result = self.classify_single(event)
        
        # 线程安全地更新进度
        with self.progress_lock:
            self.processed_count += 1
            if self.processed_count % 50 == 0 or self.processed_count == total:
                self.logger.info(f"进度: {self.processed_count}/{total} ({self.processed_count/total*100:.1f}%)")
        
        return result
    
    def classify_batch(self, events: List[Dict], batch_size: int = None, 
                      max_workers: int = None, use_concurrent: bool = True) -> List[Tuple[Optional[str], float]]:
        """
        批量分类事件（支持并发）
        
        Args:
            events: 事件列表
            batch_size: 批处理大小（并发模式下此参数无效）
            max_workers: 最大并发线程数，None表示自动（通常为CPU核心数×5）
            use_concurrent: 是否使用并发模式
            
        Returns:
            预测结果列表
        """
        total = len(events)
        self.logger.info(f"开始批量分类，共 {total} 个事件")
        
        if use_concurrent:
            # 并发模式
            return self._classify_batch_concurrent(events, max_workers)
        else:
            # 串行模式（原有逻辑）
            return self._classify_batch_sequential(events, batch_size)
    
    def _classify_batch_sequential(self, events: List[Dict], batch_size: int = None) -> List[Tuple[Optional[str], float]]:
        """
        串行批量分类（原有逻辑）
        
        Args:
            events: 事件列表
            batch_size: 批处理大小
            
        Returns:
            预测结果列表
        """
        if batch_size is None:
            batch_size = CLASSIFICATION_CONFIG['batch_size']
        
        results = []
        total = len(events)
        
        for i in range(0, total, batch_size):
            batch = events[i:i + batch_size]
            batch_results = []
            
            for j, event in enumerate(batch):
                result = self.classify_single(event)
                batch_results.append(result)
                
                # 显示进度
                current = i + j + 1
                if current % 100 == 0 or current == total:
                    self.logger.info(f"进度: {current}/{total} ({current/total*100:.1f}%)")
            
            results.extend(batch_results)
            
            # 批次间暂停，避免API限流
            if i + batch_size < total:
                time.sleep(0.5)
        
        self.logger.info("批量分类完成")
        return results
    
    def _classify_batch_concurrent(self, events: List[Dict], max_workers: int = None) -> List[Tuple[Optional[str], float]]:
        """
        并发批量分类
        
        Args:
            events: 事件列表
            max_workers: 最大并发线程数
            
        Returns:
            预测结果列表
        """
        total = len(events)
        
        # 自动确定最佳线程数（建议10-20个线程）
        if max_workers is None:
            max_workers = min(20, total)  # 最多20个并发线程
        
        self.logger.info(f"使用并发模式，线程数: {max_workers}")
        
        # 重置进度计数器
        self.processed_count = 0
        
        # 创建结果字典（保证顺序）
        results_dict = {}
        
        # 使用线程池并发处理
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有任务
            future_to_idx = {
                executor.submit(self._classify_single_with_progress, event, idx, total): idx
                for idx, event in enumerate(events)
            }
            
            # 收集结果
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    result = future.result()
                    results_dict[idx] = result
                except Exception as e:
                    self.logger.error(f"事件 {idx} 分类失败: {e}")
                    results_dict[idx] = (None, 0.0)
        
        # 按原始顺序返回结果
        results = [results_dict[i] for i in range(total)]
        
        self.logger.info("并发批量分类完成")
        return results
    
    def test_api_connection(self) -> bool:
        """
        测试API连接
        
        Returns:
            连接是否成功
        """
        test_prompt = "请回答：你好"
        result = self._call_api(test_prompt)
        
        if result:
            self.logger.info("API连接测试成功")
            return True
        else:
            self.logger.error("API连接测试失败")
            return False


def main():
    """测试函数"""
    # 创建分类器实例
    classifier = QwenClassifier()
    
    # 测试API连接
    if not classifier.test_api_connection():
        print("API连接失败，请检查配置")
        return
    
    # 测试单个分类
    test_event = {
        '事件描述': '居民反映小区业主房子涉嫌违建，希望社区处理',
        '事件类型': '矛盾纠纷',
        '区县名称': '海曙区',
        '镇街名称': '高桥镇'
    }
    
    result, confidence = classifier.classify_single(test_event)
    print(f"测试分类结果: {result}, 置信度: {confidence}")


if __name__ == '__main__':
    main()
