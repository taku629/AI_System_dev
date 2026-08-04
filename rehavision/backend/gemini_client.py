"""Gemini API 呼び出しラッパー。

課題PDFのデモ画面で示されている「複数モデルへのフォールバック」方式を実装する。
無料枠のクォータ超過（429）やモデル廃止（404）が起きた場合に、
次の候補モデルへ自動的に切り替えて回答を得る。
"""

from __future__ import annotations

import os

import google.generativeai as genai

# 優先度順のフォールバック候補。課題PDFのデモ画面のログを参考にした並び。
DEFAULT_MODEL_CANDIDATES = [
    "models/gemini-2.5-flash",
    "models/gemini-2.5-pro",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-001",
    "models/gemini-2.0-flash-lite-001",
    "models/gemini-2.0-flash-lite",
    "models/gemini-flash-latest",
]


def configure_api_key(api_key: str | None = None) -> None:
    """Gemini APIキーを設定する。

    Colab上では `google.colab.userdata` の `GOOGLE_API_KEY` シークレットを、
    それ以外の環境では環境変数 `GOOGLE_API_KEY` を利用する。
    """
    if api_key is None:
        try:
            from google.colab import userdata  # type: ignore

            api_key = userdata.get("GOOGLE_API_KEY")
        except ImportError:
            api_key = os.environ.get("GOOGLE_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY が見つかりません。Colab Secrets または環境変数に設定してください。"
        )

    genai.configure(api_key=api_key)


def ask_custom_llm(
    prompt: str,
    model_candidates: list[str] | None = None,
    verbose: bool = True,
) -> str:
    """候補モデルを順番に試し、最初に成功した応答テキストを返す。"""
    models = model_candidates or DEFAULT_MODEL_CANDIDATES
    last_error: Exception | None = None

    for model_name in models:
        if verbose:
            print(f"-> {model_name} で実行を試みます...")
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            if verbose:
                print(f"✅ 成功 ({model_name})")
            return response.text.strip()
        except Exception as exc:  # noqa: BLE001 - フォールバックのため意図的に広くcatch
            last_error = exc
            if verbose:
                print(f"[失敗] {model_name}: {exc}")
            continue

    raise RuntimeError(f"すべての候補モデルで失敗しました: {last_error}")


def build_prompt(template_path: str, reference_path: str, question: str) -> str:
    """Prompt Template と Reference ファイルから最終プロンプトを組み立てる。"""
    with open(template_path, encoding="utf-8") as f:
        template = f.read()
    with open(reference_path, encoding="utf-8") as f:
        reference_str = f.read()

    return template.format(reference_str=reference_str, question=question)
