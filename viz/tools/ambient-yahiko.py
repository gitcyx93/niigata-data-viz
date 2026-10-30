#!/usr/bin/env python3
"""Build the V11 field-recording sound design and embed it in the standalone HTML.
Requires Python numpy/scipy, ffmpeg/ffprobe. No downloads or randomness at build time.
Sources and CC0 evidence: data/audio/yahiko-v11/sources.json.
The film remains 25.2 seconds, and no music or speech is added.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import wave
import numpy as np
from scipy.signal import butter, sosfiltfilt

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / 'data/audio/yahiko-v11'
OUT = ROOT / 'output/autumn/audio'
PAGE = ROOT / 'viz/autumn/yahiko-v11-ambient.html'
SR, DURATION = 48000, 25.2
N = round(SR * DURATION)
TIMES = np.arange(N) / SR
OUT.mkdir(parents=True, exist_ok=True)


def run(args, **kwargs):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs)


def decode(file, start, duration, low, high):
    # Trim after decoding: offsets refer to the original public recording timeline.
    raw = run(['ffmpeg', '-v', 'error', '-i', str(file), '-ss', str(start), '-t', str(duration),
               '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-']).stdout
    audio = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(np.float64)
    if len(audio) != round(duration * SR):
        raise ValueError(f'Incomplete source segment: {file}')
    filtered = sosfiltfilt(butter(3, [low, high], btype='bandpass', fs=SR, output='sos'), audio, axis=0)
    return filtered


def rms_gain(audio, db):
    rms = np.sqrt(np.mean(audio * audio))
    if rms < 1e-7:
        raise ValueError('Cannot normalize silence')
    return audio * (10 ** (db / 20) / rms)


def envelope(points, times=TIMES):
    # Raised-cosine interpolation: no envelope corners or step transitions.
    t, value = np.array(points).T
    idx = np.clip(np.searchsorted(t, times, side='right') - 1, 0, len(t) - 2)
    u = np.clip((times - t[idx]) / (t[idx + 1] - t[idx]), 0, 1)
    e = value[idx] + (value[idx + 1] - value[idx]) * (.5 - .5 * np.cos(u * np.pi))
    return e[:, None]


def width(audio, factor):
    mid = np.mean(audio, axis=1)
    side = (audio[:, 0] - audio[:, 1]) * .5 * factor
    return np.column_stack([mid + side, mid - side])


def wave_file(file, data):
    if not np.isfinite(data).all() or np.max(np.abs(data)) >= 1:
        raise ValueError('Nonfinite or clipped audio')
    with wave.open(str(file), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(np.round(data * 32767).astype('<i2').tobytes())


manifest = json.loads((SOURCES / 'sources.json').read_text())
files = {}
for source in manifest['sources']:
    file = SOURCES / source['file']
    if hashlib.sha256(file.read_bytes()).hexdigest() != source['sha256']:
        raise ValueError('Source checksum mismatch: ' + str(file))
    files[source['key']] = file

# Natural recorded variation stays intact. These long segments are not looped.
forest = width(rms_gain(decode(files['forest'], 66, DURATION, 180, 6800), -31), .45)
forest *= envelope([(0, .15), (1.5, .25), (2.2, .65), (3.8, .85), (5.6, 1),
                    (8, .9), (9.8, .9), (11.4, .25), (14.6, .05), (16, 0), (25.2, 0)])
wind = width(rms_gain(decode(files['wind'], 45, DURATION, 100, 2400), -32), .8)
wind *= envelope([(0, .35), (2.2, .22), (5.6, .12), (8, .1), (10.3, .25),
                  (12.8, .55), (14.6, .85), (17, 1.1), (21, 1), (25.2, .8)])

# Latest selected A/C visuals use ONE accumulating gust, not the earlier two
# bursts. Keep a continuous source through 5.6s, then let it settle at the torii.
leaves = np.zeros((N, 2))
leaf_cues = [dict(start=1.65, source=8.3, length=6.45,
                  env=[(1.65, 0), (2.2, .07), (3.2, .25), (4.2, .55),
                       (5.2, 1), (5.6, 1.12), (6.2, .75), (7.2, .2), (8.1, 0)])]
for cue in leaf_cues:
    sound = decode(files['leaf'], cue['source'], cue['length'], 460, 5600)
    # Gently compress individual crunchy transients, then set a restrained level.
    sound = rms_gain(sound, -26)
    sound = np.tanh(sound / .18) * .18
    mono = np.mean(sound, axis=1)
    local_t = cue['start'] + np.arange(len(mono)) / SR
    pan = np.linspace(-.2, .24, len(mono))
    positioned = np.column_stack([mono * np.sqrt(1 - pan), mono * np.sqrt(1 + pan)])
    positioned *= envelope(cue['env'], local_t)
    a = round(cue['start'] * SR)
    leaves[a:a + len(mono)] += positioned

# This is an actual quiet cable TERMINAL recording, not Yahiko's cabin sound.
# Only its low mechanical bed is retained; door/clank detail is not foregrounded.
cable = np.zeros((N, 2))
mechanical = width(rms_gain(decode(files['cable'], 110, 5.2, 100, 850), -34), .25)
a = round(9.8 * SR)
cable[a:a + len(mechanical)] = mechanical
cable *= envelope([(0, 0), (9.8, 0), (10.3, .35), (11.4, .8), (12.6, 1),
                   (13.6, .8), (14.6, .15), (15, 0), (25.2, 0)])

# Natural end/restart, not a forced seamless ambience. Both endpoints are silent.
bookends = envelope([(0, 0), (.45, 1), (24.25, 1), (25.2, 0)])
stems = {name: data * bookends for name, data in
         [('forest', forest), ('open-wind', wind), ('leaf-gusts', leaves), ('cable-bed', cable)]}
mix = sum(stems.values())

with tempfile.TemporaryDirectory(prefix='yahiko-audio-') as tmp:
    raw = Path(tmp) / 'mix.wav'
    wave_file(raw, mix)
    scan = run(['ffmpeg', '-hide_banner', '-i', str(raw), '-af',
                'loudnorm=I=-23:TP=-3:LRA=12:print_format=json', '-f', 'null', '-'])
    measured = json.loads(re.search(rb'\{\s*"input_i"[\s\S]*?\}', scan.stderr).group())
    # One linear gain for all stems; preserve the gust's gradual build and release.
    gain_db = min(-23 - float(measured['input_i']), -3 - float(measured['input_tp']))
    gain = 10 ** (gain_db / 20)
    mix *= gain
    wave_file(raw, mix)
    for name, audio in stems.items():
        wav = Path(tmp) / (name + '.wav')
        wave_file(wav, audio * gain)
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-c:a', 'flac',
             str(OUT / ('yahiko-v11-' + name + '.flac'))])
    mp3 = OUT / 'yahiko-v11-ambience.mp3'
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-c:a', 'libmp3lame', '-b:a', '192k',
         '-metadata', 'title=Yahiko V11 - environmental sound design',
         '-metadata', 'comment=CC0 field-recording collage; not recorded in Yahiko. See sources.json.', str(mp3)])
    final_scan = run(['ffmpeg', '-hide_banner', '-i', str(mp3), '-af',
                     'loudnorm=I=-23:TP=-3:LRA=12:print_format=json', '-f', 'null', '-'])
    final_loudness = json.loads(re.search(rb'\{\s*"input_i"[\s\S]*?\}', final_scan.stderr).group())

# Always derive the sound edition from the CURRENT silent refinement. This keeps
# later visual edits instead of maintaining a stale renderer in a second file.
visual_page = ROOT / 'viz/autumn/yahiko-v11-refined.html'
visual = visual_page.read_text()
html = visual

def replace_once(old, new):
    global html
    if html.count(old) != 1:
        raise ValueError('Visual template changed; review audio integration: ' + old[:100])
    html = html.replace(old, new, 1)

replace_once('<title>弥彦｜秋日山海 v11 · 杉林与衔接精修</title>', '<title>弥彦｜V11 环境声版</title>')
replace_once('<div class="eyebrow">新潟四季 · 秋 / V11 精修</div>', '<div class="eyebrow">新潟四季 · 秋 / V11 环境声版</div>')
replace_once('</style>', '''.sound-controls{display:flex;align-items:center;gap:12px;margin-top:14px}.sound-controls small{color:#a4afb5;font-size:11px;line-height:1.6;flex:1}.sound-controls button{flex:none;min-width:90px}.sound-controls button[aria-pressed="true"]{border-color:#c0a177;color:#f4d5a5}button:disabled{opacity:.5;cursor:wait}.audio-credits{font-size:11px;line-height:1.8}.audio-credits ul{padding-left:17px}
</style>''')
replace_once('<input id="seek"', '<div class="sound-controls"><button id="sound" type="button" disabled aria-pressed="false" aria-label="开启环境声并播放">有声播放</button><small id="sound-note" role="status" aria-live="polite">环境声 · 默认静音 · 无配乐</small></div><input id="seek"')
from html import escape
roles = {'forest': '林风', 'leaf': '干叶', 'wind': '开阔处风声', 'cable': '索道站机械底声'}
credits = '<details class="audio-credits"><summary>环境声与素材署名</summary><p>林风、叶声、开阔处风声与索道机械底声的剪辑设计；不是弥彦现场录音。所有素材原页面均标注 CC0 1.0，经过裁切、滤波、混音。无音乐、无旁白。</p><ul>'
for s in manifest['sources']:
    credits += '<li><a href="' + escape(s['page'], quote=True) + '" target="_blank" rel="noopener">' + roles[s['key']] + '：' + escape(s['creator']) + '</a></li>'
credits += '</ul><a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener">CC0 1.0 许可</a></details>'
replace_once('</aside>', credits + '</aside>')

# Preserve upstream's opening selector verbatim. update(0) in this block now
# passes through the synchronized transport, so A/C resets both sound and picture.
opening_start = visual.index('const openingNotes=')
opening_end = visual.index("document.getElementById('watch-end')", opening_start)
transport = (ROOT / 'viz/common/yahiko-audio-transport.js').read_text()
if transport.count('/*OPENING-CONTROLS*/') != 1:
    raise ValueError('Missing opening controls adapter marker')
transport = transport.replace('/*OPENING-CONTROLS*/', visual[opening_start:opening_end])
player = (ROOT / 'viz/common/ambience-player.js').read_text()
audio_block = '/*AMBIENCE-START*/\nconst AMBIENCE_DATA = ' + json.dumps(base64.b64encode(mp3.read_bytes()).decode()) + ';\n/*AMBIENCE-END*/'
start = html.index('// Accessible playback controls also make precise, manual review possible.')
end = html.index('</script>', start)
html = html[:start] + audio_block + '\n/*AMBIENCE-PLAYER-START*/\n' + player + '\n/*AMBIENCE-PLAYER-END*/\n' + transport + '\n' + html[end:]
PAGE.write_text(html)

notes = dict(duration=DURATION, sample_rate=SR, channels=2, music=False, speech=False,
             source_manifest='data/audio/yahiko-v11/sources.json',
             source_segments=dict(forest=[66, 91.2], open_wind=[45, 70.2],
                                  continuous_leaves=[8.3, 14.75], cable_terminal=[110, 115.2]),
             visual_source_sha256=hashlib.sha256(visual_page.read_bytes()).hexdigest(),
             timeline_leaf_cues=leaf_cues, master_gain_db=gain_db, encoded_loudness=final_loudness,
             peak_sample_dbfs=float(20 * np.log10(np.max(np.abs(mix)))),
             rms_dbfs=float(20 * np.log10(np.sqrt(np.mean(mix * mix)))),
             mono_rms_dbfs=float(20 * np.log10(np.sqrt(np.mean(np.mean(mix, axis=1) ** 2)))),
             source_sha256={s['key']: s['sha256'] for s in manifest['sources']},
             mp3_sha256=hashlib.sha256(mp3.read_bytes()).hexdigest(),
             notes='Objective signal checks only; no claim of phone-speaker listening or Yahiko location fidelity.')
(OUT / 'yahiko-v11-mix.json').write_text(json.dumps(notes, ensure_ascii=False, indent=2) + '\n')
assert float(final_loudness['input_tp']) < -2.5
assert -25 < float(final_loudness['input_i']) < -21
assert np.max(np.abs(mix)) < 1 and np.isfinite(mix).all()
# Verify the actual encoded deliverable as well as the floating-point working mix.
encoded = np.frombuffer(run(['ffmpeg', '-v', 'error', '-i', str(mp3), '-f', 'f32le',
                            '-ac', '2', '-ar', str(SR), '-']).stdout, dtype='<f4').reshape(-1, 2)
assert len(encoded) == N and np.isfinite(encoded).all() and np.abs(encoded).max() < 1
leaf_rms = [float(np.sqrt(np.mean(stems['leaf-gusts'][round(a * SR):round(b * SR)] ** 2)))
            for a, b in [(2.2, 3.2), (3.2, 4.2), (4.2, 5.2), (5.2, 5.8)]]
assert all(a < b for a, b in zip(leaf_rms, leaf_rms[1:]))
assert np.abs(stems['leaf-gusts'][:round(1.65 * SR)]).max() == 0
assert np.abs(stems['leaf-gusts'][round(8.1 * SR):]).max() == 0
assert np.abs(stems['cable-bed'][:round(9.8 * SR)]).max() == 0
assert np.abs(stems['cable-bed'][15 * SR:]).max() == 0
signal = dict(samples_per_channel=len(encoded), duration=len(encoded) / SR,
              peak_dbfs=float(20 * np.log10(np.abs(encoded).max())),
              rms_dbfs=float(20 * np.log10(np.sqrt(np.mean(encoded ** 2)))),
              mono_loss_db=float(20 * np.log10(np.sqrt(np.mean(encoded.mean(axis=1) ** 2)) / np.sqrt(np.mean(encoded ** 2)))),
              endpoint_peak=float(max(np.abs(encoded[:48]).max(), np.abs(encoded[-48:]).max())),
              leaves_single_build=True, leaves_build_rms=leaf_rms, cable_window=True)
validation = ROOT / 'reference/yahiko-v11-ambient'
validation.mkdir(parents=True, exist_ok=True)
(validation / 'signal-validation.json').write_text(json.dumps(signal, indent=2) + '\n')
assert signal['endpoint_peak'] < .001 and signal['mono_loss_db'] > -1
print(json.dumps({k: notes[k] for k in ['duration', 'master_gain_db', 'peak_sample_dbfs', 'encoded_loudness']}, indent=2))
print('Embedded:', PAGE)
