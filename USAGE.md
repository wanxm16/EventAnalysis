# 事件查询系统 - 启动脚本使用说明

## 🚀 一键启动

### 完整启动（推荐首次使用）
```bash
./start.sh
```
- 自动检查并安装系统依赖（Python、Node.js、pnpm）
- 安装项目依赖（Python packages、前端packages）
- 启动后端服务（FastAPI，端口8000）
- 启动前端服务（React，端口3000）
- 提供服务健康检查和错误处理

### 快速启动（已安装依赖）
```bash
./quick-start.sh
```
或者
```bash
./start.sh --skip-install
```
- 跳过依赖安装，直接启动服务
- 适用于依赖已安装的情况

### 停止服务
```bash
./stop.sh
```
- 停止所有相关进程
- 清理端口占用
- 确保完全清理

## 🌐 服务地址

启动成功后，可以访问以下地址：

- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs

## 📋 功能特性

### 启动脚本特性
- ✅ 彩色输出，易于识别状态
- ✅ 自动检测和安装依赖
- ✅ 端口冲突检测和处理
- ✅ 服务健康检查
- ✅ 智能依赖缓存（避免重复安装）
- ✅ 优雅的服务停止
- ✅ 错误处理和回滚

### 系统功能
- ✅ 事件列表查看（按时间倒序）
- ✅ 多维度筛选（镇街、级别、分类、相关事件数量）
- ✅ 关键词搜索
- ✅ 事件详情查看
- ✅ 聚类事件分析
- ✅ 参与人数统计
- ✅ 时间线展示

## 🛠️ 故障排除

### 端口被占用
脚本会自动检测并尝试释放端口，如果仍有问题：
```bash
# 手动停止服务
./stop.sh

# 或手动清理端口
lsof -ti :8000 | xargs kill -9
lsof -ti :3000 | xargs kill -9
```

### 依赖安装失败
```bash
# 清理依赖缓存
rm backend/.deps_installed frontend/.deps_installed

# 重新完整启动
./start.sh
```

### pnpm未安装
脚本会自动安装pnpm，如果失败可手动安装：
```bash
npm install -g pnpm
```

## 📝 开发说明

- 后端：FastAPI + Python
- 前端：React + Ant Design
- 数据：CSV文件读取和处理
- 包管理：pip（后端）+ pnpm（前端）

## 🔧 维护

定期更新依赖：
```bash
# 删除依赖缓存标记
rm backend/.deps_installed frontend/.deps_installed

# 重新安装最新依赖
./start.sh
``` 