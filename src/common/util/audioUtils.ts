import * as React from 'react';

export async function playSoundBuffer(audioBuffer: ArrayBuffer) {
  const audioContext = new AudioContext();
  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = await audioContext.decodeAudioData(audioBuffer);
  bufferSource.connect(audioContext.destination);
  bufferSource.start();
}


/**
 * Plays a sound from a URL, and optionally repeats it after a delay.
 * @param url The URL of the sound to play.
 * @param firstDelay The delay before the first play, in milliseconds.
 * @param repeatMs The delay between each repeat, in milliseconds. If 0, the sound will only play once.
 */
export function usePlaySoundUrlLoop(url: string | null, firstDelay: number = 0, repeatMs: number = 0) {
  React.useEffect(() => {
    if (!url) return;

    let timer2: any;

    const playAudio = () => {
      const audio = new Audio(url);
      audio.play().catch(error => console.error('Error playing audio:', error));
    };

    const playFirstTime = () => {
      playAudio();
      timer2 = repeatMs > 0 ? setInterval(playAudio, repeatMs) : null;
    };

    const timer1 = setTimeout(playFirstTime, firstDelay);

    return () => {
      clearTimeout(timer1);
      if (timer2)
        clearInterval(timer2);
    };
  }, [firstDelay, repeatMs, url]);
}