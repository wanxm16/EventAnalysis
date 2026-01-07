import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, Tag, message } from 'antd';

const { Option } = Select;

/**
 * 标签编辑弹窗组件
 *
 * @param {boolean} visible - 弹窗是否可见
 * @param {function} onCancel - 取消回调
 * @param {function} onSave - 保存回调，参数为选中的标签数组
 * @param {object} event - 当前编辑的事件对象，需包含 事件编号 和 事件描述
 * @param {array} initialTags - 初始已选中的标签名称数组
 * @param {array} availableTags - 可选标签分组列表，格式为 [{groupName, tags: [{name, type}]}]
 */
const TagEditModal = ({
  visible,
  onCancel,
  onSave,
  event,
  initialTags = [],
  availableTags = [],
}) => {
  const [selectedTags, setSelectedTags] = useState([]);
  const [aiRecommending, setAiRecommending] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);

  // 当弹窗打开或初始标签改变时，更新选中的标签
  useEffect(() => {
    if (visible) {
      setSelectedTags(initialTags);
      setAiRecommendations([]);
    }
  }, [visible, initialTags]);

  // 关闭弹窗
  const handleCancel = () => {
    setSelectedTags([]);
    setAiRecommendations([]);
    onCancel();
  };

  // 保存标签
  const handleSave = () => {
    onSave(selectedTags);
    setSelectedTags([]);
    setAiRecommendations([]);
  };

  // AI 推荐标签
  const handleAIRecommend = async () => {
    if (!event) return;

    setAiRecommending(true);
    setAiRecommendations([]);
    try {
      // 模拟 AI 推荐延迟（实际应调用后端API）
      await new Promise(resolve => setTimeout(resolve, 1000));

      const description = event.事件描述 || '';
      const recommendations = [];

      // 简单的关键词匹配推荐逻辑（带理由）
      const keywordRules = {
        '噪音|扰民|吵': [
          { tag: '噪音投诉', reason: '事件描述中提到噪音/扰民相关内容' },
          { tag: '夜间扰民', reason: '可能涉及夜间噪音问题，需关注时间段' },
          { tag: '重点关注', reason: '噪音扰民易引发邻里矛盾，建议重点跟进' },
        ],
        '停车|车位': [
          { tag: '停车纠纷', reason: '事件涉及停车或车位问题' },
          { tag: '待处理', reason: '停车问题需要现场调解处理' },
        ],
        '纠纷|矛盾|争执': [
          { tag: '邻里纠纷', reason: '事件描述中包含纠纷/矛盾关键词' },
          { tag: '需调解', reason: '存在矛盾冲突，建议安排调解' },
          { tag: '持续关注', reason: '纠纷类事件可能反复，需持续跟进' },
        ],
        '垃圾|卫生|清理': [
          { tag: '环境卫生', reason: '事件涉及垃圾或卫生问题' },
          { tag: '垃圾清理', reason: '需要安排清理工作' },
          { tag: '已派单', reason: '建议派单给环卫部门处理' },
        ],
        '消防|安全|隐患': [
          { tag: '消防安全', reason: '事件涉及消防或安全隐患' },
          { tag: '隐患排查', reason: '存在安全风险，需排查处理' },
          { tag: '紧急处理', reason: '安全隐患需要优先紧急处理' },
        ],
        '道路|维修|基础设施': [
          { tag: '基础设施', reason: '涉及道路或基础设施问题' },
          { tag: '道路维修', reason: '需要进行道路维护修缮' },
        ],
        '违章|违建': [
          { tag: '违章建筑', reason: '事件涉及违章或违建问题' },
          { tag: '待拆除', reason: '违建可能需要拆除处理' },
        ],
        '交通|堵塞': [
          { tag: '交通违章', reason: '事件涉及交通相关问题' },
          { tag: '重点区域', reason: '交通问题区域需重点关注' },
        ],
      };

      // 遍历关键词进行匹配
      for (const [pattern, recs] of Object.entries(keywordRules)) {
        if (new RegExp(pattern).test(description)) {
          recommendations.push(...recs);
          break;
        }
      }

      // 如果没有匹配到，推荐一些通用标签
      if (recommendations.length === 0) {
        recommendations.push(
          { tag: '待处理', reason: '新事件默认标记为待处理状态' },
          { tag: '重点关注', reason: '建议关注事件后续进展' }
        );
      }

      // 过滤掉已选中的标签
      const filteredRecommendations = recommendations.filter(
        rec => !selectedTags.includes(rec.tag)
      );

      setAiRecommendations(filteredRecommendations);

      if (filteredRecommendations.length > 0) {
        message.success(`AI 推荐了 ${filteredRecommendations.length} 个标签，请在下方查看`);
      } else {
        message.info('推荐的标签已全部添加');
      }
    } catch (error) {
      message.error('AI 推荐失败: ' + error.message);
    } finally {
      setAiRecommending(false);
    }
  };

  // 采用单个AI推荐的标签
  const handleAcceptRecommendation = (tagName) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
      setAiRecommendations(prev => prev.filter(rec => rec.tag !== tagName));
      message.success(`已添加标签：${tagName}`);
    }
  };

  // 采用全部AI推荐的标签
  const handleAcceptAllRecommendations = () => {
    const newTags = aiRecommendations.map(rec => rec.tag);
    const uniqueTags = Array.from(new Set([...selectedTags, ...newTags]));
    setSelectedTags(uniqueTags);
    setAiRecommendations([]);
    message.success(`已添加 ${newTags.length} 个标签`);
  };

  return (
    <Modal
      title="编辑标签"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSave}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <strong>事件编号：</strong>
        {event?.事件编号}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>事件描述：</strong>
        <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          {event?.事件描述}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>选择标签：</strong>
          <Button
            type="link"
            size="small"
            onClick={handleAIRecommend}
            loading={aiRecommending}
            style={{ padding: 0 }}
          >
            AI 推荐
          </Button>
        </div>
        <Select
          mode="multiple"
          style={{ width: '100%', marginTop: 8 }}
          placeholder="请选择标签"
          value={selectedTags}
          onChange={setSelectedTags}
          showSearch
          filterOption={(input, option) => {
            const label = option?.label || option?.children || '';
            return label.toLowerCase().includes(input.toLowerCase());
          }}
          listHeight={400}
          dropdownStyle={{ maxHeight: 400 }}
        >
          {availableTags.map(group => (
            <Select.OptGroup key={group.groupName} label={group.groupName}>
              {group.tags.map(tag => (
                <Option key={tag.name} value={tag.name} label={tag.name}>
                  <span>
                    {tag.type === 'ai' ? '🤖 ' : '👤 '}
                    {tag.name}
                  </span>
                </Option>
              ))}
            </Select.OptGroup>
          ))}
        </Select>
      </div>

      {/* AI推荐结果展示区域 */}
      {aiRecommendations.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ color: '#1890ff' }}>AI 推荐标签：</strong>
            <Button
              type="link"
              size="small"
              onClick={handleAcceptAllRecommendations}
            >
              全部采用
            </Button>
          </div>
          <div style={{
            padding: 12,
            backgroundColor: '#f0f5ff',
            borderRadius: 6,
            border: '1px solid #d6e4ff'
          }}>
            {aiRecommendations.map((rec, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '8px 0',
                  borderBottom: index < aiRecommendations.length - 1 ? '1px solid #e8e8e8' : 'none'
                }}
              >
                <div style={{ flex: 1 }}>
                  <Tag color="blue" style={{ marginRight: 8 }}>
                    {rec.tag}
                  </Tag>
                  <span style={{ color: '#666', fontSize: 12 }}>
                    {rec.reason}
                  </span>
                </div>
                <Button
                  type="primary"
                  size="small"
                  ghost
                  onClick={() => handleAcceptRecommendation(rec.tag)}
                >
                  采用
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TagEditModal;
