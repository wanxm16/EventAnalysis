import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Spin,
  message,
  Tag,
  Space,
  Alert,
  Typography,
  Modal,
  Select,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClusterOutlined,
  CalendarOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 标签编辑相关状态
  const [availableTags, setAvailableTags] = useState([]);
  const [tagEditModalVisible, setTagEditModalVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [aiRecommending, setAiRecommending] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]); // AI推荐结果

  // Mock标签数据 - 区分AI标签和人工标签
  const mockTags = [
    { name: '噪音投诉', type: 'ai' },
    { name: '夜间扰民', type: 'ai' },
    { name: '重点关注', type: 'human' },
    { name: '已处理', type: 'human' },
  ];

  // 获取事件详情
  const fetchEventDetail = async () => {
    try {
      setLoading(true);
      const detail = await eventAPI.getEventDetail(eventId);
      // 添加mock标签数据
      detail.tags = mockTags;
      setEvent(detail);
    } catch (error) {
      console.error('获取事件详情失败:', error);
      setError(error.message);
      message.error('获取事件详情失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventDetail();
      loadAvailableTags();
    }
  }, [eventId]);

  // 加载可用标签列表
  const loadAvailableTags = async () => {
    try {
      // Mock 分组标签数据
      const mockTagGroups = [
        {
          groupName: '事件分类',
          tags: [
            { name: '高频事件', type: 'ai' },
            { name: '噪音投诉', type: 'ai' },
            { name: '停车纠纷', type: 'ai' },
            { name: '邻里纠纷', type: 'ai' },
            { name: '消防安全', type: 'ai' },
            { name: '违章建筑', type: 'ai' },
            { name: '交通违章', type: 'ai' },
            { name: '公共秩序', type: 'ai' },
          ]
        },
        {
          groupName: '环境类',
          tags: [
            { name: '环境卫生', type: 'ai' },
            { name: '垃圾清理', type: 'ai' },
            { name: '夜间扰民', type: 'ai' },
            { name: '道路维修', type: 'ai' },
            { name: '基础设施', type: 'ai' },
          ]
        },
        {
          groupName: '处理状态',
          tags: [
            { name: '待处理', type: 'human' },
            { name: '处理中', type: 'human' },
            { name: '已处理', type: 'human' },
            { name: '已解决', type: 'human' },
            { name: '待跟进', type: 'human' },
            { name: '已派单', type: 'human' },
            { name: '整改中', type: 'human' },
          ]
        },
        {
          groupName: '优先级标签',
          tags: [
            { name: '紧急处理', type: 'human' },
            { name: '重点关注', type: 'human' },
            { name: '持续关注', type: 'human' },
            { name: '加强巡查', type: 'human' },
            { name: '重点区域', type: 'human' },
          ]
        },
        {
          groupName: '安全隐患',
          tags: [
            { name: '隐患排查', type: 'ai' },
            { name: '待拆除', type: 'human' },
            { name: '紧急整改', type: 'human' },
            { name: '需调解', type: 'human' },
          ]
        }
      ];

      setAvailableTags(mockTagGroups);
    } catch (error) {
      console.error('加载标签列表失败:', error);
    }
  };

  // 打开标签编辑弹窗
  const handleEditTags = () => {
    // 提取标签名称（支持字符串或对象格式）
    const tagNames = (event.tags || []).map(tag =>
      typeof tag === 'string' ? tag : tag.name
    );
    setSelectedTags(tagNames);
    setTagEditModalVisible(true);
  };

  // AI 推荐标签
  const handleAIRecommend = async () => {
    if (!event) return;

    setAiRecommending(true);
    setAiRecommendations([]); // 清空之前的推荐
    try {
      // 模拟 AI 推荐延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 根据事件描述推荐标签（Mock数据，实际应调用后端API）
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
          break; // 只匹配第一个关键词组
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

  // 采用AI推荐的标签
  const handleAcceptRecommendation = (tagName) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
      // 从推荐列表中移除已采用的标签
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

  // 保存标签编辑
  const handleSaveTagsEdit = async () => {
    if (!event) return;

    try {
      await eventAPI.updateEventTags(event.事件编号, selectedTags);
      message.success('标签更新成功');

      // 将新标签转换为对象格式（默认为人工标签）
      const newTagObjects = selectedTags.map(tagName => ({
        name: tagName,
        type: 'human' // 手动添加的标签默认为人工标签
      }));

      // 更新本地数据
      setEvent({ ...event, tags: newTagObjects });

      setTagEditModalVisible(false);
      setSelectedTags([]);
    } catch (error) {
      message.error('更新标签失败: ' + error.message);
    }
  };
  
  
  // 解析报警人信息
  const parseCallerInfo = (callerInfo) => {
    if (!callerInfo) return [];
    
    const callers = callerInfo.split(';').map(caller => caller.trim());
    return callers.map(caller => {
      const parts = caller.split('|').map(part => part.trim());
      const info = {};
      
      parts.forEach(part => {
        if (part.includes('姓名:')) {
          info.name = part.split('姓名:')[1].trim();
        } else if (part.includes('电话:')) {
          info.phone = part.split('电话:')[1].trim();
        } else if (part.includes('身份证:')) {
          info.idCard = part.split('身份证:')[1].trim();
        }
      });
      
      return info;
    });
  };
  
  // 解析当事人信息（包含角色信息）
  const parseInvolvedPartiesInfo = (partiesInfo) => {
    if (!partiesInfo) return [];
    
    const parties = partiesInfo.split(';').map(party => party.trim());
    return parties.map(party => {
      const parts = party.split('|').map(part => part.trim());
      const info = {};
      
      parts.forEach(part => {
        if (part.includes('角色:')) {
          info.role = part.split('角色:')[1].trim();
        } else if (part.includes('姓名:')) {
          info.name = part.split('姓名:')[1].trim();
        } else if (part.includes('电话:')) {
          info.phone = part.split('电话:')[1].trim();
        } else if (part.includes('身份证:')) {
          info.idCard = part.split('身份证:')[1].trim();
        }
      });
      
      return info;
    });
  };
  
  
  // 渲染报警人信息
  const renderCallerInfo = (callerInfo) => {
    if (!callerInfo) return '-';
    
    const callers = parseCallerInfo(callerInfo);
    
    return (
      <div>
        {callers.map((caller, index) => (
          <div key={index} style={{ marginBottom: index < callers.length - 1 ? 8 : 0 }}>
            <span style={{ lineHeight: '1.5' }}>
              {Object.entries(caller).map(([key, value]) => {
                const labels = { name: '姓名', phone: '电话', idCard: '身份证' };
                return `${labels[key]}: ${value}`;
              }).join(' | ')}
            </span>
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染当事人信息
  const renderInvolvedPartiesInfo = (partiesInfo) => {
    if (!partiesInfo) return '-';
    
    const parties = parseInvolvedPartiesInfo(partiesInfo);
    
    return (
      <div>
        {parties.map((party, index) => (
          <div key={index} style={{ marginBottom: index < parties.length - 1 ? 8 : 0 }}>
            <span style={{ lineHeight: '1.5' }}>
              {Object.entries(party).map(([key, value]) => {
                const labels = { role: '角色', name: '姓名', phone: '电话', idCard: '身份证' };
                return `${labels[key]}: ${value}`;
              }).join(' | ')}
            </span>
          </div>
        ))}
      </div>
    );
  };
  

  // 解析特殊时间格式 (如 "31/5/25 19:47")
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    
    try {
      // 先尝试标准解析
      let date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // 处理特殊格式 "dd/m/yy h:mm" 或 "d/m/yy h:mm"
      const match = timeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})$/);
      if (match) {
        const [, day, month, year, hour, minute] = match;
        // 假设年份是20xx年
        const fullYear = 2000 + parseInt(year);
        date = new Date(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    
    const date = parseTime(timeStr);
    if (!date) return timeStr;
    
    try {
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  // 获取事件级别颜色
  const getLevelColor = (level) => {
    if (level?.includes('一级')) return 'red';
    if (level?.includes('二级')) return 'orange';
    if (level?.includes('三级')) return 'blue';
    return 'default';
  };

  // 跳转到聚类事件详情
  const handleViewCluster = () => {
    if (event?.EventUID) {
      navigate(`/clusters/${event.EventUID}`);
    }
  };

  // 返回列表
  const handleBack = () => {
    navigate('/events');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载事件详情中...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-container">
        <Alert
          message="事件未找到"
          description={`未找到事件编号为 ${eventId} 的事件，请检查事件编号是否正确。`}
          type="warning"
          showIcon
          action={
            <Button onClick={handleBack}>
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* 页面头部 */}
      <div className="page-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回列表
          </Button>
          <h1 className="page-title">事件详情</h1>
        </Space>
      </div>

      {/* 相关事件提醒 */}
      {event.related_events_count > 0 && (
        <Alert
          message="聚类事件提醒"
          description={
            <Space>
              <span>
                该事件属于聚类事件，还有 {event.related_events_count} 个相关事件。
              </span>
              <Button
                type="link"
                icon={<ClusterOutlined />}
                onClick={handleViewCluster}
                style={{ padding: 0 }}
              >
                查看聚类事件详情
              </Button>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 事件基本信息 */}
      <Card
        title={
          <Space>
            <CalendarOutlined />
            基本信息
          </Space>
        }
        className="detail-card"
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="事件编号" span={2}>
            <strong>{event.事件编号}</strong>
          </Descriptions.Item>
          
          <Descriptions.Item label="事件描述" span={2}>
            {event.事件描述}
          </Descriptions.Item>
          
          <Descriptions.Item label="镇街名称">
            {event.镇街名称}
          </Descriptions.Item>
          
          <Descriptions.Item label="村社名称">
            {event.村社名称 || '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="事件级别">
            <Tag color={getLevelColor(event.事件级别)}>
              {event.事件级别}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="二级分类">
            <Tag>{event.二级分类}</Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="上报时间">
            {formatTime(event.上报时间)}
          </Descriptions.Item>
          
          <Descriptions.Item label="办结时间">
            {formatTime(event.办结时间)}
          </Descriptions.Item>
          
          <Descriptions.Item label="处置结果" span={2}>
            {event.处置结果 || '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="报警人信息" span={2}>
            {renderCallerInfo(event.报警人信息)}
          </Descriptions.Item>
          
          <Descriptions.Item label="当事人信息" span={2}>
            {renderInvolvedPartiesInfo(event.当事人信息)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 标签信息 */}
      <Card
        title={
          <Space>
            <TagsOutlined />
            标签信息
          </Space>
        }
        extra={
          <Button
            type="primary"
            size="small"
            onClick={handleEditTags}
          >
            {event.tags && event.tags.length > 0 ? '编辑' : '添加'}
          </Button>
        }
        className="detail-card"
      >
        {event.tags && event.tags.length > 0 ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ marginRight: 8 }}>AI识别标签：</Text>
              <Space size={[0, 8]} wrap>
                {event.tags.filter(tag => tag.type === 'ai').length > 0 ? (
                  event.tags
                    .filter(tag => tag.type === 'ai')
                    .map((tag, index) => (
                      <Tag
                        key={index}
                        color="blue"
                      >
                        🤖 {tag.name}
                      </Tag>
                    ))
                ) : (
                  <Text type="secondary">暂无AI标签</Text>
                )}
              </Space>
            </div>

            <div>
              <Text strong style={{ marginRight: 8 }}>人工标签：</Text>
              <Space size={[0, 8]} wrap>
                {event.tags.filter(tag => tag.type === 'human').length > 0 ? (
                  event.tags
                    .filter(tag => tag.type === 'human')
                    .map((tag, index) => (
                      <Tag
                        key={index}
                        color="green"
                      >
                        👤 {tag.name}
                      </Tag>
                    ))
                ) : (
                  <Text type="secondary">暂无人工标签</Text>
                )}
              </Space>
            </div>
          </>
        ) : (
          <Text type="secondary">暂无标签，点击右上角"添加"按钮添加标签</Text>
        )}
      </Card>

      {/* 聚类信息 */}
      {event.EventUID && event.related_events_count > 0 && (
        <Card
          title={
            <Space>
              <ClusterOutlined />
              聚类信息
            </Space>
          }
          className="detail-card"
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label="聚类事件ID">
              <Space>
                <code>{event.EventUID}</code>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleViewCluster}
                >
                  查看详情
                </Button>
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="聚类事件总数">
              {event.sequence_total} 个事件
            </Descriptions.Item>
            
            <Descriptions.Item label="相关事件数量">
              {event.related_events_count} 个相关事件
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 操作按钮 */}
      <Card>
        <Space>
          <Button onClick={handleBack}>
            返回列表
          </Button>
          {event.EventUID && event.related_events_count > 0 && (
            <Button
              type="primary"
              icon={<ClusterOutlined />}
              onClick={handleViewCluster}
            >
              查看聚类事件详情
            </Button>
          )}
        </Space>
      </Card>

      {/* 标签编辑弹窗 */}
      <Modal
        title="编辑标签"
        open={tagEditModalVisible}
        onCancel={() => {
          setTagEditModalVisible(false);
          setSelectedTags([]);
          setAiRecommendations([]);
        }}
        onOk={handleSaveTagsEdit}
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
              // 支持搜索标签名称
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
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {rec.reason}
                    </Text>
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

    </div>
  );
};

export default EventDetail; 