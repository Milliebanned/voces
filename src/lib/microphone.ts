const BLUETOOTH_HEADSET =
  /airpods|bluetooth|hands-?free|headset|buds|beats|bose|sony wh|jabra/i;
const BUILT_IN = /macbook|built-in|internal/i;

const AUDIO_CONSTRAINTS = { echoCancellation: true, noiseSuppression: false };

/**
 * Opens the microphone, steering away from a Bluetooth headset's mic when the
 * computer has its own.
 *
 * Opening a wireless headset's microphone drops the whole headset into its
 * hands-free call profile: audio in both directions falls to telephone quality
 * (nothing above 4 kHz) with added delay, and the agent's voice arrives muffled
 * and crackling. Taking input from the built-in mic instead keeps the headset
 * in its high-quality playback profile.
 */
export async function openMicrophone(): Promise<{
  stream: MediaStream;
  avoidedHeadset: string | null;
}> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: AUDIO_CONSTRAINTS,
  });

  const current = stream.getAudioTracks()[0]?.label ?? "";
  if (!BLUETOOTH_HEADSET.test(current)) return { stream, avoidedHeadset: null };

  // Device labels are only readable once permission has been granted, which is
  // why the first stream has to be opened before this check can run.
  const devices = await navigator.mediaDevices.enumerateDevices();
  const builtIn = devices.find(
    (device) => device.kind === "audioinput" && BUILT_IN.test(device.label),
  );
  if (!builtIn) return { stream, avoidedHeadset: null };

  stream.getTracks().forEach((track) => track.stop());
  const replacement = await navigator.mediaDevices.getUserMedia({
    audio: { ...AUDIO_CONSTRAINTS, deviceId: { exact: builtIn.deviceId } },
  });
  return { stream: replacement, avoidedHeadset: current };
}
