# Photo Collector

一个基于 Next.js 的照片/视频收集服务，用于多人活动场景下的照片汇总上传和浏览。

## 功能特性

- **多用户上传**：通过 URL 参数区分用户，自动创建对应文件夹
- **事件管理**：按事件（如 `2026-05-yunnan-trip`）组织照片
- **瀑布流浏览**：查看所有用户上传的照片/视频
- **缩略图生成**：自动为图片和视频生成预览缩略图
- **拖拽上传**：支持拖拽和点击上传，显示上传进度
- **Lightbox 预览**：点击照片放大查看，支持视频播放
- **分享链接**：一键复制分享链接给朋友
- **权限控制**：只能上传和查看，不能删除

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 使用方式

1. 打开链接：`http://localhost:3000?event=2026-05-yunnan-trip&user=张三`
2. 输入事件 ID（如 `2026-05-yunnan-trip`）
3. 输入你的昵称
4. 拖拽或点击上传照片/视频
5. 查看瀑布流照片墙
6. 点击"Copy"复制分享链接发给朋友

### Docker 部署

```bash
# 构建镜像
docker build -t photo-collector .

# 启动服务
docker-compose up -d

# 或者直接运行
docker run -d -p 3000:3000 -v $(pwd)/uploads:/app/uploads photo-collector
```

### 群晖 NAS 部署

1. 打开 Docker 套件
2. 创建 `docker-compose.yml` 文件
3. 修改挂载路径为你的实际照片目录：
   ```yaml
   volumes:
     - /volume1/photos:/app/uploads
   ```
4. 启动容器
5. 访问 `http://nas-ip:3000`

## 项目结构

```
photo-collector/
├── app/
│   ├── layout.tsx                      # 根布局
│   ├── page.tsx                        # 主页面
│   ├── api/
│   │   ├── upload/route.ts             # 文件上传 API
│   │   ├── photos/route.ts             # 获取照片列表 API
│   │   ├── events/route.ts             # 获取事件列表 API
│   │   └── uploads/[event]/[user]/[type]/[filename]/route.ts  # 文件访问 API
├── components/
│   ├── UploadZone.tsx                  # 拖拽上传组件
│   ├── PhotoGrid.tsx                   # 瀑布流照片墙
│   ├── PhotoCard.tsx                   # 单张照片卡片
│   └── EventSelector.tsx               # 事件选择器
├── lib/
│   ├── storage.ts                      # 文件系统操作
│   └── thumbnail.ts                    # 缩略图生成
├── uploads/                            # 上传目录
├── Dockerfile
└── docker-compose.yml
```

## API 文档

### POST /api/upload

上传文件

**请求**：
- Content-Type: `multipart/form-data`
- 字段：
  - `file`: 文件（图片/视频）
  - `event`: 事件 ID
  - `user`: 用户昵称

**限制**：
- 单文件大小：400MB
- 支持格式：jpg, jpeg, png, gif, webp, mp4, mov, avi

### GET /api/photos

获取照片列表

**参数**：
- `event`: 事件 ID（必填）
- `user`: 用户昵称（选填）

### GET /api/events

获取所有事件列表

## 技术栈

- **框架**：Next.js 16 (App Router)
- **UI**：TailwindCSS 4 + Lucide Icons
- **图片处理**：sharp
- **部署**：Docker (standalone 模式)

## 目录结构

```
uploads/
└── 2026-05-yunnan-trip/
    ├── 张三/
    │   ├── original/           # 原图
    │   │   ├── photo1.jpg
    │   │   └── video1.mp4
    │   └── thumbnails/         # 缩略图
    │       ├── photo1_thumb.jpg
    │       └── video1_thumb.jpg
    └── 李四/
        ├── original/
        └── thumbnails/
```

## 注意事项

1. **视频缩略图**：需要系统安装 `ffmpeg`，否则会生成灰色占位图
2. **HEIC 格式**：iPhone 照片格式，sharp 支持但部分浏览器无法直接预览
3. **大文件上传**：400MB 文件可能需要较长时间，取决于网络速度
4. **安全性**：当前无密码保护，链接泄露任何人都可上传

## 后续扩展

- [ ] 密码保护/链接过期
- [ ] EXIF 信息提取（拍摄时间、地点）
- [ ] 照片去重（基于哈希）
- [ ] 批量下载（按用户/按事件打包 ZIP）
- [ ] 微信分享优化（OG 标签）
