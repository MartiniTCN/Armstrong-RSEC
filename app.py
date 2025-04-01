from flask import Flask, render_template, request, redirect, session, url_for, flash
import os
import random

# 初始化 Flask 应用
app = Flask(__name__)

# 配置 SECRET_KEY 用于 session 管理，可以在 Render 或网站环境中通过环境变量设置
app.secret_key = os.environ.get("SECRET_KEY", "default_secret")

# 登录页面：支持 GET 和 POST
@app.route('/', methods=['GET', 'POST'])
def login():
    # 如果是 POST 提交表单，进行验证
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        captcha_input = request.form.get('captcha')
        captcha_answer = session.get('captcha_answer')

        # 校验验证码答案
        if not captcha_input or captcha_input.strip() != str(captcha_answer):
            flash('Captcha incorrect.')
        elif username != 'admin' or password != '123456':
            flash('Invalid username or password.')
        else:
            # 登录成功，跳转到课程选择页
            return redirect(url_for('course_selection'))

    # 无论是 GET 请求还是验证失败，重新生成数学题
    a = random.randint(1, 10)
    b = random.randint(1, 10)
    op = random.choice(['+', '-'])
    question = f"{a} {op} {b}"
    answer = eval(question)
    session['captcha_answer'] = answer

    return render_template('login.html', math_question=question)

# 课程选择页：登录后跳转到
@app.route('/course_selection')
def course_selection():
    return render_template('course_selection.html')

# 访问指定课程：EE-W 课程页面
@app.route('/ee_w')
def ee_w():
    return render_template('EE-W_Test.html')

# 启动 Flask 开发模式
if __name__ == '__main__':
    app.run(debug=True)