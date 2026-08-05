# RehaVision

人工知能システム開発 第4回グループ課題（AI for Omni-Care）／第7班

理学療法士・作業療法士の負担軽減とリハビリ効果の可視化を目的とした提案「RehaVision」のデモ一式。

## デモは3つ

| # | デモ | 触り方 | APIキー |
|---|---|---|---|
| 1 | 歩行訓練の床面投影 | ブラウザで開くだけ | 不要 |
| 2 | AI対話（質問→回答→読み上げ） | ブラウザ or Colab | **各自で必要** |
| 3 | WOZ収録ツール | ブラウザで開くだけ | 不要 |

AI対話は**ブラウザ版とColab版の2通り**ある。中身（Prompt Template・Reference・モデルのフォールバック）は同じ。

| | ブラウザ版 | Colab版 |
|---|---|---|
| 起動 | サイトを開いてキーを貼るだけ | Colabを開いてセルを実行 |
| 音声入力 | **マイクで話しかけられる** | テキスト入力 |
| 用途 | **発表本番向け**（1画面で完結） | 課題の提出物・詳細な検証 |

> 課題の提出物としてColab版が必要なため、Notebookは残してある。

### ブラウザで開く

https://taku629.github.io/AI_System_dev/

※上のリンクが404の場合はGitHub Pagesが未設定。その場合はローカルで起動する。

```bash
git clone https://github.com/taku629/AI_System_dev.git
cd AI_System_dev && python3 -m http.server 8000
# → http://localhost:8000
```

**AI対話デモ**は開いた直後にAPIキーの入力を求められる。取得方法は下記。
キーはブラウザ内（localStorage）にのみ保存され、リポジトリには含まれない。

### Colabで開く

[![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/taku629/AI_System_dev/blob/main/rehavision/notebook/rehavision_demo.ipynb)

**APIキーは共有できないので、各自で用意すること。**

1. https://aistudio.google.com/apikey で「Create API key」（無料枠あり）
2. Colabの左側の🔑アイコン →「Add new secret」
3. 名前を `GOOGLE_API_KEY`、値に取得したキーを貼る
4. **「Notebook access」のトグルをON**（忘れると読み込めない）
5. セルを上から順に実行

> セクション2.5で ✅ が1つも出ない場合、APIキーかクォータの問題。そこから先は動かない。
> 「すべてのセルを実行」はAPIを20回近く叩くので、動作確認はセクション5まででよい。

## 資料

| ファイル | 内容 |
|---|---|
| [`rehavision/docs/concept.md`](./rehavision/docs/concept.md) | 企画概要 |
| [`rehavision/docs/evaluation.md`](./rehavision/docs/evaluation.md) | 評価結果（RAG有無のA/B比較） |
| [`rehavision/docs/demo-script.md`](./rehavision/docs/demo-script.md) | 発表7分の台本 |
| [`rehavision/docs/teams-demo.md`](./rehavision/docs/teams-demo.md) | オンライン発表の手順 |
| [`rehavision/docs/demo-checklist.md`](./rehavision/docs/demo-checklist.md) | 本番前チェックリスト |
| [`rehavision/woz-tool/README.md`](./rehavision/woz-tool/README.md) | WOZ収録のやり方 |

詳細は [`rehavision/README.md`](./rehavision) を参照。
