from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import pytz
from datetime import datetime, timedelta
import os
import requests

app = Flask(__name__)
app = Flask(__name__, static_url_path='/static', static_folder='static')

app.secret_key = os.environ.get('SECRET_KEY', 'Martin-Armstrong-Passw0rd-2025!')
print(f"[DEBUG] 当前 SECRET_KEY: {os.environ.get('SECRET_KEY')}")

# ========== 全局配置 ==========
TIMEZONE = pytz.timezone('Asia/Shanghai')
SESSION_TIMEOUT_MINUTES = 15

# ========== 工具函数部分 ==========

def get_client_ip():
    """获取客户端真实 IP 地址"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers['X-Forwarded-For'].split(',')[0].strip()
    return request.remote_addr or 'Unknown'

def get_current_time():
    """获取当前上海时间"""
    return datetime.now(TIMEZONE).isoformat()

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
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/login_log",
        headers=headers,
        json=data
    )
    if response.status_code not in [200, 201]:
        print("[ERROR] 插入日志失败：", response.status_code, response.text)

def update_last_active(username):
    """更新用户的 last_active 字段（通过 Supabase PATCH 请求）"""
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"last_active": get_current_time()}
    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/login_log?username=eq.{username}&status=eq.登录中",
        headers=headers,
        json=payload
    )
    if response.status_code not in [200, 204]:
        print("[WARN] 更新 last_active 失败：", response.status_code, response.text)

# ✅ 新增：用户登出时记录 logout_time 并更新状态

def logout_user(username):
    """将指定用户的状态更新为已登出，并记录登出时间"""
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")
    if not SUPABASE_URL or not SUPABASE_API_KEY:
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
        print("[WARN] 自动登出时更新状态失败：", response.status_code, response.text)

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
    now = get_current_time()
    session['username'] = username
    session['last_active'] = datetime.now().isoformat()
    insert_login_log({
        "username": username,
        "ip": ip,
        "login_time": now,
        "last_active": now,
        "status": "登录中"
    })
    return redirect(url_for('course_select'))

# ========== 登录前置钩子 ==========
@app.before_request
def check_session_timeout():
    session.permanent = True  # ✅ 设置 session 为永久类型
    if 'username' in session:
        now = datetime.now()
        last_active = session.get('last_active')
        if last_active:
            last_dt = datetime.fromisoformat(last_active)
            if now - last_dt > timedelta(minutes=SESSION_TIMEOUT_MINUTES):
                logout_user(session['username'])  # ✅ 更新 Supabase
                session.clear()
                return redirect(url_for('login'))
        session['last_active'] = now.isoformat()  # ✅ 每次请求更新活跃时间
        update_last_active(session['username'])  # ✅ 每次请求更新数据库活跃时间

def debug_request():
    print(f"📥 请求到达: {request.path}")

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

    # ✅ 解析前端提交的用户名和密码
    username = request.form.get('username')
    password = request.form.get('password')

    # ✅ 查询 Supabase
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }

    query_url = f"{SUPABASE_URL}/rest/v1/user_accounts?username=eq.{username}&password=eq.{password}"
    response = requests.get(query_url, headers=headers)

    if response.status_code != 200 or not response.json():
        return jsonify({"success": False, "message": "输入的用户名和密码无效，请确认！"}), 401

    # ✅ 匹配成功
    old_user = session.get('username')
    if old_user:
        logout_user(old_user)
        session.clear()

    ip = get_client_ip()
    now = get_current_time()
    session['username'] = username
    session['last_active'] = datetime.now().isoformat()

    insert_login_log({
        "username": username,
        "ip": ip,
        "login_time": now,
        "last_active": now,
        "status": "登录中"
    })

    return jsonify({"success": True})

@app.route('/course')
def course_select():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('course_selection.html', username=session['username'])

@app.route('/EE-W_Test')
def ee_w_test():
    if 'username' not in session:
        return redirect(url_for('login'))  # ✅ 登录校验没问题
    return render_template('test/EE-W.html')  # ✅ 路径指向新模板位置

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
@app.route('/heartbeat')
def heartbeat():
    if 'username' in session:
        now = datetime.now()
        last_active = session.get('last_active')
        if last_active:
            last_dt = datetime.fromisoformat(last_active)
            if now - last_dt > timedelta(minutes=SESSION_TIMEOUT_MINUTES):
                logout_user(session['username'])  # ✅ 主动执行登出
                session.clear()
                return 'Session expired', 440  # 非标准状态码，用于前端识别

        session['last_active'] = now.isoformat()
        update_last_active(session['username'])
        return 'OK', 200

    return 'Unauthorized', 401

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
        })

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
        return jsonify({"success": False, "message": "注册成功但更新邀请码失败"})

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
    now = datetime.now(TIMEZONE)
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

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    print(f"✅ Running Flask on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port)