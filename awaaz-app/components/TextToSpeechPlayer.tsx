import React, { useEffect } from 'react';
import { Audio } from 'expo-av';

interface TextToSpeechPlayerProps {
  text: string;
}

const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = ({ text }) => {
  useEffect(() => {
    const playAudio = async () => {
      if (!text) return;

      try {
        const response = await fetch('https://symmetrical-invention-vg4pvpjvrvxcprw9-8000.app.github.dev/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result;
          const { sound } = await Audio.Sound.createAsync(
            { uri: base64data as string },
            { shouldPlay: true }
          );
          await sound.playAsync();
        };

      } catch (error) {
        console.error('Error playing audio:', error);
      }
    };

    playAudio();
  }, [text]);

  return null; // This component doesn't render anything visible
};

export default TextToSpeechPlayer;
