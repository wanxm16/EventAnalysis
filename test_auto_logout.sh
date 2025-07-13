#!/bin/bash

echo "测试自动退出登录功能"
echo "========================"

# 创建服务状态文件
echo "running" > .service_status
echo "✅ 创建服务状态文件"

# 等待5秒
echo "⏳ 等待5秒模拟服务运行..."
sleep 5

# 删除服务状态文件（模拟服务停止）
rm -f .service_status
echo "❌ 删除服务状态文件（模拟服务停止）"

echo "🔍 现在前端应该检测到服务停止并自动退出登录"
echo "请在浏览器中查看效果"

# 再等待10秒让用户观察
sleep 10

echo "✅ 测试完成"