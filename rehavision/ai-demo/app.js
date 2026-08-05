// ブラウザから直接 Gemini API を呼ぶ対話デモ。
// Colabを開かなくても、サイト内で「質問 → 回答 → 読み上げ」まで完結する。
//
// APIキーはlocalStorageにのみ保存し、リポジトリには含めない。
// Prompt Template と Reference は ../prompts/ から読み込むため、
// ファイルを差し替えればこの画面の応答も変わる。

const KEY_STORE = "rehavision-gemini-key";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// notebook 側の MODEL_CANDIDATES と揃えてある
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
];

const SAMPLES = [
  "患者の状態はどうですか？",
  "リハビリの効果は出ている？",
  "訓練はどこまで進んでいますか",
  "患者さんの苦手なことは？",
  "退院後に注意することは？",
  "作業療法士の記録を確認して",
];

// ../prompts/ が読めない場合に使う控え
const FALLBACK_PROMPT = `# 回答条件
- あなたは「Rehavision」の音声アシスタントです。作業療法士または患者のご家族からの質問に、下記「患者情報」に基づいて答えてください。
- 「患者情報」に記載がない内容は、推測で断定せず「記録には該当する情報がありません。担当の作業療法士にご確認ください。」と回答してください。
- 回答は3文以内、日本語の自然な話し言葉でまとめてください。

# フォーマット
- 箇条書きや記号は使わないでください。音声合成でそのまま読み上げるため、話し言葉の文章のみを出力してください。

# 患者情報
{reference_str}

# 質問
質問：{question}
`;

const FALLBACK_REFERENCE = `■ 患者基本情報
氏名：田中 一郎
主病名：右大腿骨頸部骨折 術後
現在の病期：回復期

■ 現在の身体状態
歩行時に軽度のふらつきがあり、単独歩行は転倒リスクが高いため、歩行時は見守りが必要です。

■ 訓練進捗
理学療法は全10回のうち8回を実施済みで、達成度は80%です。
歩行距離：10m → 45m に改善
片脚立位：2秒 → 8秒 に改善
`;

const $ = (id) => document.getElementById(id);
const el = {
  gate: $("gate"), keyInput: $("key-input"), keySave: $("key-save"), keyClear: $("key-clear"),
  app: $("app"), question: $("question"), send: $("send"), mic: $("mic"),
  answer: $("answer"), placeholder: $("placeholder"), thinking: $("thinking"), error: $("error"),
  speak: $("speak"), modelLabel: $("model-label"), srcLabel: $("src-label"), samples: $("samples"),
};

let promptTemplate = FALLBACK_PROMPT;
let referenceStr = FALLBACK_REFERENCE;
let modelOrder = [...MODELS];

/* ---------------- Prompt / Reference ---------------- */

async function loadPrompts() {
  try {
    const [p, r] = await Promise.all([
      fetch("../prompts/07_prompt.txt").then((res) => (res.ok ? res.text() : Promise.reject(res.status))),
      fetch("../prompts/07_reference.txt").then((res) => (res.ok ? res.text() : Promise.reject(res.status))),
    ]);
    promptTemplate = p;
    referenceStr = r;
    el.srcLabel.textContent = "prompts/ を読み込み済み";
  } catch {
    el.srcLabel.textContent = "prompts/ が読めないため内蔵の控えを使用";
  }
}

function buildPrompt(question) {
  return promptTemplate
    .replaceAll("{reference_str}", referenceStr)
    .replaceAll("{question}", question);
}

/* ---------------- Gemini 呼び出し ---------------- */

async function callGemini(prompt, apiKey) {
  const errors = [];

  for (const model of modelOrder) {
    let res;
    try {
      res = await fetch(`${API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
    } catch (netErr) {
      throw new Error(`ネットワークに接続できません: ${netErr.message}`);
    }

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
      if (!text) {
        errors.push(`${model}: 応答が空でした`);
        continue;
      }
      // 成功したモデルを次回の先頭に回す
      modelOrder = [model, ...modelOrder.filter((m) => m !== model)];
      return { text, model };
    }

    const body = await res.text();
    let msg = body;
    try {
      msg = JSON.parse(body)?.error?.message ?? body;
    } catch { /* JSONでなければ生のまま */ }
    errors.push(`${model}: ${res.status} ${String(msg).slice(0, 160)}`);
  }

  throw new Error(`すべてのモデルで失敗しました。\n\n${errors.join("\n")}`);
}

/* ---------------- 読み上げ ---------------- */

function speakOut(text) {
  if (!el.speak.checked || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const ja = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja"));
  if (ja) u.voice = ja;
  u.lang = "ja-JP";
  window.speechSynthesis.speak(u);
}

/* ---------------- 画面制御 ---------------- */

function setBusy(busy) {
  el.send.disabled = busy;
  el.thinking.hidden = !busy;
  if (busy) {
    el.placeholder.hidden = true;
    el.answer.hidden = true;
    el.error.hidden = true;
  }
}

async function ask(question) {
  const q = question.trim();
  if (!q) return;

  const apiKey = localStorage.getItem(KEY_STORE);
  if (!apiKey) return openGate();

  setBusy(true);
  try {
    const { text, model } = await callGemini(buildPrompt(q), apiKey);
    el.answer.textContent = text;
    el.answer.hidden = false;
    el.modelLabel.textContent = model;
    speakOut(text);
  } catch (err) {
    el.error.textContent = err.message;
    el.error.hidden = false;
  } finally {
    setBusy(false);
  }
}

/* ---------------- 音声入力 ---------------- */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;

if (SR) {
  recog = new SR();
  recog.lang = "ja-JP";
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  recog.onresult = (e) => {
    const said = e.results[0][0].transcript;
    el.question.value = said;
    ask(said);
  };
  recog.onend = () => el.mic.classList.remove("on");
  recog.onerror = () => el.mic.classList.remove("on");

  el.mic.addEventListener("click", () => {
    if (el.mic.classList.contains("on")) {
      recog.stop();
      return;
    }
    el.mic.classList.add("on");
    try { recog.start(); } catch { el.mic.classList.remove("on"); }
  });
} else {
  el.mic.disabled = true;
  el.mic.title = "このブラウザは音声入力に対応していません（Chrome推奨）";
}

/* ---------------- APIキー ---------------- */

function openGate() {
  el.gate.hidden = false;
  el.app.hidden = true;
  el.keyInput.value = "";
  el.keyInput.focus();
}

function openApp() {
  el.gate.hidden = true;
  el.app.hidden = false;
  el.question.focus();
}

el.keySave.addEventListener("click", () => {
  const k = el.keyInput.value.trim();
  if (!k) return el.keyInput.focus();
  localStorage.setItem(KEY_STORE, k);
  openApp();
});

el.keyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") el.keySave.click();
});

el.keyClear.addEventListener("click", () => {
  localStorage.removeItem(KEY_STORE);
  openGate();
});

/* ---------------- 起動 ---------------- */

el.send.addEventListener("click", () => ask(el.question.value));
el.question.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") ask(el.question.value);
});

SAMPLES.forEach((s) => {
  const b = document.createElement("button");
  b.className = "sample";
  b.type = "button";
  b.textContent = s;
  b.addEventListener("click", () => { el.question.value = s; ask(s); });
  el.samples.appendChild(b);
});

loadPrompts();
if (localStorage.getItem(KEY_STORE)) openApp(); else openGate();
