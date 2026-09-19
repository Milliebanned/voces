// Captures microphone audio and hands it back as 24 kHz mono PCM16, the only
// format the Voice Agent API accepts.
//
// Chromium honours a forced 24 kHz AudioContext, but Firefox and Safari ignore
// it and silently disable echo cancellation, so the resampling happens here
// instead and the context is left at the hardware rate.
//
// Downsampling has to low-pass first. Plain interpolation folded everything
// between 12 and 24 kHz back down on top of the 0-12 kHz speech band as false
// energy, right where the consonants that tell "pasta" from "basta" live. A
// windowed-sinc filter below the new Nyquist now runs before interpolation
// whenever the rate actually drops.
const TAPS = 63;

function lowPassKernel(cutoff) {
  // cutoff as a fraction of the input sample rate
  const kernel = new Float32Array(TAPS);
  const middle = (TAPS - 1) / 2;
  let sum = 0;
  for (let i = 0; i < TAPS; i++) {
    const n = i - middle;
    const sinc = n === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * n) / (Math.PI * n);
    // Blackman window: -74 dB stopband, plenty for speech.
    const window =
      0.42 -
      0.5 * Math.cos((2 * Math.PI * i) / (TAPS - 1)) +
      0.08 * Math.cos((4 * Math.PI * i) / (TAPS - 1));
    kernel[i] = sinc * window;
    sum += kernel[i];
  }
  for (let i = 0; i < TAPS; i++) kernel[i] /= sum;
  return kernel;
}

class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { inputSampleRate, targetSampleRate } = options.processorOptions ?? {};
    this.inputSampleRate = inputSampleRate ?? sampleRate;
    this.targetSampleRate = targetSampleRate ?? 24000;
    this.ratio = this.inputSampleRate / this.targetSampleRate;
    this.carry = 0;

    // Only needed when the rate goes down. Cut just under the new Nyquist
    // (0.45 of the output rate) so the transition band is spent above speech.
    this.kernel =
      this.ratio > 1
        ? lowPassKernel((0.45 * this.targetSampleRate) / this.inputSampleRate)
        : null;
    // The last TAPS-1 input samples, so filtering is continuous across the
    // 128-frame render blocks.
    this.history = new Float32Array(TAPS - 1);

    // The audio thread renders 128 frames at a time, which would mean hundreds
    // of WebSocket messages a second, each one base64-encoded on the main
    // thread that also has to keep the agent's voice playing smoothly. 50 ms
    // batches keep latency low without flooding it.
    this.batchSize = Math.round(this.targetSampleRate * 0.05);
    this.batch = new Int16Array(this.batchSize);
    this.batchLength = 0;
  }

  lowPass(input) {
    const kernel = this.kernel;
    const history = this.history;
    const joined = new Float32Array(history.length + input.length);
    joined.set(history);
    joined.set(input, history.length);

    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let acc = 0;
      for (let k = 0; k < TAPS; k++) acc += joined[i + k] * kernel[k];
      out[i] = acc;
    }
    this.history = joined.slice(joined.length - history.length);
    return out;
  }

  process(inputs) {
    const raw = inputs[0]?.[0];
    if (!raw || raw.length === 0) return true;

    if (this.ratio === 1) {
      this.send(raw, raw.length);
      return true;
    }

    const input = this.kernel ? this.lowPass(raw) : raw;

    // With the band already limited, linear interpolation between samples is
    // enough to land on the new rate.
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
