# 課題要件まとめ（第4回グループ課題 / AI for Omni-Care）

補足資料PDFより、デモ実装に関わる要件を抜粋。

## 目標

1. チーム医療のどこかでValueがある新たな機能の創出
2. 実現性確認: Platformは既存想定でPromptを作成し、実現性を検証（PromptTemplateまたはRAG/Pluginを想定してよい）

## Prompt Design

- ハルシネーションを起こさないための Prompt Template 設計（または RAG）
- Prompt は token 数制限を超えないこと
- 最終日、プロンプトをシステムに入力して動作確認

## Gemini API 準備

1. Gemini APIキーを取得（無料枠あり）
2. Google Colab の Secrets に `GOOGLE_API_KEY` として登録し、Notebook Access を ON にする

## ファイル命名規則

| ファイル | 用途 | 命名例 |
|---|---|---|
| Prompt Template | LLM応答の雛形（回答条件・フォーマットを定義） | `班番号_prompt.txt`（例: `07_prompt.txt`） |
| Reference | `{reference_str}` に埋め込む外部情報 | `班番号_reference.txt`（例: `07_reference.txt`） |

## 発表本番（15週）の流れ

1. 班ごとにPCを用意
2. Google Colab上で動くプログラム・Prompt Template・外部情報ファイルを用意
3. 審査員の質問を入力（音声 or テキスト）すると読み上げ音声ファイルが出力される
4. 音声ファイルを再生
5. 事前にPC接続確認

プレゼン時間: 7分（発表）＋ 質疑2分 ＋ 結果宣告 ＋ 入れ替え1分

## 成果物・提出物

1. プレゼン資料: `班番号_プレゼン資料.pptx`
2. 最終提出物: `班番号_第4回グループ課題.pptx`
3. Code: デモに使用した全ファイルを `班番号_Code.zip`（例: `07_gemini_call.ipynb`, `07_Prompt_template.xlsx`）

## 評価ポイント

- 商品価値が成立していること
- ハルシネーションを起こさない対話システム（音声 or テキスト）をデモで実演できていること
- プレゼンの説得力
- Project提案として、審査員全員の承認（Approval）で設計移管（AE-OUT）完了

## WOZ（Wizard of OZ）による対話コーパス収集

- 実際に対話システムを作る前に、対話システムの価値を体験するための手法
- ユーザ役とオペレータ役に分かれて対話を収集し、質問・回答・カテゴリをリスト化
- 収集した対話コーパスを RAG のデータ・評価データとして利用する
- 本リポジトリの `prompts/07_reference.txt` は、この考え方に基づき想定患者データとして作成
