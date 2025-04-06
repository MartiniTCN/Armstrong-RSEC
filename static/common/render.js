// 文件路径：/static/common/render.js
// 说明：统一测试页面渲染与评估脚本，支持加载 CSV、评分、语言切换、邮件发送

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

// 🌐 当前语言变量（你已有 currentLanguage 的话可省略）
let currentLanguage = localStorage.getItem("language") || "zh";

// ✅ 切换语言并刷新页面（或重载内容）
function toggleLanguage() {
  // ✅ 1. 切换语言变量
  currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
  localStorage.setItem("language", currentLanguage);

  // ✅ 2. 立即更新图标
  const flag = document.getElementById("languageFlag");
  if (flag) {
    flag.src = `https://flagcdn.com/${currentLanguage === 'en' ? 'cn' : 'us'}.svg`;
    flag.alt = currentLanguage === 'en' ? "中文" : "English";
  }

  // ✅ 3. 设置状态标记（后续渲染用）
  localStorage.setItem("showLoadingOnce", "true");
  localStorage.setItem("isSwitchingLanguage", "true");

  // ✅ 4. 弹出“语言切换中”模态框
  createModal(
    "switchLangModal",
    "",
    `<p class="text-center text-base leading-6">
      语言切换中...<br/>Switching language...
    </p>`,
    null,
    false
  );

  // ✅ 5. 刷新页面
  setTimeout(() => location.reload(), 300);
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
  renderQuestions(parsedQuestions);
}
// ✅ 支持的中英文提示（全局）
const loadingMessages = {
  zh: "测试题加载中，请稍后…",
  en: "Loading questions, please wait..."
};

// ✅ 根据语言更新加载提示
function updateLoadingText() {
  const lang = localStorage.getItem("language") || "zh";
  const loadingText = document.getElementById("loadingText");
  if (loadingText) {
    loadingText.textContent = loadingMessages[lang];
  }
}

// ✅ 加载 CSV 文件并初始化题目与答案
function loadCSVAndInit(courseName) {
  const csvPath = `/static/csv/${courseName}.csv`;

  // ✅ 获取当前语言（默认中文）
  const lang = localStorage.getItem("language") || "zh";

  // ✅ 多语言提示内容
  const messages = {
    zh: "测试题加载中，请稍后…",
    en: "Loading questions, please wait..."
  };

  // ✅ 显示加载弹窗（无关闭按钮）
  createModal("loadingModal", lang === "zh" ? "提示" : "Notice", messages[lang], null, false);

  // ✅ 使用 PapaParse 加载 CSV 文件
  Papa.parse(csvPath, {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete: function (results) {
      // ✅ 解析成功后初始化题目
      parsedQuestions = results.data;
      initCorrectAnswers(parsedQuestions);
      renderQuestions(parsedQuestions);

      // ✅ 加载完毕后移除模态弹窗
      closeModal("loadingModal");
    },

    error: function (err) {
      // ❌ 错误时弹出错误提示弹窗
      closeModal("loadingModal");
      createModal("errorModal", lang === "zh" ? "加载失败" : "Load Failed", "❌ 加载题库失败，请检查 CSV 路径是否正确！");
      console.error("📛 PapaParse 加载错误：", err);
    }
  });
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

// ✅ 提取正确答案
function initCorrectAnswers(data) {
  correctAnswers = { single: [], multiple: [], judge: [], essay: [] };
  data.forEach(row => {
    const type = row.type?.toLowerCase();
    const answer = row.answer?.trim();
    if (type === "single") {
      correctAnswers.single.push(answer);
    } else if (type === "multiple") {
      const arr = answer.split(',').map(a => a.trim()).sort();
      correctAnswers.multiple.push(arr);
    } else if (type === "judge") {
      correctAnswers.judge.push(answer);
    } else if (type === "essay") {
      correctAnswers.essay.push(answer);
    }
  });
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

// ✅ 渲染题目结构（根据当前语言）
function renderQuestions(data) {
  // ✅ 获取各题型的挂载容器
  const sectionMap = {
    single: document.querySelector("[data-section='single']"),
    multiple: document.querySelector("[data-section='multi']"),
    judge: document.querySelector("[data-section='judge']"),
    essay: document.querySelector("[data-section='essay']"), // 简答题
  };

  // ✅ 校验容器是否存在，避免挂载失败
  for (const [type, container] of Object.entries(sectionMap)) {
    if (!container) {
      alert(`❌ 页面缺少 ${type} 类型题目的容器，无法渲染该类型题目！`);
      console.error(`找不到 data-section='${type}' 的容器`);
      return;
    }
    container.innerHTML = ""; // 每次渲染前清空容器
  }

  console.log("准备渲染题目", data);

  // ✅ 各题型的题号索引计数器
  let index = { single: 1, multiple: 1, judge: 1, essay: 1 };

  // ✅ 遍历每道题，根据类型渲染不同内容
  data.forEach(row => {
    const type = row.type?.toLowerCase(); // 获取题目类型（如：single, multiple, essay）
    const question = currentLanguage === 'zh' ? row.question_zh : row.question_en; // 根据语言切换获取题干
    const options = ['A', 'B', 'C', 'D'].map(opt =>
      currentLanguage === 'zh' ? row[opt] : row[`${opt}_EN`]
    );

    let html = "";

    if (type === 'single') {
      html = renderSingle(index.single++, question, options);
    } else if (type === 'multiple') {
      html = renderMultiple(index.multiple++, question, options);
    } else if (type === 'judge') {
      html = renderJudge(index.judge++, question);
    } else if (type === 'essay') {
      // ✅ 简答题额外提取 image_url 字段（如无则为 ""）
      const imageUrl = row.image_url || "";
      html = renderEssay(index.essay++, question, row.image_url || "", row.id || ""); // 💡 加入图片链接参数
    }

    // ✅ 渲染内容插入对应容器
    if (html && sectionMap[type]) {
      sectionMap[type].innerHTML += html;
    }
  });
}

// ✅ 渲染各类题型 HTML
function renderSingle(index, question, options) {
  return `
  <div class="question-card mb-6 ${cardClass}">
      <!-- 题目题干 -->
      <p class="font-bold mb-2 ${textClass}">${index}. ${question}</p>

    <!-- ✅ 网格容器：小屏1列，大屏2列 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      ${options.map((opt, i) => `
        <label class="flex items-start gap-2">
            <input type="radio" name="q${index}" value="${String.fromCharCode(65 + i)}">
            <span class="${textClass}">${String.fromCharCode(65 + i)}. ${opt}</span>
          </label>
      `).join('')}
    </div>
  </div>`;
}

function renderMultiple(index, question, options) {
  return `
  <div class="question-card mb-6 ${cardClass}">
      <!-- 题目题干 -->
      <p class="font-bold mb-2 ${textClass}">${index}. ${question}（多选）</p>

    <!-- ✅ 网格容器：小屏1列，大屏2列 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      ${options.map((opt, i) => `
        <label class="flex items-start gap-2">
            <input type="checkbox" name="mq${index}" value="${String.fromCharCode(65 + i)}">
            <span class="${textClass}">${String.fromCharCode(65 + i)}. ${opt}</span>
          </label>
      `).join('')}
    </div>
  </div>`;
}

function renderJudge(index, question) {
  return `
   <div class="judge-card mb-6 ${cardClass}">
      <!-- 判断题题干 -->
      <p class="font-bold mb-2 ${textClass}">${index}. ${question}</p>

    <!-- ✅ 判断题响应式布局：小屏 1 列，大屏 2 列 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <label class="flex items-start gap-2">
          <input type="radio" name="jq${index}" value="正确">
          <span class="${textClass}">正确</span>
        </label>
        <label class="flex items-start gap-2">
          <input type="radio" name="jq${index}" value="错误">
          <span class="${textClass}">错误</span>
        </label>
    </div>
  </div>`;
}

// ✅ 渲染简答题模块（带图片、自动统计字数、统一样式）
function renderEssay(index, question, imageUrl = "") {
  // ✅ 提示文字作为 placeholder
  const placeholder = `${question}（请围绕要点详细描述，建议不少于 300 字）`;

  return `
    <div class="essay-card mb-6 ${cardClass}">
      <!-- ✅ 简答题题目 -->
      <p class="font-bold mb-2 ${textClass}">${index}. ${question}</p>

      <!-- ✅ 显示题目配图（如果有） -->
      ${imageUrl
        ? `<div class="flex justify-center mb-4">
             <img src="${imageUrl}" alt="参考图" class="max-w-full max-h-64 rounded shadow" />
           </div>`
        : ''}

      <!-- ✅ 答题输入区 + 字数统计 -->
      <div class="relative">
        <textarea
          id="eq${index}"
          rows="6"
          class="w-full p-2 ${inputClass}"
          placeholder="${placeholder.replace(/"/g, '&quot;')}" 
          oninput="updateWordCount(${index})"
        ></textarea>
        <p class="text-sm text-gray-500 mt-1" id="wordCount${index}">已输入 0 字，建议不少于 300 字</p>
      </div>
    </div>`;
}

// ✅ 评估评分逻辑
function evaluateAll() {
  if (!allQuestionsAnswered()) {
    alert("⚠️ 请完成所有题目再提交评估！");
    return; // 阻止提交
  }
  let score = 0;
  let total = 0;

  // 单选题
  correctAnswers.single.forEach((correct, i) => {
    const chosen = document.querySelector(`input[name='q${i + 1}']:checked`);
    if (chosen && chosen.value === correct) score += 2;
    total += 2;
  });

  // 多选题
  correctAnswers.multiple.forEach((correct, i) => {
    const chosen = [...document.querySelectorAll(`input[name='mq${i + 1}']:checked`)].map(e => e.value).sort();
    if (JSON.stringify(chosen) === JSON.stringify(correct)) score += 1;
    total += 1;
  });

  // 判断题
  correctAnswers.judge.forEach((correct, i) => {
    const chosen = document.querySelector(`input[name='jq${i + 1}']:checked`);
    if (chosen && chosen.value === correct) score += 1;
    total += 1;
  });

  // 简答题（简单关键词匹配）
  correctAnswers.essay.forEach((answer, i) => {
    const input = document.getElementById(`eq${i + 1}`);
    const keywords = answer.split(',').map(k => k.trim());
    if (keywords.some(kw => input.value.includes(kw))) score += 4;
    total += 4;
  });

  // 展示结果
  document.getElementById("testContainer").classList.add("hidden");
  const resultPage = document.getElementById("resultPage");
  resultPage.classList.remove("hidden");
  resultPage.scrollIntoView({ behavior: 'smooth' });
  document.getElementById("assessmentSummary").innerHTML = `<p class='text-xl'>得分：<strong>${score}</strong> / ${total}</p>`;
}

// ✅ 邮件发送（可集成 EmailJS）
function handleResultEmail() {
  const lang = localStorage.getItem("language") || "zh";
  const title = lang === "zh" ? "验证口令" : "Enter Password";
  const message = lang === "zh" ? "请输入动态口令进行验证" : "Please enter the verification code";

  createModal("passwordModal", title, message, (value) => {
    if (value === "AFT2025") {
      evaluateAnswers();
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
  if (!localStorage.theme) {
    document.documentElement.classList.add("dark");
    localStorage.theme = "dark";
  } else if (localStorage.theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // ✅ 等待 DOM 加载完成再绑定点击事件
  // ✅ 页面加载时：只在首次进入或语言切换时弹出一次加载提示
  window.addEventListener("DOMContentLoaded", () => {
    const course = new URLSearchParams(window.location.search).get("course") || "EE-W";
  
    // ✅ 获取语言设置
    const lang = localStorage.getItem("language") || "zh";
  
    // ✅ 若是语言切换后，优先关闭语言切换弹窗
    if (localStorage.getItem("isSwitchingLanguage") === "true") {
      closeModal("switchLangModal");
      localStorage.removeItem("isSwitchingLanguage");
    }
  
    // ✅ 检查是否需要弹出加载提示（语言切换中设置的）
    if (localStorage.getItem("showLoadingOnce") === "true") {
      localStorage.removeItem("showLoadingOnce"); // 只弹一次
      const messages = {
        zh: "测试题加载中，请稍后…",
        en: "Loading questions, please wait..."
      };
      createModal("loadingModal", lang === "zh" ? "提示" : "Notice", messages[lang], null, false);
    }
  
    // ✅ 加载题库（加载完毕时关闭弹窗）
    loadCSVAndInit(course);
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


// ✅  绑定明暗模式切换按钮
document.addEventListener("DOMContentLoaded", () => {
  // ✅ 初始化主题样式
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.classList.toggle("dark", savedTheme === "dark");

  // ✅ 初始化明暗图标
  const sun = document.getElementById("sunIcon");
  const moon = document.getElementById("moonIcon");
  if (sun && moon) {
    sun.classList.toggle("hidden", savedTheme !== "dark");
    moon.classList.toggle("hidden", savedTheme === "dark");
  }

  // ✅ 绑定主题切换按钮
  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      if (sun && moon) {
        sun.classList.toggle("hidden", !isDark);
        moon.classList.toggle("hidden", isDark);
      }
    });
  }

  // ✅ 初始化语言图标
  const langIcon = document.getElementById("languageFlag");
  const lang = localStorage.getItem("language") || "zh";
  if (langIcon) {
    langIcon.src = lang === "zh" ? "https://flagcdn.com/cn.svg" : "https://flagcdn.com/us.svg";
    langIcon.alt = lang === "zh" ? "中文" : "English";
  }

  // ✅ 绑定语言切换按钮
  const langBtn = document.getElementById("langToggle");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      const nextLang = lang === "zh" ? "en" : "zh";
      localStorage.setItem("language", nextLang);
      location.reload();
    });
  }

  // ✅ 加载题库
  const urlParams = new URLSearchParams(window.location.search);
  const course = urlParams.get("course") || "EE-W";
  loadCSVAndInit(course);
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

// ✅ 同步图标函数（切换 🌙/☀️）