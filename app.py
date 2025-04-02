from flask import Flask, render_template, request, redirect, url_for, session
# import sqlite3
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
    """连接 PostgreSQL 数据库（使用 Supabase 提供的 DATABASE_URL）"""
    import psycopg2
    import os
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise RuntimeError("未设置环境变量 DATABASE_URL")
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        print("[ERROR] 无法连接到 Supabase 数据库：", e)
        raise

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
    """检查是否有超时未操作的用户"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = now_beijing()
    cursor.execute("SELECT id, last_active FROM login_log WHERE status = '登录中'")
    rows = cursor.fetchall()
    for row in rows:
        last_active = row[1]
        if now - last_active > timedelta(minutes=15):
            print(f"[超时退出] 记录 ID {row[0]} 超过 15 分钟未操作，已登出")
            cursor.execute("""
                UPDATE login_log
                SET status = %s, logout_time = %s
                WHERE id = %s
            """, ('已登出', now.isoformat(), row[0]))
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
            # ---  测试连接是否成功 ---
            try:
                conn = get_db_connection()
                print("[DEBUG] 成功连接到 Supabase 数据库")
                conn.close()
            except Exception as e:
                print("[ERROR] 无法连接数据库：", e)

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

    # 从表单中获取用户输入的用户名、密码、验证码
    username = request.form['username']
    password = request.form['password']
    answer = request.form['captcha']
    expected = session.get('captcha')  # 获取 session 中的验证码正确答案

    # 验证码判断逻辑
    if not expected or not answer or int(answer) != expected:
        # 生成新的验证码题目，重新渲染登录页
        num1, num2 = random.randint(1, 9), random.randint(1, 9)
        question = f"{num1} + {num2} = ?"
        session['captcha'] = num1 + num2
        return render_template('login.html', error="验证码错误", math_question=question)

    # 账户密码校验（你可以扩展成数据库验证）
    if username == "admin" and password == "123456":
        # 登录成功，记录 session
        session['username'] = username

        # 获取 IP 与当前北京时间
        ip = get_client_ip()
        now = now_beijing().isoformat()

        # 写入 Supabase 中 login_log 表
        try:
            conn = get_db_connection()  # 使用你统一定义的连接方法
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO login_log (username, ip, login_time, last_active, status)
                VALUES (%s, %s, %s, %s, %s)
            """, (username, ip, now, now, '登录中'))
            conn.commit()
            conn.close()
            print(f"[DEBUG] 用户 {username} 登录成功，记录已写入 Supabase")
        except Exception as e:
            print("[ERROR] 登录记录写入失败：", e)

        # 登录后跳转课程页
        return redirect(url_for('course_selection'))

    else:
        # 用户名或密码错误，生成新验证码
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

@app.route('/EE-W_Test.html')
def ee_w_test():
    return render_template('EE-W_Test.html')

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

@app.route('/log')
def login_log():
    """展示登录日志页面，读取 Supabase 中 login_log 表"""

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 查询所有登录日志记录，按登录时间倒序
        cursor.execute("""
            SELECT id, username, ip, login_time, last_active, logout_time, status
            FROM login_log
            ORDER BY login_time DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        # 渲染到模板 log.html
        return render_template('log.html', logs=rows)

    except Exception as e:
        print("[ERROR] 日志查询失败：", e)
        return "日志加载失败"

@app.route('/health')
def health():
    """Render部署健康检查"""
    return "OK"


@app.before_request
def update_last_active():
    """每次请求前更新活动时间，并执行超时检测"""
    username = session.get('username')
    if username:
        try:
            # ✅ 更新用户活动时间
            conn = get_db_connection()
            cursor = conn.cursor()
            now = now_beijing().isoformat()
            cursor.execute("""
                UPDATE login_log
                SET last_active = %s
                WHERE username = %s AND status = '登录中'
            """, (now, username))
            conn.commit()
            conn.close()
        except Exception as e:
            print("[警告] 无法更新用户活动时间：", e)

    # ✅ 检查所有“登录中”用户是否超时（无论是否登录用户）
    try:
        check_timeout()
    except Exception as e:
        print("[警告] 检查超时失败：", e)

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