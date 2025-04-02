from flask import Flask, render_template, request, redirect, url_for, session
import pytz
from datetime import datetime, timedelta
import os
import random  # ✅ 保留用于数学题验证
import requests


app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'Martin-Armstrong-Passw0rd-2025!')
print(f"[DEBUG] 当前 SECRET_KEY: {os.environ.get('SECRET_KEY')}")

# ========== 全局配置 ==========
TIMEZONE = pytz.timezone('Asia/Shanghai')
SESSION_TIMEOUT_MINUTES = 15

# ========== 工具函数部分 ==========

def generate_math_question():
    """生成一个简单的数学加法题（两个 1 位数）并返回问题与答案"""
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    return f"{a} + {b} = ?", str(a + b)

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

# ========== 登录前置钩子 ==========
@app.before_request
def check_session_timeout():
    """每次请求前检查 session 是否超时，更新 last_active"""
    if 'username' in session:
        now = datetime.now()
        last_active = session.get('last_active')
        if last_active:
            last_dt = datetime.fromisoformat(last_active)
            if now - last_dt > timedelta(minutes=SESSION_TIMEOUT_MINUTES):
                session.clear()
                return redirect(url_for('login'))
        session['last_active'] = now.isoformat()
        update_last_active(session['username'])
        
def debug_request():
    print(f"📥 请求到达: {request.path}")

# ========== 页面路由 ==========
@app.route('/login')
def login():
    question, answer = generate_math_question()           # ✅ 生成问题与答案
    session['captcha_answer'] = answer                    # ✅ 存入 session 做后续验证
    return render_template('login.html', math_question=question)  # ✅ 把问题传给前端

@app.route('/do_login', methods=['POST'])
def do_login():
    username = request.form.get('username')
    captcha = request.form.get('captcha')
    correct_answer = session.get('captcha_answer')

    if captcha != correct_answer:
        question, answer = generate_math_question()  # 重新生成题目
        session['captcha_answer'] = answer
        return render_template(
            'login.html',
            math_question=question,
            shake=True  # 👈 用于前端判断是否抖动
        )

    # ✅ 正确后继续登录
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
    return render_template('course_select.html', username=session['username'])

@app.route('/ee-w')
def ee_w_test():
    return render_template('EE-W_Test.html')

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/health')
def health_check():
    return 'OK', 200


# ========== 启动入口 ==========
if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 10000))  # Render 会设置 PORT 环境变量
    print(f"✅ Running Flask on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port)
