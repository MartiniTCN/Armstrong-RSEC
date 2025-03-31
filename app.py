from flask import Flask, render_template, redirect, url_for, session, request
import random
import os  # ✅ 新增：用于从环境变量读取 SECRET_KEY

# ✅ 初始化 Flask 应用
app = Flask(__name__)

# 添加健康检查接口
@app.route('/health')
def health_check():
    return 'OK', 200
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

        # ✅ 输出调试信息
        print(f"[DEBUG] 用户输入: 用户名={username}, 密码={password}, 验证码={captcha_input}, 正确答案={captcha_real}")
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