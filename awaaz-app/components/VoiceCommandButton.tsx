import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// Assuming your backend is running locally on the same Wi-Fi
// For local development, use your machine's local IP address or localhost
// For web, 'localhost' should work. For physical devices, use your machine's IP.
// const API_URL = 'http://10.101.235.252:8000'; // Adjust if your backend is on a different IP
const API_URL = 'http://127.0.0.1:8000'; // Adjust if your backend is on a different IP

interface VoiceCommandButtonProps {
  onEmpatheticText: (response: { response_text: string; is_final: boolean }) => void;
}

export interface VoiceCommandButtonRef {
  startRecording: () => void;
}

const VoiceCommandButton = forwardRef<VoiceCommandButtonRef, VoiceCommandButtonProps>(({ onEmpatheticText }, ref) => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dingSound = useRef<Audio.Sound | null>(null);
  const processingSound = useRef<Audio.Sound | null>(null);
  const recordingStartTime = useRef<number | null>(null);

  // Load sounds and request permissions
  useEffect(() => {
    const loadSounds = async () => {
      try {
        const { sound: ding } = await Audio.Sound.createAsync(
          require('../assets/sounds/ding.mp3')
        );
        dingSound.current = ding;

        const { sound: processing } = await Audio.Sound.createAsync(
          require('../assets/sounds/processing.mp3')
        );
        processingSound.current = processing;
      } catch (error) {
        console.error('Failed to load sounds:', error);
        setError('Failed to load essential sounds. Please restart the app.');
      }
    };

    loadSounds();

    (async () => {
      if (Platform.OS !== 'web') {
        try {
          const { granted } = await AudioModule.requestRecordingPermissionsAsync();
          if (!granted) {
            setError('Permission to access microphone is required to use voice commands!');
            Alert.alert("Permission Required", "Microphone access is needed for voice commands. Please enable it in your device settings.");
          }
        } catch (permissionError) {
          console.error('Failed to request microphone permission:', permissionError);
          setError('Failed to request microphone permission.');
          Alert.alert("Error", "Could not request microphone permission. Please check your device settings.");
        }
      }
    })();

    return () => {
      if (dingSound.current) {
        dingSound.current.unloadAsync();
      }
      if (processingSound.current) {
        processingSound.current.unloadAsync();
      }
    };
  }, []);

  // Play or stop processing sound based on isLoading
  useEffect(() => {
    const manageProcessingSound = async () => {
      if (isLoading) {
        try {
          if (processingSound.current) {
            await processingSound.current.setIsLoopingAsync(true);
            await processingSound.current.setVolumeAsync(0.4);
            await processingSound.current.playAsync();
          }
        } catch (err) {
          console.error('Failed to play processing sound:', err);
        }
      } else {
        if (processingSound.current) {
          try {
            await processingSound.current.stopAsync();
            await processingSound.current.setIsLoopingAsync(false);
          } catch {}
        }
      }
    };
    manageProcessingSound();
  }, [isLoading]);

  useImperativeHandle(ref, () => ({
    startRecording,
  }));

  async function startRecording() {
    try {
      setError(null);
      setIsLoading(true);

      if (dingSound.current) {
        await dingSound.current.setVolumeAsync(0.3);
        await dingSound.current.playFromPositionAsync(0);
      }

      if (Platform.OS !== 'web') {
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setIsLoading(false);
      recordingStartTime.current = Date.now();
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Failed to start recording.');
      setIsLoading(false);
    }
  }

  async function stopRecording() {
    setIsLoading(true);
    setIsRecording(false);
    if (!audioRecorder.isRecording) {
      setError('No recording in progress.');
      setIsLoading(false);
      return;
    }

    try {
      await audioRecorder.stop();
      if (Platform.OS !== 'web') {
        await AudioModule.setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      }
      const uri = audioRecorder.uri;
      console.log('Recording stopped and stored at', uri);
      const recordingDuration = recordingStartTime.current ? Date.now() - recordingStartTime.current : 0;
      if (uri) {
        if (recordingDuration > 500) {
          await uploadAudio(uri);
        } else {
          console.log('Recording too short, not uploading.');
          speakMessage('Recording was too short.');
        }
      } else {
        setError('Failed to get recording URI.');
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setError('Failed to stop recording.');
    } finally {
      setIsLoading(false);
    }
  }

  async function speakMessage(message: string) {
    try {
      const response = await fetch(`${API_URL}/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const audioBlob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result;
          const { sound } = await Audio.Sound.createAsync(
            { uri: base64data as string },
            { shouldPlay: true }
          );
          sound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.isLoaded && status.didJustFinish) {
              await sound.unloadAsync();
            }
          });
        } catch (audioLoadError) {
          console.error('Error loading or playing message audio:', audioLoadError);
          Alert.alert("Error", "Failed to play system message.");
        }
      };
    } catch (error) {
      console.error('Error fetching or playing message audio:', error);
      Alert.alert("Error", "Failed to communicate with the server for system messages.");
    }
  }

  async function uploadAudio(audioUri: string) {
    setIsLoading(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        const formData = new FormData();
        const audioBlobResponse = await fetch(audioUri);
        const blob = await audioBlobResponse.blob();
        formData.append('audio_file', blob, 'audio.wav'); // field name should match backend expectation

        console.log('Uploading audio to:', `${API_URL}/awaaz-command`);
        const webResponse = await fetch(`${API_URL}/awaaz-command`, {
          method: 'POST',
          body: formData,
        });

        if (webResponse.ok) {
          const responseData = await webResponse.json();
          console.log('API Response:', responseData);
          if (onEmpatheticText) onEmpatheticText(responseData);
        } else {
          const errorText = await webResponse.text();
          console.error('Transcription API Error:', webResponse.status, errorText);
          setError(`Error: ${webResponse.status} - ${errorText}`);
        }
      } else {
        // Native (iOS/Android)
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) throw new Error('Audio file does not exist.');
        const fileExtension = audioUri.split('.').pop();
        const fileName = `recording.${fileExtension || 'm4a'}`;
        const mimeType = `audio/${fileExtension || 'm4a'}`;

        console.log('Uploading audio to:', `${API_URL}/awaaz-command`, 'using FileSystem.uploadAsync');
        const nativeResponse = await FileSystem.uploadAsync(
          `${API_URL}/awaaz-command`,
          audioUri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'audio_file',
            mimeType: mimeType,
          }
        );

        if (nativeResponse.status === 200) {
          const responseData = JSON.parse(nativeResponse.body);
          console.log('API Response:', responseData);
          if (onEmpatheticText) onEmpatheticText(responseData);
        } else {
          console.error('Transcription API Error:', nativeResponse.status, nativeResponse.body);
          setError(`Error: ${nativeResponse.status} - ${nativeResponse.body}`);
        }
      }
    } catch (e) {
      console.error('Audio Upload Failed:', e);
      setError('Failed to upload audio or connect to the server.');
    } finally {
      setIsLoading(false);
    }
  }

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonLoading]}
        onPress={handlePress}
        disabled={isLoading}
        accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isLoading ? (
          <Text>Processing...</Text>
        ) : (
          <FontAwesome name={isRecording ? 'stop-circle' : 'microphone'} size={80} color="black" />
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLoading: {
    backgroundColor: '#CCCCCC',
  },
  errorText: {
    marginTop: 20,
    color: 'red',
    textAlign: 'center',
  },
});

export default VoiceCommandButton;
