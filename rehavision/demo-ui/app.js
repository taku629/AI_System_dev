// Rehavision — 歩行訓練プロジェクションのシミュレーター
// 左：床に投影される映像。右：作業療法士のタブレットに出る計測値。

const GOAL = 5;
const PREV = 3;          // 前回の到達歩数（07_reference.txt の 2026-07-28 の記録）
const NEXT_GOAL = 7;

// 1歩ごとの安定度(%)。2歩目で崩れ、後半にかけて改善する。
const STABILITY = [null, 82, 46, 71, 86, 91];
const WARN_BELOW = 60;

const $ = (id) => document.getElementById(id);
const el = {
  cue: $("cue"),
  title: document.querySelector(".title"),
  stepNow: $("step-now"),
  alert: $("alert"),
  alertText: $("alert-text"),
  gaugeFg: $("gauge-fg"),
  gaugeNum: $("gauge-num"),
  stabilityNum: $("stability-num"),
  stabilityBar: $("stability-bar"),
  dots: $("dots"),
  barToday: $("bar-today"),
  barTodayVal: $("bar-today-val"),
  result: $("result"),
  start: $("start"),
  reset: $("reset"),
  footprints: [...document.querySelectorAll(".fp")].reverse(), // 手前→奥
  dotList: [...document.querySelectorAll("#dots i")],
};

const GAUGE_LEN = 327;   // 2πr (r=52)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setStability(value) {
  el.stabilityNum.textContent = `${value}%`;
  el.stabilityBar.style.width = `${value}%`;
  el.stabilityBar.classList.toggle("warn", value < WARN_BELOW);
  el.stabilityBar.classList.toggle("good", value >= 85);
}

function showAlert(text) {
  el.alertText.textContent = text;
  el.alert.hidden = false;
}

function reset() {
  el.title.textContent = "本日の動作①";
  el.cue.textContent = "まっすぐ進みましょう";
  el.stepNow.textContent = "0";
  el.alert.hidden = true;
  el.footprints.forEach((f) => f.classList.remove("on"));

  el.gaugeFg.style.strokeDashoffset = GAUGE_LEN;
  el.gaugeFg.classList.remove("done");
  el.gaugeNum.textContent = "0";

  el.stabilityNum.textContent = "—";
  el.stabilityBar.style.width = "0%";
  el.stabilityBar.classList.remove("warn", "good");

  el.dotList.forEach((d) => d.classList.remove("ok", "warn"));
  el.barToday.style.width = "0%";
  el.barTodayVal.textContent = "0";
  el.result.hidden = true;
  el.start.disabled = false;
}

async function run() {
  el.start.disabled = true;
  reset();
  el.start.disabled = true;

  el.title.textContent = "本日の目標！";
  el.cue.textContent = `「${GOAL}歩」前に進む！`;
  await sleep(1400);
  el.title.textContent = "本日の動作①";
  el.cue.textContent = "まっすぐ進みましょう";
  await sleep(700);

  for (let step = 1; step <= GOAL; step += 1) {
    await sleep(1000);

    el.stepNow.textContent = String(step);
    el.footprints[step - 1].classList.add("on");

    // ゲージ
    el.gaugeNum.textContent = String(step);
    el.gaugeFg.style.strokeDashoffset = GAUGE_LEN * (1 - step / GOAL);

    // 安定度
    const s = STABILITY[step];
    setStability(s);

    // 1歩ごとの判定
    el.dotList[step - 1].classList.add(s < WARN_BELOW ? "warn" : "ok");

    // 比較バー（前回3歩を100%基準にせず、目標5歩を満幅とする）
    el.barToday.style.width = `${(step / GOAL) * 100}%`;
    el.barTodayVal.textContent = String(step);

    if (s < WARN_BELOW) {
      showAlert("左足の踏み出しが少し不安定です！");
    } else {
      el.alert.hidden = true;
    }
  }

  await sleep(900);
  el.title.textContent = "訓練終了";
  el.cue.textContent = `前回よりもスムーズに歩けました！`;
  el.gaugeFg.classList.add("done");
  el.alert.hidden = true;
  el.result.hidden = false;
  el.result.querySelector(".result-value").textContent = `${NEXT_GOAL} 歩`;
  el.start.disabled = false;
}

el.start.addEventListener("click", run);
el.reset.addEventListener("click", reset);

// 前回バーは目標5歩を満幅とした比率で描く
document.querySelector(".bar-row:not(.now) .bar i").style.width = `${(PREV / GOAL) * 100}%`;

reset();
