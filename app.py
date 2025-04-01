from flask import Flask, render_template, redirect, url_for, session, request
import random
import os  # ✅ 新增：用于从环境变量读取 SECRET_KEY

app = Flask(__name__)

# ✅ 用于 Render 部署健康检查的接口
@app.route('/health')
def health_check():
    return 'OK', 200
app.secret_key = os.environ.get('SECRET_KEY', 'default_dev_secret_key')

# 登录页
@app.route('/', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        captcha_input = request.form.get('captcha')
        captcha_real = session.get('captcha')

        # 简单的用户名密码验证
        print(f"[DEBUG] 用户输入: 用户名={username}, 密码={password}, 验证码={captcha_input}, 正确答案={captcha_real}")
        if not captcha_input or captcha_input.strip() != str(captcha_real):
            error = '验证码错误'
        elif username != 'admin' or password != '123456':
            error = '用户名或密码错误'
        else:
            # ✅ 登录成功 → 记录登录日志
            import csv
            from datetime import datetime

            user_ip = request.remote_addr
            login_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            log_row = [username, login_time, user_ip, ""]  # 登出时间为空

            log_file = 'static/logins.csv'  # 确保 static 目录存在
            with open(log_file, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(log_row)

            ip_address = request.remote_addr  # ✅ 修改为下一行：
            ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)

            # ✅ 登录成功后跳转/courses 课程选择页
            return redirect(url_for('courses'))

    # 每次访问登录页生成一个新题目
    num1 = random.randint(1, 9)
    num2 = random.randint(1, 9)
    operator = random.choice(['+', '-'])
    question = f"{num1} {operator} {num2}"
    answer = eval(question)
    session['captcha'] = answer

    return render_template('login.html', error=error, math_question=question)

# ✅ 登录后跳转的课程选择页面
@app.route('/courses')
def courses():
    return render_template('course_selection.html')

# ✅ EE-W 课程入口页面
@app.route('/EE-W_Test')
def EE_W_test():
    return render_template('EE-W_Test.html')

# ✅ 显式添加路由：返回课程选择页面
@app.route('/course_selection.html')
def course_selection():
    return render_template('course_selection.html')

@app.route('/logs')
def view_logs():
    return app.send_static_file('Login_Log.html')


if __name__ == '__main__':
    app.run(debug=True)