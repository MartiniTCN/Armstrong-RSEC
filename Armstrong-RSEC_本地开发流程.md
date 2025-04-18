# 🛠️ Armstrong-RSEC 本地开发习惯流程指南（含 Flask + venv）

---

## ✅ 开始工作（每日开发第一步）

```bash
cd Armstrong-RSEC                # 进入项目文件夹
source venv/bin/activate         # 启动虚拟环境
pip install python-dateutil      # 安装 python-dateutil 模块
python app.py                    # 启动本地 Flask 服务
```

浏览器访问：

```
http://127.0.0.1:10000
```

---

## ⏸️ 开发中止（临时停一下，比如去喝咖啡）

```bash
Ctrl + C                         # 停止 Flask 服务
# ✅ 虚拟环境仍然保持激活状态
# ⌨️ 可以继续运行 Python、pip、修改代码等
```

---

## 🔁 继续开发（不需要重复进入 venv）

```bash
python app.py                    # 再次启动 Flask 服务
```

---

## 👋 完全离开项目（准备关机 / 切换别的项目）

```bash
Ctrl + C                         # 停止 Flask 服务（如果未停止）
deactivate                       # 退出虚拟环境
```

---

## ✅ 状态说明总结

| 状态         | 是否运行 Flask | 是否激活 venv | 操作建议              |
|--------------|----------------|----------------|------------------------|
| 开始开发     | ✅ 是           | ✅ 是           | 访问浏览器，开始调试  |
| 开发中止     | ❌ 否           | ✅ 是           | 可继续修改 / 重启 Flask |
| 继续开发     | ✅ 是           | ✅ 是           | 直接运行 Flask 即可    |
| 完全退出     | ❌ 否           | ❌ 否           | 离开或关闭终端         |

---

> 💡 建议将 `.env` 文件加入 `.gitignore`，避免泄露 Supabase 密钥
