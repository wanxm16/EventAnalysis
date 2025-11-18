import React, { useState } from 'react';
import {
  Card,
  Typography,
  Alert,
  Space
} from 'antd';
import {
  InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

function PromptManagement() {
  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>Prompt 配置</Title>
      <Text type="secondary">
        配置AI报告生成的Prompt模板，优化报告生成质量
      </Text>

      <Card style={{ marginTop: 24 }}>
        <Alert
          message="功能开发中"
          description={
            <Space direction="vertical">
              <Paragraph>
                <InfoCircleOutlined /> Prompt 配置功能正在开发中，敬请期待！
              </Paragraph>
              <Paragraph>
                该功能将支持：
              </Paragraph>
              <ul>
                <li>自定义 System Prompt 和 User Prompt 模板</li>
                <li>支持多个 Prompt 模板管理</li>
                <li>设置默认模板</li>
                <li>基于示例文档自动生成 Prompt</li>
              </ul>
            </Space>
          }
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
}

export default PromptManagement;
