from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3
from datetime import datetime, timedelta
import pytz
import os
import random

# 初始化 Flask 应用
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default_dev_secret_key')
init_db()  # 初始化数据库表结构

# 数据库路径
# 超时时间设置（分钟）
# 获取北京时间
def get_bj_time():
    return datetime.now(pytz.timezone('Asia/Shanghai'))

# 初始化 SQLite 数据库，创建 login_log 表（如果尚未存在）
def init_db():
    conn = sqlite3.connect('logindata.db')  # 使用 SQLite 数据库
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            ip TEXT,
            login_time TEXT,
            logout_time TEXT,
            status TEXT,
            last_active TEXT
        )
    ''')
    conn.commit()
    conn.close()

# === 登录记录写入 ===
def log_login(username, ip_address):
    login_time = get_bj_time().strftime('%Y-%m-%d %H:%M:%S')
    conn = sqlite3.connect('login_log.db')
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO login_log (username, ip_address, login_time, last_active, status)
        VALUES (?, ?, ?, ?, ?)
    """, (username, ip_address, login_time, login_time, '登录中'))
    conn.commit()
    conn.close()

# === 更新活跃状态 ===
def update_activity(username):
    now = get_bj_time().strftime('%Y-%m-%d %H:%M:%S')
    conn = sqlite3.connect('login_log.db')
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE login_log
        SET last_active = ?
        WHERE username = ? AND status = '登录中'
    """, (now, username))
    conn.commit()
    conn.close()
# 检查用户是否超时未操作，自动登出
def check_timeout():
    now = get_bj_time()
    conn = sqlite3.connect('login_log.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, last_active FROM login_log WHERE status = '登录中'")
    for row in cursor.fetchall():
        log_id, last_active_str = row
        last_active = datetime.strptime(last_active_str, '%Y-%m-%d %H:%M:%S')
        if now - last_active > timedelta(minutes=15):
            cursor.execute("""
                UPDATE login_log
                SET status = '已退出', logout_time = ?
                WHERE id = ?
            """, (now.strftime('%Y-%m-%d %H:%M:%S'), log_id))
    conn.commit()
    conn.close()

# 健康检查接口，供 Render 检测部署状态
@app.route('/health')
def health():
    return 'OK'
# 登录页面（验证码 + 账号密码验证）
@app.route('/', methods=['GET', 'POST'])
def login():
    check_timeout()  # 每次访问首页时执行超时检测
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        captcha_input = request.form.get('captcha')
        captcha_answer = session.get('captcha')

        # 简单的用户名密码验证
        if not captcha_input or captcha_input.strip() != str(captcha_answer):
            error = '验证码错误'
        elif username != 'admin' or password != '123456':
            error = '用户名或密码错误'
        else:
            session['username'] = username
            log_login(username, request.remote_addr)
            return redirect(url_for('course_selection'))

    # 每次访问登录页生成一个新题目
    num1, num2 = random.randint(1, 9), random.randint(1, 9)
    operator = random.choice(['+', '-'])
    question = f"{num1} {operator} {num2}"
    session['captcha'] = eval(question)

    return render_template('login.html', error=error, math_question=question)


# === 课程选择页 ===
@app.route('/course_selection')
def course_selection():
    if 'username' not in session:
        return redirect(url_for('login'))
    update_activity(session['username'])
    return render_template('course_selection.html')

# === EE-W 课程页面 ===
@app.route('/EE-W_Test')
def ee_w_test():
    if 'username' not in session:
        return redirect(url_for('login'))
    update_activity(session['username'])
    return render_template('EE-W_Test.html')

# === 登录日志查看页面 ===
@app.route('/Login_Log')
def login_log():
    conn = sqlite3.connect('login_log.db')
    cursor = conn.cursor()
    cursor.execute("""
        SELECT username, ip_address, login_time, last_active, logout_time, status
        FROM login_log ORDER BY login_time DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return render_template('login_log.html', logs=rows)

# === 服务器启动时自动创建数据库表 如果还不存在）： ===

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS login_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                ip_address TEXT,
                login_time TEXT,
                logout_time TEXT,
                status TEXT,
                last_active TEXT
            )
        ''')
        conn.commit()


@app.before_first_request
def startup_tasks():
    

# Gunicorn 会自动运行这个 app 实例
if __name__ == '__main__':
    app.run(debug=True)