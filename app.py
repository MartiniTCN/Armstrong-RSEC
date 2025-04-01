from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3
import pytz
from datetime import datetime, timedelta
import os
import random  # ✅ 保留用于数学题验证

app = Flask(__name__)
app.secret_key = 'your_secret_key'

DATABASE = 'login_log.db'

# ========== 工具函数部分 ==========

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库，创建 login_log 表（仅当不存在时）"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            ip TEXT NOT NULL,
            login_time TEXT NOT NULL,
            last_active TEXT NOT NULL,
            logout_time TEXT,
            status TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def get_client_ip():
    """获取客户端真实 IP 地址"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0]
    return request.remote_addr

def now_beijing():
    """获取当前北京时间"""
    tz = pytz.timezone('Asia/Shanghai')
    return datetime.now(tz)

def check_timeout():
    """检查登录记录中是否有 15 分钟无操作的，自动登出"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = now_beijing()
    cursor.execute("SELECT id, last_active FROM login_log WHERE status = '登录中'")
    rows = cursor.fetchall()
    for row in rows:
        last_active = datetime.fromisoformat(row['last_active'])
        if now - last_active > timedelta(minutes=15):
            cursor.execute("UPDATE login_log SET status='已登出', logout_time=? WHERE id=?", (now.isoformat(), row['id']))
    conn.commit()
    conn.close()

# ========== 路由部分 ==========

@app.route('/')
def login():
    """登录页入口，显示数学题验证，执行超时检测"""
    check_timeout()  # 检查是否有超时记录
    num1 = random.randint(1, 9)
    num2 = random.randint(1, 9)
    session['captcha_answer'] = num1 + num2
    return render_template('login.html', question=f"{num1} + {num2} = ?")

@app.route('/login', methods=['POST'])
def do_login():
    """处理登录请求"""
    username = request.form['username']
    password = request.form['password']
    answer = request.form['captcha']
    expected = session.get('captcha_answer')

    if not expected or not answer or int(answer) != expected:
        return render_template('login.html', error="验证码错误", question=f"{random.randint(1,9)} + {random.randint(1,9)} = ?")

    if username.startswith("user") and password == "password":
        session['username'] = username
        ip = get_client_ip()
        now = now_beijing().isoformat()

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO login_log (username, ip, login_time, last_active, status) VALUES (?, ?, ?, ?, ?)",
                       (username, ip, now, now, '登录中'))
        conn.commit()
        conn.close()

        return redirect(url_for('course_selection'))
    else:
        return render_template('login.html', error="账号或密码错误", question=f"{random.randint(1,9)} + {random.randint(1,9)} = ?")

@app.route('/course_selection')
def course_selection():
    """跳转课程选择页"""
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('course_selection.html')

@app.route('/logout')
def logout():
    """登出并更新 logout_time"""
    username = session.get('username')
    if username:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = now_beijing().isoformat()
        cursor.execute("UPDATE login_log SET status='已登出', logout_time=? WHERE username=? AND status='登录中'",
                       (now, username))
        conn.commit()
        conn.close()
    session.clear()
    return redirect(url_for('login'))

@app.route('/login_log')
def login_log():
    """展示登录日志页面"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM login_log ORDER BY id DESC")
    logs = cursor.fetchall()
    conn.close()
    return render_template('login_log.html', logs=logs)

@app.route('/health')
def health():
    """Render部署健康检查"""
    return "OK"

# ========== 应用入口 ==========

# ✅ Render平台：立即初始化数据库（不依赖于 __main__ 块）
init_db()  # 初始化数据库，仅在首次部署时创建 login_log 表

# ✅ 本地开发时运行调试服务器（Render 会忽略 __main__ 块）
if __name__ == '__main__':
    app.run(debug=True)