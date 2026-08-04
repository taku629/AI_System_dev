"""Gemini APIキーなしで実行できるオフライン検証。

実際のAPI呼び出しはできないため、`google.generativeai` をモックに差し替え、
プロンプト組み立て・モデルフォールバック・整形ロジックが正しく動くことを確認する。
実際のGemini応答品質の検証はColab上で `GOOGLE_API_KEY` を使って行うこと。
"""

from __future__ import annotations

import sys
import types
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class _FakeResponse:
    def __init__(self, text: str) -> None:
        self.text = text


class _FailingModel:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name

    def generate_content(self, _prompt: str) -> _FakeResponse:
        if "flash-latest" not in self.model_name:
            raise RuntimeError("429 RESOURCE_EXHAUSTED (fake quota error)")
        return _FakeResponse("田中さんはコーヒーを飲んでも問題ありませんが、砂糖は控えてください。")


def _install_fake_genai() -> None:
    fake_module = types.ModuleType("google.generativeai")
    fake_module.configure = lambda **kwargs: None
    fake_module.GenerativeModel = _FailingModel
    google_pkg = sys.modules.setdefault("google", types.ModuleType("google"))
    google_pkg.generativeai = fake_module
    sys.modules["google.generativeai"] = fake_module


def test_build_prompt_embeds_reference_and_question() -> None:
    from gemini_client import build_prompt

    prompt = build_prompt(
        str(BASE_DIR.parent / "prompts" / "07_prompt.txt"),
        str(BASE_DIR.parent / "prompts" / "07_reference.txt"),
        "田中さんはコーヒー飲めますか？",
    )
    assert "田中" in prompt
    assert "質問：田中さんはコーヒー飲めますか？" in prompt
    print("[OK] build_prompt: reference/questionが正しく埋め込まれている")


def test_ask_custom_llm_falls_back_to_working_model() -> None:
    from gemini_client import ask_custom_llm

    answer = ask_custom_llm(
        "dummy prompt",
        model_candidates=["models/gemini-2.5-flash", "models/gemini-flash-latest"],
        verbose=False,
    )
    assert "砂糖" in answer
    print("[OK] ask_custom_llm: 429エラーのモデルをスキップし、成功するモデルにフォールバックした")


def test_ask_custom_llm_raises_when_all_fail() -> None:
    from gemini_client import ask_custom_llm

    try:
        ask_custom_llm("dummy prompt", model_candidates=["models/gemini-2.5-flash"], verbose=False)
    except RuntimeError as exc:
        assert "すべての候補モデルで失敗" in str(exc)
        print("[OK] ask_custom_llm: 全モデル失敗時に例外を送出する")
    else:
        raise AssertionError("全モデル失敗時に例外が発生しなかった")


if __name__ == "__main__":
    _install_fake_genai()
    sys.path.insert(0, str(BASE_DIR))

    test_build_prompt_embeds_reference_and_question()
    test_ask_custom_llm_falls_back_to_working_model()
    test_ask_custom_llm_raises_when_all_fail()

    print("\nすべてのオフライン検証に成功しました（Gemini APIキー不要）。")
    print("実際のAPI応答品質は、GOOGLE_API_KEYを使ってColab上のnotebookで確認してください。")
