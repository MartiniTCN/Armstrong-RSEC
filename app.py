from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import pytz
from datetime import datetime, timedelta
import os
import requests

app = Flask(__name__)
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
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        session.clear()  # ✅ 每次打开登录页时清除旧会话
        return render_template('login.html')
    
    # ✅ POST 请求，表示提交登录
    if request.method == 'POST':
        debug_request()
        return handle_login()
    username = request.form.get('username')
    password = request.form.get('password')  # 这里只是接收，无验证逻辑

    # ✅ 检查是否已有其他账号在登录，如果有，先将旧账号状态更新为“已登出”
    old_user = session.get('username')
    if old_user:
        logout_user(old_user)  # 🔁 更新 Supabase 中旧账号的状态
        session.clear()

    # ✅ 登录成功逻辑
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

@app.route('/course')
def course_select():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('course_selection.html', username=session['username'])

@app.route('/EE-W_Test')
def ee_w_test():
    return render_template('EE-W_Test.html')

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
    import psycopg2

    conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
    cur = conn.cursor()
    cur.execute("SELECT * FROM login_log ORDER BY login_time DESC")
    logs = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify(logs)

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
        return jsonify({"success": False, "message": "Supabase 配置缺失"}), 500

    data = request.form
    username = data.get('username')
    password = data.get('password')
    company = data.get('company')
    city = data.get('city')
    email = data.get('email')
    phone = data.get('phone')
    sales_name = data.get('sales')  # ✅ 表单中是 name="sales"
    invite_code = data.get('invite_code')

    if not all([username, password, company, city, email, phone, sales_name, invite_code]):
        return jsonify({"success": False, "message": "请填写所有字段"})

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}"
    }

    # ✅ 检查邀请码有效性
    check_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/invitation_codes?code=eq.{invite_code}&is_used=eq.false",
        headers=headers
    )
    if check_resp.status_code != 200 or not check_resp.json():
        return jsonify({"success": False, "message": "邀请码无效或已被使用"})
    # ✅ 检查用户名是否重复（新增）
    check_user_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_accounts?username=eq.{username}",
        headers=check_headers
    )
    if check_user_resp.status_code == 200 and check_user_resp.json():
        return jsonify({"success": False, "message": "该用户名已注册"})

    # ✅ 插入用户数据
    insert_headers = headers.copy()
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

    # ✅ 更新邀请码使用状态
    from datetime import datetime
    update_payload = {
        "is_used": True,
        "used_by": username,
        "used_at": datetime.now().isoformat()
    }
    update_resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/invitation_codes?code=eq.{invite_code}",
        headers=insert_headers,
        json=update_payload
    )
    if update_resp.status_code not in [200, 204]:
        return jsonify({"success": False, "message": "注册成功但更新邀请码失败"})

    return jsonify({"success": True, "message": "注册成功"})


@app.route('/health')
def health_check():
    return 'OK', 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    print(f"✅ Running Flask on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port)