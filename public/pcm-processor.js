// Captures microphone audio and hands it back as 24 kHz mono PCM16, the only
// format the Voice Agent API accepts.
//
// Chromium honours a forced 24 kHz AudioContext, but Firefox and Safari ignore
// it and silently disable echo cancellation, so the resampling happens here
// instead and the context is left at the hardware rate.
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { inputSampleRate, targetSampleRate } = options.processorOptions ?? {};
    this.inputSampleRate = inputSampleRate ?? sampleRate;
    this.targetSampleRate = targetSampleRate ?? 24000;
    this.ratio = this.inputSampleRate / this.targetSampleRate;
    this.carry = 0;

    // The audio thread renders 128 frames at a time, which would mean hundreds
    // of WebSocket messages a second, each one base64-encoded on the main
    // thread that also has to keep the agent's voice playing smoothly. 50 ms
    // batches keep latency low without flooding it.
    this.batchSize = Math.round(this.targetSampleRate * 0.05);
    this.batch = new Int16Array(this.batchSize);
    this.batchLength = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    if (this.ratio === 1) {
      this.send(input, input.length);
      return true;
    }

    // Linear interpolation is enough for speech at these rates.
    const outLength = Math.floor((input.length - this.carry) / this.ratio);
    if (outLength <= 0) {
      this.carry -= input.length;
      return true;
    }

    const resampled = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const position = this.carry + i * this.ratio;
      const index = Math.floor(position);
      const fraction = position - index;
      const current = input[index] ?? 0;
      const next = input[index + 1] ?? current;
      resampled[i] = current + (next - current) * fraction;
    }

    this.carry = this.carry + outLength * this.ratio - input.length;
    this.send(resampled, outLength);
    return true;
  }

  send(samples, length) {
    for (let i = 0; i < length; i++) {
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      this.batch[this.batchLength++] = Math.round(clamped * 32767);

      if (this.batchLength === this.batchSize) {
        const full = this.batch;
        this.port.postMessage(full.buffer, [full.buffer]);
        this.batch = new Int16Array(this.batchSize);
        this.batchLength = 0;
      }
    }
  }
}

registerProcessor("pcm-processor", PCMProcessor);
