from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3
import pytz
from datetime import datetime, timedelta
import os
import random  # ✅ 保留用于数学题验证

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'Martin-Armstrong-Passw0rd-2025!')
print(f"[DEBUG] 当前 SECRET_KEY: {os.environ.get('SECRET_KEY')}")

DATABASE = 'login_log.db'

# ========== 工具函数部分 ==========

def generate_math_question():
    """生成一个简单的数学加法题（两个 1 位数）并返回问题与答案"""
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    return f"{a} + {b} = ?", str(a + b)

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

    cursor.execute("SELECT id, username, last_active FROM login_log WHERE status = '登录中'")
    rows = cursor.fetchall()

    for row in rows:
        last_active = datetime.fromisoformat(row['last_active'])
        if now - last_active > timedelta(minutes=15):
            cursor.execute(
                "UPDATE login_log SET status='已登出', logout_time=? WHERE id=?",
                (now.isoformat(), row['id'])
            )
            print(f"[超时登出] 用户名: {row['username']}，登录ID: {row['id']}，上次活动时间: {row['last_active']}，当前时间: {now.isoformat()}")

    conn.commit()
    conn.close()

   

# ========== 路由部分 ==========

@app.route('/', methods=['GET', 'POST'])
def login():
    check_timeout()  # ✅ 只在登录页执行
    error = None

    # --- 处理 POST 登录提交 ---
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        captcha_input = request.form.get('captcha')
        captcha_real = session.get('captcha')

        print(f"[DEBUG] 用户输入: 用户名={username}, 密码={password}, 验证码={captcha_input}, 正确答案={captcha_real}")

        # --- 验证失败情况 ---
        if not captcha_input or captcha_input.strip() != str(captcha_real):
            error = '验证码错误'
            print("[DEBUG] 验证码不正确")
        elif username != 'admin' or password != '123456':
            error = '用户名或密码错误'
            print("[DEBUG] 用户名或密码错误")
        else:
            # --- 登录成功 ---
            print("[DEBUG] 登录成功，即将跳转到课程选择页")
            return redirect(url_for('course_selection'))  # ✅ 使用正确的 endpoint 名称

    # --- 无论 POST 或 GET 都需要生成新的数学题 ---
    num1 = random.randint(1, 9)
    num2 = random.randint(1, 9)
    operator = random.choice(['+', '-'])
    question = f"{num1} {operator} {num2}"
    answer = eval(question)
    session['captcha'] = answer

    # --- 渲染页面 ---
    return render_template('login.html', error=error, math_question=question)

@app.route('/login', methods=['POST'])
def do_login():
    """处理登录请求"""
    username = request.form['username']
    password = request.form['password']
    answer = request.form['captcha']
    expected = session.get('captcha')  # ✅ 与统一用法一致

    # 验证码判断
    if not expected or not answer or int(answer) != expected:
        # 重新生成数学题并写入 session
        num1, num2 = random.randint(1, 9), random.randint(1, 9)
        question = f"{num1} + {num2} = ?"
        session['captcha'] = num1 + num2
        return render_template('login.html', error="验证码错误", math_question=question)

    # 用户名/密码判断
    if username == "admin" and password == "123456":
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
        # 再生成一次题目
        num1, num2 = random.randint(1, 9), random.randint(1, 9)
        question = f"{num1} + {num2} = ?"
        session['captcha'] = num1 + num2
        return render_template('login.html', error="账号或密码错误", math_question=question)

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


@app.before_request
def update_last_active_and_check_timeout():
    """在每次请求前更新活跃时间；首页执行超时自动登出"""
    username = session.get('username')

    # ✅ 1. 已登录用户，更新 last_active 字段
    if username:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            now = now_beijing().isoformat()
            cursor.execute("""
                UPDATE login_log
                SET last_active = ?
                WHERE username = ? AND status = '登录中'
            """, (now, username))
            conn.commit()
            conn.close()
        except Exception as e:
            print("[警告] 更新用户活动时间失败：", e)

    # ✅ 2. 仅在访问首页时执行超时自动登出逻辑（避免频繁扫描数据库）
   # if request.path == '/':
    #    try:
     #       check_timeout()
      #  except Exception as e:
       #     print("[警告] 超时登出检查失败：", e)

# ========== 应用入口 ==========

# ✅ Render平台：立即初始化数据库（不依赖于 __main__ 块）
init_db()  # 初始化数据库，仅在首次部署时创建 login_log 表

# ✅ 本地开发时运行调试服务器（Render 会忽略 __main__ 块）
if __name__ == '__main__':
    app.run(debug=True)