# 部署配置指南

## AI服务配置说明

系统支持多种AI服务提供商，可通过配置文件灵活切换。

### 🔧 配置方法

#### 方法1: 使用AI配置文件（推荐）

1. **复制配置文件模板**
   ```bash
   cp ai_config.env.example ai_config.env
   ```

2. **编辑AI配置**
   ```bash
   # 选择AI服务提供商
   AI_PROVIDER=deepseek  # 可选: openai/deepseek/qwen/zhipu/custom
   
   # 填入API密钥
   AI_API_KEY=sk-your-actual-api-key
   
   # 可选：自定义模型
   AI_MODEL=deepseek-chat
   ```

#### 方法2: 使用环境变量

```bash
export AI_PROVIDER=openai
export AI_API_KEY=sk-your-openai-key
export AI_MODEL=gpt-3.5-turbo
```

#### 方法3: 在主配置文件中配置

编辑 `config.env` 文件，添加AI配置部分（已预配置）。

### 🌟 支持的AI服务商

| 提供商 | 配置值 | 官网 | 说明 |
|--------|--------|------|------|
| OpenAI | `openai` | https://platform.openai.com/ | GPT系列模型 |
| DeepSeek | `deepseek` | https://platform.deepseek.com/ | 高性价比选择 |
| 阿里云通义千问 | `qwen` | https://dashscope.aliyuncs.com/ | 国内服务商 |
| 智谱AI | `zhipu` | https://open.bigmodel.cn/ | GLM系列模型 |
| 自定义 | `custom` | - | 自定义API服务 |

### 📋 配置示例

#### OpenAI 配置
```bash
AI_PROVIDER=openai
AI_API_KEY=sk-your-openai-key
AI_MODEL=gpt-3.5-turbo
```

#### DeepSeek 配置
```bash
AI_PROVIDER=deepseek
AI_API_KEY=sk-your-deepseek-key
AI_MODEL=deepseek-chat
```

#### 自定义API 配置
```bash
AI_PROVIDER=custom
AI_API_KEY=your-custom-key
AI_BASE_URL=https://your-api.com/v1
AI_MODEL=your-model-name
```

### 🚀 部署步骤

1. **克隆代码**
   ```bash
   git clone http://192.168.2.54:8088/agent/EventAnalysis.git
   cd EventAnalysis
   ```

2. **配置AI服务**
   ```bash
   # 复制配置文件
   cp ai_config.env.example ai_config.env
   cp config.env.example config.env
   
   # 编辑配置文件，填入API密钥
   vim ai_config.env
   ```

3. **启动系统**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

### 🔍 配置验证

启动时系统会显示AI配置加载状态：
```
✅ AI服务配置加载成功: deepseek - deepseek-chat
✅ AI服务初始化成功: deepseek - deepseek-chat
```

### ⚠️ 注意事项

1. **API密钥安全**
   - 不要将真实API密钥提交到版本控制系统
   - `ai_config.env` 和 `config.env` 已添加到 `.gitignore`

2. **配置优先级**
   - 环境变量 > ai_config.env > config.env

3. **兼容性**
   - 保持与旧版本配置的兼容性
   - `DEEPSEEK_API_KEY` 仍然有效，但建议使用 `AI_API_KEY`

4. **故障排除**
   - 如果AI功能不可用，检查API密钥配置
   - 查看启动日志确认配置加载状态
   - 访问 API 文档确认服务状态：http://localhost:8000/docs

### 🔧 高级配置

```bash
# AI服务参数调优
AI_MAX_TOKENS=1500      # 最大token数
AI_TEMPERATURE=0.8      # 创造性参数
AI_TIMEOUT=45           # 请求超时时间

# 多环境配置
AI_PROVIDER=deepseek    # 开发环境使用DeepSeek
# AI_PROVIDER=openai   # 生产环境使用OpenAI
```

这样配置后，您可以根据部署环境的不同，灵活选择和切换AI服务提供商，而无需修改代码。