from flask import Flask, render_template, redirect, url_for, session, request
import random
import os

# 初始化 Flask 应用
app = Flask(__name__)

# 从环境变量或默认值设置 SECRET_KEY
app.secret_key = os.environ.get('SECRET_KEY', 'default_dev_secret_key')

# 登录页
@app.route('/', methods=['GET', 'POST'])
def login():
    error = None

    # 处理 POST 请求时的表单提交
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        captcha_input = request.form.get('captcha')
        captcha_real = session.get('captcha')

        # 校验验证码
        if not captcha_input or captcha_input.strip() != str(captcha_real):
            error = '验证码错误'
        elif username != 'admin' or password != '123456':
            error = '用户名或密码错误'
        else:
            # 登录成功后跳转到 /courses
            return redirect(url_for('courses'))

    # 生成数学题
    num1 = random.randint(1, 9)
    num2 = random.randint(1, 9)
    operator = random.choice(['+', '-'])
    question = f"{num1} {operator} {num2}"
    answer = eval(question)
    session['captcha'] = answer

    return render_template('login.html', error=error, math_question=question)

# 课程选择页面
@app.route('/courses')
def courses():
    return render_template('course_selection.html')

# 启动服务器
if __name__ == '__main__':
    app.run(debug=True)