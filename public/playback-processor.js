// Plays the agent's voice as one continuous stream on the audio thread.
//
// The Voice Agent API streams speech at exactly real time in ~10 ms chunks, so
// the playback buffer never grows on its own: whatever cushion playback starts
// with is all it will ever have. Network stalls of 200-400 ms are routine, and
// any stall longer than the cushion empties it mid-word.
//
// Two defences, both measured against recorded arrival timings:
// - an adaptive cushion that starts small for low latency and grows each time
//   the connection proves it needs more, for the rest of the session;
// - short fades whenever audio stops or starts unexpectedly, so a gap that
//   still gets through is a soft pause rather than a click.
const START_CUSHION_SECONDS = 0.25;
const MAX_CUSHION_SECONDS = 0.8;
const CUSHION_STEP_SECONDS = 0.15;
// Every cushioned millisecond is a millisecond of delay, so after a reply that
// played through cleanly the cushion eases back toward the starting size.
const CUSHION_RELAX_SECONDS = 0.05;
const FADE_IN_SECONDS = 0.005;
const FADE_OUT_SECONDS = 0.002;

class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.buffered = 0;
    this.playing = false;
    this.streamEnded = false;

    this.cushion = Math.round(sampleRate * START_CUSHION_SECONDS);
    this.maxCushion = Math.round(sampleRate * MAX_CUSHION_SECONDS);
    this.cushionStep = Math.round(sampleRate * CUSHION_STEP_SECONDS);
    this.startCushion = this.cushion;
    this.cushionRelax = Math.round(sampleRate * CUSHION_RELAX_SECONDS);
    this.replyHadUnderrun = false;
    this.fadeInLength = Math.round(sampleRate * FADE_IN_SECONDS);
    this.fadeOutDecay = Math.exp(-1 / (sampleRate * FADE_OUT_SECONDS));

    this.fadeInRemaining = 0;
    this.lastSample = 0;

    this.port.onmessage = ({ data }) => {
      if (data.type === "audio") {
        const pcm = new Int16Array(data.buffer);
        const samples = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 32768;
        this.queue.push(samples);
        this.buffered += samples.length;
        this.streamEnded = false;
      } else if (data.type === "end") {
        // The reply is complete: play the tail even if it is under the cushion.
        this.streamEnded = true;
      } else if (data.type === "clear") {
        this.queue = [];
        this.offset = 0;
        this.buffered = 0;
        this.setPlaying(false);
      }
    };
  }

  setPlaying(playing) {
    if (this.playing === playing) return;
    this.playing = playing;
    this.port.postMessage({ type: playing ? "playing" : "idle" });
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
  }

  process(_inputs, outputs) {
    const output = outputs[0][0];

    if (!this.playing) {
      const ready =
        this.buffered >= this.cushion || (this.streamEnded && this.buffered > 0);
      if (!ready) {
        this.fadeToSilence(output, 0);
        return true;
      }
      this.setPlaying(true);
      this.fadeInRemaining = this.fadeInLength;
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

    for (let i = 0; i < written && this.fadeInRemaining > 0; i++) {
      output[i] *= 1 - this.fadeInRemaining / this.fadeInLength;
      this.fadeInRemaining--;
    }

    if (written > 0) this.lastSample = output[written - 1];

    if (written < output.length) {
      if (this.streamEnded) {
        if (!this.replyHadUnderrun) {
          this.cushion = Math.max(this.startCushion, this.cushion - this.cushionRelax);
        }
        this.replyHadUnderrun = false;
      } else {
        // Running dry before the reply finished means the cushion was too thin
        // for this connection; widen it for what follows.
        this.cushion = Math.min(this.maxCushion, this.cushion + this.cushionStep);
        this.replyHadUnderrun = true;
      }
      this.fadeToSilence(output, written);
      this.setPlaying(false);
    }

    return true;
  }
}

registerProcessor("playback-processor", PlaybackProcessor);
