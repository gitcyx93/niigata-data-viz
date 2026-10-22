#!/usr/bin/env python3
"""冬季（越后汤泽）的环境音：用代码合成，和画面时间点对齐，20 秒首尾无缝。

用法：python3 viz/tools/ambient-winter.py <输出.wav>
依赖：numpy。之后用 ffmpeg 把它和录好的视频合在一起：
  ffmpeg -i 视频.mp4 -i 音频.wav -c:v copy -c:a aac -b:a 192k -shortest 输出.mp4
各声音都在切镜头前自然结束，所以切镜头时声音也跟着换场。

时间点来自 viz/winter/yuzawa-yukiguni.html：
  列车冲出隧道 19.55 秒（= 上一轮的 -0.45 秒），之前 1.5 秒地面震动越来越强
  3.3 秒切到滑雪：刻滑转弯（每 π/4.1 秒一个弯）→ 5.1 秒直滑加速 → 6.4 秒横刹到 8.0 秒
  8.7 秒切到温泉：水声、雪落进水里，10.7 秒碰杯
  13 秒后拉远到全景：只剩风雪
所有声音都写进一个循环的缓冲区（超出 20 秒的部分绕回开头），所以首尾接得上。
"""
import sys
import wave
import numpy as np

SR, T = 48000, 20.0
N = int(SR * T)
rng = np.random.default_rng(7)
buf = np.zeros((2, N))


def band(x, lo, hi, soft=.3):
    """用频谱遮罩做带通（对循环信号是无缝的）。"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 / soft))
    if hi:
        m *= 1 / (1 + (f / hi) ** (2 / soft))
    return np.fft.irfft(X * m, len(x))


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)


def env(n, a, r):
    """长度 n 的包络：a 秒淡入、r 秒淡出（余弦）。"""
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = .5 - .5 * np.cos(np.linspace(0, np.pi, na))
    if nr: e[-nr:] *= .5 + .5 * np.cos(np.linspace(0, np.pi, nr))
    return e


def add(sig, t0, gain=1.0, pan=0.0):
    """把一段（单声道或双声道）声音加到循环缓冲区的 t0 秒处；超出结尾的部分绕回开头。"""
    if sig.ndim == 1:
        sig = np.vstack([sig * np.sqrt(.5 * (1 - pan)), sig * np.sqrt(.5 * (1 + pan))])
    i0 = int(round(t0 * SR)) % N
    idx = (np.arange(sig.shape[1]) + i0) % N
    np.add.at(buf[0], idx, sig[0] * gain)
    np.add.at(buf[1], idx, sig[1] * gain)


def tl(t):
    """时间轴上的门：t 是 [(秒, 值), ...]，返回整段循环的分段线性曲线。"""
    xs, ys = zip(*t)
    return np.interp(np.arange(N) / SR, xs, ys)


# ---- 风雪：整段循环的底噪（左右声道不同，随时间慢慢起伏）----
time = np.arange(N) / SR
for ch in range(2):
    w = band(rng.standard_normal(N), 80, 900, .6)
    w = norm(w)
    swell = .55 + .25 * np.sin(2 * np.pi * 2 * time / T + ch) + .2 * np.sin(2 * np.pi * 5 * time / T + 1.3 * ch)
    level = tl([(0, .9), (3.2, .9), (3.3, .35), (8.7, .35), (8.75, .5), (13, .5), (14.5, 1), (20, .9)])
    buf[ch] += w * swell * level * .16
    hiss = norm(band(rng.standard_normal(N), 3000, 9000, .6))           # 雪粒打在东西上的细碎声
    buf[ch] += hiss * level * .025

# ---- 列车：地面震动越来越强 → 冲出隧道的呼啸 → 车厢一节节过去 → 远去 ----
tx = 19.55
rum_len = int(3.2 * SR)
rum = norm(band(rng.standard_normal(rum_len), 25, 140, .5))
e = np.concatenate([np.linspace(0, 1, int(1.5 * SR)) ** 2, np.exp(-np.linspace(0, 3.5, rum_len - int(1.5 * SR)))])
add(rum * e, tx - 1.5, .55)
whoosh_len = int(3.6 * SR)
n = rng.standard_normal(whoosh_len)
seg = []
for k in range(36):                                                    # 分段带通，中心频率从高往低滑（多普勒）
    a, b = k * whoosh_len // 36, (k + 1) * whoosh_len // 36
    c = 2600 * np.exp(-k / 12) + 300
    seg.append(band(n[a:b], c * .5, c * 1.6, .6))
wh = norm(np.concatenate(seg))
wh *= np.concatenate([np.linspace(0, 1, int(.12 * SR)) ** .5, np.exp(-np.linspace(0, 3, whoosh_len - int(.12 * SR)))])
add(np.vstack([wh * np.linspace(.4, 1, whoosh_len), wh * np.linspace(1, .4, whoosh_len)]), tx, .5)   # 从左往右
clack_t = tx + .25
for k in range(22):                                                    # 车轮压过铁轨接缝：咔嗒咔嗒
    t0 = clack_t + k * .12 + (k % 2) * .03
    if t0 - tx > 3.0: break
    L = int(.05 * SR)
    ck = norm(band(rng.standard_normal(L), 300, 2500, .5)) * np.exp(-np.linspace(0, 8, L))
    add(ck, t0, .18 * np.exp(-(t0 - tx) * .6), pan=-.6 + .05 * k)

# ---- 滑雪：刻滑每个弯「唰」一声 → 直滑时风声变大 → 横刹一长串「嚓——」 ----
OM, T0 = 4.1, 3.2
k = 0
while True:
    t0 = T0 + (k + 1) * np.pi / OM
    if t0 > 5.1: break
    if t0 > 3.3:
        L = int(.45 * SR)
        sw = norm(band(rng.standard_normal(L), 1200, 5500, .5)) * np.sin(np.linspace(0, np.pi, L)) ** 1.5
        add(sw, t0 - .15, .32, pan=.35 if k % 2 else -.35)
    k += 1
L = int(1.4 * SR)
rush = norm(band(rng.standard_normal(L), 400, 4000, .6)) * np.linspace(0, 1, L) ** 1.5 * env(L, 0, .05)
add(rush, 5.05, .22)
L = int(1.9 * SR)
sk = norm(band(rng.standard_normal(L), 1500, 9000, .5))
grain = 1 + .5 * norm(band(rng.standard_normal(L), 20, 60, .5))            # 雪面不平：刮擦声一颤一颤
sk *= grain * np.concatenate([np.linspace(0, 1, int(.08 * SR)), np.linspace(1, 0, L - int(.08 * SR)) ** 1.4])
add(sk, 6.4, .45, pan=.25)
# ---- 温泉：水轻轻拍岸、雪落进水里、碰杯 ----
L = int(4.6 * SR)
lap = norm(band(rng.standard_normal(L), 120, 1200, .6))
lap *= (.6 + .4 * np.sin(2 * np.pi * np.arange(L) / SR * .7) ** 2) * env(L, .02, .8)
add(lap, 8.7, .2)
for i in range(16):                                                    # 水滴
    t0 = 8.8 + rng.random() * 4.2
    Ld = int(.12 * SR); tt = np.arange(Ld) / SR
    f0 = 900 + rng.random() * 900
    drop = np.sin(2 * np.pi * (f0 + 600 * tt / tt[-1]) * tt) * np.exp(-tt * 40)
    add(drop, t0, .06, pan=rng.uniform(-.7, .7))
Lc = int(.9 * SR); tt = np.arange(Lc) / SR                             # 碰杯：厚玻璃啤酒杯的「咚叮」
clink = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, a, d in [(1180, 1, 9), (2870, .6, 12), (4420, .35, 16), (6100, .2, 22)])
clink += .3 * norm(band(rng.standard_normal(Lc), 2000, 8000, .5)) * np.exp(-tt * 60)
add(clink, 10.7, .26)
Lf = int(1.6 * SR)                                                      # 泡沫溅起的细碎声
fizz = norm(band(rng.standard_normal(Lf), 4000, 12000, .5)) * np.exp(-np.linspace(0, 4, Lf))
add(fizz * (rng.random(Lf) > .7), 10.72, .05)

# ---- 输出：轻压缩、归一到约 -1 dBFS ----
y = np.tanh(buf * 1.6) / np.tanh(1.6)
y /= np.max(np.abs(y)) / .89
pcm = (y.T * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(sys.argv[1], f'{T}s', f'peak {np.max(np.abs(y)):.2f}', f'rms {np.sqrt(np.mean(y ** 2)):.3f}')
