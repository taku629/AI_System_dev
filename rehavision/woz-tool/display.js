// RehaVision WOZ 利用者用ディスプレイ
//
// - operator.html の接続状態を確認
// - 未接続なら操作画面への案内を表示
// - 接続後にマイク入力を有効化
// - SpeechRecognition で質問を文字起こし
// - BroadcastChannel で operator.html に送信

const channel = new BroadcastChannel("rehavision-woz");

const connectionGuide = document.getElementById("connection-guide");
const deviceScreen = document.getElementById("device-screen");

const statusLabel = document.getElementById("device-status");

const openOperatorBtn = document.getElementById("open-operator-btn");
const askAgainBtn = document.getElementById("ask-again-btn");

const views = {
  idle: document.getElementById("idle-view"),
  thinking: document.getElementById("thinking-view"),
  answer: document.getElementById("answer-view"),
};

const idleText = document.querySelector(".idle-text");
const thinkingText = document.querySelector(".thinking-text");
const answerText = document.getElementById("answer-text");

const SR =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;

let isListening = false;
let hasMicPermission = false;
let awaitingAnswer = false;

let operatorConnected = false;
let lastOperatorResponse = 0;

// ------------------------------------------------------------------
// 接続状態
// ------------------------------------------------------------------

function setOperatorConnected(connected) {

  operatorConnected = connected;

  if (connected) {

    lastOperatorResponse = Date.now();

    connectionGuide.hidden = true;
    deviceScreen.hidden = false;

    statusLabel.textContent = "操作画面 接続済み";

    statusLabel.classList.remove("disconnected");
    statusLabel.classList.add("connected");

    if (!awaitingAnswer && !isListening) {
      resetToIdle();
    }

  } else {

    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }

    isListening = false;
    awaitingAnswer = false;

    connectionGuide.hidden = false;
    deviceScreen.hidden = true;

    statusLabel.textContent = "操作画面 未接続";

    statusLabel.classList.remove("connected");
    statusLabel.classList.add("disconnected");
  }
}

function pingOperator() {

  channel.postMessage({
    type: "operator-ping",
  });
}

// 2秒ごとにoperatorの生存確認
setInterval(() => {

  pingOperator();

  if (
    operatorConnected &&
    Date.now() - lastOperatorResponse > 5000
  ) {
    setOperatorConnected(false);
  }

}, 2000);

// ------------------------------------------------------------------
// 画面状態
// ------------------------------------------------------------------

function setState(state, text = "") {

  Object.entries(views).forEach(([name, element]) => {
    element.hidden = name !== state;
  });

  if (state === "answer") {
    answerText.textContent = text;
  }
}

function setIdleMessage(text) {

  if (idleText) {
    idleText.textContent = text;
  }
}

function setThinkingMessage(text) {

  if (thinkingText) {
    thinkingText.textContent = text;
  }
}

function resetToIdle() {

  awaitingAnswer = false;

  setState("idle");

  statusLabel.textContent =
    operatorConnected
      ? "待機中"
      : "操作画面 未接続";

  setIdleMessage(
    SR
      ? "タップして質問する"
      : "このブラウザは音声入力に対応していません"
  );
}

function setListeningState() {

  setState("idle");

  statusLabel.textContent = "聞き取り中";

  setIdleMessage("聞き取っています…");
}

// ------------------------------------------------------------------
// マイク許可
// ------------------------------------------------------------------

async function ensureMicPermission() {

  if (hasMicPermission) return;

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    throw new Error(
      "このブラウザではマイク機能を利用できません。Chrome / Edgeを推奨します。"
    );
  }

  const stream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

  hasMicPermission = true;

  // SpeechRecognition側で使用するため、
  // 権限確認後のstream自体は閉じる
  stream
    .getTracks()
    .forEach((track) => track.stop());
}

// ------------------------------------------------------------------
// 音声認識
// ------------------------------------------------------------------

function buildRecognition() {

  if (!SR) return null;

  if (recognition) return recognition;

  recognition = new SR();

  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {

    isListening = true;
    awaitingAnswer = false;

    setListeningState();
  };

  recognition.onresult = (event) => {

    const transcript =
      Array.from(event.results)
        .map(
          (result) =>
            result[0]?.transcript || ""
        )
        .join("")
        .trim();

    if (!transcript) {

      resetToIdle();

      return;
    }

    awaitingAnswer = true;

    setState("thinking");

    statusLabel.textContent = "確認中";

    setThinkingMessage(
      `「${transcript}」を確認しています…`
    );

    // operator.htmlへ送信
    channel.postMessage({
      type: "question",
      text: transcript,
    });
  };

  recognition.onerror = (event) => {

    isListening = false;
    awaitingAnswer = false;

    let message =
      "音声入力に失敗しました";

    switch (event.error) {

      case "not-allowed":

        message =
          "マイクの使用が許可されていません";

        break;

      case "no-speech":

        message =
          "音声が聞き取れませんでした";

        break;

      case "audio-capture":

        message =
          "マイクが見つかりません";

        break;

      case "network":

        message =
          "音声認識でネットワークエラーが発生しました";

        break;

      default:

        message =
          `音声入力エラー: ${event.error}`;
    }

    setState("idle");

    setIdleMessage(message);

    statusLabel.textContent = "待機中";
  };

  recognition.onend = () => {

    isListening = false;

    // 回答待ちなら確認画面を維持
    if (awaitingAnswer) {
      return;
    }

    if (operatorConnected) {
      resetToIdle();
    }
  };

  return recognition;
}

// ------------------------------------------------------------------
// 音声入力開始
// ------------------------------------------------------------------

async function startListening() {

  if (!operatorConnected) {

    setOperatorConnected(false);

    return;
  }

  if (!SR) {

    setIdleMessage(
      "このブラウザは音声入力に対応していません"
    );

    return;
  }

  if (isListening) return;

  try {

    setIdleMessage(
      "マイクの許可を確認しています…"
    );

    await ensureMicPermission();

    const recog = buildRecognition();

    if (!recog) return;

    recog.start();

  } catch (error) {

    setState("idle");

    setIdleMessage(
      `マイクを使用できません: ${error.message}`
    );

    statusLabel.textContent = "待機中";
  }
}

// ------------------------------------------------------------------
// BroadcastChannel
// ------------------------------------------------------------------

channel.addEventListener(
  "message",
  (event) => {

    const msg = event.data;

    if (
      !msg ||
      typeof msg !== "object"
    ) {
      return;
    }

    switch (msg.type) {

      // operatorが起動した
      case "operator-ready":

        setOperatorConnected(true);

        break;

      // 生存確認
      case "operator-pong":

        setOperatorConnected(true);

        break;

      // operatorが閉じられた
      case "operator-closed":

        setOperatorConnected(false);

        break;

      // 回答
      case "answer":

        awaitingAnswer = false;

        setState(
          "answer",
          msg.text || ""
        );

        statusLabel.textContent =
          "回答";

        break;

      // operator側から確認中にする
      case "thinking":

        awaitingAnswer = true;

        setState("thinking");

        statusLabel.textContent =
          "確認中";

        setThinkingMessage(
          "回答を準備しています…"
        );

        break;

      // 待機状態へ戻す
      case "idle":

        resetToIdle();

        break;

      default:

        break;
    }
  }
);

// ------------------------------------------------------------------
// UI操作
// ------------------------------------------------------------------

// マイク領域
views.idle.style.cursor = "pointer";

views.idle.tabIndex = 0;

views.idle.addEventListener(
  "click",
  startListening
);

views.idle.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {

      event.preventDefault();

      startListening();
    }
  }
);

// 操作画面を開く
openOperatorBtn.addEventListener(
  "click",
  () => {

    window.open(
      "operator.html",
      "rehavision-woz-operator"
    );

    statusLabel.textContent =
      "操作画面 接続待ち";

    // 少し待って確認
    setTimeout(
      pingOperator,
      500
