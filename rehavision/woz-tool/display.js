// ユーザ役に見せるディスプレイ。
// オペレータ卓（operator.html）から BroadcastChannel 経由で指示を受け取り、
// 待機／確認中／応答表示 の3状態を切り替える。
// さらに、この画面自身でマイク許可を取り、音声認識した質問を
// operator.html 側へ送る。

const channel = new BroadcastChannel("rehavision-woz");

const views = {
    idle: document.getElementById("idle-view"),
    thinking: document.getElementById("thinking-view"),
    answer: document.getElementById("answer-view"),
};

const answerText = document.getElementById("answer-text");
const statusLabel = document.getElementById("device-status");

const idleText = document.querySelector(".idle-text");
const thinkingText = document.querySelector(".thinking-text");
const screenEl = document.getElementById("device-screen");

const STATUS_LABEL = {
    idle: "待機中",
    listening: "聞き取り中",
    thinking: "確認中",
    answer: "応答",
};

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;
let hasMicPermission = false;
let awaitingAnswer = false;

function setState(state, text) {
    Object.entries(views).forEach(([name, el]) => {
        el.hidden = name !== state;
    });

    if (state === "answer") {
        answerText.textContent = text || "";
    }

    if (state === "idle") {
        statusLabel.textContent = STATUS_LABEL.idle;
    } else if (state === "thinking") {
        statusLabel.textContent = STATUS_LABEL.thinking;
    } else if (state === "answer") {
        statusLabel.textContent = STATUS_LABEL.answer;
    }
}

function setIdleMessage(text) {
    if (idleText) idleText.textContent = text;
}

function setThinkingMessage(text) {
    if (thinkingText) thinkingText.textContent = text;
}

function setListeningState() {
    setState("idle");
    statusLabel.textContent = STATUS_LABEL.listening;
    setIdleMessage("聞き取っています…");
}

function resetToIdle() {
    awaitingAnswer = false;
    setState("idle");
    setIdleMessage(
        SR ? "タップして話す" : "このブラウザは音声入力に対応していません",
    );
}

async function ensureMicPermission() {
    if (hasMicPermission) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            "このブラウザではマイク機能を使えません。Chrome / Edge を推奨します。",
        );
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    hasMicPermission = true;

    // 権限確認だけ行い、すぐ閉じる
    stream.getTracks().forEach((track) => track.stop());
}

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
        const transcript = Array.from(event.results)
            .map((result) => result[0]?.transcript || "")
            .join("")
            .trim();

        if (!transcript) {
            resetToIdle();
            return;
        }

        awaitingAnswer = true;
        setState("thinking");
        setThinkingMessage(`「${transcript}」を確認しています…`);

        channel.postMessage({
            type: "question",
            text: transcript,
        });
    };

    recognition.onerror = (event) => {
        isListening = false;

        let msg = "音声入力に失敗しました";
        switch (event.error) {
            case "not-allowed":
                msg = "マイクの許可が必要です";
                break;
            case "no-speech":
                msg = "音声が聞き取れませんでした。もう一度お試しください";
                break;
            case "audio-capture":
                msg = "マイクが見つかりません";
                break;
            case "network":
                msg = "音声認識でネットワークエラーが発生しました";
                break;
            default:
                msg = `音声入力に失敗しました: ${event.error}`;
                break;
        }

        setState("idle");
        setIdleMessage(msg);
        statusLabel.textContent = STATUS_LABEL.idle;
    };

    recognition.onend = () => {
        isListening = false;

        // 質問送信後は operator 側の返答待ちなので thinking を維持
        if (awaitingAnswer) return;

        setState("idle");
        setIdleMessage("タップして話す");
        statusLabel.textContent = STATUS_LABEL.idle;
    };

    return recognition;
}

async function startListening() {
    if (!SR) {
        setIdleMessage("このブラウザは音声入力に対応していません");
        return;
    }

    if (isListening) return;

    try {
        setIdleMessage("マイクの許可を確認しています…");
        await ensureMicPermission();

        const recog = buildRecognition();
        if (!recog) return;

        recog.start();
    } catch (err) {
        setState("idle");
        setIdleMessage(`マイクを使えません: ${err.message}`);
        statusLabel.textContent = STATUS_LABEL.idle;
    }
}

channel.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    switch (msg.type) {
        case "answer":
            awaitingAnswer = false;
            setState("answer", msg.text);
            break;

        case "thinking":
            awaitingAnswer = true;
            setState("thinking");
            setThinkingMessage("確認しています…");
            break;

        case "idle":
            resetToIdle();
            break;

        case "ping":
            channel.postMessage({ type: "pong" });
            break;

        default:
            break;
    }
});

// タップで音声入力開始
views.idle.style.cursor = "pointer";
views.idle.tabIndex = 0;
views.idle.addEventListener("click", startListening);
views.idle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startListening();
    }
});

// 起動を知らせ、オペレータ卓側の接続表示を更新させる
channel.postMessage({ type: "display-ready" });

window.addEventListener("beforeunload", () => {
    channel.postMessage({ type: "display-closed" });
});

resetToIdle();
