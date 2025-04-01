# ✅ Flask 登录系统与课程跳转逻辑

from flask import Flask, render_template, redirect, url_for, session, request
import random
import os

# ✅ 初始化 Flask 应用
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default_dev_secret_key')

# ✅ 登录首页
@app.route('/', methods=['GET', 'POST'])
def login():
    error = None

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        captcha_input = request.form.get('captcha')
        captcha_real = session.get('captcha')

        print(f"[DEBUG] 用户输入: 用户名={username}, 密码={password}, 验证码={captcha_input}, 正确答案={captcha_real}")

        if not captcha_input or captcha_input.strip() != str(captcha_real):
            error = '验证码错误'
        elif username != 'admin' or password != '123456':
            error = '用户名或密码错误'
        else:
            # ✅ 登录成功后跳转到课程选择页面
            return redirect(url_for('course_selection'))

    # ✅ GET 或失败时生成新验证码
    num1 = random.randint(1, 9)
    num2 = random.randint(1, 9)
    operator = random.choice(['+', '-'])
    question = f"{num1} {operator} {num2}"
    answer = eval(question)
    session['captcha'] = answer

    return render_template('login.html', error=error, math_question=question)

# ✅ 课程选择页路由
@app.route('/courses')
def course_selection():
    return render_template('course_selection.html')

# ✅ EE-W 测试课程跳转页面
@app.route('/ee-w')
def ee_w():
    return render_template('EE-W_Test.html')

# ✅ 启动开发服务器
if __name__ == '__main__':
    app.run(debug=True)