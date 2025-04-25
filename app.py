import os

# ✅ Render 环境不加载 dotenv
if os.environ.get("RENDER") != "true":
    try:
        import dotenv
        dotenv.load_dotenv()
        print("✅ 本地调试模式，已加载 .env")
    except ImportError:
        print("⚠️ 未安装 python-dotenv，跳过 .env 加载")

from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import pytz
from datetime import datetime, timezone, timedelta
import os
import requests

app = Flask(__name__)
app = Flask(__name__, static_url_path='/static', static_folder='static')

app.secret_key = os.environ.get('SECRET_KEY', 'Martin-Armstrong-Passw0rd-2025!')
print(f"[DEBUG] 当前 SECRET_KEY: {os.environ.get('SECRET_KEY')}")

# ========== 全局配置 ==========
# ✅ 定义中国时区
CHINA_TZ = timezone(timedelta(hours=8))
TIMEZONE = pytz.timezone("Asia/Shanghai")

SESSION_TIMEOUT_MINUTES = 70

# ========== 工具函数部分 ==========

def get_current_time():
    """返回当前中国时间（UTC+8）"""
    return datetime.now(CHINA_TZ).isoformat()

def get_current_datetime():
    return datetime.now(CHINA_TZ)

def get_client_ip():
    """获取客户端真实 IP 地址"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers['X-Forwarded-For'].split(',')[0].strip()
    return request.remote_addr or 'Unknown'

def update_user_last_active(user_id):
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")

    if not SUPABASE_URL or not SUPABASE_API_KEY:
        print("[ERROR] 缺少 Supabase 配置，无法更新 last_active")
        return

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }

    update_url = f"{SUPABASE_URL}/rest/v1/login_log?username=eq.{user_id}&status=eq.登录中"
    payload = {
        "last_active": datetime.now(TIMEZONE).isoformat()
    }

    response = requests.patch(update_url, headers=headers, json=payload)

    if response.status_code not in [200, 204]:
        print(f"[WARN] 更新用户 {user_id} 的 last_active 失败：{response.status_code}")
    else:
        print(f"[INFO] 已更新 {user_id} 的 last_active")

def insert_login_log(data):
    """通过 Supabase REST API 插入登录日志"""
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        raise RuntimeError("未配置 SUPABASE_URL 或 SUPABASE_API_KEY 环境变量")

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }

    # ✅ 自动转换 datetime 为字符串
    def to_str(v):
        return v.isoformat() if isinstance(v, datetime) else v
    payload = {k: to_str(v) for k, v in data.items()}

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/login_log",
        headers=headers,
        json=payload
    )
    if response.status_code not in [200, 201]:
        print("[ERROR] 插入日志失败：", response.status_code, response.text)

def logout_user(username):
    """将指定用户的状态更新为已登出，并记录登出时间"""
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        print("[ERROR] 缺少 Supabase URL 或 API Key")
        return

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "status": "已登出",
        "logout_time": get_current_time()
    }
    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/login_log?username=eq.{username}&status=eq.登录中",
        headers=headers,
        json=payload
    )
    
    if response.status_code not in [200, 204]:
        print(f"[WARN] 自动登出时更新状态失败：{response.status_code} - {response.text}")
        # 如果失败，可以选择重新尝试、记录到数据库或者发送通知等
    else:
        print(f"[INFO] 用户 {username} 已成功登出。")

def update_last_active(username):
    """仅更新当前登录中的最新一条记录的 last_active 字段"""
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        print("[ERROR] 缺少 Supabase URL 或 API Key")
        return

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }

    # ✅ 第一步：先查出最新的“登录中”记录
    query_url = f"{SUPABASE_URL}/rest/v1/login_log?username=eq.{username}&status=eq.登录中&order=login_time.desc&limit=1"
    resp = requests.get(query_url, headers=headers)
    if resp.status_code == 200 and resp.json():
        log_id = resp.json()[0]["id"]

        # ✅ 第二步：只更新这一条记录
        patch_url = f"{SUPABASE_URL}/rest/v1/login_log?id=eq.{log_id}"
        payload = {"last_active": get_current_time()}
        patch_resp = requests.patch(patch_url, headers=headers, json=payload)

        if patch_resp.status_code in [200, 204]:
            print(f"[INFO] ✅ 用户 {username} 的最后活动时间已更新。")
        else:
            print(f"[WARN] ❌ 更新失败：{patch_resp.status_code} - {patch_resp.text}")
    else:
        print(f"[WARN] ⚠️ 未找到用户 {username} 的“登录中”记录")

def handle_login():
    username = request.form.get('username')
    password = request.form.get('password')

    # ✅ 若已有用户登录，先登出前一个用户
    old_user = session.get('username')
    if old_user:
        logout_user(old_user)
        session.clear()

    # ✅ 正常登录流程
    ip = get_client_ip()
    now = get_current_datetime()
    session['username'] = username
    session['last_active'] = now
    insert_login_log({
        "username": username,
        "ip": ip,
        "login_time": now,
        "last_active": now,
        "status": "登录中"
    })
    return redirect(url_for('course_select'))

# ========== 登录前置钩子 ==========
from dateutil.parser import isoparse

@app.before_request
def check_session_timeout():
    session.permanent = True
    if 'username' in session:
        now = get_current_datetime()
        last_active = session.get('last_active')
        if last_active:
            last_dt = isoparse(last_active).astimezone(TIMEZONE)
            if now - last_dt > timedelta(minutes=SESSION_TIMEOUT_MINUTES):
                logout_user(session['username'])
                session.clear()
                return redirect(url_for('login'))
        session['last_active'] = now.isoformat()
        update_last_active(session['username'])

# ========== 页面路由 ==========
# ====  Martin 通用路由 ====
@app.route('/course/<course_id>')
def course_page(course_id):
    if 'username' not in session:
        return redirect(url_for('login'))

    try:
        # 尝试加载 test/<course_id>.html 页面
        return render_template(f'test/{course_id}.html', username=session['username'])
    except Exception as e:
        print(f"[ERROR] 无法渲染课程页面：{course_id}, 错误信息：{e}")
        return f"课程页面 {course_id} 不存在或出错", 404
    

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        session.clear()
        return render_template('login.html')

    try:
        # ✅ 获取前端用户名密码
        username = request.form.get('username')
        password = request.form.get('password')

        # ✅ Supabase 配置
        SUPABASE_URL = os.environ.get("SUPABASE_URL")
        SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")

        headers = {
            "apikey": SUPABASE_API_KEY,
            "Authorization": f"Bearer {SUPABASE_API_KEY}",
            "Content-Type": "application/json"
        }

        # ✅ 查询 Supabase user_accounts 表是否匹配
        query_url = f"{SUPABASE_URL}/rest/v1/user_accounts?username=eq.{username}&password=eq.{password}"
        response = requests.get(query_url, headers=headers)

        if response.status_code != 200 or not response.json():
            lang = request.cookies.get("lang", "zh")
            message = (
                "Invalid username or password.\nIf you forgot your password, please contact RSEC for help!"
                if lang == "en" else
                "输入的用户名和密码无效，请确认！\n如果密码遗忘，请联系 RSEC 寻求帮助！"
            )
            return jsonify({"success": False, "message": message}), 401

        # ✅ 登录成功：获取用户数据
        user_data = response.json()[0]
        user_id = user_data.get("username")

        # ✅ 清除旧 session（如有）
        old_user = session.get('username')
        if old_user:
            logout_user(old_user)
            session.clear()

        # ✅ 设置 session["user"]（用于 heartbeat 识别）
        session["user"] = {
            "id": user_id,
            "username": username,
            "role": "user"
        }

        # ✅ 附加信息
        ip = get_client_ip()
        now = get_current_datetime()
        session['username'] = username
        session['last_active'] = now.isoformat()

        # ✅ 记录登录日志
        insert_login_log({
            "username": username,
            "ip": ip,
            "login_time": now,
            "last_active": now,
            "status": "登录中"
        })

        return jsonify({"success": True})

    except Exception as e:
        print("🔥 登录异常：", e)
        return jsonify({
            "success": False,
            "message": "服务器内部错误，请联系管理员。...",
            "error": str(e)
        }), 500

@app.route('/logout')
def logout():
    username = session.get('username')
    if username:
        # 获取 Supabase 的 URL 和 API 密钥
        SUPABASE_URL = os.environ.get("SUPABASE_URL")
        SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
        headers = {
            "apikey": SUPABASE_API_KEY,
            "Authorization": f"Bearer {SUPABASE_API_KEY}",
            "Content-Type": "application/json"
        }

        # 查询当前用户的登录日志，获取最新一条登录记录
        query_url = f"{SUPABASE_URL}/rest/v1/login_log?username=eq.{username}&order=login_time.desc&limit=1"
        response = requests.get(query_url, headers=headers)
        data = response.json()

        if response.status_code == 200 and data:
            log_id = data[0]["id"]
            # 更新状态为“已退出”，并设置登出时间
            update_url = f"{SUPABASE_URL}/rest/v1/login_log?id=eq.{log_id}"
            payload = {
                "status": "已退出",
                "logout_time": get_current_time()
            }
            update_resp = requests.patch(update_url, headers=headers, json=payload)
            print("✅ 登出记录更新状态:", update_resp.status_code)

    session.clear()
    return redirect(url_for("login"))

@app.route('/course')
def course_select():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('course_selection.html', username=session['username'])

@app.route('/EE-W_Test')
def ee_w_test():
    if 'username' not in session:
        return redirect(url_for('login'))  # ✅ 登录校验没问题
    return render_template('test/EE-W.html', username=session['username'])  # ✅ 路径指向新模板位置

@app.route('/DE-PUMP_Test')
def de_pump_test():
    if 'username' not in session:
        return redirect(url_for('login'))  # ✅ 登录校验没问题
    return render_template('test/DE-PUMP.html', username=session['username'])  # ✅ 路径指向新模板位置

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/login_log')
def login_log():
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return "未配置 Supabase", 500

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
    }

    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/login_log?select=*",
        headers=headers
    )

    if response.status_code != 200:
        return f"请求 Supabase 失败: {response.status_code}", 500

    logs = response.json()
    logs.sort(key=lambda x: x.get("login_time", ""), reverse=True)

    logs_mapped = []
    for row in logs:
        logs_mapped.append([
            row.get("id", ""),
            row.get("username", ""),
            row.get("ip", ""),
            row.get("login_time", ""),
            row.get("last_active", ""),
            row.get("logout_time", ""),
            row.get("status", "")
        ])

    return render_template("login_log.html", logs=logs_mapped)

@app.route('/api/logs')
def get_login_logs():
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return jsonify([]), 500

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}"
    }

    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/login_log?select=*&order=login_time.desc",
        headers=headers
    )

    if response.status_code != 200:
        return jsonify([]), 500

    return jsonify(response.json())

# ✅ 新增：前端心跳机制支持路由，保持 session 活跃
@app.route('/heartbeat', methods=['POST'])
def heartbeat():
    if not session.get("user"):
        return "Not logged in", 401
    update_user_last_active(session["user"]["id"])  # 自定义函数更新 Supabase
    return "OK", 200

# ✅ 注册功能的 Flask 接口路由
from flask import request, jsonify

@app.route('/register', methods=['POST'])
def register():
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return jsonify({"success": False, "message": "配置缺失"}), 500

    # ✅ 补上定义 headers
    check_headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}"
    }

    # ✅ 接收表单字段
    # ✅ 支持 JSON 或表单数据格式
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    # ✅ 提取字段前先打印日志
    print(f"[注册请求] 来源 IP：{get_client_ip()}，原始数据：{dict(data)}")

    # ✅ 不管前端格式是 JSON 还是表单，都统一从 data 提取字段，统一处理数据格式
    username = data.get('username')
    password = data.get('password')
    company = data.get('company')
    city = data.get('city')
    email = data.get('email')
    phone = data.get('phone')
    sales_name = data.get('sales_name')
    invite_code = data.get('invite_code')

    # ✅ 校验字段完整性
    missing_fields = []
    if not username: missing_fields.append("用户名")
    if not password: missing_fields.append("密码")
    if not company: missing_fields.append("单位")
    if not city: missing_fields.append("城市")
    if not email: missing_fields.append("邮箱")
    if not phone: missing_fields.append("电话")
    if not sales_name: missing_fields.append("销售姓名")
    if not invite_code: missing_fields.append("邀请码")

    if missing_fields:
        return jsonify({
            "success": False,
            "message": f"缺少字段：{', '.join(missing_fields)}"
        }), 400  # 返回400状态码表示请求有误

    import re
	
    # ✅ 正则校验用户名、手机号、邮箱格式
    username_pattern = re.compile(r'^[a-zA-Z0-9]{3,20}$')
    phone_pattern = re.compile(r'^\d{11}$')  # 可根据需要修改
    email_pattern = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')

    if not username_pattern.match(username):
        return jsonify({"success": False, "message": "用户名格式不正确，应为3-20位字母或数字"})

    if not phone_pattern.match(phone):
        return jsonify({"success": False, "message": "手机号格式错误，请输入11位数字"})

    if not email_pattern.match(email):
        return jsonify({"success": False, "message": "邮箱格式错误，请检查"})

    # ✅ 检查邀请码有效性
    check_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/invitation_codes?code=eq.{invite_code}&is_used=eq.false",
        headers=check_headers
    )
    if check_resp.status_code != 200 or not check_resp.json():
        return jsonify({"success": False, "message": "邀请码无效或已被使用"})

    # ✅ 检查用户名是否重复
    check_user_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_accounts?username=eq.{username}",
        headers=check_headers
    )
    if check_user_resp.status_code == 200 and check_user_resp.json():
        return jsonify({"success": False, "message": "该用户名已注册"})

    # ✅ 插入用户
    insert_headers = check_headers.copy()
    insert_headers["Content-Type"] = "application/json"

    user_payload = {
        "username": username,
        "password": password,
        "company": company,
        "city": city,
        "email": email,
        "phone": phone,
        "sales_name": sales_name,
        "invite_code": invite_code
    }

    user_resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/user_accounts",
        headers=insert_headers,
        json=user_payload
    )
    if user_resp.status_code not in [200, 201]:
        return jsonify({"success": False, "message": "注册失败"}), 500

    # ✅ 标记邀请码已用
    update_resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/invitation_codes?code=eq.{invite_code}",
        headers=insert_headers,
        json={
            "is_used": True,
            "used_by": username,
            "used_at": get_current_time()
        }
    )

    if update_resp.status_code not in [200, 204]:
        return jsonify({"success": False, "message": "注册成功但更新邀请码失败"}), 500

    return jsonify({"success": True, "message": "注册成功"})

# ✅ 修改点 1：新增 APScheduler 定时任务
from apscheduler.schedulers.background import BackgroundScheduler

def auto_logout_inactive_users():
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }

    # 判断过去 15 分钟内无操作的登录用户
    now = get_current_datetime()
    cutoff = now - timedelta(minutes=SESSION_TIMEOUT_MINUTES)
    cutoff_iso = cutoff.isoformat()

    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/login_log?status=eq.登录中&last_active=lt.{cutoff_iso}",
        headers=headers,
        json={
            "status": "已登出",
            "logout_time": now.isoformat()
        }
    )
    print("[定时任务] 自动登出状态：", response.status_code)

# 启动任务调度器
scheduler = BackgroundScheduler()
scheduler.add_job(auto_logout_inactive_users, 'interval', minutes=5)
scheduler.start()


@app.route('/health')
def health_check():
    return 'OK', 200

@app.route('/api/heartbeat', methods=['POST'])
def api_heartbeat():
    if 'username' not in session:
        return jsonify({"success": False, "message": "未登录"}), 401

    # 更新用户的最后活动时间
    update_last_active(session['username'])
    return jsonify({"success": True, "message": "心跳成功"}), 200


@app.route('/api/logout', methods=['POST'])
def api_logout():
    if 'username' not in session:
        return jsonify({"success": False, "message": "未登录"}), 401

    # 更新用户的状态为已登出
    logout_user(session['username'])
    session.clear()
    return jsonify({"success": True, "message": "登出成功"}), 200
# ✅ 定时清理“登录中但超过 SESSION_TIMEOUT_MINUTES 未活动”的用户
from dateutil.parser import isoparse
from datetime import datetime, timedelta, timezone

def mark_inactive_users():
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        print("[ERROR] 缺少 Supabase URL 或 API Key")
        return

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }

    now = get_current_datetime()  # 返回中国时区 datetime 对象
    cutoff = now - timedelta(minutes=SESSION_TIMEOUT_MINUTES)

    print(f"[INFO] 当前时间：{now.isoformat()}")
    print(f"[INFO] 超时阈值：{cutoff.isoformat()}")

    # ✅ 查询所有“登录中”的用户记录（不再通过 URL 进行 last_active 比较）
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/login_log?status=eq.登录中&select=id,username,last_active",
        headers=headers
    )

    if response.status_code != 200:
        print(f"[ERROR] 查询 Supabase 登录中用户失败：{response.status_code} - {response.text}")
        return

    users = response.json()
    inactive_users = []

    for user in users:
        last_active = user.get("last_active")
        if not last_active:
            continue

        try:
            # ✅ 转换为 datetime 并与 cutoff 比较
            last_dt = isoparse(last_active)
            if last_dt < cutoff:
                inactive_users.append(user)
        except Exception as e:
            print(f"[WARN] 无法解析时间 '{last_active}'，跳过用户 {user.get('username')}：{e}")

    print(f"[INFO] 需登出的用户数：{len(inactive_users)}")

    for user in inactive_users:
        username = user.get("username")
        logout_time = now.isoformat()

        # ✅ 更新 Supabase 状态
        update_url = f"{SUPABASE_URL}/rest/v1/login_log?id=eq.{user['id']}"
        payload = {
            "status": "已登出",
            "logout_time": logout_time
        }
        update_resp = requests.patch(update_url, headers=headers, json=payload)

        if update_resp.status_code not in [200, 204]:
            print(f"[WARN] 用户 {username} 登出失败：{update_resp.status_code} - {update_resp.text}")
        else:
            print(f"[✅] 用户 {username} 已成功登出，时间：{logout_time}")

    return len(inactive_users)


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))  # Render 会自动注入 PORT
    is_debug = os.environ.get("FLASK_DEBUG", "0") == "1"  # 默认关闭 Debug
    print(f"✅ Running Flask on http://0.0.0.0:{port} (debug={is_debug})")
    app.run(host='0.0.0.0', port=port, debug=is_debug)
