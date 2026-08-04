// Rehavision — 歩行訓練プロジェクションのシミュレーター
// pptxストーリーボード（本日の動作①：まっすぐ進みましょう／0-5歩／フィードバック）を再現する。

const PATIENT_NAME = "田中さん";
const GOAL_STEPS = 5;
const NEXT_GOAL_STEPS = 7;

const els = {
  instruction: document.getElementById("instruction"),
  subInstruction: document.getElementById("sub-instruction"),
  countValue: document.getElementById("count-value"),
  walker: document.getElementById("walker"),
  feedbackBubble: document.getElementById("feedback-bubble"),
  footprints: Array.from(document.querySelectorAll(".footprint")),
  startBtn: document.getElementById("start-btn"),
  resetBtn: document.getElementById("reset-btn"),
  tabletLog: document.getElementById("tablet-log"),
};

// 各歩数ごとのY座標(px) — walk-trackの高さ260pxに合わせた歩幅
const STEP_POSITIONS = [230, 210, 165, 120, 75, 30];

// ステップごとのAIフィードバック（storyboardの「左足の踏み出しが少し不安定」を再現）
const STEP_FEEDBACK = {
  2: { text: "左足の踏み出しが少し不安定です！", tone: "warn" },
  5: { text: "スムーズに歩けています！", tone: "good" },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setFeedback(step) {
  const fb = STEP_FEEDBACK[step];
  if (!fb) {
    els.feedbackBubble.hidden = true;
    return;
  }
  els.feedbackBubble.hidden = false;
  els.feedbackBubble.textContent = fb.text;
  els.feedbackBubble.classList.toggle("good", fb.tone === "good");
}

function logToTablet(message) {
  if (els.tabletLog.querySelector(".log-placeholder")) {
    els.tabletLog.innerHTML = "";
  }
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const time = document.createElement("span");
  time.className = "log-time";
  time.textContent = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const text = document.createElement("div");
  text.textContent = message;
  entry.appendChild(time);
  entry.appendChild(text);
  els.tabletLog.appendChild(entry);
  els.tabletLog.scrollTop = els.tabletLog.scrollHeight;
}

function resetStage() {
  els.instruction.textContent = "本日の動作①";
  els.subInstruction.textContent = "前に歩く！";
  els.countValue.textContent = "0";
  els.walker.style.top = `${STEP_POSITIONS[0]}px`;
  els.feedbackBubble.hidden = true;
  els.footprints.forEach((fp) => fp.classList.remove("lit"));
  els.tabletLog.innerHTML = '<p class="log-placeholder">訓練を開始すると、ここにAIによる記録メモが表示されます。</p>';
  els.startBtn.disabled = false;
}

async function runSequence() {
  els.startBtn.disabled = true;

  // 1. 目標提示
  els.instruction.textContent = "本日の目標！";
  els.subInstruction.textContent = `「${GOAL_STEPS}歩」前に進む！`;
  logToTablet(`訓練開始：${PATIENT_NAME}の歩行訓練（目標 ${GOAL_STEPS} 歩）を記録します。`);
  await sleep(1600);

  // 2. 歩行ガイド表示
  els.instruction.textContent = "本日の動作①";
  els.subInstruction.textContent = "まっすぐ進みましょう";
  await sleep(900);

  // 3. 1歩ずつ進める
  for (let step = 1; step <= GOAL_STEPS; step += 1) {
    await sleep(1100);
    els.countValue.textContent = String(step);
    els.walker.style.top = `${STEP_POSITIONS[step]}px`;
    els.footprints[step - 1]?.classList.add("lit");
    setFeedback(step);

    if (STEP_FEEDBACK[step]) {
      logToTablet(`${step}歩目：${STEP_FEEDBACK[step].text}`);
    } else {
      logToTablet(`${step}歩目を記録しました。`);
    }
  }

  // 4. 結果表示
  await sleep(1200);
  els.instruction.textContent = "訓練終了";
  els.subInstruction.textContent = `${PATIENT_NAME}は前回よりもスムーズに歩けました！【次回目標：${NEXT_GOAL_STEPS}歩】`;
  els.feedbackBubble.hidden = false;
  els.feedbackBubble.classList.add("good");
  els.feedbackBubble.textContent = `本日の訓練完了：${GOAL_STEPS}/${GOAL_STEPS} 歩`;
  logToTablet(`訓練完了：${PATIENT_NAME}は前回よりもスムーズに歩行できました。次回目標を${NEXT_GOAL_STEPS}歩に更新し、家族への説明文を作成できます。`);

  els.startBtn.disabled = false;
}

els.startBtn.addEventListener("click", () => {
  resetStage();
  runSequence();
});

els.resetBtn.addEventListener("click", resetStage);

resetStage();
