// WOZオペレータ卓。
// ユーザ役の発話を聞いて応答を選び、ディスプレイ（display.html）へ送って読み上げる。
// 送信のたびに1行ずつ対話コーパス（スライド33-34の表形式）へ記録される。

const channel = new BroadcastChannel("rehavision-woz");
const STORAGE_KEY = "rehavision-woz-log";

// 頻出フレーズのグループ名から、コーパス上のカテゴリを推測するための対応表
const CATEGORY_HINT = {
    状態確認: "情報提示",
    訓練進捗: "訓練経過",
    訓練内容: "情報提示",
    今後の見通し: "今後の見通し",
    "課題・注意事項": "注意事項",
    情報なし: "情報なし",
};

const els = {
    phraseGroups: document.getElementById("phrase-groups"),
    answerInput: document.getElementById("answer-input"),
    questionInput: document.getElementById("question-input"),
    categorySelect: document.getElementById("category-select"),
    sendBtn: document.getElementById("send-btn"),
    thinkingBtn: document.getElementById("thinking-btn"),
    idleBtn: document.getElementById("idle-btn"),
    speakToggle: document.getElementById("speak-toggle"),
    voiceSelect: document.getElementById("voice-select"),
    ttsNote: document.getElementById("tts-note"),
    openDisplayBtn: document.getElementById("open-display-btn"),
    linkStatus: document.getElementById("link-status"),
    logBody: document.getElementById("log-body"),
    logCount: document.getElementById("log-count"),
    exportCsvBtn: document.getElementById("export-csv-btn"),
    exportJsonBtn: document.getElementById("export-json-btn"),
    importJsonBtn: document.getElementById("import-json-btn"),
    importFile: document.getElementById("import-file"),
    clearLogBtn: document.getElementById("clear-log-btn"),
};

/** @type {{id:number, time:string, question:string, answer:string, category:string}[]} */
let log = [];
let displayWindow = null;

/* ------------------------------------------------------------------
   頻出フレーズ
   ------------------------------------------------------------------ */

function renderPhrases() {
    PHRASE_GROUPS.forEach((group) => {
        const wrap = document.createElement("div");
        wrap.className = "phrase-group";

        const title = document.createElement("div");
        title.className = "phrase-group-title";
        title.textContent = group.category;
        wrap.appendChild(title);

        group.phrases.forEach((phrase) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "phrase-btn";
            btn.textContent = phrase;
            btn.addEventListener("click", () =>
                appendPhrase(phrase, group.category),
            );
            wrap.appendChild(btn);
        });

        els.phraseGroups.appendChild(wrap);
    });
}

function appendPhrase(phrase, groupCategory) {
    const current = els.answerInput.value.trim();
    els.answerInput.value = current ? `${current}${phrase}` : phrase;

    const hint = CATEGORY_HINT[groupCategory];
    if (hint && CORPUS_CATEGORIES.includes(hint)) {
        els.categorySelect.value = hint;
    }
    els.answerInput.focus();
}

function renderCategories() {
    CORPUS_CATEGORIES.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        els.categorySelect.appendChild(opt);
    });
}

/* ------------------------------------------------------------------
   音声合成（ブラウザ内蔵のWeb Speech APIを使用）
   ------------------------------------------------------------------ */

let voices = [];

function loadVoices() {
    voices = window.speechSynthesis
        ? window.speechSynthesis
              .getVoices()
              .filter((v) => v.lang.startsWith("ja"))
        : [];

    els.voiceSelect.innerHTML = "";

    if (!window.speechSynthesis) {
        els.ttsNote.textContent = "音声合成に非対応のブラウザです";
        els.ttsNote.title =
            "読み上げは VOICEVOX 等で作った音声ファイルを手動再生してください。";
        els.speakToggle.checked = false;
        els.speakToggle.disabled = true;
        return;
    }

    if (voices.length === 0) {
        const opt = document.createElement("option");
        opt.textContent = "日本語音声なし";
        els.voiceSelect.appendChild(opt);
        els.ttsNote.textContent = "日本語音声が未インストール";
        els.ttsNote.title =
            "OSに日本語音声を追加するか、VOICEVOX等で作った音声ファイルを手動再生してください。";
        return;
    }

    voices.forEach((voice, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = voice.name;
        els.voiceSelect.appendChild(opt);
    });
    els.ttsNote.textContent = "";
    els.ttsNote.title = "";
}

function speak(text) {
    if (!window.speechSynthesis || voices.length === 0) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selected = voices[Number(els.voiceSelect.value)] || voices[0];
    utterance.voice = selected;
    utterance.lang = selected.lang || "ja-JP";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

/* ------------------------------------------------------------------
   送信
   ------------------------------------------------------------------ */

function nowLabel() {
    return new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function send() {
    const answer = els.answerInput.value.trim();
    if (!answer) {
        els.answerInput.focus();
        return;
    }

    channel.postMessage({ type: "answer", text: answer });

    if (els.speakToggle.checked) {
        speak(answer);
    }

    log.push({
        id: log.length + 1,
        time: nowLabel(),
        question: els.questionInput.value.trim(),
        answer,
        category: els.categorySelect.value,
    });
    persist();
    renderLog();

    els.answerInput.value = "";
    els.questionInput.value = "";
    els.questionInput.focus();
}

/* ------------------------------------------------------------------
   対話コーパスの表
   ------------------------------------------------------------------ */

function renderLog() {
    els.logCount.textContent = String(log.length);
    els.logBody.innerHTML = "";

    if (log.length === 0) {
        const tr = document.createElement("tr");
        tr.className = "empty-row";
        const td = document.createElement("td");
        td.colSpan = 6;
        td.textContent =
            "まだ記録がありません。応答を送信すると1行ずつ追加されます。";
        tr.appendChild(td);
        els.logBody.appendChild(tr);
        return;
    }

    log.forEach((entry, index) => {
        const tr = document.createElement("tr");

        tr.appendChild(staticCell(String(entry.id)));
        tr.appendChild(staticCell(entry.time));
        tr.appendChild(
            textareaCell(entry.question, (v) =>
                updateEntry(index, "question", v),
            ),
        );
        tr.appendChild(
            textareaCell(entry.answer, (v) => updateEntry(index, "answer", v)),
        );
        tr.appendChild(
            categoryCell(entry.category, (v) =>
                updateEntry(index, "category", v),
            ),
        );

        const delTd = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "row-del-btn";
        delBtn.textContent = "×";
        delBtn.title = "この行を削除";
        delBtn.addEventListener("click", () => removeEntry(index));
        delTd.appendChild(delBtn);
        tr.appendChild(delTd);

        els.logBody.appendChild(tr);
    });
}

function staticCell(text) {
    const td = document.createElement("td");
    td.className = "cell-static";
    td.textContent = text;
    return td;
}

function textareaCell(value, onChange) {
    const td = document.createElement("td");
    const ta = document.createElement("textarea");
    ta.className = "cell-input";
    ta.rows = 2;
    ta.value = value;
    ta.addEventListener("change", () => onChange(ta.value));
    td.appendChild(ta);
    return td;
}

function categoryCell(value, onChange) {
    const td = document.createElement("td");
    const select = document.createElement("select");
    select.className = "cell-input";
    CORPUS_CATEGORIES.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
    td.appendChild(select);
    return td;
}

function updateEntry(index, field, value) {
    log[index][field] = value;
    persist();
}

function removeEntry(index) {
    log.splice(index, 1);
    log.forEach((entry, i) => {
        entry.id = i + 1;
    });
    persist();
    renderLog();
}

/* ------------------------------------------------------------------
   保存・書き出し
   ------------------------------------------------------------------ */

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch (err) {
        console.warn("ログの保存に失敗しました", err);
    }
}

function restore() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) log = JSON.parse(saved);
    } catch (err) {
        console.warn("ログの復元に失敗しました", err);
        log = [];
    }
}

function csvEscape(value) {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function timestampSlug() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function exportCsv() {
    const header = ["ID", "時刻", "Users' Question", "Answers", "カテゴリ"];
    const rows = log.map((e) => [
        e.id,
        e.time,
        e.question,
        e.answer,
        e.category,
    ]);
    const csv = [header, ...rows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\r\n");
    // Excelで文字化けしないようBOMを付ける
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `woz_corpus_${timestampSlug()}.csv`);
}

function exportJson() {
    const blob = new Blob([JSON.stringify(log, null, 2)], {
        type: "application/json",
    });
    downloadBlob(blob, `woz_corpus_${timestampSlug()}.json`);
}

function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(String(reader.result));
            if (!Array.isArray(parsed)) throw new Error("配列ではありません");
            log = parsed;
            log.forEach((entry, i) => {
                entry.id = i + 1;
            });
            persist();
            renderLog();
        } catch (err) {
            alert(`読み込みに失敗しました: ${err.message}`);
        }
    };
    reader.readAsText(file);
}

/* ------------------------------------------------------------------
   ディスプレイとの接続
   ------------------------------------------------------------------ */

function setLinkStatus(connected) {
    els.linkStatus.textContent = connected ? "接続中" : "未接続";
    els.linkStatus.classList.toggle("connected", connected);
}

channel.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "display-ready" || msg.type === "pong") {
        setLinkStatus(true);
        return;
    }

    if (msg.type === "display-closed") {
        setLinkStatus(false);
        return;
    }

    // display.html から音声認識された質問を受け取る
    if (msg.type === "question") {
        setLinkStatus(true);
        els.questionInput.value = msg.text || "";
        els.questionInput.focus();

        // 受け取ったら display 側を「確認中」にしておく
        channel.postMessage({ type: "thinking" });
        return;
    }
});

/* ------------------------------------------------------------------
   イベント配線
   ------------------------------------------------------------------ */

els.sendBtn.addEventListener("click", send);

els.answerInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        send();
    }
});

els.thinkingBtn.addEventListener("click", () =>
    channel.postMessage({ type: "thinking" }),
);
els.idleBtn.addEventListener("click", () =>
    channel.postMessage({ type: "idle" }),
);

els.openDisplayBtn.addEventListener("click", () => {
    displayWindow = window.open("display.html", "rehavision-woz-display");
    setTimeout(() => channel.postMessage({ type: "ping" }), 600);
});

els.exportCsvBtn.addEventListener("click", exportCsv);
els.exportJsonBtn.addEventListener("click", exportJson);
els.importJsonBtn.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importJson(file);
    event.target.value = "";
});

els.clearLogBtn.addEventListener("click", () => {
    if (log.length === 0) return;
    if (
        !confirm(
            `記録済みの${log.length}件をすべて消去します。よろしいですか？`,
        )
    )
        return;
    log = [];
    persist();
    renderLog();
});

if (window.speechSynthesis) {
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
}

/* ------------------------------------------------------------------
   起動
   ------------------------------------------------------------------ */

renderPhrases();
renderCategories();
loadVoices();
restore();
renderLog();
channel.postMessage({ type: "ping" });
