"""
AI服务配置文件
支持多种AI服务提供商的配置和切换
"""
import os
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass

class AIProvider(Enum):
    """AI服务提供商枚举"""
    OPENAI = "openai"
    DEEPSEEK = "deepseek"
    QWEN = "qwen"
    ZHIPU = "zhipu"
    CUSTOM = "custom"

@dataclass
class AIConfig:
    """AI服务配置类"""
    provider: AIProvider
    api_key: str
    base_url: str
    model: str
    max_tokens: int = 1000
    temperature: float = 0.7
    timeout: int = 30
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "provider": self.provider.value,
            "api_key": self.api_key,
            "base_url": self.base_url,
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "timeout": self.timeout
        }

# 预定义的AI服务配置
AI_PROVIDERS_CONFIG = {
    AIProvider.OPENAI: {
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"],
        "default_model": "gpt-3.5-turbo"
    },
    AIProvider.DEEPSEEK: {
        "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-coder"],
        "default_model": "deepseek-chat"
    },
    AIProvider.QWEN: {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": ["qwen-turbo", "qwen-plus", "qwen-max"],
        "default_model": "qwen-turbo"
    },
    AIProvider.ZHIPU: {
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4", "glm-3-turbo"],
        "default_model": "glm-4"
    },
    AIProvider.CUSTOM: {
        "base_url": "",  # 用户自定义
        "models": [],
        "default_model": ""
    }
}

class AIConfigManager:
    """AI配置管理器"""
    
    def __init__(self):
        self.config: Optional[AIConfig] = None
        self._load_config()
    
    def _load_config(self):
        """从环境变量和配置文件加载配置"""
        # 优先从环境变量读取
        provider_name = os.getenv("AI_PROVIDER", "openai").lower()
        
        try:
            provider = AIProvider(provider_name)
        except ValueError:
            print(f"⚠️ 未知的AI提供商: {provider_name}，使用默认OpenAI")
            provider = AIProvider.OPENAI
        
        # 获取API密钥
        api_key = self._get_api_key(provider)
        if not api_key:
            print(f"❌ 未找到 {provider.value} 的API密钥")
            return
        
        # 获取配置信息
        provider_config = AI_PROVIDERS_CONFIG[provider]
        base_url = os.getenv("AI_BASE_URL", provider_config["base_url"])
        model = os.getenv("AI_MODEL", provider_config["default_model"])
        
        # 创建配置对象
        self.config = AIConfig(
            provider=provider,
            api_key=api_key,
            base_url=base_url,
            model=model,
            max_tokens=int(os.getenv("AI_MAX_TOKENS", "1000")),
            temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
            timeout=int(os.getenv("AI_TIMEOUT", "30"))
        )
        
        print(f"✅ AI服务配置加载成功: {provider.value} - {model}")
    
    def _get_api_key(self, provider: AIProvider) -> Optional[str]:
        """获取指定提供商的API密钥"""
        # 通用API密钥环境变量
        api_key = os.getenv("AI_API_KEY")
        if api_key:
            return api_key
        
        # 特定提供商的API密钥环境变量
        provider_key_map = {
            AIProvider.OPENAI: "OPENAI_API_KEY",
            AIProvider.DEEPSEEK: "DEEPSEEK_API_KEY", 
            AIProvider.QWEN: "QWEN_API_KEY",
            AIProvider.ZHIPU: "ZHIPU_API_KEY",
            AIProvider.CUSTOM: "CUSTOM_API_KEY"
        }
        
        return os.getenv(provider_key_map.get(provider, "AI_API_KEY"))
    
    def get_config(self) -> Optional[AIConfig]:
        """获取当前AI配置"""
        return self.config
    
    def is_available(self) -> bool:
        """检查AI服务是否可用"""
        return self.config is not None
    
    def get_available_models(self) -> list:
        """获取当前提供商可用的模型列表"""
        if not self.config:
            return []
        return AI_PROVIDERS_CONFIG[self.config.provider]["models"]
    
    def update_config(self, **kwargs):
        """动态更新配置"""
        if not self.config:
            print("❌ AI配置未初始化")
            return
        
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                print(f"✅ 更新AI配置: {key} = {value}")
    
    def switch_provider(self, provider: AIProvider, api_key: str = None):
        """切换AI服务提供商"""
        if api_key:
            os.environ["AI_API_KEY"] = api_key
        os.environ["AI_PROVIDER"] = provider.value
        self._load_config()

# 全局配置管理器实例
ai_config_manager = AIConfigManager()

def get_ai_config() -> Optional[AIConfig]:
    """获取AI配置的便捷函数"""
    return ai_config_manager.get_config()

def is_ai_available() -> bool:
    """检查AI服务是否可用的便捷函数"""
    return ai_config_manager.is_available()