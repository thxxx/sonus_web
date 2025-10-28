// utils/audio.ts
export async function playAudioOnce(
  src: string | Blob | ArrayBuffer,
  opts: { volume?: number } = {}
): Promise<void> {
  const { volume = 1 } = opts;

  let objectUrl: string | null = null;

  try {
    if (src instanceof ArrayBuffer) {
      src = new Blob([src], { type: "audio/wav" }); // 형식 모르면 브라우저가 대개 처리함
    }
    const url =
      typeof src === "string" ? src : (objectUrl = URL.createObjectURL(src));

    await new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      audio.src = url;
      audio.volume = volume;
      audio.loop = false;
      audio.preload = "auto";
      audio.crossOrigin = "anonymous"; // CDN 등에서 필요할 수 있음
      audio.currentTime = 0;

      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        // 메모리 정리
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        const err = new Error("Failed to play audio.");
        cleanup();
        reject(err);
      };

      // iOS/Safari는 사용자 제스처 이후만 재생 가능
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          cleanup();
          reject(e);
        });
      }
    });
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
