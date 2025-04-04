// 文件路径：/static/common/render.js
// 说明：统一测试页面渲染与评估脚本，支持加载 CSV、评分、语言切换、邮件发送

let currentLanguage = 'zh';
let parsedQuestions = [];
let correctAnswers = { single: [], multiple: [], judge: [], essay: [] };

// ✅ 页面加载后自动启动
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const course = urlParams.get("course") || "EE-W";
  loadCSVAndInit(course);
});

// ✅ 语言切换按钮处理
function switchLanguage(lang) {
  currentLanguage = lang;
  console.log(`🌐 已切换语言为：${lang}`);
  alert(`🌐 已切换为 ${lang === 'zh' ? '中文' : 'English'} 模式`);
  renderQuestions(parsedQuestions);
}

// ✅ 加载 CSV 文件并初始化题目与答案
function loadCSVAndInit(courseName) {
  const csvPath = `/static/csv/${courseName}.csv`;
  Papa.parse(csvPath, {
    download: true,
    header: true,
    skipEmptyLines: true,
  
    complete: function (results) {
      parsedQuestions = results.data;
      initCorrectAnswers(parsedQuestions);
      renderQuestions(parsedQuestions);
    },
  
    error: function (err) {
      alert("❌ 加载题库失败，请检查 CSV 路径是否正确！");
      console.error("📛 PapaParse 加载错误：", err);
    }
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
  // ✅ 获取各题型对应容器
  const singleContainer = document.getElementById("singleChoiceCard");
  const multipleContainer = document.getElementById("multipleChoiceCard");
  const judgeContainer = document.getElementById("judgeCard");
  const essayContainer = document.getElementById("essayCard");

  // ✅ 容错检查
  if (!singleContainer || !multipleContainer || !judgeContainer || !essayContainer) {
    alert("❌ 页面缺少题目容器，无法渲染题目！");
    console.error("❌ 缺少容器：", {
      singleContainer, multipleContainer, judgeContainer, essayContainer
    });
    return;
  }

  // ✅ 清空原内容
  singleContainer.innerHTML = "";
  multipleContainer.innerHTML = "";
  judgeContainer.innerHTML = "";
  essayContainer.innerHTML = "";

  console.log("准备渲染题目", data);

  let index = { single: 1, multiple: 1, judge: 1, essay: 1 };

  data.forEach(row => {
    const type = row.type?.toLowerCase();
    const question = currentLanguage === 'zh' ? row.question_zh : row.question_en;
    const options = ['A', 'B', 'C', 'D'].map(opt =>
      currentLanguage === 'zh' ? row[opt] : row[`${opt}_EN`]
    );

    if (type === 'single') {
      singleContainer.innerHTML += renderSingle(index.single++, question, options);
    } else if (type === 'multiple') {
      multipleContainer.innerHTML += renderMultiple(index.multiple++, question, options);
    } else if (type === 'judge') {
      judgeContainer.innerHTML += renderJudge(index.judge++, question);
    } else if (type === 'essay') {
      essayContainer.innerHTML += renderEssay(index.essay++, question);
    }
  });

  // ✅ 确保试题区可见（可选）
  document.getElementById("testPage")?.classList.remove("hidden");
}

// ✅ 渲染各类题型 HTML
function renderSingle(index, question, options) {
  return `
  <div class="question-card mb-6">
    <p class="font-bold mb-2">${index}. ${question}</p>
    ${options.map((opt, i) => `
      <label class="block"><input type="radio" name="q${index}" value="${String.fromCharCode(65 + i)}"> ${String.fromCharCode(65 + i)}. ${opt}</label>
    `).join('')}
  </div>`;
}

function renderMultiple(index, question, options) {
  return `
  <div class="question-card mb-6">
    <p class="font-bold mb-2">${index}. ${question}（多选）</p>
    ${options.map((opt, i) => `
      <label class="block"><input type="checkbox" name="mq${index}" value="${String.fromCharCode(65 + i)}"> ${String.fromCharCode(65 + i)}. ${opt}</label>
    `).join('')}
  </div>`;
}

function renderJudge(index, question) {
  return `
  <div class="judge-card mb-6">
    <p class="font-bold mb-2">${index}. ${question}</p>
    <label class="mr-4"><input type="radio" name="jq${index}" value="正确"> 正确</label>
    <label><input type="radio" name="jq${index}" value="错误"> 错误</label>
  </div>`;
}

function renderEssay(index, question) {
  return `
  <div class="essay-card mb-6">
    <p class="font-bold mb-2">${index}. ${question}</p>
    <textarea id="eq${index}" rows="4" class="w-full p-2 border dark:bg-gray-800"></textarea>
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
  document.getElementById("passwordModal").classList.remove("hidden");
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
    alert("⚠️ 以下题目尚未作答：\n" + unanswered.join("\n"));
    return false;
  }

  return true;
}

function sendResultEmail(dataHTML) {
  const serviceID = "service_csl8frv";
  const templateID = "template_0v2mqw9";
  const publicKey = "LoQCI3C98dk3FgEvj";

  emailjs.init(publicKey);
  emailjs.send(serviceID, templateID, {
    table_html: dataHTML
  }).then(
    function () {
      alert("📩 成绩邮件已成功发送！");
    },
    function (error) {
      alert("❌ 邮件发送失败：" + JSON.stringify(error));
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
    const htmlContent = buildEmailTable();
    sendResultEmail(htmlContent);
    closePasswordModal();
  } else {
    alert("❌ 动态口令错误，请重试！");
  }
}

