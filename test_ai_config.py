#!/usr/bin/env python3
"""
AI配置测试脚本
用于验证AI服务配置是否正确
"""

import sys
import os

# 添加backend目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_ai_config():
    """测试AI配置"""
    try:
        # 加载AI配置文件
        if os.path.exists('ai_config.env'):
            print("🔍 发现ai_config.env文件，加载配置...")
            with open('ai_config.env', 'r') as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
        
        # 导入AI配置模块
        from ai_config import get_ai_config, is_ai_available, ai_config_manager
        
        print("=" * 60)
        print("🤖 AI服务配置测试")
        print("=" * 60)
        
        # 检查配置可用性
        if not is_ai_available():
            print("❌ AI服务配置不可用")
            print("💡 请检查以下配置:")
            print("   1. 创建 ai_config.env 文件")
            print("   2. 设置 AI_PROVIDER 环境变量")
            print("   3. 设置 AI_API_KEY 环境变量")
            return False
        
        # 获取配置信息
        config = get_ai_config()
        if config:
            print(f"✅ AI服务配置加载成功")
            print(f"   📋 提供商: {config.provider.value}")
            print(f"   🔗 API地址: {config.base_url}")
            print(f"   🤖 模型: {config.model}")
            print(f"   🔑 API密钥: {config.api_key[:10]}...***")
            print(f"   ⚙️ 最大Token: {config.max_tokens}")
            print(f"   🌡️ 温度: {config.temperature}")
            print(f"   ⏱️ 超时: {config.timeout}秒")
            
            # 获取可用模型
            models = ai_config_manager.get_available_models()
            if models:
                print(f"   📝 可用模型: {', '.join(models)}")
            
            return True
        else:
            print("❌ 无法获取AI配置")
            return False
            
    except ImportError as e:
        print(f"❌ 导入AI配置模块失败: {e}")
        print("💡 请确保在backend目录中运行此脚本")
        return False
    except Exception as e:
        print(f"❌ AI配置测试失败: {e}")
        return False

def main():
    """主函数"""
    print("🚀 海曙区社会治理中心事件分析系统 - AI配置测试")
    print()
    
    success = test_ai_config()
    
    print()
    print("=" * 60)
    if success:
        print("🎉 AI配置测试通过！系统可以正常使用AI功能")
        print("💡 现在可以运行 ./start.sh 启动系统")
    else:
        print("⚠️ AI配置测试失败，请检查配置后重试")
        print("📖 详细配置说明请参考 DEPLOYMENT.md")
    print("=" * 60)

if __name__ == "__main__":
    main()