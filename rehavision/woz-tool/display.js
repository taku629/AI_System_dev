// ユーザ役に見せるディスプレイ。
// オペレータ卓（operator.html）から BroadcastChannel 経由で指示を受け取り、
// 待機／確認中／応答表示 の3状態を切り替える。
//
// ユーザ役はこの画面だけを見る（課題資料スライド32）。
// 読み上げはオペレータ卓側で行うため、この画面では音を出さない。

const channel = new BroadcastChannel("rehavision-woz");

const views = {
  idle: document.getElementById("idle-view"),
  thinking: document.getElementById("thinking-view"),
  answer: document.getElementById("answer-view"),
};

const answerText = document.getElementById("answer-text");
const statusLabel = document.getElementById("device-status");

const STATUS_LABEL = {
  idle: "待機中",
  thinking: "確認中",
  answer: "応答",
};

function setState(state, text) {
  Object.entries(views).forEach(([name, el]) => {
    el.hidden = name !== state;
  });
  if (state === "answer") {
    answerText.textContent = text || "";
  }
  statusLabel.textContent = STATUS_LABEL[state] || "";
}

channel.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;

  switch (msg.type) {
    case "answer":
      setState("answer", msg.text);
      break;
    case "thinking":
      setState("thinking");
      break;
    case "idle":
      setState("idle");
      break;
    case "ping":
      // オペレータ卓の接続確認に応答する
      channel.postMessage({ type: "pong" });
      break;
    default:
      break;
  }
});

// 起動を知らせ、オペレータ卓側の接続表示を更新させる
channel.postMessage({ type: "display-ready" });

window.addEventListener("beforeunload", () => {
  channel.postMessage({ type: "display-closed" });
});

setState("idle");
