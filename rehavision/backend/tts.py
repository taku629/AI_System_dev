"""日本語テキストを音声ファイルに変換するラッパー（gTTS使用）。

課題本番では VOICEVOX 等でも代替可能（`docs/requirements.md` 参照）。
"""

from __future__ import annotations

from gtts import gTTS


def synthesize_speech(text: str, out_path: str = "answer.mp3", lang: str = "ja") -> str:
    """テキストを音声合成し、mp3ファイルとして保存してパスを返す。"""
    tts = gTTS(text=text, lang=lang)
    tts.save(out_path)
    return out_path
