# 🎮 Vue消消乐游戏项目

一个现代化的Web消消乐游戏，采用Vue 3 + TypeScript + Vite技术栈构建，集成了完整的监控、测试和部署系统。

## ✨ 项目特性

- 🎯 **经典游戏机制**: 完整的消消乐游戏逻辑和动画效果
- 🎵 **音效系统**: 支持背景音乐和音效，智能音频管理
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 📊 **监控系统**: 实时性能监控和错误追踪
- 🔍 **日志分析**: 智能日志聚合和分析
- 🚨 **智能告警**: 基于规则的自动告警系统
- 🧪 **全面测试**: 单元测试、集成测试、E2E测试
- 🚀 **自动部署**: 支持蓝绿部署和滚动更新
- 🔒 **安全保障**: 多层安全防护机制

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
访问 http://localhost:5173 查看游戏

### 构建项目
```bash
npm run build
```

### 运行测试
```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行E2E测试
npm run test:e2e
```

### 启动本地服务器
```bash
# 使用Node.js服务器
node start-server-node.js

# 或使用批处理脚本（Windows）
start-test-server.bat
```

## 🎮 游戏功能

- **经典消消乐**: 点击相邻的相同方块进行消除
- **连击系统**: 连续消除获得更高分数
- **时间挑战**: 在限定时间内达到目标分数
- **音效反馈**: 丰富的音效增强游戏体验
- **动画效果**: 流畅的消除和掉落动画

## 🛠️ 技术架构

- **前端框架**: Vue 3 + Composition API
- **开发语言**: TypeScript
- **构建工具**: Vite
- **测试框架**: Vitest + Playwright
- **代码规范**: ESLint + Prettier
- **部署方案**: Docker + Kubernetes

## 📁 项目结构

```
├── src/                    # 源代码目录
│   ├── components/         # Vue组件
│   ├── composables/        # 组合式API
│   ├── utils/              # 工具函数
│   ├── types/              # TypeScript类型定义
│   └── monitoring/         # 监控系统
├── public/                 # 静态资源
│   ├── audio/              # 音频文件
│   └── tiles/              # 游戏方块图片
├── test/                   # 测试文件
├── scripts/                # 构建和部署脚本
├── docker/                 # Docker配置
└── docs/                   # 项目文档
```

## 🧪 测试

项目包含完整的测试套件：

- **单元测试**: 组件和工具函数测试
- **集成测试**: 系统集成测试
- **E2E测试**: 端到端用户场景测试
- **性能测试**: 游戏性能基准测试

## 📚 详细文档

- [📖 综合开发指南](./COMPREHENSIVE_GUIDE.md) - 完整的开发和部署指南
- [🔧 API文档](./API_DOCUMENTATION.md) - 详细的API接口文档
- [📋 最佳实践](./BEST_PRACTICES.md) - 开发最佳实践指南
- [🚀 部署指南](./DEPLOYMENT.md) - 生产环境部署说明
- [🔍 故障排除](./TROUBLESHOOTING.md) - 常见问题解决方案

## 🌐 在线体验

- **游戏地址**: https://game-assets-del.pages.dev/
- **GitHub仓库**: https://github.com/EricSmith123/game-assets

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和测试人员！
