// Embedded by ambient-yahiko.py. Lazy Web Audio: never opens audio on page load.
// The decoded buffer is the film's master clock only while an audible voice runs.
function createAmbiencePlayer({base64, duration, getTime, shouldPlay, onState, onError}) {
  let context = null, buffer = null, load = null, voice = null;
  let enabled = false, loading = false, generation = 0, destroyed = false;
  let voices = 0, lastError = '';
  const wrap = t => ((t % duration) + duration) % duration;
  const notify = () => onState?.({enabled, loading, ready: !!buffer, error: lastError});
  function stopVoice() {
    if (!voice) return;
    const old = voice; voice = null;
    const now = context.currentTime;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + .012);
    old.source.stop(now + .014);
  }
  function startVoice(offset) {
    stopVoice();
    if (destroyed || !enabled || !buffer || context.state !== 'running' || !shouldPlay()) return;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer; source.loop = true; source.loopStart = 0; source.loopEnd = duration;
    source.connect(gain); gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1, now + .012);
    const current = {source, gain, offset: wrap(offset), started: now};
    voices++;
    source.onended = () => {
      source.disconnect(); gain.disconnect(); voices--;
      if (voice === current) voice = null;
    };
    source.start(now, current.offset); voice = current;
  }
  async function prepare() {
    if (destroyed) throw new Error('环境声播放器已关闭');
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('此浏览器不支持环境声播放');
      context = new Audio();
    }
    // Resume is invoked synchronously inside the user's gesture, before decoding.
    const resumed = context.resume();
    if (!buffer && !load) {
      load = (async () => {
        if (!base64) throw new Error('环境声数据未构建');
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const decoded = await context.decodeAudioData(bytes.buffer);
        if (decoded.duration < duration - .03) throw new Error('环境声音轨长度不足');
        // Browser decoders differ in MP3 padding. Use an exact film-length buffer.
        const exact = context.createBuffer(decoded.numberOfChannels,
          Math.round(duration * decoded.sampleRate), decoded.sampleRate);
        for (let ch = 0; ch < exact.numberOfChannels; ch++) {
          exact.copyToChannel(decoded.getChannelData(ch).subarray(0, exact.length), ch);
        }
        if (!destroyed) buffer = exact;
      })().catch(error => {load = null; throw error;});
    }
    await Promise.all([resumed, load]);
  }
  async function setEnabled(value) {
    const ticket = ++generation;
    enabled = !!value; lastError = '';
    if (!enabled) {loading = false; stopVoice(); notify(); return;}
    loading = !buffer; notify();
    try {
      await prepare();
      if (destroyed || ticket !== generation || !enabled) return;
      loading = false; startVoice(getTime()); notify();
    } catch (error) {
      if (destroyed || ticket !== generation) return;
      enabled = false; loading = false; stopVoice();
      lastError = '声音未能开启，请再点一次'; notify(); onError?.(error);
    }
  }
  function sync(offset, playing) {
    stopVoice();
    if (!enabled || destroyed || !playing || !shouldPlay()) return;
    if (buffer && context?.state === 'running') startVoice(offset);
    else if (!loading) {
      // May resume after a background interruption. Check latest state, not an
      // obsolete captured offset, when asynchronous resume/decoding completes.
      setEnabled(true);
    }
  }
  function clock(fallback) {
    // If the OS suspends audio while visible, freeze the film on the same clock
    // instead of letting silent animation run ahead and jump backwards on resume.
    return voice && context.state !== 'closed'
      ? wrap(voice.offset + context.currentTime - voice.started) : fallback;
  }
  async function destroy() {
    if (destroyed) return;
    destroyed = true; enabled = false; generation++; stopVoice();
    if (context && context.state !== 'closed') await context.close();
  }
  return {
    setEnabled, sync, clock, pause: stopVoice, destroy,
    get enabled() {return enabled;},
    snapshot() {return {enabled, loading, ready: !!buffer, hasVoice: !!voice, voices,
      contextState: context?.state || 'uncreated', decodedDuration: buffer?.duration || 0,
      position: clock(getTime()), loopEnd: voice?.source.loopEnd || 0, error: lastError};}
  };
}
