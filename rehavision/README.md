# Rehavision

**AIが導き、回復を支えるスマートリハビリ環境**

人工知能システム開発 第7班による、`AI for Omni-Care` 向け新機能提案「Rehavision」のデモ実装。
理学療法士・作業療法士の負担軽減とリハビリ効果の可視化を目的とした、天井カメラ・LiDAR・床面プロジェクション・LLM(RAG)・音声UIを組み合わせたシステムを想定している。

| ドキュメント | 内容 |
|---|---|
| [`docs/concept.md`](./docs/concept.md) | 企画概要（背景・仕組み・ターゲット・価値） |
| [`docs/requirements.md`](./docs/requirements.md) | 課題要件のまとめ |
| [`docs/evaluation.md`](./docs/evaluation.md) | 評価結果（RAG有無のA/B比較・ルーブリック評価） |
| [`docs/demo-script.md`](./docs/demo-script.md) | 発表本番（7分）の台本 |
| [`docs/demo-checklist.md`](./docs/demo-checklist.md) | **本番前の準備チェックリスト（未検証項目あり・要確認）** |

> **⚠️ 重要**: このリポジトリのコードは**実際のGemini APIキーで未検証**です。
> オフラインのモックテストでロジックは確認済みですが、本物のAPIで通るかは確認できていません。
> 本番前に必ず [`docs/demo-checklist.md`](./docs/demo-checklist.md) を実施してください。

## ディレクトリ構成

```
rehavision/
├── docs/               企画概要・課題要件・評価結果・プレゼン台本
├── prompts/            Prompt Template / Reference / 評価用テストセット
├── notebook/            Google Colab対応デモNotebook（Gemini API + TTS）
├── backend/             Colab外でも使えるPythonモジュール（notebookと同等ロジック）＋オフライン検証テスト
├── demo-ui/              歩行訓練プロジェクションのUIシミュレーター（静的HTML/CSS/JS）
└── woz-tool/             WOZ収録ツール（オペレータ卓＋ユーザ役用ディスプレイ）
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

## 3. WOZ収録ツール

Wizard of OZ方式で対話コーパスを収集するためのツール。
オペレータが裏でAIのふりをして応答し、その対話を自動で表形式（ID / 質問 / 応答 / カテゴリ）に記録する。

```bash
cd rehavision/woz-tool
python3 -m http.server 8000
# ブラウザで http://localhost:8000/operator.html を開く
```

詳しい収録手順は [`woz-tool/README.md`](./woz-tool/README.md) を参照。

## Prompt Template / Reference について

- `prompts/07_prompt.txt`: ハルシネーション対策（情報にない内容は断定しない）と、TTS読み上げに適した話し言葉フォーマットを指定
- `prompts/07_reference.txt`: 患者（田中一郎）のリハビリ記録・訓練進捗を記載したRAG用参照データ。`07_評価.xlsx` の評価で使われた内容に合わせている
- `prompts/07_testset.md`: 評価用テストセット20問（Key Index・正解文章・採点ルール）

本番の審査員質問に対応するため、`prompts/` 配下のファイルを差し替えるだけでテンプレート・参照情報を更新できる構成にしている。

> **注意**: `07_prompt.txt` はこのリポジトリで作成したスキャフォールド版。
> `07_評価.xlsx` の評価を実際に走らせた際のPrompt Templateが別途ある場合は、そちらで置き換えること。
> 特に「回答は3文以内」という制約は、評価でCoverageが76.9%に留まった要因の一つと考えられる
> （詳細は [`docs/evaluation.md`](./docs/evaluation.md)）。

## APIキーなしでの動作検証

```bash
cd rehavision/backend
python3 test_offline.py
```

`google.generativeai` をモックに差し替え、`GOOGLE_API_KEY` なしで
プロンプト組み立て・モデルフォールバック処理のロジックを検証できる。
実際のGemini応答の品質確認は、Colab上で本物のAPIキーを使って行うこと。
