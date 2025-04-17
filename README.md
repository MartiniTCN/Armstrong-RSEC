



# Armstrong-RSEC 本地开发与调试指南

本项目基于 **Flask + GitHub + Render** 构建，用于 Armstrong 产品培训与评估系统。本文档指导你如何在本地运行、测试、调试和部署。

---

## 📁 项目结构简览

Armstrong-RSEC/
├── app.py                   # Flask 主程序入口
├── requirements.txt         # 所需依赖列表
├── venv/                    # 虚拟环境（本地生成）
├── templates/               # 所有 HTML 页面
├── static/                  # JS、CSS、图标、图片资源
└── …

---

## 🚀 一次性初始化步骤（首次运行时）

```bash
cd Armstrong-RSEC                   # 进入项目目录
python3 -m venv venv                # 创建虚拟环境
source venv/bin/activate            # 激活虚拟环境
pip install -r requirements.txt     # 安装依赖包



⸻

🧪 本地调试流程（每次运行）

cd Armstrong-RSEC                   # 进入项目目录
source venv/bin/activate            # 启动虚拟环境
python app.py                       # 启动本地 Flask 服务

然后浏览器访问：

http://127.0.0.1:10000



⸻

🔄 修改文件后是否需要重启？

修改内容	是否需要重启 Flask？	操作说明
templates/*.html	❌ 否	刷新浏览器即可
static/*.js 或 *.css	❌ 否	刷新浏览器即可
app.py 或 Python 文件	✅ 自动重载	控制台自动重启
安装新 Python 包（pip）	✅ 推荐手动重启	Ctrl+C 停止后再启动
修改环境变量或配置文件	✅ 必须手动重启	Ctrl+C 后再运行



⸻

🔁 启动 / 停止 Flask 服务
	•	停止 Flask 服务： 在终端按下 Ctrl + C
	•	重启 Flask 服务：

python app.py



⸻

🧼 退出虚拟环境

deactivate

退出后，终端前的 (venv) 提示会消失。

⸻

📌 常用命令总览

任务	命令
启动虚拟环境	source venv/bin/activate
启动 Flask 本地服务	python app.py
停止 Flask 服务	Ctrl + C
安装依赖包	pip install -r requirements.txt
退出虚拟环境	deactivate



⸻

📦 提交更新到 GitHub 后自动 Render 部署
	1.	本地调试无误后，运行：

git add .
git commit -m "更新说明"
git push origin main


	2.	Render 会自动检测并重新部署


