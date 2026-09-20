// Plays the agent's voice as one continuous stream on the audio thread, and
// reports how much of it has actually been heard so captions can follow it.
//
// The Voice Agent API paces speech at real time in ~10 ms chunks, so the
// playback buffer never grows on its own: whatever cushion playback starts with
// is all it will ever have. Delivery over a whole reply comes out at about real
// time, but it arrives unevenly, and after a stall it resumes at roughly real
// time too — there is no burst to catch up on. Delivery that has fallen behind
// stays behind.
//
// That single fact decides the design. An earlier version treated a dry buffer
// as a reason to stop and re-accumulate a 0.3 s cushion before resuming. Since
// the service never delivers fast enough to rebuild a cushion, that wait could
// only be paid out of silence: a 200 ms stall became a second of nothing, and
// on a marginal connection playback chopped on and off for the whole reply.
// That chopping — not the stalls themselves — is what was audible as crackle
// and as a flat, robotic voice, because every restart re-ran the fade-in ramp.
//
// So there is exactly one wait here, and it happens before the first word:
// - the start cushion is paid once per reply. It adapts in both directions,
//   growing when a reply had to insert silence and easing back down over clean
//   replies, so a single bad moment does not tax the rest of the session;
// - a gap inside a reply is never waited on. The block runs to silence and the
//   next sample to arrive plays immediately, so a stall of 200 ms costs 200 ms
//   and nothing more.
const START_CUSHION_SECONDS = 0.5;
const MAX_START_CUSHION_SECONDS = 1;
// Headroom so a reply slightly worse than the last one does not break through.
const START_MARGIN_SECONDS = 0.15;
// Every cushioned millisecond is a millisecond before the agent answers, so a
// reply that played through clean hands a little of it back.
const CUSHION_RELAX_SECONDS = 0.05;
// How fast the envelope opens on real audio. Short: this is only there to stop
// a resume being heard as a click.
const ATTACK_SECONDS = 0.005;
// How fast it closes when there is nothing to play. Deliberately much longer
// than one 5.3 ms render block, so a single short underrun barely dips the
// envelope instead of chopping a hole in the voice.
const RELEASE_SECONDS = 0.03;
// Long enough to kill the click, short enough not to be heard as a pause.
const FADE_OUT_SECONDS = 0.006;
// Captions are redrawn on the main thread, so progress is reported about 20
// times a second rather than on every 128-frame render block.
const PROGRESS_INTERVAL_SECONDS = 0.05;

class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.buffered = 0;
    this.playing = false;
    this.streamEnded = false;

    this.startCushion = Math.round(sampleRate * START_CUSHION_SECONDS);
    this.floorCushion = this.startCushion;
    this.maxStartCushion = Math.round(sampleRate * MAX_START_CUSHION_SECONDS);
    this.startMargin = Math.round(sampleRate * START_MARGIN_SECONDS);
    this.cushionRelax = Math.round(sampleRate * CUSHION_RELAX_SECONDS);

    // Silence inserted mid-reply. It is also, exactly, the extra head start
    // this reply would have needed to play through cleanly.
    this.starved = 0;

    // What the incoming audio actually looks like, per reply.
    this.peak = 0;
    this.sumSquares = 0;
    this.jumps = 0;
    this.measured = 0;
    this.previousSample = 0;

    // A single gain envelope for the whole session, moved a step at a time.
    this.gain = 0;
    this.attackStep = 1 / (sampleRate * ATTACK_SECONDS);
    this.releaseStep = 1 / (sampleRate * RELEASE_SECONDS);
    this.fadeOutDecay = Math.exp(-1 / (sampleRate * FADE_OUT_SECONDS));
    this.lastSample = 0;

    // Samples of this reply that have actually left for the speakers. The
    // caption is drawn from this, not from when a message arrived.
    this.played = 0;
    this.progressInterval = Math.round(sampleRate * PROGRESS_INTERVAL_SECONDS);
    this.sinceProgress = 0;

    this.port.onmessage = ({ data }) => {
      if (data.type === "audio") {
        const pcm = new Int16Array(data.buffer);
        const samples = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 32768;
        // Measured on the samples exactly as the service sent them, before any
        // queueing or envelope of ours touches them. If the audio is already
        // quiet or already full of discontinuities here, nothing downstream in
        // this file can be the cause.
        for (let i = 0; i < samples.length; i++) {
          const value = Math.abs(samples[i]);
          if (value > this.peak) this.peak = value;
          this.sumSquares += samples[i] * samples[i];
          // A step this large between neighbouring samples is not speech; it is
          // a splice. Counted across the chunk boundary too, since a misaligned
          // or dropped chunk would show up exactly there.
          if (Math.abs(samples[i] - this.previousSample) > 0.25) this.jumps++;
          this.previousSample = samples[i];
        }
        this.measured += samples.length;
        this.queue.push(samples);
        this.buffered += samples.length;
        this.streamEnded = false;
      } else if (data.type === "reply") {
        // A new reply: the caption starts from nothing, and the next audio
        // waits for the start cushion before the first word.
        this.played = 0;
        this.sinceProgress = 0;
        this.starved = 0;
        this.streamEnded = false;
        this.port.postMessage({ type: "progress", played: 0 });
      } else if (data.type === "end") {
        // The reply is complete: play the tail even if it is under the cushion.
        this.streamEnded = true;
      } else if (data.type === "clear") {
        this.queue = [];
        this.offset = 0;
        this.buffered = 0;
        this.starved = 0;
        this.setPlaying(false);
      }
    };
  }

  setPlaying(playing) {
    if (this.playing === playing) return;
    this.playing = playing;
    this.port.postMessage({
      type: playing ? "playing" : "idle",
      played: this.played,
      // Only ever sent at the true end of a reply now, so the caption can
      // settle on the full line without a gap being mistaken for the end.
      drained: !playing && this.streamEnded && this.buffered === 0,
    });
  }

  // Decays from wherever the waveform was instead of stepping straight to zero.
  // Carries on across render blocks, so a stop near the end of one block keeps
  // decaying into the next rather than snapping to zero at the boundary.
  fadeToSilence(output, from) {
    let value = this.lastSample;
    for (let i = from; i < output.length; i++) {
      value *= this.fadeOutDecay;
      output[i] = value;
    }
    this.lastSample = Math.abs(value) < 1e-5 ? 0 : value;
    // Nothing is playing, so the envelope closes too and the next reply opens
    // with a clean attack rather than snapping in at full amplitude.
    this.gain = 0;
  }

  reportProgress(written) {
    this.played += written;
    this.sinceProgress += written;
    if (this.sinceProgress < this.progressInterval) return;
    this.sinceProgress = 0;
    this.port.postMessage({ type: "progress", played: this.played });
  }

  // A reply has finished. Whatever silence it had to insert is head start it
  // was owed; a reply that needed none hands a little of the cushion back.
  settleCushion() {
    // Reported before it is applied, so the log line describes the reply that
    // just played rather than the next one's head start.
    this.port.postMessage({
      type: "stats",
      starvedMs: Math.round((this.starved / sampleRate) * 1000),
      cushionMs: Math.round((this.startCushion / sampleRate) * 1000),
      spokenMs: Math.round((this.played / sampleRate) * 1000),
      peak: Number(this.peak.toFixed(3)),
      rms: Number(
        Math.sqrt(this.sumSquares / Math.max(1, this.measured)).toFixed(4),
      ),
      jumps: this.jumps,
      // Jumps per second of audio, which is what says whether a splice is
      // happening at every chunk boundary or only here and there.
      jumpsPerSecond: Number(
        (this.jumps / Math.max(0.001, this.measured / sampleRate)).toFixed(1),
      ),
    });
    this.peak = 0;
    this.sumSquares = 0;
    this.jumps = 0;
    this.measured = 0;
    this.previousSample = 0;
    this.startCushion =
      this.starved > 0
        ? Math.min(
            this.maxStartCushion,
            this.startCushion + this.starved + this.startMargin,
          )
        : Math.max(this.floorCushion, this.startCushion - this.cushionRelax);
    this.starved = 0;
  }

  process(_inputs, outputs) {
    const output = outputs[0][0];

    // The only wait there is: the cushion held before a reply's first word.
    if (!this.playing) {
      const ready =
        this.buffered >= this.startCushion ||
        (this.streamEnded && this.buffered > 0);
      if (!ready) {
        this.fadeToSilence(output, 0);
        return true;
      }
      this.setPlaying(true);
    }

    let written = 0;
    while (written < output.length && this.queue.length > 0) {
      const chunk = this.queue[0];
      const count = Math.min(output.length - written, chunk.length - this.offset);
      output.set(chunk.subarray(this.offset, this.offset + count), written);
      written += count;
      this.offset += count;
      this.buffered -= count;
      if (this.offset >= chunk.length) {
        this.queue.shift();
        this.offset = 0;
      }
    }

    // One continuous envelope, carried across blocks, rather than a fade that
    // is re-armed whenever the queue runs short. A render block is 5.3 ms and
    // the old ramp was 5 ms, so on a marginal buffer almost every block was
    // being lifted from zero again: that is a ~187 Hz amplitude modulation
    // stamped onto the voice, which is quieter, buzzy and crackly all at once.
    // Here a one-block underrun costs a fraction of the envelope and is paid
    // back in under a millisecond of speech, so brief starvation is inaudible
    // and only a real silence ever reaches zero.
    for (let i = 0; i < written; i++) {
      if (this.gain < 1) this.gain = Math.min(1, this.gain + this.attackStep);
      output[i] *= this.gain;
    }

    if (written > 0) this.lastSample = output[written - 1];
    this.reportProgress(written);

    if (written < output.length) {
      // Whatever could not be filled decays from where the waveform actually
      // was, so a gap is a soft pause rather than a click.
      for (let i = written; i < output.length; i++) {
        this.lastSample *= this.fadeOutDecay;
        if (this.gain > 0) this.gain = Math.max(0, this.gain - this.releaseStep);
        output[i] = this.lastSample;
      }
      if (Math.abs(this.lastSample) < 1e-5) this.lastSample = 0;

      if (this.streamEnded && this.buffered === 0) {
        this.settleCushion();
        this.setPlaying(false);
        return true;
      }

      // A gap inside the reply. Stay in the reply rather than stopping: the
      // next sample to arrive plays immediately, because waiting to rebuild a
      // cushion the service cannot refill only lengthens the gap. Count the
      // silence so the next reply starts with enough head start to avoid it.
      this.starved += output.length - written;
    }

    return true;
  }
}

registerProcessor("playback-processor", PlaybackProcessor);
