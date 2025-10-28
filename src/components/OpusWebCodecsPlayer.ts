// utils/audio/OpusWebCodecsPlayer.ts
export class OpusWebCodecsPlayer {
  private audioCtx: AudioContext;
  private decoder: AudioDecoder | null = null;
  private playHead = 0;
  private primed = false;
  private readonly SR = 24000;
  private readonly CH = 1;

  constructor(audioCtx?: AudioContext) {
    this.audioCtx =
      audioCtx ??
      new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!("AudioDecoder" in window))
      throw new Error("WebCodecs AudioDecoder not supported");
  }

  configure() {
    const opusHeader = this.makeOpusHead(this.CH, 0, this.SR, 0, 0);
    this.decoder = new (window as any).AudioDecoder({
      output: (audioData: AudioData) => this.onDecoded(audioData),
      error: (e: any) => console.error("[OpusDecoder] error", e),
    });
    this.decoder?.configure({
      codec: "opus",
      sampleRate: this.SR,
      numberOfChannels: this.CH,
      description: opusHeader.buffer, // OpusHead (CodecSpecificData)
    });
  }

  private onDecoded(audioData: AudioData) {
    const ab = this.audioCtx.createBuffer(
      audioData.numberOfChannels,
      audioData.numberOfFrames,
      audioData.sampleRate
    );
    for (let ch = 0; ch < audioData.numberOfChannels; ch++) {
      const tmp = new Float32Array(audioData.numberOfFrames);
      audioData.copyTo(tmp, { planeIndex: ch });
      ab.getChannelData(ch).set(tmp);
    }
    audioData.close();

    if (!this.primed) {
      this.playHead = Math.max(this.audioCtx.currentTime + 0.25, this.playHead); // 250ms 프리버퍼
      this.primed = true;
    }
    const src = this.audioCtx.createBufferSource();
    src.buffer = ab;
    src.connect(this.audioCtx.destination);
    const when = this.playHead;
    src.start(when);
    this.playHead = when + ab.duration;
  }

  decodeFrame(payload: Uint8Array, seq: number, timestampUSec?: number) {
    if (!this.decoder) return;
    const ts = Math.trunc(timestampUSec ?? seq * 20_000);
    const chunk = new (window as any).EncodedAudioChunk({
      type: "key",
      timestamp: ts,
      data: payload,
    });
    this.decoder.decode(chunk);
  }

  async flush() {
    console.log("[OpusDecoder] flush 호출 됩니까?");
    await this.decoder?.flush().catch((e) => {
      console.error("[OpusDecoder] flush error", e);
    });
  }
  close() {
    console.log("[OpusDecoder] close 호출 됩니까?");
    try {
      this.decoder?.close();
    } catch {}
    this.decoder = null;
  }
  get context() {
    return this.audioCtx;
  }

  // ---- OpusHead ----
  private makeOpusHead(
    channels = 1,
    preSkip = 0,
    inputSampleRate = this.SR,
    gain = 0,
    channelMapping = 0
  ): Uint8Array {
    const magic = new TextEncoder().encode("OpusHead");
    const b = new Uint8Array(19);
    b.set(magic, 0);
    b[8] = 1; // version
    b[9] = channels;
    b[10] = preSkip & 0xff;
    b[11] = (preSkip >> 8) & 0xff;
    b[12] = inputSampleRate & 0xff;
    b[13] = (inputSampleRate >> 8) & 0xff;
    b[14] = (inputSampleRate >> 16) & 0xff;
    b[15] = (inputSampleRate >> 24) & 0xff;
    b[16] = gain & 0xff;
    b[17] = (gain >> 8) & 0xff;
    b[18] = channelMapping;
    return b;
  }
}
