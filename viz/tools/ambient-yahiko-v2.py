#!/usr/bin/env python3
"""Yahiko ambience V2: one wind-in-foliage source, picture-derived dynamics, silence.
Python numpy/scipy, ffmpeg, Node 22+. Fully offline after the licensed source is saved.
Does not modify the V1 page/mix or the silent animation. Technical checks ≠ audition.
"""
import base64
import hashlib
import json
import re
import subprocess
import tempfile
import wave
from html import escape
from pathlib import Path

import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.signal import butter, sosfiltfilt

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / 'data/audio/yahiko-v11-v2'
OUTPUT = ROOT / 'output/autumn/audio-v2'
REFERENCE = ROOT / 'reference/yahiko-v11-ambient-v2'
VISUAL = ROOT / 'viz/autumn/yahiko-v11-refined.html'
PAGE = ROOT / 'viz/autumn/yahiko-v11-ambient-v2.html'
SR, T = 48000, 25.2
N = round(T * SR)
times = np.arange(N) / SR
for p in [OUTPUT, REFERENCE]:
    p.mkdir(parents=True, exist_ok=True)


def run(args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def read_segment(file, start, seconds, lo, hi):
    raw = run(['ffmpeg', '-v', 'error', '-i', str(file), '-ss', str(start), '-t', str(seconds),
               '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-']).stdout
    signal = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(float)
    if len(signal) != round(seconds * SR):
        raise ValueError('Source segment is incomplete')
    return sosfiltfilt(butter(3, [lo, hi], btype='bandpass', fs=SR, output='sos'), signal, axis=0)


def level(signal, db, reference=None):
    ref = signal if reference is None else signal[reference]
    rms = np.sqrt(np.mean(ref ** 2))
    if rms < 1e-8:
        raise ValueError('Refusing to amplify silence')
    return signal * (10 ** (db / 20) / rms)


def envelope(points):
    t, v = np.array(points).T
    idx = np.clip(np.searchsorted(t, times, side='right') - 1, 0, len(t) - 2)
    u = np.clip((times - t[idx]) / (t[idx + 1] - t[idx]), 0, 1)
    return (v[idx] + (v[idx + 1] - v[idx]) * (.5 - .5 * np.cos(u * np.pi)))[:, None]


def narrow(signal, amount):
    mid, side = signal.mean(axis=1), (signal[:, 0] - signal[:, 1]) * .5 * amount
    return np.column_stack([mid + side, mid - side])


def pcm(file, signal):
    assert np.isfinite(signal).all() and np.abs(signal).max() < 1
    with wave.open(str(file), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(np.round(signal * 32767).astype('<i2').tobytes())


manifest = json.loads((SOURCE_DIR / 'sources.json').read_text())
assert len(manifest['sources']) == 1
source = manifest['sources'][0]
source_file = SOURCE_DIR / source['file']
assert hashlib.sha256(source_file.read_bytes()).hexdigest() == source['sha256']

# Read the real leaf positions/opacity from the same equations the film renders.
# A particle being emitted off-screen is NOT yet an audible screen event.
cue = json.loads(run(['node', str(ROOT / 'viz/tools/sample-yahiko-wind.cjs')]).stdout)
visual_hash = hashlib.sha256(VISUAL.read_bytes()).hexdigest()
assert cue['visualSourceSha256'] == visual_hash
st = np.array([s['t'] for s in cue['samples']])
area = np.array([s['area'] for s in cue['samples']])
assert area.max() > 0
mass = gaussian_filter1d((area / area.max()) ** .75, sigma=10)
mass *= np.interp(st, [0, 2.2, 2.35, 7.65, 7.95, T], [0, 0, 1, 1, 0, 0])
mass /= mass.max()
wind_env = np.interp(times, st, mass)
# A small stereo bias follows the field of leaves, not individual exaggerated flybys.
x = gaussian_filter1d(np.array([s['x'] for s in cue['samples']]), sigma=30)
pan = np.interp(times, st, np.clip((x - 540) / 540, -1, 1)) * .1

# Actual wind moving foliage, not feet crushing a leaf pile. No pitch shifting or
# impact layering; keep the original physical texture. No upward loudness maximizer.
texture = read_segment(source_file, 37.5, 10.5, 450, 4800)
texture = narrow(level(texture, -31, slice(4 * SR, 6 * SR)), .35)
foliage = np.zeros((N, 2))
foliage[:len(texture)] = texture
foliage *= wind_env[:, None]
foliage *= np.column_stack([np.sqrt(1 - pan), np.sqrt(1 + pan)])

# A separate, much quieter layer at the same location dies away as the camera
# leaves the grove. Nothing drives or clatters just because a cable car is visible.
forest = np.zeros((N, 2))
bed = narrow(level(read_segment(source_file, 59, 10.5, 350, 3300), -43), .45)
forest[:len(bed)] = bed
forest *= envelope([(0, 0), (2.2, 0), (3, .65), (7.5, .65), (8.4, .55), (9.6, .25), (10.5, 0), (T, 0)])

# Only a very low air texture at the vista: remove the close leaf detail and
# sub-bass. This is processed texture, not a claimed mountain/location recording.
air = np.zeros((N, 2))
air_clip = narrow(level(read_segment(source_file, 59, 10.6, 300, 1150), -44), .55)
air[round(14.6 * SR):] = air_clip
air *= envelope([(0, 0), (14.6, 0), (16.5, .7), (21.8, .55), (23.9, .35), (T, 0)])

stems = {'visible-foliage': foliage, 'grove-distance': forest, 'vista-air': air}
mix = sum(stems.values())
# Safety is downward-only. Silence stays silence and low ambience stays low.
gain = min(1., 10 ** (-14 / 20) / np.abs(mix).max())
mix *= gain
with tempfile.TemporaryDirectory(prefix='yahiko-ambient-v2-') as td:
    temp = Path(td)
    wav = temp / 'mix.wav'
    pcm(wav, mix)
    for name, signal in stems.items():
        p = temp / (name + '.wav')
        pcm(p, signal * gain)
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-c:a', 'flac', str(OUTPUT / (name + '.flac'))])
    mp3 = OUTPUT / 'yahiko-v11-ambience-v2.mp3'
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '192k',
         '-metadata', 'title=Yahiko V11 ambience V2 - wind, distance and silence', str(mp3)])
    scan = run(['ffmpeg', '-hide_banner', '-i', str(mp3), '-af',
                'loudnorm=I=-30:TP=-3:LRA=12:print_format=json', '-f', 'null', '-'])
    loudness = json.loads(re.search(rb'\{\s*"input_i"[\s\S]*?\}', scan.stderr).group())

# The old mix is not overwritten; preserve it for a fair before/after comparison.
old = json.loads((ROOT / 'output/autumn/audio/yahiko-v11-mix.json').read_text())
assert float(loudness['input_i']) < float(old['encoded_loudness']['input_i']) - 4
assert float(loudness['input_tp']) < -12
assert np.max(np.abs(mix[:round(2.2 * SR)])) == 0
assert np.max(np.abs(mix[round(10.5 * SR):round(14.6 * SR)])) == 0
assert np.max(np.abs(foliage[8 * SR:])) == 0

# Standalone page: copy latest visuals, change only the UI and audio transport.
visual = VISUAL.read_text()
html = visual

def replace_once(old, new):
    global html
    if html.count(old) != 1:
        raise ValueError('Template changed; inspect instead of silently dropping new visuals: ' + old[:80])
    html = html.replace(old, new, 1)

replace_once('<title>弥彦｜秋日山海 v11 · 杉林与衔接精修</title>', '<title>弥彦｜环境声第二版 · 风与留白</title>')
replace_once('<div class="eyebrow">新潟四季 · 秋 / V11 精修</div>', '<div class="eyebrow">新潟四季 · 秋 / 环境声第二版</div>')
replace_once('</style>', '''.sound-controls{display:flex;align-items:center;gap:12px;margin-top:14px}.sound-controls small{color:#a4afb5;font-size:11px;line-height:1.6;flex:1}.sound-controls button{flex:none;min-width:90px}.sound-controls button[aria-pressed="true"]{border-color:#c0a177;color:#f4d5a5}button:disabled{opacity:.5;cursor:wait}.audio-credits{font-size:11px;line-height:1.8}
</style>''')
replace_once('<input id="seek"', '<div class="sound-controls"><button id="sound" type="button" disabled aria-pressed="false" aria-label="从头播放并开启环境声">从头试听</button><small id="sound-note" role="status" aria-live="polite">第二版 · 默认静音 · 无配乐</small></div><input id="seek"')
credits = '<details class="audio-credits"><summary>第二版声音说明与来源</summary><p>只使用风吹树枝和叶片的录音。叶声随画面里实际可见的飞叶增强、退去；林间声退出后，缆车段留白，海景只有很轻的空气层。不加脚步、机械声或海浪。</p><p>声音设计，不是弥彦实地录音。风吹枝叶：<a target="_blank" rel="noopener" href="' + escape(source['page'], quote=True) + '">Anya_Media / Freesound #523389</a>，<a target="_blank" rel="noopener" href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>。经裁切、滤波与音量编排。</p></details>'
replace_once('</aside>', credits + '</aside>')
opening_start = visual.index('const openingNotes=')
opening_end = visual.index("document.getElementById('watch-end')", opening_start)
transport = (ROOT / 'viz/common/yahiko-audio-transport.js').read_text()
assert transport.count('/*OPENING-CONTROLS*/') == 1
transport = transport.replace('/*OPENING-CONTROLS*/', visual[opening_start:opening_end])
transport = transport.replace('环境声 · 默认静音 · 无配乐', '第二版 · 默认静音 · 无配乐')
transport = transport.replace('环境声已开启 · 无配乐', '第二版 · 风与留白 · 无配乐')
transport = transport.replace('弥彦 · 环境声版', '弥彦 · 环境声第二版')
old_click = "soundButton.onclick=()=>{captureClock();const enable=!ambience.enabled;if(enable)playing=true;status();void ambience.setEnabled(enable);};"
new_click = "let firstAudition=true;\nsoundButton.onclick=()=>{captureClock();const enable=!ambience.enabled;if(enable){playing=true;if(firstAudition){firstAudition=false;update(0);}}status();void ambience.setEnabled(enable);};"
if transport.count(old_click) != 1:
    raise ValueError('Audio transport changed; review first-audition adapter')
transport = transport.replace(old_click, new_click)
player = (ROOT / 'viz/common/ambience-player.js').read_text()
audio = '/*AMBIENCE-START*/\nconst AMBIENCE_DATA = ' + json.dumps(base64.b64encode(mp3.read_bytes()).decode()) + ';\n/*AMBIENCE-END*/'
a = html.index('// Accessible playback controls also make precise, manual review possible.')
b = html.index('</script>', a)
html = html[:a] + audio + '\n/*AMBIENCE-PLAYER-START*/\n' + player + '\n/*AMBIENCE-PLAYER-END*/\n' + transport + '\n' + html[b:]
PAGE.write_text(html)

# Objective evidence, explicitly separate from perceptual approval.
decoded = np.frombuffer(run(['ffmpeg', '-v', 'error', '-i', str(mp3), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-']).stdout, dtype='<f4').reshape(-1, 2)
assert len(decoded) == N and np.isfinite(decoded).all()
assert np.abs(decoded).max() < 1
assert np.abs(decoded[:round(2.1 * SR)]).max() < .0001
assert np.abs(decoded[11 * SR:14 * SR]).max() < .0001
mono_loss = float(20 * np.log10(np.sqrt(np.mean(decoded.mean(axis=1) ** 2)) / np.sqrt(np.mean(decoded ** 2))))
assert mono_loss > -1
notes = dict(version=2, duration=T, sample_rate=SR, visual_source_sha256=visual_hash,
             sources_manifest='data/audio/yahiko-v11-v2/sources.json',
             used_source_ids=['523389'], removed_v1_sources=['751473','406100','553733','419316'],
             source_segments=dict(visible_foliage=[37.5,48], grove_distance=[59,69.5], vista_air=[59,69.6]),
             no_music=True, no_mechanical_sound=True, no_footsteps=True, no_waves=True,
             intentional_silence=[[0,2.2],[10.5,14.6]],
             visible_wind_peak_seconds=float(st[np.argmax(area)]),
             audio_envelope_peak_seconds=float(st[np.argmax(mass)]),
             cue_method='100Hz visible leaf area/opacity from current windLeafState, softly smoothed; not off-screen emission times.',
             downward_only_gain_db=float(20*np.log10(gain)), encoded_loudness=loudness,
             relative_to_v1_lufs=float(loudness['input_i'])-float(old['encoded_loudness']['input_i']),
             mono_loss_db=mono_loss, mp3_sha256=hashlib.sha256(mp3.read_bytes()).hexdigest(),
             source_sha256=source['sha256'], subjective_audition=False,
             limitation='No listening certification. Signal/clock tests cannot establish perceptual match.')
(OUTPUT / 'mix.json').write_text(json.dumps(notes, ensure_ascii=False, indent=2) + '\n')
(REFERENCE / 'wind-envelope.json').write_text(json.dumps(dict(visualSourceSha256=visual_hash, samples=[dict(t=float(t), visibleArea=float(a), gain=float(v)) for t,a,v in zip(st,area,mass) if t<=8.2]),indent=2)+'\n')
(REFERENCE / 'signal-validation.json').write_text(json.dumps(dict(duration=len(decoded)/SR, finite=True, clipping=False,
    opening_silence=True,cable_silence=True,mono_loss_db=mono_loss,encoded_loudness=loudness),indent=2)+'\n')
print(json.dumps({k:notes[k] for k in ['version','duration','visible_wind_peak_seconds','audio_envelope_peak_seconds','encoded_loudness','relative_to_v1_lufs']},indent=2))
print('Built',PAGE)
