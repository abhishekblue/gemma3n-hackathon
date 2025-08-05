import React, { useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { insertMedicine } from '../database';
import { scheduleRemindersForMedicine } from '../utils/NotificationManager';
import * as Notifications from 'expo-notifications';

interface TextToSpeechPlayerProps {
  response_data: {
    response_text: string;
    is_final: boolean;
    action?: string; // Add action to response_data
    data?: { // Add data to response_data
      name: string;
      strength: string;
      times: string[];
    };
  };
  startRecording?: () => void; // Make startRecording optional
  onSpeechFinish?: () => void; // New prop: Callback when speech finishes
}

const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = ({ response_data, startRecording, onSpeechFinish }) => {
  const [ttsSound, setTtsSound] = useState<Audio.Sound | null>(null);
  const endingSound = useRef<Audio.Sound | null>(null);

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

  useEffect(() => {
    const playAudio = async () => {
      if (!response_data || !response_data.response_text) return;

      try {
        // const response = await fetch('http://127.0.0.1:8000/text-to-speech', {
        const response = await fetch('http://10.161.128.186:8000/text-to-speech', {
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
                // Perform action first if it's an add_medicine action
                if (response_data.action === "add_medicine" && response_data.data) {
                  await insertMedicine(
                    response_data.data.name,
                    response_data.data.strength,
                    response_data.data.times // Changed from frequency to times
                  );
                  console.log("Medicine saved to database:", response_data.data);
                  const permissionStatus = await Notifications.getPermissionsAsync();
                  console.log("Permission status:", permissionStatus);

                  // Schedule reminders for the newly added medicine
                  if (response_data.data) {
                    console.log("Attempting to schedule reminders with data:", response_data.data);
                    await scheduleRemindersForMedicine({
                      name: response_data.data.name,
                      dosage: response_data.data.strength,
                      times: response_data.data.times,
                    });
                  } else {
                    console.log("No data available to schedule reminders.");
                  }
                }

                // Then handle ending sound playback
                if (endingSound.current) {
                  await endingSound.current.setVolumeAsync(0.3);
                  await endingSound.current.playFromPositionAsync(0);

                  const endingSoundListener = (endingStatus: any) => {
                    if (endingStatus.isLoaded && endingStatus.didJustFinish) {
                      onSpeechFinish && onSpeechFinish();
                      endingSound.current?.setOnPlaybackStatusUpdate(null); // Clean up listener
                    }
                  };
                  endingSound.current.setOnPlaybackStatusUpdate(endingSoundListener);
                } else {
                  // If endingSound is not available, call onSpeechFinish immediately
                  onSpeechFinish && onSpeechFinish();
                }
              } else {
                startRecording && startRecording();
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
  }, [response_data]);

  return null; // This component doesn't render anything visible
};

export default TextToSpeechPlayer;
