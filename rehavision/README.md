# Rehavision

**AIが導き、回復を支えるスマートリハビリ環境**

人工知能システム開発 第7班による、`AI for Omni-Care` 向け新機能提案「Rehavision」のデモ実装。
理学療法士・作業療法士の負担軽減とリハビリ効果の可視化を目的とした、天井カメラ・LiDAR・床面プロジェクション・LLM(RAG)・音声UIを組み合わせたシステムを想定している。

企画の詳細は [`docs/concept.md`](./docs/concept.md)、課題要件は [`docs/requirements.md`](./docs/requirements.md) を参照。

## ディレクトリ構成

```
rehavision/
├── docs/               企画概要・課題要件のまとめ
├── prompts/            Prompt Template / Reference（課題の命名規則: 班番号_prompt.txt 等）
├── notebook/            Google Colab対応デモNotebook（Gemini API + TTS）
├── backend/             Colab外でも使えるPythonモジュール（notebookと同等ロジック）
└── demo-ui/              歩行訓練プロジェクションのUIシミュレーター（静的HTML/CSS/JS）
```

## 1. 対話デモ（Gemini API + RAG風応答 + TTS）

課題PDFの「デモ」スライドで示されている、審査員の質問→AI回答→TTS読み上げの流れを再現したもの。

### Google Colabで実行する場合

1. `notebook/rehavision_demo.ipynb` をColabで開く（GitHubからそのまま開くか、リポジトリをclone）
2. Colabの鍵アイコン（Secrets）で `GOOGLE_API_KEY` を登録し、Notebook access をONにする
3. 上から順にセルを実行する。`prompts/07_prompt.txt` / `07_reference.txt` が同じリポジトリ内にあれば自動的に読み込まれる（無い場合はNotebook内蔵のテンプレートにフォールバック）
4. 「質問応答デモ」セルの `question` を書き換えると、任意の質問で試せる

### ローカル/CLIで実行する場合

```bash
cd rehavision/backend
pip install -r requirements.txt
export GOOGLE_API_KEY="your-api-key"
python3 - <<'PY'
from gemini_client import configure_api_key, ask_custom_llm, build_prompt
from tts import synthesize_speech

configure_api_key()
prompt = build_prompt("../prompts/07_prompt.txt", "../prompts/07_reference.txt", "田中さんはコーヒー飲めますか？")
answer = ask_custom_llm(prompt)
print(answer)
synthesize_speech(answer, "answer.mp3")
PY
```

## 2. 歩行訓練プロジェクション シミュレーター

実機（天井カメラ・LiDAR・プロジェクター）の代わりに、床面投影のUIをブラウザ上で再現したデモ。
pptxストーリーボード（「本日の動作①／まっすぐ進みましょう／0→5歩」＋AIフィードバック）を実装している。

```bash
cd rehavision/demo-ui
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開き、「訓練を開始する」を押す
```

画面左が床面投影のシミュレーション（歩行ガイド・歩数カウント・AIフィードバック）、右が作業療法士向けタブレット（AIアシスタント）のログ表示。

## Prompt Template / Reference について

- `prompts/07_prompt.txt`: ハルシネーション対策（情報にない内容は断定しない）と、TTS読み上げに適した話し言葉フォーマットを指定
- `prompts/07_reference.txt`: 想定患者（田中さん・仮名）のリハビリ記録・生活注意事項を記載したRAG用参照データ

本番の審査員質問に対応するため、`prompts/` 配下のファイルを差し替えるだけでテンプレート・参照情報を更新できる構成にしている。
