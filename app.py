from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3
import os
from datetime import datetime, timedelta
import pytz

# 初始化 Flask 应用
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "default_secret_key")

# 数据库路径
DB_PATH = "login_log.db"
# 超时时间设置（分钟）
TIMEOUT_MINUTES = 15
# 设置为北京时间
BEIJING_TZ = pytz.timezone("Asia/Shanghai")

# === 数据库初始化 ===
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            login_time TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            last_active TEXT NOT NULL,
            status TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# === 登录记录写入 ===
def log_login(username, ip):
    now = datetime.now(BEIJING_TZ).strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO login_logs (username, login_time, ip_address, last_active, status) VALUES (?, ?, ?, ?, ?)",
                   (username, now, ip, now, "在线"))
    conn.commit()
    conn.close()

# === 更新活跃状态 ===
def update_activity(username, ip):
    now = datetime.now(BEIJING_TZ)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, last_active FROM login_logs WHERE username = ? AND ip_address = ? AND status = '在线' ORDER BY id DESC LIMIT 1",
                   (username, ip))
    row = cursor.fetchone()
    if row:
        last_active = datetime.strptime(row[1], "%Y-%m-%d %H:%M:%S")
        if now - last_active > timedelta(minutes=TIMEOUT_MINUTES):
            # 超时设为已退出
            cursor.execute("UPDATE login_logs SET status = '已退出' WHERE id = ?", (row[0],))
        else:
            # 更新活跃时间
            cursor.execute("UPDATE login_logs SET last_active = ? WHERE id = ?", (now.strftime("%Y-%m-%d %H:%M:%S"), row[0]))
    conn.commit()
    conn.close()

# === 登录页面 ===
@app.route("/", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if username == "admin" and password == "123456":
            session["username"] = username
            session["ip"] = request.remote_addr
            log_login(username, session["ip"])
            return redirect("/course_selection")
        else:
            error = "用户名或密码错误"
    return render_template("login.html", error=error)

# === 课程选择页 ===
@app.route("/course_selection")
def course_selection():
    if "username" not in session:
        return redirect("/")
    update_activity(session["username"], session["ip"])
    return render_template("course_selection.html")

# === EE-W 课程页面 ===
@app.route("/ee-w")
def ee_w():
    if "username" not in session:
        return redirect("/")
    update_activity(session["username"], session["ip"])
    return render_template("EE-W_Test.html")

# === 登录日志查看页面 ===
@app.route("/login_log")
def login_log():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username, login_time, ip_address, last_active, status FROM login_logs ORDER BY id DESC")
    logs = cursor.fetchall()
    conn.close()
    return render_template("login_log.html", logs=logs)

# === Render 健康检查 ===
@app.route("/health")
def health():
    return "OK", 200

# === 启动服务（本地用） ===
if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        init_db()
    app.run(debug=True)