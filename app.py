from flask import Flask, render_template, request, redirect, url_for, session
from datetime import datetime
import random

app = Flask(__name__)
app.secret_key = 'Martin-Armstrong-Passw0rd-2025!'

# ✅ 用于 Render 部署健康检查的接口
@app.route('/health')
def health_check():
    """
    Render 会在部署期间访问 /health 路由，
    如果返回状态码 200 则认为服务部署成功。
    此接口不会暴露任何敏感信息。
    """
    return "OK", 200


# 登录页
@app.route('/', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        answer = request.form.get('answer')
        correct_answer = session.get('math_answer')

        # 简单的用户名密码验证
        if username == 'admin' and password == 'password':
            if correct_answer and answer and int(answer) == correct_answer:
                return redirect(url_for('course_selection'))  # 登录成功跳转课程选择页
            else:
                error = '验证码错误，请重新输入'
        else:
            error = '用户名或密码错误'

    # 每次访问登录页生成一个新题目
    num1 = random.randint(1, 9)
    num2 = random.randint(1, 9)
    session['math_answer'] = num1 + num2
    question = f"{num1} + {num2} = ?"

    return render_template('login.html', error=error, math_question=question)

# ✅ 登录后跳转的课程选择页面
@app.route('/course_selection')
def course_selection():
    return render_template('course_selection.html')

# ✅ EE-W 课程入口页面
@app.route('/EE-W_Test')
def EE_W_test():
    return render_template('protected.html')


if __name__ == '__main__':
    app.run(debug=True)