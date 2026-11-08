"""生成全站发音音频（微软神经语音：女声 SunHi / 男声 InJoon）

用法：
    pip install edge-tts
    python3 scripts/gen_audio.py

会读取 scripts/collect-texts.js 收集到的文本，生成：
    audio/f/<id>.mp3   女声
    audio/m/<id>.mp3   男声
    audio/manifest.js  文本 → 文件 id 的对照表
已生成过的文件会跳过，修改内容后重新运行即可增量更新。
"""
import asyncio
import hashlib
import json
import os
import subprocess
import sys

import ssl

import edge_tts
import edge_tts.communicate

# 在需要自定义 CA 的网络环境（如公司代理）下，可通过 SSL_CERT_FILE 指定证书
if os.environ.get("SSL_CERT_FILE"):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = {"f": "ko-KR-SunHiNeural", "m": "ko-KR-InJoonNeural"}
RATE = "-10%"  # 稍慢一点，便于学习者跟读
CONCURRENCY = 8


def text_id(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


async def synth(sem, text, voice, out):
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice, rate=RATE).save(out + ".part")
                os.replace(out + ".part", out)
                return
            except Exception as e:  # 网络偶尔失败，重试
                if attempt == 3:
                    print(f"FAILED {voice} {text!r}: {e}", file=sys.stderr)
                    raise
                await asyncio.sleep(2 ** attempt)


async def main():
    texts = json.loads(subprocess.check_output(
        ["node", os.path.join(ROOT, "scripts", "collect-texts.js")]))
    manifest = {t: text_id(t) for t in texts}
    sem = asyncio.Semaphore(CONCURRENCY)
    jobs = []
    for key, voice in VOICES.items():
        os.makedirs(os.path.join(ROOT, "audio", key), exist_ok=True)
        for t, i in manifest.items():
            out = os.path.join(ROOT, "audio", key, i + ".mp3")
            if not os.path.exists(out):
                jobs.append(synth(sem, t, voice, out))
    print(f"{len(texts)} texts, {len(jobs)} files to generate")
    await asyncio.gather(*jobs)

    # 删除已不再使用的旧文件
    keep = set(manifest.values())
    for key in VOICES:
        d = os.path.join(ROOT, "audio", key)
        for f in os.listdir(d):
            if f.endswith(".mp3") and f[:-4] not in keep:
                os.remove(os.path.join(d, f))

    with open(os.path.join(ROOT, "audio", "manifest.js"), "w", encoding="utf-8") as fh:
        fh.write("/* 自动生成：python3 scripts/gen_audio.py */\n")
        fh.write("window.AUDIO_VOICES = " + json.dumps(VOICES) + ";\n")
        fh.write("window.AUDIO_MANIFEST = " + json.dumps(manifest, ensure_ascii=False, sort_keys=True) + ";\n")
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
