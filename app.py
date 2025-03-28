

from flask import Flask, render_template, redirect, url_for, session, request
import random
import os  # ✅ 新增：用于从环境变量读取 SECRET_KEY

# ✅ 初始化 Flask 应用
app = Flask(__name__)

# 添加健康检查接口
@app.route('/health')
def health_check():
    return 'OK', 200

# ✅ 从环境变量读取 Secret Key（部署平台使用），如果未设置则使用默认值
app.secret_key = os.environ.get('SECRET_KEY', 'default_dev_secret_key')

# ✅ 登录首页：支持 GET 渲染与 POST 表单验证
@app.route('/', methods=['GET', 'POST'])
def login():
    error = None  # 用于显示错误信息

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        captcha_input = request.form.get('captcha')
        captcha_real = session.get('captcha')  # 从 session 获取验证码正确答案

        # ✅ 输出调试信息
        print(f"[DEBUG] 用户输入: 用户名={username}, 密码={password}, 验证码={captcha_input}, 正确答案={captcha_real}")

        # ✅ 验证验证码是否正确（不区分大小写）
        if not captcha_input or captcha_input.strip() != str(captcha_real):
            error = '验证码错误'
        # ✅ 验证用户名密码
        elif username != 'admin' or password != '123456':
            error = '用户名或密码错误'
        # ✅ 登录成功，跳转到 protected 页面
        else:
            return redirect(url_for('protected'))

    # ✅ 无论 GET 访问或验证失败，都会重新生成新的数学题
    num1 = random.randint(1, 9)
    num2 = random.randint(1, 9)
    operator = random.choice(['+', '-'])
    question = f"{num1} {operator} {num2}"
    answer = eval(question)  # 使用 eval 计算数学题结果

    session['captcha'] = answer  # 保存答案到 session

    # ✅ 渲染 login.html，传入错误提示和题目内容
    return render_template('login.html', error=error, math_question=question)

# ✅ 登录成功后访问的受保护页面
@app.route('/protected')
def protected():
    return render_template('protected.html')

# ✅ 启动开发服务器（仅开发使用）
if __name__ == '__main__':
    app.run(debug=True)
