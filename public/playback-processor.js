// Plays the agent's voice as one continuous stream on the audio thread.
//
// Scheduling a separate buffer per network chunk from the main thread left
// playback at the mercy of main-thread timing: any late chunk opened a gap,
// and every gap was audible as a crackle. Here chunks are queued and pulled
// sample by sample, so the only way to hear silence is to genuinely run dry.
class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.buffered = 0;
    this.playing = false;
    this.streamEnded = false;

    // Wait for ~100 ms of audio before starting (or restarting after running
    // dry) so small arrival jitter is absorbed instead of chopping the voice.
    this.prebuffer = Math.round(sampleRate * 0.1);

    this.port.onmessage = ({ data }) => {
      if (data.type === "audio") {
        const pcm = new Int16Array(data.buffer);
        const samples = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 32768;
        this.queue.push(samples);
        this.buffered += samples.length;
        this.streamEnded = false;
      } else if (data.type === "end") {
        // The reply is complete: play the tail even if it is under prebuffer.
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

  process(_inputs, outputs) {
    const output = outputs[0][0];

    if (!this.playing) {
      if (this.buffered >= this.prebuffer || (this.streamEnded && this.buffered > 0)) {
        this.setPlaying(true);
      } else {
        output.fill(0);
        return true;
      }
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

    if (written < output.length) {
      output.fill(0, written);
      this.setPlaying(false);
    }

    return true;
  }
}

registerProcessor("playback-processor", PlaybackProcessor);
