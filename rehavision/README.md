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
| [`docs/teams-demo.md`](./docs/teams-demo.md) | **オンライン（Teams）でのデモ手順。音声共有の設定が必須** |
| [`docs/qa-prep.md`](./docs/qa-prep.md) | **想定質疑と回答の組み立て（要調査の項目あり）** |
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
├── demo-ui/              歩行訓練の床面投影シミュレーター（静的HTML/CSS/JS）
├── ai-demo/              ブラウザ版のAI対話デモ（Gemini APIを直接呼ぶ）
└── woz-tool/             WOZ収録ツール（オペレータ卓＋ユーザ役用ディスプレイ）
```

## 1. 対話デモ（Gemini API + RAG風応答 + TTS）

課題PDFの「デモ」スライドで示されている、審査員の質問→AI回答→TTS読み上げの流れを再現したもの。

### Google Colabで実行する場合

**このリンクを開くだけで起動できる。**

https://colab.research.google.com/github/taku629/AI_System_dev/blob/main/rehavision/notebook/rehavision_demo.ipynb

1. 上のリンクでColabを開く
2. Colabの鍵アイコン（Secrets）で `GOOGLE_API_KEY` を登録し、**Notebook access をONにする**
3. 上から順にセルを実行する
4. 「質問応答デモ」セルの `question` を書き換えると、任意の質問で試せる

Prompt Template と Reference は、実行環境に応じて自動的に解決される。

| 実行場所 | 読み込み元 |
|---|---|
| リポジトリ内（ローカル） | 手元の `prompts/*.txt`（編集がそのまま反映される） |
| Colab（.ipynbのみ） | リポジトリを自動でcloneして取得 |
| ネットワーク不通 | Notebook内蔵のコピー |

### ローカル/CLIで実行する場合

```bash
cd rehavision/backend
pip install -r requirements.txt
export GOOGLE_API_KEY="your-api-key"
python3 - <<'PY'
from gemini_client import configure_api_key, ask_custom_llm, build_prompt
from tts import synthesize_speech

configure_api_key()
prompt = build_prompt("../prompts/07_prompt.txt", "../prompts/07_reference.txt", "リハビリの効果は出ている？")
answer = ask_custom_llm(prompt)
print(answer)
synthesize_speech(answer, "answer.mp3")
PY
```

### ブラウザで実行する場合（発表本番向け）

`ai-demo/` を開き、画面の指示に従ってAPIキーを入力する。Colabを開かずに
質問から読み上げまで完結し、**マイクでの音声入力にも対応**している。

Prompt Template と Reference は `prompts/` から読み込むため、**Colab版と同じ応答になる**。
キーはブラウザのlocalStorageにのみ保存され、リポジトリには含まれない。

## 2. 歩行訓練の床面投影シミュレーター

実機（天井カメラ・LiDAR・プロジェクター）の代わりに、床面に投影される映像をブラウザで再現したデモ。
プロジェクターで真上から照らす想定のため遠近感は付けず、配色と素材は
班のストーリーボード（黒地・シアン・黄色の警告）から取り込んでいる。

```bash
cd rehavision/demo-ui
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開き、「訓練を開始」を押す
```

画面左が床面投影（歩行ピクトグラム・足跡ガイド・歩数）、
右が作業療法士のタブレット（進捗リング・歩行安定度・1歩ごとの判定・前回との比較）。

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
