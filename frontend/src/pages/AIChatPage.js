import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, message, Tag, Typography, Spin } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

const { TextArea } = Input;
const { Title } = Typography;

const AIChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 欢迎消息
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      content: `👋 您好！我是海曙区事件分析助手，可以帮您查询和分析事件数据。

**我可以回答的问题类型：**
- 📊 **统计查询**：如"海曙区三级事件有多少条？"
- 🗓️ **时间分析**：如"6月份新增事件数量"  
- 🏘️ **地区对比**：如"各镇街事件数量排名"
- 🔍 **内容搜索**：如"包含退款纠纷的案例"
- ⏱️ **效率分析**：如"平均处理时长"

**常用查询示例：**
- 海曙区总共有多少条事件记录？
- 三级事件数量统计
- 镇街事件数量前5名
- 6月5日月湖街道的三级事件
- 包含噪音的事件案例

请输入您的问题，我会为您提供详细的分析结果！`,
      timestamp: new Date().toLocaleTimeString()
    }]);
  }, []);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 获取查询类型对应的颜色
  const getQueryTypeColor = (queryType) => {
    const colorMap = {
      'SQL查询': 'blue',
      '语义搜索': 'green', 
      '混合查询': 'purple',
      '错误': 'red'
    };
    return colorMap[queryType] || 'default';
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await api.post('/chat', {
        message: inputText,
        conversation_id: null
      });

      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.message,
        queryType: response.query_type,
        sql: response.data?.sql,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      let errorContent = '抱歉，发送失败。';
      
      if (error.response) {
        errorContent += `错误: ${error.response.status}`;
        if (error.response.data?.detail) {
          errorContent += ` - ${error.response.data.detail}`;
        }
      } else if (error.request) {
        errorContent += '请检查网络连接。';
      } else {
        errorContent += `请求错误: ${error.message}`;
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: errorContent,
        queryType: '错误',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
      message.error('发送失败，请查看错误信息');
    } finally {
      setLoading(false);
    }
  };

  // 处理快捷问题
  const handleQuickQuestion = (question) => {
    setInputText(question);
  };

  // 处理键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSendMessage();
    }
  };

  // 快捷问题列表
  const quickQuestions = [
    "海曙区总共有多少条事件记录？",
    "三级事件数量统计",
    "镇街事件数量前5名", 
    "6月5日月湖街道的三级事件",
    "包含噪音的事件案例"
  ];

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f5f5f5'
    }}>
      {/* 头部标题 */}
      <div style={{ 
        padding: '16px 24px', 
        background: '#fff', 
        borderBottom: '1px solid #e8e8e8',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          maxWidth: '900px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            🤖 事件问答助手
          </Title>
        </div>
      </div>

      {/* 聊天消息区域 */}
      <div style={{ 
        flex: 1, 
        padding: '16px 24px',
        paddingBottom: '70px', // 进一步减少底部空间，匹配更紧凑的输入框
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 140px)' // 进一步减少最大高度限制
      }}>
        <div style={{ 
          maxWidth: '900px', 
          margin: '0 auto' 
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '16px'
              }}
            >
              <Card
                style={{
                  maxWidth: '80%',
                  minWidth: '200px',
                  backgroundColor: msg.type === 'user' ? '#1890ff' : '#fff',
                  border: msg.type === 'user' ? 'none' : '1px solid #d9d9d9',
                  borderRadius: '12px'
                }}
                bodyStyle={{ 
                  padding: '12px 16px',
                  color: msg.type === 'user' ? '#fff' : '#000'
                }}
              >
                {/* 消息头部 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: msg.type === 'assistant' && msg.queryType ? '8px' : '0'
                }}>
                  <span style={{ 
                    fontSize: '12px', 
                    opacity: 0.7,
                    color: msg.type === 'user' ? '#fff' : '#666'
                  }}>
                    {msg.type === 'user' ? '您' : 'AI助手'} • {msg.timestamp}
                  </span>
                  {msg.queryType && (
                    <Tag color={getQueryTypeColor(msg.queryType)} size="small">
                      {msg.queryType}
                    </Tag>
                  )}
                </div>

                {/* 消息内容 */}
                <div style={{ 
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: msg.type === 'user' ? '#fff' : '#000'
                }}>
                  {msg.type === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        // 自定义样式
                        h1: ({children}) => <h1 style={{color: '#1890ff', marginTop: '16px', marginBottom: '8px'}}>{children}</h1>,
                        h2: ({children}) => <h2 style={{color: '#1890ff', marginTop: '12px', marginBottom: '6px'}}>{children}</h2>,
                        h3: ({children}) => <h3 style={{color: '#1890ff', marginTop: '8px', marginBottom: '4px'}}>{children}</h3>,
                        p: ({children}) => <p style={{margin: '8px 0'}}>{children}</p>,
                        strong: ({children}) => <strong style={{color: '#ff4d4f', fontWeight: 'bold'}}>{children}</strong>,
                        ul: ({children}) => <ul style={{margin: '8px 0', paddingLeft: '20px'}}>{children}</ul>,
                        li: ({children}) => <li style={{margin: '4px 0'}}>{children}</li>,
                        code: ({children}) => <code style={{
                          background: '#f0f0f0', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontFamily: 'Monaco, Consolas, monospace',
                          fontSize: '13px'
                        }}>{children}</code>,
                        pre: ({children}) => <pre style={{
                          background: '#f6f8fa',
                          padding: '12px',
                          borderRadius: '6px',
                          margin: '8px 0',
                          overflow: 'auto',
                          fontFamily: 'Monaco, Consolas, monospace',
                          fontSize: '13px'
                        }}>{children}</pre>
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>

                {/* SQL调试信息 */}
                {msg.sql && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px 12px',
                    background: '#f6f8fa',
                    borderRadius: '6px',
                    border: '1px solid #e1e4e8'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#586069',
                      marginBottom: '4px'
                    }}>
                      🔍 执行的SQL:
                    </div>
                    <code style={{ 
                      fontSize: '12px',
                      fontFamily: 'Monaco, Consolas, monospace',
                      color: '#24292e'
                    }}>
                      {msg.sql}
                    </code>
                  </div>
                )}
              </Card>
            </div>
          ))}

          {/* 加载指示器 */}
          {loading && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-start',
              marginBottom: '16px'
            }}>
              <Card style={{ 
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '1px solid #d9d9d9'
              }} bodyStyle={{ padding: '12px 16px' }}>
                <Spin size="small" />
                <span style={{ marginLeft: '8px', color: '#666' }}>AI正在思考...</span>
              </Card>
            </div>
          )}

          {/* 快捷问题 */}
          {messages.length === 1 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                fontSize: '14px', 
                color: '#666', 
                marginBottom: '12px',
                fontWeight: '500'
              }}>
                💡 快速开始：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    size="small"
                    style={{ 
                      borderRadius: '16px',
                      border: '1px solid #d9d9d9',
                      background: '#fff'
                    }}
                    onClick={() => handleQuickQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 悬浮输入框 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        padding: '12px 24px', // 减少垂直padding
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          alignItems: 'flex-end',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入您的问题... (Ctrl/Cmd+Enter 发送)"
            autoSize={{ minRows: 1, maxRows: 3 }} // 减少最小和最大行数
            style={{
              flex: 1,
              borderRadius: '12px',
              fontSize: '14px'
            }}
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={loading}
            size="large"
            style={{
              borderRadius: '12px',
              height: '40px', // 减少按钮高度
              minWidth: '40px' // 减少按钮宽度
            }}
          />
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#999', 
          textAlign: 'center',
          marginTop: '6px', // 减少上边距
          maxWidth: '900px',
          margin: '6px auto 0' // 减少总体边距
        }}>
          💡 提示：使用 Ctrl/Cmd+Enter 快速发送消息
        </div>
      </div>
    </div>
  );
};

export default AIChatPage; 