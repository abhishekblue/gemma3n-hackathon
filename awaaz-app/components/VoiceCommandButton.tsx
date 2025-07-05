import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAudioRecorder, AudioModule, RecordingPresets, AudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

// Assuming your backend is running locally on the same Wi-Fi
// For local development, use your machine's local IP address or localhost
// For web, 'localhost' should work. For physical devices, use your machine's IP.
const API_URL = 'https://symmetrical-invention-vg4pvpjvrvxcprw9-8000.app.github.dev'; // Adjust if your backend is on a different IP

const VoiceCommandButton = () => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) {
          setError('Permission to access microphone is required!');
        }
      }
    })();
  }, []);

  async function startRecording() {
    try {
      setError(null);
      setTranscription(null);
      setIsLoading(true);

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

      if (uri) {
        await uploadAudio(uri);
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

  async function uploadAudio(audioUri: string) {
    setIsLoading(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        const formData = new FormData();
        const audioBlobResponse = await fetch(audioUri);
        const blob = await audioBlobResponse.blob();
        formData.append('audio_file', blob, 'audio.wav'); // Changed field name to 'audio_file'

        console.log('Uploading audio to:', `${API_URL}/transcribe`);
        const webResponse = await fetch(`${API_URL}/transcribe`, {
          method: 'POST',
          body: formData,
        });

        if (webResponse.ok) {
          const responseData = await webResponse.json();
          console.log('Transcription API Response:', responseData);
          setTranscription(responseData.transcription);
        } else {
          const errorText = await webResponse.text();
          console.error('Transcription API Error:', webResponse.status, errorText);
          setError(`Error: ${webResponse.status} - ${errorText}`);
        }
      } else {
        // For native (iOS/Android), use FileSystem.uploadAsync
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
          throw new Error('Audio file does not exist.');
        }
        const fileExtension = audioUri.split('.').pop();
        const fileName = `recording.${fileExtension || 'm4a'}`;
        const mimeType = `audio/${fileExtension || 'm4a'}`;

        console.log('Uploading audio to:', `${API_URL}/transcribe`, 'using FileSystem.uploadAsync');
        const nativeResponse = await FileSystem.uploadAsync(
          `${API_URL}/transcribe`,
          audioUri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'audio_file', // Changed field name to 'audio_file'
            mimeType: mimeType,
            // fileName is not a valid option for MULTIPART uploadType
          }
        );

        if (nativeResponse.status === 200) { // Assuming 200 OK for success
          const responseData = JSON.parse(nativeResponse.body);
          console.log('Transcription API Response:', responseData);
          setTranscription(responseData.transcription);
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
        accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
      >
        {isLoading ? (
          <Text>Processing...</Text>
        ) : (
          <FontAwesome name={isRecording ? "stop-circle" : "microphone"} size={80} color="black" />
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {transcription ? <Text style={styles.transcriptionText}>{transcription}</Text> : null}
      {isRecording && <Text style={styles.recordingStatus}>Recording...</Text>}
    </View>
  );
};

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
  transcriptionText: {
    marginTop: 20,
    color: 'black',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingStatus: {
    marginTop: 10,
    color: 'blue',
    fontSize: 16,
  },
});

export default VoiceCommandButton;
