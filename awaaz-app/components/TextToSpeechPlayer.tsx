import React, { useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';

interface TextToSpeechPlayerProps {
  response_data: {
    response_text: string;
    is_final: boolean;
  };
  startRecording: () => void;
}

const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = ({ response_data, startRecording }) => {
  const [ttsSound, setTtsSound] = useState<Audio.Sound | null>(null);
  const dingSound = useRef<Audio.Sound | null>(null);
  const endingSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSounds = async () => {
      try {
        const { sound: ding } = await Audio.Sound.createAsync(
          require('../assets/sounds/ding.mp3')
        );
        dingSound.current = ding;

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
      if (dingSound.current) {
        dingSound.current.unloadAsync();
      }
      if (endingSound.current) {
        endingSound.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const playAudio = async () => {
      if (!response_data || !response_data.response_text) return;

      try {
        const response = await fetch('https://symmetrical-invention-vg4pvpjvrvxcprw9-8000.app.github.dev/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: response_data.response_text }),
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
          setTtsSound(newTtsSound);

          newTtsSound.setOnPlaybackStatusUpdate(async (status) => {
            console.log("Playback status update:", status);
            if (status.isLoaded && status.didJustFinish) {
              if (ttsSound) {
                await ttsSound.unloadAsync();
                setTtsSound(null);
              }
              
              if (response_data.is_final) {
                if (endingSound.current) {
                  await endingSound.current.setVolumeAsync(0.3);
                  await endingSound.current.playFromPositionAsync(0);
                }
              } else {
                if (dingSound.current) {
                  await dingSound.current.setVolumeAsync(0.3);
                  await dingSound.current.playFromPositionAsync(0);
                }
                startRecording();
              }
            }
          });

          await newTtsSound.loadAsync({ uri: base64data as string }, { shouldPlay: true });
        };

      } catch (error) {
        console.error('Error playing audio:', error);
      }
    };

    playAudio();

    return () => {
      if (ttsSound) {
        ttsSound.unloadAsync();
      }
    };
  }, [response_data, startRecording]);

  return null; // This component doesn't render anything visible
};

export default TextToSpeechPlayer;
