// 文件路径：/static/common/render
// 说明：统一测试页面渲染与评估脚本，支持加载 CSV、评分、语言切换、邮件发送

const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs';  // ✅ 实际密钥
window.isRestoringAnswers = false
// ✅ 从 sessionStorage 获取当前登录用户名（需登录后写入）
const currentUsername = sessionStorage.getItem("username") || "未知用户";

// ✅ 从当前 HTML 路径中提取课程名称（如 /templates/Booster.html）
const pathSegments = window.location.pathname.split("/");
const currentCourse = pathSegments[pathSegments.length - 1]?.replace(".html", "") || "未知课程";
// ✅ 从 URL 中提取课程名称（如 /course/Booster）

// ✅ render.js 中定义的函数（不需要 <script> 包裹）
function handleLogout() {
  window.location.href = "/logout";
}

// ✅ 优化：仅首次加载时设置中文
if (!localStorage.getItem("language")) {
  localStorage.setItem("language", "zh");
}
let currentLanguage = localStorage.getItem("language") || "zh";

 // 🌈 基础样式统一定义，便于明暗主题切换 + 后期维护
const textClass = "text-gray-800 dark:text-gray-100";
const inputClass = "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded";
const buttonClass = "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline";
const cardClass = "bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-4";
const modalClass = "fixed z-50 inset-0 overflow-y-auto bg-gray-800 bg-opacity-50 flex items-center justify-center";

let parsedQuestions = [];
let correctAnswers = { single: [], multiple: [], judge: [], essay: [] };


// ✅ 工具函数：创建并显示统一风格的模态弹窗
// ✅ 工具函数：创建并显示统一风格的模态弹窗（支持输入框、确认/关闭按钮）
function createModal(id, title, message, onConfirm = null, showClose = true, showInput = false, inputPlaceholder = "") {
  // 移除已有同名模态框
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  // 创建模态容器
  const modal = document.createElement("div");
  modal.id = id;
  modal.className = modalClass;

  // 构造模态内容区域
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-900 text-gray-800 dark:text-white rounded-xl p-6 w-80 shadow-lg text-center">
      <h3 class="text-lg font-bold mb-2">${title}</h3>
      <p class="mb-4">${message}</p>

      ${showInput ? `
        <input
          id="${id}-input"
          type="text"
          placeholder="${inputPlaceholder || '请输入'}"
          class="w-full p-2 mb-4 rounded border dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      ` : ''}

      <div class="flex justify-center gap-4">
        ${onConfirm ? `<button id="${id}-confirmBtn" class="${buttonClass}">确认</button>` : ''}
        ${showClose ? `<button id="${id}-closeBtn" class="bg-gray-300 dark:bg-gray-700 text-black dark:text-white px-4 py-2 rounded">关闭</button>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // ✅ 绑定确认按钮事件（带输入）
  if (onConfirm) {
    const confirmBtn = document.getElementById(`${id}-confirmBtn`);
    confirmBtn?.addEventListener("click", () => {
      const value = showInput ? document.getElementById(`${id}-input`).value.trim() : null;
      onConfirm(value); // 将输入值作为参数传入回调函数
      modal.remove();
    });
  }

  // ✅ 绑定关闭按钮事件
  if (showClose) {
    const closeBtn = document.getElementById(`${id}-closeBtn`);
    closeBtn?.addEventListener("click", () => modal.remove());
  }
}

function updateLanguageUI(lang) {
  // ✅ 卡片标题替换（用 data-title-zh / data-title-en）
  document.querySelectorAll("h2").forEach(h2 => {
    const zh = h2.dataset.titleZh;
    const en = h2.dataset.titleEn;
    if (zh && en) {
      const icon = h2.querySelector("i")?.outerHTML || "";
      h2.innerHTML = `${icon}${lang === 'zh' ? zh : en}`;
    }
  });
  // ✅ 更新所有学员信息表单标签
  document.querySelectorAll("label[data-zh][data-en] .lang-label").forEach(el => {
    const parent = el.closest("label");
    if (parent) {
      el.textContent = currentLanguage === "zh"
        ? parent.getAttribute("data-zh")
        : parent.getAttribute("data-en");
    }
  });

  // ✅ 更新所有 input placeholder
  document.querySelectorAll("input[data-placeholder-zh][data-placeholder-en]").forEach(input => {
    input.placeholder = currentLanguage === "zh"
      ? input.getAttribute("data-placeholder-zh")
      : input.getAttribute("data-placeholder-en");
  });

  // ✅ 导航栏标题
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    const zh = pageTitle.getAttribute("data-title-zh");
    const en = pageTitle.getAttribute("data-title-en");
    pageTitle.textContent = lang === "zh" ? zh : en;
  }

  // ✅ 登录信息（保留图标）
  const userGreeting = document.getElementById("userGreeting");
  if (userGreeting) {
    const username = userGreeting.dataset.username || "";
    const greeting = lang === "zh" ? `${username}` : `${username}`;

    userGreeting.innerHTML = `
      <i class="fas fa-graduation-cap mr-2 text-[12px]"></i>
      <span class="font-semibold">${greeting}</span>
    `;
  }

  // ✅ 退出按钮
  const logoutText = document.getElementById("logoutText");
  if (logoutText) {
    logoutText.textContent = lang === "zh" ? "退出" : "Logout";
    logoutText.className = "text-blue-500 cursor-pointer hover:underline";
  }

  // ✅ 返回课程按钮
  const backToCourse = document.querySelector('a[href="/course"]');
  if (backToCourse) {
    backToCourse.innerHTML =
      lang === 'en'
        ? '<i class="fas fa-arrow-left mr-2"></i>Back to course list'
        : '<i class="fas fa-arrow-left mr-2"></i>返回课程选择页';
  }

  // ✅ 倒计时状态按钮
  const statusBtnSpan = document.querySelector('#examStatusBar button span');
  if (statusBtnSpan) {
    statusBtnSpan.innerText =
      isPaused
        ? (lang === 'en' ? 'Resume' : '继续')
        : (lang === 'en' ? 'Pause' : '暂停');
  }

  // ✅ 表单字段 label 更新（加判空处理）
  const labelCompany = document.querySelector('label[for="company"]');
  if (labelCompany)
    labelCompany.innerHTML = lang === 'en'
      ? '<span class="text-red-500">*</span> Company Name'
      : '<span class="text-red-500">*</span> 公司名称';

  const labelName = document.querySelector('label[for="name"]');
  if (labelName)
    labelName.innerHTML = lang === 'en'
      ? '<span class="text-red-500">*</span> Full Name'
      : '<span class="text-red-500">*</span> 学员姓名';

  const labelPhone = document.querySelector('label[for="phone"]');
  if (labelPhone)
    labelPhone.innerHTML = lang === 'en'
      ? '<span class="text-red-500">*</span> Phone Number'
      : '<span class="text-red-500">*</span> 手机号码';

  const labelEmail = document.querySelector('label[for="email"]');
  if (labelEmail)
    labelEmail.innerHTML = lang === 'en' ? 'Email Address' : '邮箱地址';

    // ✅ 更新题干（class="question-text"）
    document.querySelectorAll(".question-text").forEach(p => {
      const zh = p.getAttribute("data-zh");
      const en = p.getAttribute("data-en");
      if (zh && en) {
        const indexMatch = p.textContent.trim().match(/^\d+/); // 提取题号
        const prefix = indexMatch ? `${indexMatch[0]}. ` : "";
        p.textContent = prefix + (lang === "zh" ? zh : en);
      }
    });
  
    // ✅ 更新选项内容（class="option-text"）
    document.querySelectorAll(".option-text").forEach(span => {
      const zh = span.getAttribute("data-zh");
      const en = span.getAttribute("data-en");
      if (zh && en) {
        const prefixMatch = span.textContent.trim().match(/^[A-D]\./); // 选项字母 A. B. 等
        const prefix = prefixMatch ? `${prefixMatch[0]} ` : "";
        span.textContent = prefix + (lang === "zh" ? zh : en);
      }
    });

    // ✅ 更新 textarea placeholder（简答题）
    document.querySelectorAll("textarea[data-placeholder-zh][data-placeholder-en]").forEach(textarea => {
      textarea.placeholder = lang === "zh"
        ? textarea.getAttribute("data-placeholder-zh")
        : textarea.getAttribute("data-placeholder-en");
    });

}

function updateQuestionTextLanguage(lang) {
  document.querySelectorAll('.question-text').forEach(el => {
    const zh = el.getAttribute('data-zh');
    const en = el.getAttribute('data-en');
    el.innerHTML = `${el.innerHTML.split('. ')[0]}. ${lang === 'zh' ? zh : en}`;
  });
}

// ✅ 语言切换函数：自动弹出模态提示框，不用 alert
function toggleLanguage() {
  // 1. 切换语言状态
  currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
  localStorage.setItem("language", currentLanguage);

  // 2. 更新语言图标
  const flag = document.getElementById("languageFlag");
  if (flag) {
    flag.src = `https://flagcdn.com/${currentLanguage === 'en' ? 'cn' : 'us'}.svg`;
    flag.alt = currentLanguage === 'en' ? "中文" : "English";
  }

  // 3. 创建并显示提示弹窗（蓝底白字，自动消失）
  const msg = document.createElement("div");
  msg.id = "langSwitchToast";
  msg.className = `
    fixed top-1/2 left-1/2 
    transform -translate-x-1/2 -translate-y-1/2 
    bg-blue-600 text-white text-xs sm:text-sm px-4 py-2 
    rounded-xl shadow-md z-[9999] text-center max-w-xs 
    animate-fade-in-scale
  `;
  msg.innerText = currentLanguage === "zh"
    ? "🌐 语言切换中，请稍候... Language is switching..."
    : "🌐 Language is switching... 请稍候...";

  document.getElementById("langSwitchToast")?.remove();
  document.body.appendChild(msg);

  // ✅ 淡出 + 移除
  setTimeout(() => {
    msg.classList.remove("animate-fade-in-scale");
    msg.classList.add("animate-fade-out-scale");

    setTimeout(() => msg.remove(), 300); // wait for fade-out
  }, 1200); // 保持显示时间

  // 4. 更新导航栏、表单、按钮等静态文字
  updateLanguageUI(currentLanguage);
  updateQuestionTextLanguage(currentLanguage); // ✅ 添加这行

  // 5. 重新渲染题目（保持原有答题）
  //renderQuestions(parsedQuestions);

  // 6. 更新加载提示文字（如果有）
  updateLoadingText();

  // 7. 如果在评测页，重新渲染结果内容
  if (typeof renderAssessmentResult === "function" && document.getElementById("resultTableBody")) {
    renderAssessmentResult();
  }
  
}

// ✅ 更新语言按钮图标
function updateLangIcon() {
  const icon = document.getElementById("langIcon");
  if (icon) {
    icon.src = currentLanguage === "zh" ? "/static/flags/zh.svg" : "/static/flags/en.svg";
    icon.alt = currentLanguage === "zh" ? "中文" : "English";
  }
}

// ✅ 初始化语言按钮
document.getElementById("langToggle")?.addEventListener("click", toggleLanguage);
updateLangIcon(); // 页面加载时更新图标


// ✅ 语言切换按钮处理
function switchLanguage(lang) {
  currentLanguage = lang;
  console.log(`🌐 已切换语言为：${lang}`);
  alert(`🌐 已切换为 ${lang === 'zh' ? '中文' : 'English'} 模式`);
  //renderQuestions(parsedQuestions);
}
// ✅ 支持的中英文提示（全局）
const loadingMessages = {
  zh: "测试题加载中，请稍后…",
  en: "Loading questions, please wait..."
};

function showLoadingMessage() {
  // 若已存在则不重复添加
  if (document.getElementById("questionLoadingMessage")) return;

  const msg = document.createElement("div");
  msg.id = "questionLoadingMessage";
  msg.className = `
    fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
    bg-blue-600 text-white text-sm sm:text-base px-6 py-3 rounded-xl shadow-lg
    z-[9999] text-center animate-fade-in-scale max-w-sm
  `;
  msg.innerHTML = `
    <div>📘 题目加载中...</div>
    <div class="text-xs sm:text-sm opacity-80 mt-1">Question is loading...</div>
  `;
  document.body.appendChild(msg);
}

function hideLoadingMessage() {
  const msg = document.getElementById("questionLoadingMessage");
  if (msg) msg.remove();
}


// ✅ 根据语言更新加载提示
function updateLoadingText() {
  const lang = localStorage.getItem("language") || "zh";
  const loadingText = document.getElementById("loadingText");
  if (loadingText) {
    loadingText.textContent = loadingMessages[lang];
  }
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active-page');
  });
  document.getElementById(pageId).classList.add('active-page');
  window.scrollTo(0, 0);
  if (pageId === 'homePage' || pageId === 'completePage') {
    isPaused = true;
    document.getElementById('testPage').classList.add('blur-overlay');
  }
}



// ✅ 工具函数：关闭指定 ID 的模态框
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.remove();
}




// ✅ 弹出“确认提交答卷”的模态框
function confirmSubmitTest() {
  const lang = localStorage.getItem("language") || "zh";

  const title = lang === "zh" ? "确认提交" : "Submit Confirmation";
  const message = lang === "zh"
    ? "你确定要提交本次答卷吗？提交后将无法修改。"
    : "Are you sure you want to submit your answers? You won’t be able to change them after.";

  // ✅ 使用统一风格的模态框
  createModal("submitConfirmModal", title, message, () => {
    submitTest(); // 点击确认后才真正提交答卷
  });
}

// ✅ 公共函数：获取输入值
function getInputValue(name) {
  const el = document.querySelector(`[name="${name}"]`);
  return el ? el.value.trim() : "";
}

function getFallbackValue(id) {
  const el = document.getElementById(id);
  return el ? (el.value?.trim?.() || el.textContent?.trim?.() || "") : "";
}

// ✅ 提交答卷，只跳转，不执行评测、不导出、不发送邮件
function submitTest() {

  // 确保 parsedQuestions 存在并已正确填充
  const parsedQuestions = JSON.parse(sessionStorage.getItem("parsedQuestions") || "[]");
  console.log("提交时读取的题目数据：", parsedQuestions);

  const userInfo = {
    company: getFallbackValue("company"),
    name: getFallbackValue("name"),
    phone: getFallbackValue("phone"),
    email: getFallbackValue("email")
  };

  // ✅ 收集答题内容
  const answers = collectAnswers(); // { singleChoice, multipleChoice, judgment, essay }

  // ✅ 构造完整数据结构
  const finalData = {
    userInfo,
    ...answers
  };

  // ✅ 上传每一道题的答案到 Supabase
  Object.entries(answers).forEach(([type, answerSet]) => {
    Object.entries(answerSet).forEach(([questionId, answer]) => {
      submitAnswerToSupabase({
        username: currentUsername,
        course: currentCourse,
        questionId,
        questionType: type,
        answer
      });
    });
  });

  console.log("📤 已收集完成，准备提交答卷");

  // ✅ 页面切换到完成页
  showPage("completePage");

  // ✅ 渲染完成页内容
  renderAnswersOnCompletePage(finalData);
}

// ✅ 渲染完成页上用户提交的答案（不包含正确答案与得分）
function renderAnswersOnCompletePage(answers) {
  const now = new Date().toLocaleString('zh-CN', { hour12: false });

  // ✅ 读取渲染顺序（必须与评分一致）
  const parsedQuestions = JSON.parse(sessionStorage.getItem("parsedQuestions") || "[]");

  // ✅ 强制排序：单选 → 多选 → 判断 → 简答
  const grouped = { single: [], multiple: [], judge: [], essay: [] };
  parsedQuestions.forEach(q => {
    const type = q?.type?.toLowerCase();
    if (grouped[type]) grouped[type].push(q);
  });
  const sortedQuestions = [
    ...grouped.single,
    ...grouped.multiple,
    ...grouped.judge,
    ...grouped.essay
  ];

  // ✅ 渲染学员信息
  document.getElementById("resultCompany").textContent = answers.userInfo.company;
  document.getElementById("resultName").textContent = answers.userInfo.name;
  document.getElementById("resultEmail").textContent = answers.userInfo.email;
  document.getElementById("resultPhone").textContent = answers.userInfo.phone;
  document.getElementById("resultTime").textContent = now;

  // ✅ 清空旧表格
  const tbody = document.getElementById("resultTableBody");
  tbody.innerHTML = "";

  const createRow = (type, num, yourAnswer) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border p-2">${type}</td>
      <td class="border p-2">${num}</td>
      <td class="border p-2">${yourAnswer}</td>
      <td class="border p-2 text-gray-400 italic">-</td>
      <td class="border p-2 text-gray-400 italic">-</td>
    `;
    tbody.appendChild(row);
  };

  // ✅ 索引标记器
  const index = { single: 1, multiple: 1, judge: 1, essay: 1 };

  sortedQuestions.forEach((q, i) => {
    if (!q || !q.type) {
      console.warn(`⚠️ 第 ${i + 1} 题无效，跳过：`, q);
      return;
    }
  
    const type = q.type.toLowerCase();
    const id = q.id;
    let userAnswer = "未答";
    let label = "";
  
    if (type === "single") {
      userAnswer = answers.singleChoice?.[id] || "未答";
      label = "单选题";
      createRow(label, index.single++, userAnswer);
  
    } else if (type === "multiple") {
      const val = answers.multipleChoice?.[id] || [];
      userAnswer = val.length > 0 ? val.join(", ") : "未答";
      label = "多选题";
      createRow(label, index.multiple++, userAnswer);
  
    } else if (type === "judge") {
      const val = answers.judgment?.[id];
      const normalized = val?.toLowerCase()?.trim();
      userAnswer = normalized === "true" ? "✔ 正确"
                  : normalized === "false" ? "✘ 错误"
                  : "未答";
      label = "判断题";
      createRow(label, index.judge++, userAnswer);
  
    } else if (type === "essay") {
      const val = answers.essay?.[id];
      if (!val || typeof val !== "string" || val.trim() === "") {
        userAnswer = "未答";
      } else {
        userAnswer = val.length > 50 ? val.slice(0, 50) + "..." : val;
      }
      label = "简答题";
      createRow(label, index.essay++, userAnswer);
    }
  });
  console.log("🔄 完成页读取的题目数据：", parsedQuestions);

}

// ✅ 收集评测结果并展示在完成页（含评分与等级判定）
function evaluateAnswers(userAnswers, correctAnswers) {
  let totalScore = 0;
  const resultRows = [];

  const typeMap = {
    singlechoice: "单选题",
    multiplechoice: "多选题",
    judgement: "判断题",
    essay: "简答题"
  };

  const scoreMap = {
    singlechoice: 2,
    multiplechoice: 1,
    judgement: 1,
    essay: 10
  };

  for (const type in correctAnswers) {
    const userGroup = userAnswers[type] || {};
    const correctGroup = correctAnswers[type] || {};

    for (const qid in correctGroup) {
      const correct = correctGroup[qid];
      const user = userGroup[qid] ?? "";
      let score = 0;

      if (type === "multiplechoice") {
        const correctSet = new Set(correct.split(",").map(s => s.trim()));
        const userSet = new Set((user || "").split(",").map(s => s.trim()));
        const isCorrect = correctSet.size === userSet.size && [...correctSet].every(x => userSet.has(x));
        score = isCorrect ? scoreMap[type] : 0;
      } else if (type === "essay") {
        const keywords = correct.split(/[，,。.\s]+/).filter(Boolean); // 用标点或空格分词
        const matchCount = keywords.filter(k => user.includes(k)).length;
        score = Math.round((matchCount / keywords.length) * scoreMap[type]);
      } else {
        score = (user.trim() === correct.trim()) ? scoreMap[type] : 0;
      }

      totalScore += score;

      resultRows.push({
        type: typeMap[type],
        id: qid,
        user: user || "未答",
        correct: correct,
        score: score
      });
    }
  }

  return { totalScore, resultRows };
}

// ✅ 点击“开始评测”按钮时的入口
function onStartEvaluationClick() {
  if (confirm("您确定开始进行评测吗？\n\n一旦开始，将无法返回测试页，并会导出 PDF、推送结果到 Armstrong RSEC。")) {
    // 用户点击“是”，继续弹出动态验证码
    promptPasswordAndSend();
  } else {
    // 用户点击“否”，什么也不做
    return;
  }
}

// ✅ 动态验证码验证 + 分支处理
function promptPasswordAndSend() {
  const code = prompt("请输入动态口令（如由 RSEC 部门提供）：");

  if (!code) return alert("未输入验证码，操作已取消。");

  if (code === "RSEC") {
    // ✅ 验证成功，执行全部逻辑
    const answers = collectAnswers();
    renderAssessmentResult(answers); // 渲染完成页
    exportPDF(answers);              // 导出 PDF
    sendEmailResult(answers);        // 发送邮件
    evaluationStarted = true;
  } else {
    // ❌ 验证失败，只导出 PDF 并提醒
    const answers = collectAnswers();
    evaluationStarted = true;
    renderAssessmentResult(answers);
    exportPDF(answers);
    alert("动态验证码错误，仅导出 PDF，未发送邮件，请联系管理员。");
  }
}

// ✅ 通用滚动函数：支持偏移，支持过渡丝滑
function smoothScrollToElement(element, offset = 0) {
  if (!element) return;
  
  const targetY = element.getBoundingClientRect().top + window.scrollY + offset;

  window.scrollTo({
    top: targetY,
    behavior: "smooth" // 平滑滚动
  });
}

// ✅ 点击题型标题跳转（跳到该题型区域开头）
function scrollToType(type) {
  const section = document.querySelector(`[data-section="${type}"]`);
  if (section) {
    // 偏移导航栏高度，比如 -130px
    smoothScrollToElement(section, -130);
  } else {
    console.warn("❌ 无法找到题型锚点：", type);
  }
}

// ✅ 更新题目进度（渲染小圆点）
function updateProgressFromDOM() {
  if (window.isRestoringAnswers) return;

  const containers = {
    single: document.getElementById("single-progress"),
    multi: document.getElementById("multi-progress"),
    judge: document.getElementById("judge-progress"),
    essay: document.getElementById("essay-progress"),
  };

  const data = {
    single: { total: 0, done: 0 },
    multi: { total: 0, done: 0 },
    judge: { total: 0, done: 0 },
    essay: { total: 0, done: 0 },
  };

  // 清空每个题型的进度容器
  Object.values(containers).forEach(c => c && (c.innerHTML = ""));

  // ✅ 渲染对应题型的小圆点并更新进度统计
  function renderDots(selector, type, isAnswered) {
    const cards = document.querySelectorAll(selector);

    console.log(`正在渲染 ${type} 类型题目的小圆点...`);
    console.log(`共 ${cards.length} 个题目`);

    cards.forEach((card, index) => {
      const dot = document.createElement("div");
      dot.className = "dot-circle";
      dot.textContent = index + 1;
      dot.title = `第 ${index + 1} 题`;

      if (isAnswered(card)) {
        dot.classList.add("bg-green-500");
        data[type].done++; // ✅ 更新已答数量
      } else {
        dot.classList.add("bg-gray-400");
      }

      data[type].total++; // ✅ 总题数增加

      dot.onclick = () => {
        smoothScrollToElement(card, -90); // 🔥 偏移 90px 避开导航栏
      };

      containers[type]?.appendChild(dot);
    });
  }

  // 单选题：判断当前题目是否已选
  renderDots(".question-card[data-type='single']", "single", card => {
    const radio = card.querySelector("input[type='radio']:checked");
    return radio && radio.value.trim() !== "";
  });

  // 多选题：判断当前题目是否已选
  renderDots(".question-card[data-type='multiple']", "multi", card => {
    const checkboxes = card.querySelectorAll("input[type='checkbox']:checked");
    return checkboxes.length > 0;
  });

  // 判断题：判断当前题目是否已选
  renderDots(".question-card[data-type='judge']", "judge", card => {
    const radio = card.querySelector("input[type='radio']:checked");
    return radio && radio.value.trim() !== "";
  });

  // 简答题：判断当前题目是否已输入
  renderDots(".essay-card[data-id]", "essay", card => {
    const textarea = card.querySelector("textarea");
    return textarea && textarea.value.trim() !== "";
  });

  console.log("🎯 当前各类型答题进度统计", data);
}

// 假设用户信息存储在表单中
function getUserInfo() {
  return {
    company: document.getElementById("company").value,
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value
  };
}

// ✅ 答案收集
function collectAnswers() {
  const answers = {
    singleChoice: {},
    multipleChoice: {},
    judgment: {},
    essay: {},
    userInfo: {
      company: document.getElementById("company")?.value?.trim() || "",
      name: document.getElementById("name")?.value?.trim() || "",
      phone: document.getElementById("phone")?.value?.trim() || "",
      email: document.getElementById("email")?.value?.trim() || ""
    }
  };

  // ✅ 单选题
  document.querySelectorAll(".question-card[data-type='single']").forEach(card => {
    const id = card.getAttribute("data-id")?.trim();
    const input = card.querySelector("input[type='radio']:checked");
    if (id && input) {
      answers.singleChoice[id] = input.value;
    } else {
      //console.warn(`⚠️ 单选题未作答或缺少 ID：`, card);
    }
  });

  // ✅ 多选题
  document.querySelectorAll(".question-card[data-type='multiple']").forEach(card => {
    const id = card.getAttribute("data-id")?.trim();
    const checked = [...card.querySelectorAll("input[type='checkbox']:checked")];
    if (id && checked.length > 0) {
      answers.multipleChoice[id] = checked.map(cb => cb.value);
    } else {
      //console.warn(`⚠️ 多选题未作答或缺少 ID：`, card);
    }
  });

  // ✅ 判断题
  document.querySelectorAll(".question-card[data-type='judge']").forEach(card => {
    const id = card.getAttribute("data-id")?.trim();
    const input = card.querySelector("input[type='radio']:checked");
    if (id && input) {
      answers.judgment[id] = input.value;
    } else {
      //console.warn(`⚠️ 判断题未作答或缺少 ID：`, card);
    }
  });

  // ✅ 简答题
  document.querySelectorAll(".essay-card[data-id]").forEach(card => {
    const id = card.getAttribute("data-id")?.trim();
    const textarea = card.querySelector("textarea");
    if (id && textarea) {
      answers.essay[id] = textarea.value.trim();
    } else {
      //console.warn(`⚠️ 简答题未作答或缺少 ID：`, card);
    }
  });

  const snapshot = JSON.stringify(answers);
  console.log(`📦 当前收集到的答题内容：`, snapshot);

  // ✅ 存入全局
  window.collectedAnswers = answers;
  //console.log("✅ 已收集答题结果：", answers); // Martin 暂时隐藏答题收集结果的 console 提示
  return answers;

  // ✅ 新增：每次收集后更新进度
  updateQuestionProgress(answers);
}

 
function renderAssessmentResult() {
  const tableBody = document.getElementById("resultTableBody");
  if (!tableBody) {
    console.error("❌ 找不到表格容器 resultTableBody！");
    return;
  }

  // ✅ 保底 parsedQuestions（刷新后从 sessionStorage 读取）
  if (!Array.isArray(window.parsedQuestions)) {
    try {
      window.parsedQuestions = JSON.parse(sessionStorage.getItem("parsedQuestions") || "[]");
    } catch {
      window.parsedQuestions = [];
    }
  }

  if (!Array.isArray(window.parsedQuestions) || window.parsedQuestions.length === 0) {
    console.error("❌ parsedQuestions 无效！");
    return;
  }

  const allData = window.collectedAnswers || JSON.parse(sessionStorage.getItem("collectedAnswers") || "{}");
  const answers = {
    singleChoice: allData.singleChoice || {},
    multipleChoice: allData.multipleChoice || {},
    judgment: allData.judgment || {},
    essay: allData.essay || {}
  };
  const userInfo = allData.userInfo || {};

  // ✅ 渲染学员信息
  document.getElementById("resultCompany").textContent = userInfo.company || "-";
  document.getElementById("resultName").textContent = userInfo.name || "-";
  document.getElementById("resultPhone").textContent = userInfo.phone || "-";
  document.getElementById("resultEmail").textContent = userInfo.email || "-";
  document.getElementById("resultTime").textContent = new Date().toLocaleString();

  // ✅ 清空表格
  tableBody.innerHTML = "";
  const indexMap = { single: 1, multiple: 1, judge: 1, essay: 1 };
  let totalScore = 0;
  let fullScore = 0;

  // ✅ 按题型重新分组（保证完成页顺序为：单选→多选→判断→简答）
  const grouped = { single: [], multiple: [], judge: [], essay: [] };
  window.parsedQuestions.forEach(q => {
    const t = q?.type?.toLowerCase();
    if (grouped[t]) grouped[t].push(q);
  });

  // ✅ 统一渲染逻辑
  ["single", "multiple", "judge", "essay"].forEach(type => {
    grouped[type].forEach((q, i) => {
      const id = q.id;
      const label = currentLanguage === "zh"
        ? (type === "single" ? "单选题" : type === "multiple" ? "多选题" : type === "judge" ? "判断题" : "简答题")
        : (type === "single" ? "Single" : type === "multiple" ? "Multiple" : type === "judge" ? "True/False" : "Essay");

      const displayLabel = `${label} ${indexMap[type]++}`;
      let userAnswer = "未答";
      let correctAnswer = q.answer;
      let score = 0;
      let scoreFull =
        type === "single" ? 2 :
        type === "multiple" ? 1 :
        type === "judge" ? 1 :
        type === "essay" ? 20 : 0;

      if (type === "single") {
        const ua = answers.singleChoice[id];
        userAnswer = ua || "未答";
        if (ua === correctAnswer) score = scoreFull;

      } else if (type === "multiple") {
        const ua = answers.multipleChoice[id] || [];
        const correct = correctAnswer.split("").map(s => s.trim()).sort();
        const selected = [...ua].map(s => s.trim()).sort();
        userAnswer = selected.length > 0 ? selected.join(", ") : "未答";
        if (selected.join("") === correct.join("")) score = scoreFull;

      } else if (type === "judge") {
        const ua = answers.judgment[id];
        const normalized = ua?.toLowerCase()?.trim();
        const correctNorm = q.answer?.toLowerCase()?.trim();
      
        const isTrue = val => val === "true" || val === "✔ 正确" || val === "正确";
        const isFalse = val => val === "false" || val === "✘ 错误" || val === "错误";
      
        userAnswer = isTrue(normalized) ? "✔ 正确"
                    : isFalse(normalized) ? "✘ 错误"
                    : "未答";
      
        correctAnswer = isTrue(correctNorm) ? "正确"
                       : isFalse(correctNorm) ? "错误"
                       : correctNorm || "-";
      
        if ((isTrue(correctNorm) && isTrue(normalized)) ||
            (isFalse(correctNorm) && isFalse(normalized))) {
          score = scoreFull;
        }
      } else if (type === "essay") {
        const ua = answers.essay[id];
        const standard = q.answer || "-";  // answer 字段为英文标准答案
        if (typeof ua === "string" && ua.trim()) {
          userAnswer = ua.trim().length > 50 ? ua.trim().slice(0, 50) + "..." : ua.trim();
        } else {
          userAnswer = "未答";
        }
        correctAnswer = standard;
        score = "-";      // ✅ 不计分
        scoreFull = "-";  // ✅ 不显示总分
      }

      // ✅ 仅对可计算的题型进行得分统计（排除简答题）
      if (typeof score === 'number' && typeof scoreFull === 'number') {
        totalScore += score;
        fullScore += scoreFull;
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="border p-2 text-center">${displayLabel}</td>
        <td class="border p-2 text-center">${id}</td>
        <td class="border p-2 text-center">${userAnswer}</td>
        <td class="border p-2 text-center">${correctAnswer}</td>
        <td class="border p-2 text-center">${score} / ${scoreFull}</td>
      `;
      tableBody.appendChild(row);
    });
  });

  // ✅ 渲染得分与等级
  // ✅ 渲染得分与等级
    const safeTotal = Number.isFinite(totalScore) ? totalScore : 0;
    const safeFull = Number.isFinite(fullScore) ? fullScore : 0;

    // ✅ 计算所有题型的满分（含简答题）
    const allFullScore =
    grouped.single.length * 2 +
    grouped.multiple.length * 1 +
    grouped.judge.length * 1 +
    grouped.essay.length * 20;

    // ✅ 渲染总得分（实际得分 / 所有题目的总分）并备注不含简答题得分
    document.getElementById("resultScore").innerHTML = `
    <span class="text-base text-green-600 dark:text-green-400 font-bold">
      ${safeTotal} / ${allFullScore}
    </span>
    <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">(不含简答题得分)</span>
    `;

    // ✅ 渲染等级评定（统一字体大小）
    document.getElementById("resultLevel").innerHTML = totalScore >= fullScore * 0.6
      ? (currentLanguage === "zh"
          ? `<span class="text-base">✅ 合格</span>`
          : `<span class="text-base">✅ Pass</span>`)
      : (currentLanguage === "zh"
          ? `<span class="text-sm">⚠️ 建议重考</span>`
          : `<span class="text-sm">⚠️ Retake Suggested</span>`);
}

// ✅ 提取正确答案
function initCorrectAnswers(data) {
  correctAnswersMap = {}; // 🌐 全局标准答案字典

  data.forEach((row, idx) => {
    // ✅ 防御性判断：必须包含 type 和 answer 字段，且不能为纯空格
    if (!row || typeof row !== "object") {
      //console.warn(`❌ 无法识别为有效题目对象，第 ${idx + 1} 行：`, row);
      return;
    }
    
    if (!row.type) {
      console.warn(`⚠️ 缺少 type 字段，第 ${idx + 1} 行：`, row);
      return;
    }
    
    if (!row.answer || row.answer.trim() === "") {
      console.warn(`⚠️ 缺少答案字段，第 ${idx + 1} 行：`, row);
      return;
    }

    const type = row.type.trim().toLowerCase();           // 标准化题型
    const id = row.id?.trim() || `q_${type}_${idx}`;      // 题目 ID
    let answer = row.answer.trim();                       // 原始答案

    // ✅ 多选题：统一格式为 A,B,C...
    if (type === "multiple") {
      answer = answer
        .split(",")
        .map(a => a.trim().toUpperCase())
        .sort()
        .join(",");
    }

    // ✅ 判断题：支持中英文、符号等表达形式
    if (type === "judge") {
      const normalized = answer.toLowerCase().replace(/\s/g, "");
      if (["true", "yes", "✔", "√", "正确"].includes(normalized)) {
        answer = "true";
      } else if (["false", "no", "✘", "×", "错误"].includes(normalized)) {
        answer = "false";
      } else {
        console.warn(`❗️判断题答案格式异常 [index=${idx}]：`, {
          id: row?.id,
          question: row?.question_zh || row?.question_en,
          rawAnswer: row.answer
        });
        answer = "false"; // 默认容错处理
      }
    }

    // ✅ 添加至标准答案映射
    correctAnswersMap[id] = answer;
  });

  // ✅ 打印初始化完成信息
  console.log("✅ 初始化标准答案完成，共计：", Object.keys(correctAnswersMap).length, "题");
  //console.table(correctAnswersMap);
}

// ✅ 加载 CSV 文件并渲染题目（语言切换）
function loadCSVAndRender(csvPath, lang = "zh") {
  Papa.parse(csvPath, {
    download: true,
    header: true,
    complete: function (results) {
      renderQuestions(results.data, lang);
    }
  });
}

// ✅ 恢复答题状态（从 sessionStorage 中读取）


// ✅ 恢复用户填写信息（公司、姓名、电话、邮箱）
function restoreUserInfo() {
  const stored = sessionStorage.getItem("userInfo");
  if (!stored) {
    console.warn("⚠️ 无法恢复用户信息：没有找到缓存");
    return;
  }

  try {
    const info = JSON.parse(stored);
    if (info.company) document.getElementById("company").value = info.company;
    if (info.name) document.getElementById("name").value = info.name;
    if (info.phone) document.getElementById("phone").value = info.phone;
    if (info.email) document.getElementById("email").value = info.email;
    console.log("✅ 已恢复用户信息", info);
  } catch (e) {
    console.error("❌ 恢复用户信息失败：", e);
  }
}

let questionAlreadyLoaded = false; // ✅ 防止重复加载题库

function loadCSVAndInit(courseName) {
  if (!courseName || typeof courseName !== 'string') {
    alert("⚠️ 无法识别课程名，请检查 HTML 文件名是否正确！");
    return;
  }

  // 每次加载时清除缓存的题目顺序，确保每次加载都重新随机
  localStorage.removeItem(`shuffledQuestions_${courseName}`);

  if (questionAlreadyLoaded) return;
  questionAlreadyLoaded = true;

  const csvPath = `/static/csv/${courseName}.csv`;
  const lang = localStorage.getItem("language") || "zh";

  const shuffledKey = `shuffledQuestions_${courseName}`;
  const parsedKey = `parsedQuestions_${courseName}`;

  showLoadingMessage();

  Papa.parse(csvPath, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: async function (results) {
      results.data = results.data.map(row => {
        const fixed = {};
        Object.keys(row).forEach(k => fixed[k.trim()] = row[k]);
        return fixed;
      });
    
      const parsed = results.data.filter(row =>
        row && (row.question_zh || row.question_en) && row.type?.trim()
      );

      // 每次加载都重新打乱题目顺序
      let shuffled = shuffleArray(parsed);

      // 存储新的随机顺序到localStorage
      localStorage.setItem(shuffledKey, JSON.stringify(shuffled));

      parsedQuestions = shuffled;
      window.parsedQuestions = shuffled;
      console.log(`✅ 题库加载完成，共 ${parsed.length} 题`);
    
      initCorrectAnswers(shuffled);
      renderQuestions(shuffled);
      restoreUserInfo();

      hideLoadingMessage();

      // ✅ 显示恢复提示（小黑条）
      const restoreNotice = document.createElement("div");
      restoreNotice.textContent = "🔄 正在恢复答题记录...";
      restoreNotice.style = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: #fff;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(restoreNotice);

      try {
        await waitForDOMReady('.question-card, .essay-card textarea', 9000);
        await restoreAnswersFromSupabase();
        updateProgressFromDOM(); // 🔥 加这一行，确保恢复后同步刷新进度卡片
        restoreNotice.textContent = "✅ 答题记录恢复完成";
        console.log("✅ 答题记录已恢复 - loadCSVAndInit");

        if (!sessionStorage.getItem("parsedQuestions")) {
          sessionStorage.setItem("parsedQuestions", JSON.stringify(parsedQuestions));
        }

      } catch (err) {
        restoreNotice.textContent = "⚠️ 恢复失败：" + err;
        console.warn("⚠️ DOM 检测超时，跳过答题恢复：", err);
      }

      restoreNotice.style.transition = "opacity 0.5s ease";
      restoreNotice.style.opacity = "1";
      setTimeout(() => {
        restoreNotice.style.opacity = "0";
        setTimeout(() => restoreNotice.remove(), 500); // 等淡出完成再移除
      }, 2000);

    },

    error: function (err) {
      hideLoadingMessage();
      createModal("errorModal", lang === "zh" ? "加载失败" : "Load Failed", "❌ 加载题库失败！");
      console.error("📛 PapaParse 加载错误：", err);
    }
  });
}
// ✅ 全局标志：防止重复恢复
let hasRestoredAnswers = false;

function waitForDOMReady(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const interval = 50;  // 每隔50毫秒检查一次
    let timeSpent = 0;

    const checkDOM = () => {
      // 检查指定的元素是否已存在
      if (document.querySelector(selector)) {
        resolve();  // 元素存在，返回
      } else if (timeSpent >= timeout) {
        reject(`Timeout: Elements with selector "${selector}" not found within ${timeout}ms`);
      } else {
        timeSpent += interval;
        setTimeout(checkDOM, interval);  // 每隔一段时间再检查一次
      }
    };

    checkDOM();
  });
}

// ✅ 统一恢复函数，调用时机见下方
async function restoreAnswersFromSupabase() {
  if (!currentUsername || !currentCourse) return;
  if (hasRestoredAnswers) return;

  hasRestoredAnswers = true;
  window.isRestoringAnswers = true; // 🔒 防止其它逻辑干扰

  try {
    const res = await fetch(`https://yzzncbawckdwidrlcahy.supabase.co/rest/v1/quiz_lib?username=eq.${currentUsername}&course=eq.${currentCourse}`, {
      method: 'GET',
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs',
      }
    });

    const records = await res.json();
    console.log(`🔄 开始从 Supabase 恢复答题记录，共拉取 ${records.length} 条`);
    if (!Array.isArray(records)) return;

    records.forEach(record => {
      const { question_id, question_type, answer } = record;
      let card;
      if (question_type === "essay") {
        card =
          document.querySelector(`.essay-card[data-id="${question_id}"]`) ||
          document.querySelector(`.question-card[data-id="${question_id}"][data-type="essay"]`) ||
          document.querySelector(`.question-card[data-id="${question_id}"][data-type="text"]`);
        
        if (!card) {
          console.warn(`❌ 未找到简答题卡片：${question_id}`);
          return;
        }

        const textarea = card.querySelector('textarea');
        if (!textarea) {
          console.warn(`❌ 卡片 ${question_id} 中未找到 <textarea> 元素`);
          return;
        }

        textarea.value = answer;
        console.log(`✅ 简答题 ${question_id} 恢复成功：${answer.slice(0, 20)}...`);
        
      } else {
        card = document.querySelector(`.question-card[data-id="${question_id}"][data-type="${question_type}"]`);
        if (!card) {
          console.warn(`❌ 未找到 ${question_type} 卡片：${question_id}`);
          return;
        }
    
        if (question_type === "single" || question_type === "judge") {
          const radio = card.querySelector(`input[type="radio"][value="${answer}"]`);
          if (radio) {
            radio.checked = true;
            console.log(`✅ ${question_type} 题 ${question_id} 恢复成功`);
          }
    
        } else if (question_type === "multiple") {
          answer.split(',').forEach(val => {
            const checkbox = card.querySelector(`input[type="checkbox"][value="${val.trim()}"]`);
            if (checkbox) checkbox.checked = true;
          });
          console.log(`✅ 多选题 ${question_id} 恢复成功`);
        }
      }
    });

    // ✅ 仅在恢复数据完成后调用 updateProgressFromDOM() 更新答题进度卡
    setTimeout(() => {
      updateProgressFromDOM();
    }, 100); // 使用 setTimeout 保证恢复后更新进度卡

    console.log("✅ 答题记录已恢复 - restoreAnswersFromSupabase");

  // 确保恢复完成后更新进度卡
  updateProgressFromDOM();  // ✅ 更新答题进度

  } catch (err) {
    console.error("❌ 恢复失败：", err);
  } finally {
    window.isRestoringAnswers = false;    // 🔓 恢复结束
    updateProgressFromDOM();              // ✅ 安全更新进度
  }
}


// ✅ 最终优化版本：题目渲染函数（支持跳过无效题、类型校验、渲染缺失追踪）
function renderQuestions(data) {
  // ✅ 第一步：确认 data 是有效数组
  if (!Array.isArray(data)) {
    console.error("❌ 渲染失败：输入数据无效", data);
    return;
  }

  // ✅ 定义题型对应容器映射
  const sectionMap = {
    single: document.querySelector("[data-section='single']"),
    multiple: document.querySelector("[data-section='multi']"),
    judge: document.querySelector("[data-section='judge']"),
    essay: document.querySelector("[data-section='essay']")
  };

  // ✅ 初始化容器内容
  for (const [type, container] of Object.entries(sectionMap)) {
    if (!container) {
      console.warn(`⚠️ 缺少 ${type} 类型的容器 <div data-section="${type}">，将跳过该类型题目渲染`);
      continue;
    }
    container.innerHTML = ""; // 清空容器内容
  }

  const index = { single: 1, multiple: 1, judge: 1, essay: 1 }; // 题目编号
  const renderedIds = new Set(); // 用于追踪已渲染的题目 ID

  // ✅ 开始渲染题目
  data.forEach((row, i) => {
    const lineNum = i + 2; // 行号（从 2 开始，防止 0，1 误伤）

    if (!row || typeof row !== "object") {
      const debugFields = ["type", "id", "question_zh", "question_en", "answer"];
      const fieldStates = debugFields.map(f => `${f}: ${row?.[f] ?? "[undefined]"}`).join(" | ");
      console.warn(`⚠️ 第 ${lineNum} 行跳过：行数据为空或格式错误\n📌 字段状态：${fieldStates}`);
      return;
    }

    const requiredFields = ["type", "id", "question_zh", "question_en", "answer"];
    const details = requiredFields.map(f => `${f}: ${row[f] ?? "[缺失]"}`).join(" | ");
    //console.warn(`🔍 第 ${lineNum} 行字段状态：${details}`);

    const type = row.type?.toLowerCase?.().trim();
    if (!type || !(type in index)) {
      console.warn(`⚠️ 第 ${lineNum} 行跳过：题型无效或 index 中无对应类型 \"${row.type}\"`, row);
      return;
    }

    const qZh = row.question_zh?.trim?.() || "";
    const qEn = row.question_en?.trim?.() || "";
    const questionText = currentLanguage === "zh" ? qZh : qEn;
    if (!questionText) {
      console.warn(`⚠️ 第 ${lineNum} 行跳过：无题干（question_zh / question_en）`, row);
      return;
    }

    const id = row.id || `q_${type}_${index[type] || 0}`;
    let html = "";

    try {
      if (type === "single") {
        html = renderSingle(index.single++, row);
      } else if (type === "multiple") {
        html = renderMultiple(index.multiple++, row);
      } else if (type === "judge") {
        html = renderJudge(index.judge++, row);
      } else if (type === "essay") {
        html = renderEssay(index.essay++, row);
      }

      // ✅ 渲染题目到对应容器
      if (html && sectionMap[type]) {
        sectionMap[type].innerHTML += html;
        renderedIds.add(`${type}-${row.id}`);
      } else {
        console.warn(`⚠️ 第 ${lineNum} 行未能渲染至页面（容器缺失或 HTML 为空）`, row);
      }
    } catch (err) {
      console.error(`❌ 渲染失败：第 ${lineNum} 行（${type}-${id}）`, err, row);
    }
    
  });

  // ✅ 检查是否有未渲染的题目
  const expectedIds = data
    .filter(q => q && typeof q === "object" && q.type && q.id)
    .map(q => `${q.type}-${q.id}`);

  const missed = expectedIds.filter(id => !renderedIds.has(id));
  if (missed.length > 0) {
    console.warn(`📉 共 ${missed.length} 题未被渲染：`, missed);
  }

  console.log(`✅ 成功渲染题目数：${renderedIds.size}`);

  window.parsedQuestions = data; // 保持全局数据同步
}



// ✅ 使用 Fisher–Yates 随机算法打乱数组
// ✅ 安全打乱函数：不会修改原数组，返回打乱后的新数组
function shuffleArray(array) {
  const copy = array.slice(); // 拷贝一份，避免原数组被污染
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ✅ 随机种子生成（每次进入页面都会变）
function randomSeed() {
  return (Date.now() + Math.random()) % 1;
}

function renderQuestionsFromArray(questions) {
  const sectionMap = {
    single: document.querySelector("[data-section='single']"),
    multiple: document.querySelector("[data-section='multi']"),
    judge: document.querySelector("[data-section='judge']"),
    essay: document.querySelector("[data-section='essay']")
  };

  // 清空容器
  for (const container of Object.values(sectionMap)) {
    container.innerHTML = "";
  }

  let index = { single: 1, multiple: 1, judge: 1, essay: 1 };

  questions.forEach(row => {
    const type = row.type?.toLowerCase();
    const question = currentLanguage === 'zh' ? row.question_zh : row.question_en;
    const options = ['A', 'B', 'C', 'D'].map(opt =>
      currentLanguage === 'zh' ? row[opt] : row[`${opt}_EN`]
    );

    let html = "";

    if (type === 'single') {
      html = renderSingle(index.single++, question, options, row.id);
    } else if (type === 'multiple') {
      html = renderMultiple(index.multiple++, question, options, row.id);
    } else if (type === 'judge') {
      html = renderJudge(index.judge++, question, row.id);
    } else if (type === 'essay') {
      html = renderEssay(index.essay++, question, row.image_url || "", row.id || "");
    }

    if (html && sectionMap[type]) {
      sectionMap[type].innerHTML += html;
    }
  });
}

function checkMissingFields(row, lineNum, fields) {
  const missing = [];
  const check = (f) => typeof row[f] !== "string" || row[f].trim() === "";

  if (check("type")) missing.push("type");
  if (check("id")) missing.push("id");
  if (check("answer")) missing.push("answer");
  if (check("question_zh") && check("question_en")) missing.push("question_zh / question_en");

  if (row.type?.toLowerCase?.() === "single" || row.type?.toLowerCase?.() === "multiple") {
    ["A", "B", "C", "D"].forEach(opt => {
      if (check(opt)) missing.push(opt);
    });
  }

  if (missing.length > 0) {
    try {
      const fieldValues = fields.map(f => {
        const val = row[f];
        const safe = typeof val === "string" ? val.trim() : String(val);
        return `${f}: "${safe}"`;
      }).join(" | ");

      console.warn(
        `%c⚠️ 第 ${lineNum} 行缺失字段：${missing.join(", ")}`,
        "color:orange;font-weight:bold;"
      );
      console.log(`📌 字段内容：${fieldValues}`);
    } catch (e) {
      console.error(`❌ 第 ${lineNum} 行缺失字段打印失败：`, e);
    }
  }

  return missing;
}

// ✅ 渲染单选题并提交至 Supabase
function renderSingle(index, row) {
  if (!row || (!row.question_zh && !row.question_en)) return "";

  const zh = row.question_zh?.trim() || "";
  const en = row.question_en?.trim() || "";
  const questionText = currentLanguage === 'zh' ? zh : en;
  const imageUrl = row.image_url?.trim() || "";

  return `
  <div class="question-card mb-6 ${cardClass}" data-id="${row.id}" data-type="single">
    <p class="font-bold mb-2 ${textClass} question-text" data-zh="${zh}" data-en="${en}">
      ${index}. ${questionText}
    </p>
    ${imageUrl ? `
      <div class="flex justify-center mb-4">
        <img src="${imageUrl}" alt="参考图" class="max-w-full max-h-64 rounded shadow" />
      </div>` : ""}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      ${["A", "B", "C", "D"].map(opt => {
        const zhOpt = row[opt]?.trim() || "";
        const enOpt = row[`${opt}_EN`]?.trim() || "";
        const display = currentLanguage === 'zh' ? zhOpt : enOpt;
        return `
        <label class="flex items-center gap-2">
          <input type="radio" name="q${row.id}" value="${opt}" onchange="submitAnswerToSupabase({ username: currentUsername, course: currentCourse, questionId: '${row.id}', questionType: 'single', answer: '${opt}' })">
          <span class="${textClass} option-text" data-zh="${zhOpt}" data-en="${enOpt}">
            ${opt}. ${display}
          </span>
        </label>`;
      }).join('')}
    </div>
  </div>`;
}

// ✅ 渲染多选题并提交至 Supabase
function renderMultiple(index, row) {
  if (!row || (!row.question_zh && !row.question_en)) return "";

  const zh = row.question_zh?.trim() || "";
  const en = row.question_en?.trim() || "";
  const questionText = currentLanguage === 'zh' ? zh : en;
  const imageUrl = row.image_url?.trim() || "";

  return `
    <div class="question-card mb-6 ${cardClass}" data-id="${row.id}" data-type="multiple">
    <p class="font-bold mb-2 ${textClass} question-text" data-zh="${zh}" data-en="${en}">
      ${index}. ${questionText}
    </p>
    ${imageUrl ? `
      <div class="flex justify-center mb-4">
        <img src="${imageUrl}" alt="参考图" class="max-w-full max-h-64 rounded shadow" />
      </div>` : ""}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      ${["A", "B", "C", "D"].map(opt => {
        const zhOpt = row[opt]?.trim() || "";
        const enOpt = row[`${opt}_EN`]?.trim() || "";
        const display = currentLanguage === 'zh' ? zhOpt : enOpt;
        return `
        <label class="flex items-center gap-2">
          <input type="checkbox" name="q${row.id}" value="${opt}" onchange="handleMultiAnswer(this, '${row.id}')">
          <span class="${textClass} option-text" data-zh="${zhOpt}" data-en="${enOpt}">
            ${opt}. ${display}
          </span>
        </label>`;
      }).join('')}
    </div>
  </div>`;
}

// ✅ 渲染判断题并提交至 Supabase
function renderJudge(index, row) {
  if (!row || (!row.question_zh && !row.question_en)) return "";

  const zh = row.question_zh?.trim() || "";
  const en = row.question_en?.trim() || "";
  const questionText = currentLanguage === 'zh' ? zh : en;
  const imageUrl = row.image_url?.trim() || "";

  return `
  <div class="question-card mb-6 ${cardClass}" data-id="${row.id}" data-type="judge">
    <p class="font-bold mb-2 ${textClass} question-text" data-zh="${zh}" data-en="${en}">
      ${index}. ${questionText}
    </p>
    ${imageUrl ? `
      <div class="flex justify-center mb-4">
        <img src="${imageUrl}" alt="参考图" class="max-w-full max-h-64 rounded shadow" />
      </div>` : ""}
    <div class="flex flex-col gap-2">
      <label class="flex items-center gap-2">
        <input type="radio" name="q${row.id}" value="True" onchange="submitAnswerToSupabase({ username: currentUsername, course: currentCourse, questionId: '${row.id}', questionType: 'judge', answer: 'True' })">
        <span class="${textClass}">${currentLanguage === 'zh' ? '正确' : 'True'}</span>
      </label>
      <label class="flex items-center gap-2">
        <input type="radio" name="q${row.id}" value="False" onchange="submitAnswerToSupabase({ username: currentUsername, course: currentCourse, questionId: '${row.id}', questionType: 'judge', answer: 'False' })">
        <span class="${textClass}">${currentLanguage === 'zh' ? '错误' : 'False'}</span>
      </label>
    </div>
  </div>`;
}

// ✅ 渲染简答题模块（带上传功能）
function renderEssay(index, row) {
  if (!row || (!row.question_zh && !row.question_en)) return "";

  const zh = row.question_zh?.trim() || "";
  const en = row.question_en?.trim() || "";
  const questionText = currentLanguage === 'zh' ? zh : en;
  const imageUrl = row.image_url?.trim() || "";
  const placeholder = questionText.replace(/"/g, '&quot;');

  const wordTip = currentLanguage === 'zh'
    ? '已输入 0 字，建议不少于 300 字'
    : '0 words entered, recommended at least 300.';

  return `
  <div class="essay-card mb-6 ${cardClass}" data-id="${row.id}">
    <p class="font-bold mb-2 ${textClass} question-text" data-zh="${zh}" data-en="${en}">
      ${index}. ${questionText}
    </p>
    ${imageUrl ? `
      <div class="flex justify-center mb-4">
        <img src="${imageUrl}" alt="参考图" class="max-w-full max-h-64 rounded shadow" />
      </div>` : ""}
    <div class="relative">
      <textarea
        id="eq${index}"
        rows="6"
        class="w-full p-2 ${inputClass}"
        placeholder="${placeholder}"
        oninput="updateWordCount(${index}); handleEssayInput(this, '${row.id}')"
      ></textarea>
      <p class="text-sm text-gray-500 mt-1" id="wordCount${index}">
        ${wordTip}
      </p>
    </div>
  </div>`;
}

// ✅ 实时更新简答题字数提示
function updateWordCount(index) {
  const textarea = document.getElementById(`eq${index}`);
  const counter = document.getElementById(`wordCount${index}`);
  const length = textarea.value.length;
  const lang = localStorage.getItem("language") || "zh";

  if (lang === "zh") {
    counter.textContent = `已输入 ${length} 字，建议不少于 300 字`;
  } else {
    counter.textContent = `${length} words entered, recommended at least 300.`;
  }
}

// ✅ 邮件发送（可集成 EmailJS）
function handleResultEmail() {
  const lang = localStorage.getItem("language") || "zh";
  const title = lang === "zh" ? "验证口令" : "Enter Password";
  const message = lang === "zh" ? "请输入动态口令进行验证" : "Please enter the verification code";

  createModal("passwordModal", title, message, (value) => {
    if (value === "AFT2025") {
      evaluateAnswers();
      // ✅ 保存答题数据
      //sessionStorage.setItem("collectedAnswers", JSON.stringify(answers));
      renderAssessmentResult();
      showPage("resultPage");

      const htmlContent = buildEmailTable();
      sendResultEmail(htmlContent);
    } else {
      createModal("failPwd", "验证失败", "❌ 动态口令错误，请重试！");
    }
  }, true, true, "请输入动态口令");
}

function closePasswordModal() {
  document.getElementById("passwordModal").classList.add("hidden");
}


function cancelPassword() {
  closePasswordModal();
}
function sendEmail() {
  const email = document.getElementById("emailInput").value;
  if (email) {
    alert(`✔️ 邮件已发送至 ${email}（模拟）`);
    closePasswordModal();
  } else {
    alert("❌ 请填写有效的邮箱地址");
  }
}

function cancelEmail() {
  closePasswordModal();
}
function closeEmailModal() {
  document.getElementById("emailModal").classList.add("hidden");
}
function openEmailModal() {
  document.getElementById("emailModal").classList.remove("hidden");
}
function handleEmail() {
  openEmailModal();
}
function handleEmailCancel() {
  closeEmailModal();
}

// ✅ 检查是否所有题目都已作答
function allQuestionsAnswered() {
  let unanswered = [];

  // 单选题
  correctAnswers.single.forEach((_, i) => {
    const chosen = document.querySelector(`input[name='q${i + 1}']:checked`);
    if (!chosen) unanswered.push(`单选题 ${i + 1}`);
  });

  // 多选题（只要没有任何选择视为未答）
  correctAnswers.multiple.forEach((_, i) => {
    const chosen = document.querySelectorAll(`input[name='mq${i + 1}']:checked`);
    if (chosen.length === 0) unanswered.push(`多选题 ${i + 1}`);
  });

  // 判断题
  correctAnswers.judge.forEach((_, i) => {
    const chosen = document.querySelector(`input[name='jq${i + 1}']:checked`);
    if (!chosen) unanswered.push(`判断题 ${i + 1}`);
  });

  // 简答题
  correctAnswers.essay.forEach((_, i) => {
    const input = document.getElementById(`eq${i + 1}`);
    if (!input || input.value.trim() === "") {
      unanswered.push(`简答题 ${i + 1}`);
    }
  });

  if (unanswered.length > 0) {
    const lang = localStorage.getItem("language") || "zh";
    const message = lang === "zh"
      ? "以下题目尚未作答：\n" + unanswered.join("\n")
      : "The following questions are unanswered:\n" + unanswered.join("\n");

    createModal("unansweredModal", lang === "zh" ? "未完成答题" : "Unanswered", message);
    return false;
  }


  return true;
}

function sendResultEmail(dataHTML) {
  emailjs.init(publicKey);
  emailjs.send(serviceID, templateID, {
    table_html: dataHTML
  }).then(
    function () {
      const lang = localStorage.getItem("language") || "zh";
      createModal("mailOK", lang === "zh" ? "发送成功" : "Success", "📩 成绩邮件已成功发送！");
    },
    function (error) {
      createModal("mailFail", "邮件发送失败", "❌ 邮件发送失败，请检查网络或稍后再试");
    }
  );
}



// ⚙️ 构建表格 HTML 内容
function buildEmailTable() {
  const summary = document.getElementById("assessmentSummary");
  return summary ? summary.innerHTML : "<p>暂无结果</p>";
}

// ✅ 提交时调用（需口令验证）
function submitPassword() {
  const pass = document.getElementById("dynamicPasswordInput").value;

  if (pass === "AFT2025") {
    // ✅ 1. 评分
    evaluateAnswers();

    // ✅ 2. 渲染评估结果到结果页
    renderAssessmentResult();

    // ✅ 3. 显示结果页
    showPage("resultPage");

    // ✅ 4. 邮件发送
    const htmlContent = buildEmailTable();
    sendResultEmail(htmlContent);

    // ✅ 5. 关闭弹窗
    closePasswordModal();
  } else {
    alert("❌ 动态口令错误，请重试！");
  }
}



// ✅ 实时更新简答题字数统计
function updateEssayCharCount(index) {
  const textarea = document.getElementById(`eq${index}`);
  const countDisplay = document.getElementById(`charCount${index}`);
  const length = textarea.value.trim().length;

  countDisplay.textContent = `已输入 ${length} 字，建议不少于 300 字`;
}

// ✅ 明暗主题初始化：自动读取 localStorage 并应用 dark 模式
(function () {
  // ✅ 读取本地主题设置，若无则默认暗色
  if (!localStorage.theme) {
    document.body.classList.add("dark");         // ✅ 设置暗色主题
    localStorage.theme = "dark";                 // ✅ 保存设置
  } else if (localStorage.theme === "dark") {
    document.body.classList.add("dark");         // ✅ 若是 dark 也加上
  } else {
    document.body.classList.remove("dark");      // ✅ 明确移除 dark 类
  }
  // ✅ 等待页面加载后绑定逻辑
  window.addEventListener("DOMContentLoaded", () => {
    const course = new URLSearchParams(window.location.search).get("course") || "EE-W";
    const lang = localStorage.getItem("language") || "zh";

    // ✅ 若语言切换中，优先关闭语言切换提示框
    if (localStorage.getItem("isSwitchingLanguage") === "true") {
      closeModal("switchLangModal");
      localStorage.removeItem("isSwitchingLanguage");
    }

    // ✅ 是否需要显示一次性加载提示
    if (localStorage.getItem("showLoadingOnce") === "true") {
      localStorage.removeItem("showLoadingOnce"); // ⚠️ 只弹一次
      const messages = {
        zh: "测试题加载中，请稍后…",
        en: "Loading questions, please wait..."
      };
      createModal("loadingModal", lang === "zh" ? "提示" : "Notice", messages[lang], null, false);
    }

    // ✅ 渲染题目
    //loadCSVAndInit(course);
  });
})();
// ✅ 显示通用模态框
function showUniversalModal(title, message, showInput = false, onConfirm = null) {
  // 设置内容
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMessage").textContent = message;

  // 控制输入框是否显示
  const inputEl = document.getElementById("modalInput");
  inputEl.classList.toggle("hidden", !showInput);
  inputEl.value = ""; // 清空

  // 设置确认按钮逻辑
  const confirmBtn = document.getElementById("modalConfirmBtn");
  confirmBtn.onclick = () => {
    const value = showInput ? inputEl.value.trim() : null;
    if (onConfirm) onConfirm(value); // 回调
    closeUniversalModal();
  };

  // 显示弹窗
  document.getElementById("universalModal").classList.remove("hidden");
}

// ✅ 关闭模态框
function closeUniversalModal() {
  document.getElementById("universalModal").classList.add("hidden");
}

// ✅ 通用加载课程 CSV：自动识别当前 HTML 文件名
function getCurrentCourseFromURL() {
  const path = window.location.pathname;
  const filename = path.substring(path.lastIndexOf("/") + 1); // 如 EE-W.html
  const courseName = filename.replace(".html", ""); // 转为 EE-W
  return courseName || "EE-W"; // 默认课程
}

document.addEventListener("DOMContentLoaded", async () => {
  const html = document.documentElement;
  const savedTheme = localStorage.getItem("theme");

  let isDark;

  // ✅ [1] 首次加载：判断 localStorage 或系统偏好
  if (savedTheme) {
    isDark = savedTheme === "dark";
  } else {
    // 💡 如果用户首次访问，根据系统设定确定默认主题
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  // ✅ [2] 应用初始主题样式（加上 html.class）
  html.classList.toggle("dark", isDark);

  // ✅ [3] 明暗按钮图标联动处理
  const themeBtn = document.getElementById("themeToggle");
  const sunIcon = themeBtn?.querySelector(".fa-sun");
  const moonIcon = themeBtn?.querySelector(".fa-moon");

  if (sunIcon && moonIcon) {
    sunIcon.classList.toggle("hidden", isDark);
    moonIcon.classList.toggle("hidden", !isDark);
  }

  // ✅ [4] 点击切换明暗模式
  themeBtn?.addEventListener("click", () => {
    const nowDark = html.classList.toggle("dark");
    localStorage.setItem("theme", nowDark ? "dark" : "light");

    sunIcon?.classList.toggle("hidden", nowDark);
    moonIcon?.classList.toggle("hidden", !nowDark);

    // 手动切换时更新卡片样式
    updateCardStyle(nowDark);
  });

  // ✅ [5] 设置卡片样式（默认调用一次 + 支持切换）
  function updateCardStyle(darkMode) {
    const cards = document.querySelectorAll(".card-darkmode");
    cards.forEach(card => {
      card.style.backgroundColor = darkMode ? "#1f1f1f" : "#ffffff";
      card.style.color = darkMode ? "#ccc" : "#333";
    });
  }

  // 初始化卡片背景色
  updateCardStyle(isDark);

  // ✅ [6] 监听系统主题变化（如 macOS/iOS 跳转 dark 模式）
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    const prefersDark = e.matches;

    // ✅ 将新状态写入 localStorage，以便页面刷新后仍然一致
    localStorage.setItem("theme", prefersDark ? "dark" : "light");

    // ✅ 应用主题样式和重新设置卡片颜色
    html.classList.toggle("dark", prefersDark);
    updateCardStyle(prefersDark);

    // ✅ 图标同步
    sunIcon?.classList.toggle("hidden", prefersDark);
    moonIcon?.classList.toggle("hidden", !prefersDark);
  });

  // ✅ [7] 语言切换功能
  const langIcon = document.getElementById("languageFlag");
  const lang = localStorage.getItem("language") || "zh";

  if (langIcon) {
    langIcon.src = lang === "zh" ? "https://flagcdn.com/cn.svg" : "https://flagcdn.com/us.svg";
    langIcon.alt = lang === "zh" ? "中文" : "English";
  }

  const langBtn = document.getElementById("langToggle");
  langBtn?.addEventListener("click", () => {
    const newLang = lang === "zh" ? "en" : "zh";
    localStorage.setItem("language", newLang);
    location.reload();
  });

  // ✅ [8] 显示登录用户名
  const username = localStorage.getItem("username") || "未登录";
  const userDisplay = document.getElementById("loggedInUser");
  if (userDisplay) {
    userDisplay.textContent = `欢迎：${username}`;
  }

  // ✅ [9] 启动倒计时 / 加载提示
  updateCountdown();
  updateLoadingText();

  // ✅ [10] 加载题库
  // ✅ 获取当前课程名
  const course = getCurrentCourseFromURL();  // 自动识别 EE-W、DE-ADV 等

  // ✅ 加载对应课程的 CSV 题库
  loadCSVAndInit(course);  // ✅ 自动完成加载 + 渲染 + 恢复
  
});

function updateThemeIcon() {
  const icon = document.getElementById("themeIcon");
  if (!icon) return;

  if (document.documentElement.classList.contains("dark")) {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  }
}


// 🌙 主题切换
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light'; // 默认 light
  const isDark = savedTheme === 'dark'; // ✅ 先定义
  const htmlEl = document.documentElement;

  // ✅ 设置 html 的 dark 类
  htmlEl.classList.toggle('dark', isDark);

  // ✅ 更新图标
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');
  if (sunIcon && moonIcon) {
    sunIcon.classList.toggle('hidden', isDark);     // 🌙 dark 模式 => 隐藏太阳
    moonIcon.classList.toggle('hidden', !isDark);   // ☀️ light 模式 => 隐藏月亮
  }
}



// 主题切换函数，绑定到按钮 onclick
// 切换主题并同步图标
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  const sunIcon = document.querySelector('.fa-sun');
  const moonIcon = document.querySelector('.fa-moon');

  // 切换主题类
  html.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');

  // 图标手动切换 visibility
  if (isDark) {
    // 当前是 dark，要切到 light，显示太阳
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    // 当前是 light，要切到 dark，显示月亮
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
}

// 页面加载时初始化主题（从 localStorage 读取）
// 初始化函数
window.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggle');
  const sunIcon = document.querySelector('.fa-sun');
  const moonIcon = document.querySelector('.fa-moon');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'light';

  // 恢复主题
  if (savedTheme === 'dark') {
    html.classList.add('dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else {
    html.classList.remove('dark');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }

  // 点击切换
  themeToggleBtn.addEventListener('click', () => {
    const isDark = html.classList.contains('dark');
    html.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');

    // 图标切换
    if (isDark) {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }

    console.log(`[Click] 主题切换为 ${isDark ? 'light' : 'dark'}`);
  });
});

// ✅ 页面加载完成后立即根据当前语言更新 UI（标题、按钮、导航栏等）
document.addEventListener("DOMContentLoaded", () => {
  updateLanguageUI(currentLanguage);
});

// ✅ 自动缓存用户信息输入
["company", "name", "phone", "email"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", () => {
      const currentInfo = {
        company: document.getElementById("company").value.trim(),
        name: document.getElementById("name").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        email: document.getElementById("email").value.trim()
      };
      sessionStorage.setItem("userInfo", JSON.stringify(currentInfo));
    });
  }
});


// ✅ 页面加载后首次更新
document.addEventListener("DOMContentLoaded", () => {
  updateProgressFromDOM();
});

// ✅ 用户作答后自动刷新进度
document.addEventListener("change", (e) => {
  if (e.target.matches("input[type='radio'], input[type='checkbox'], textarea")) {
    updateProgressFromDOM();
  }
});

function sendEmailResult(answers) {
  const tableHTML = generateEmailTableHTML(answers);

  const templateParams = {
    company: answers.userInfo.company,
    user_name: answers.userInfo.name,
    phone: answers.userInfo.phone,
    user_email: answers.userInfo.email,
    timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
    message: '系统自动提交：EE-W产品培训答卷',
    table_html: tableHTML
  };

  // ✅ 调用 EmailJS
  emailjs.send('service_csl8frv', 'template_0v2mqw9', templateParams)
    .then(() => {
        console.log("✅ 邮件发送成功");
        alert("✅ 评测结果已成功发送至 RSEC 邮箱！");
      })
    .catch(err => {
        console.error('[EmailJS] 邮件失败', err);
        //alert('⚠️ 邮件发送失败，请将导出的 PDF 手动发送到 RSEC 邮箱：rsec@armstrong.com');
        showEmailResultPopup("❌ 邮件发送失败，是否重新发送？");
      });
}

// ✅ 提交答题记录到 Supabase
// ✅ 提交答题记录到 Supabase（支持 UPSERT 覆盖）
async function submitAnswerToSupabase({ username, course, questionId, questionType, answer }) {
  if (!username || username === "unknown_user") {
    console.warn("⚠️ 无法识别用户名，答题记录未上传！");
    return;
  }
  if (!questionId || !questionType || !answer) {
    console.warn("⚠️ 缺少必要参数，答题记录未上传！");
    return;
  }

  const payload = {
    username,
    course,
    question_id: questionId,
    question_type: questionType,
    answer,
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch('https://yzzncbawckdwidrlcahy.supabase.co/rest/v1/quiz_lib?on_conflict=username,course,question_id,question_type', {
      method: 'POST',
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs',
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`❌ 答案上传失败 (${res.status}):`, await res.text());
    } else {
      console.log(`✅ 答案已上传或更新：题目 ${questionId}, 类型 ${questionType}, 内容 ${answer}`);
    }
  } catch (err) {
    console.error('⚠️ 上传答题记录出错：', err);
  }
}




// ✅ 处理多选题提交
function handleMultiAnswer(el, questionId) {
  const checkboxes = document.querySelectorAll(`input[name="${el.name}"]:checked`);
  const values = Array.from(checkboxes).map(cb => cb.value);
  submitAnswerToSupabase({
    username: currentUsername,
    course: currentCourse,
    questionId,
    questionType: "multiple",
    answer: values.join(", ")
  });
}

let debounceTimers = {};
function handleEssayInput(el, questionId) {
  const val = el.value.trim();
  clearTimeout(debounceTimers[questionId]);

  debounceTimers[questionId] = setTimeout(() => {
    if (val.length > 0) {
      submitAnswerToSupabase({
        username: currentUsername,
        course: currentCourse,
        questionId,
        questionType: "essay",
        answer: val
      });
    }
  }, 800);  // 800ms 内不再输入才上传
}

// ✅ 清除指定用户和课程的旧答题记录（重新登录或切换课程时触发）
async function clearPreviousAnswersFromSupabase(username, course) {
  if (!username || !course) return;

  try {
    const res = await fetch(`https://yzzncbawckdwidrlcahy.supabase.co/rest/v1/quiz_lib?username=eq.${username}&course=eq.${course}`, {
      method: 'DELETE',
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs',
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      console.log(`🧹 已清除 Supabase 上 ${username} 的 ${course} 旧答题记录`);
    } else {
      console.warn(`⚠️ 清除答题记录失败：${res.status}`, await res.text());
    }
  } catch (err) {
    console.error("❌ 清除答题记录异常：", err);
  }
}




// 清空当前课程的所有答题记录
function clearAnswers() {
  // 清空 localStorage 和 sessionStorage 中保存的答题记录
  localStorage.removeItem("answers");
  sessionStorage.removeItem("answers");


  // 清空答题状态（例如，重置表单、取消选中的答案等）
  document.querySelectorAll("input[type='radio']").forEach(input => input.checked = false);
  document.querySelectorAll("input[type='checkbox']").forEach(input => input.checked = false);
  document.querySelectorAll("textarea").forEach(textarea => textarea.value = "");

  // 更新进度卡
  updateProgressFromDOM();
}

// 从 Supabase 恢复答题记录
async function loadAnswersFromSupabase() {
  try {
    const res = await fetch(`https://yzzncbawckdwidrlcahy.supabase.co/rest/v1/quiz_lib?username=eq.${currentUsername}&course=eq.${currentCourse}`, {
      method: 'GET',
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6em5jYmF3Y2tkd2lkcmxjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjczMTUsImV4cCI6MjA1OTE0MzMxNX0.w3dUuEkPt_XNzQiUcUe9qhG33JrDGR65hyBszJjJHXs',
      }
    });

    const records = await res.json();
    console.log(`🔄 从 Supabase 恢复答题记录，共拉取 ${records.length} 条`);

    if (Array.isArray(records)) {
      // 恢复答题记录（可以参考之前的 restoreAnswersFromSupabase 函数）
      restoreAnswersFromSupabase(records);
    } else {
      console.error("📛 恢复答题记录失败");
    }
  } catch (err) {
    console.error("📛 加载答题记录失败：", err);
  }
}

// 假设 loadAnswersFromSupabase 是一个从数据库加载数据的函数
function loadAnswers() {
  const lang = localStorage.getItem("language") || "zh"; // 获取当前语言
  alert(lang === "zh" ? "正在加载答题记录..." : "Loading answers...");

  // 调用从 Supabase 加载数据的函数
  loadAnswersFromSupabase() // 这个函数应该负责加载并显示答题记录
    .then(() => {
      alert(lang === "zh" ? "答题记录加载成功！" : "Answers loaded successfully!");
    })
    .catch(err => {
      console.error("加载答题记录失败：", err);
      alert(lang === "zh" ? "加载失败，请稍后再试！" : "Failed to load answers, please try again later.");
    });
}

