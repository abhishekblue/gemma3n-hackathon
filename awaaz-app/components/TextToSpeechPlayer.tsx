import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Audio } from 'expo-av';

interface TextToSpeechPlayerProps {
  response_data: {
    response_text: string;
    is_final: boolean;
  };
  startRecording: () => void;
}

export interface TextToSpeechPlayerRef {
  loadAndPlay: (text: string, isFinal: boolean) => void;
}

const TextToSpeechPlayer: React.ForwardRefRenderFunction<TextToSpeechPlayerRef, TextToSpeechPlayerProps> = ({ startRecording }, ref) => {
  const [ttsSound, setTtsSound] = useState<Audio.Sound | null>(null);
  const endingSound = useRef<Audio.Sound | null>(null);
  const currentResponseData = useRef<{ response_text: string; is_final: boolean } | null>(null);

  useImperativeHandle(ref, () => ({
    loadAndPlay: async (text: string, isFinal: boolean) => {
      currentResponseData.current = { response_text: text, is_final: isFinal };
      if (ttsSound) {
        await ttsSound.unloadAsync();
        setTtsSound(null);
      }
      await playAudio(text, isFinal);
    }
  }));

  useEffect(() => {
    const loadSounds = async () => {
      try {
        const { sound: ending } = await Audio.Sound.createAsync(
          require('../assets/sounds/ending.mp3')
        );
        endingSound.current = ending;

      } catch (error) {
        console.error('Error loading sounds:', error);
      }
    };

    loadSounds();

    return () => {
      if (endingSound.current) {
        endingSound.current.unloadAsync();
      }
    };
  }, []);

  const playAudio = async (text: string, isFinal: boolean) => {
    if (!text) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("Audio stream received, attempting to load and play...");
      const audioBlob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = reader.result;
        const newTtsSound = new Audio.Sound();
        
        newTtsSound.setOnPlaybackStatusUpdate(async (status) => {
          console.log("Playback status update:", status);
          if (status.isLoaded && status.didJustFinish) {
            await newTtsSound.unloadAsync();
            setTtsSound(null);
            
            if (isFinal) {
              if (endingSound.current) {
                await endingSound.current.setVolumeAsync(0.3);
                await endingSound.current.playFromPositionAsync(0);
              }
            } else {
              startRecording();
            }
          }
        });

        await newTtsSound.loadAsync({ uri: base64data as string }, { shouldPlay: true });
        setTtsSound(newTtsSound);
      };

    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  useEffect(() => {
    // Clean up function for ttsSound
    return () => {
      if (ttsSound) {
        ttsSound.unloadAsync();
      }
    };
  }, [ttsSound]); // Only run when ttsSound changes

  return null; // This component doesn't render anything visible
};

export default forwardRef(TextToSpeechPlayer);
