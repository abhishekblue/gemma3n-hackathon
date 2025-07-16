import React, { useState, useRef } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import VoiceCommandButton from '../../components/VoiceCommandButton';
import TextToSpeechPlayer from '../../components/TextToSpeechPlayer';

export default function App() {
  const [llmResponse, setLlmResponse] = useState<{ response_text: string; is_final: boolean } | null>(null);
  const voiceCommandButtonRef = useRef<{ startRecording: () => void }>(null);

  const handleLlmResponse = (response: { response_text: string; is_final: boolean }) => {
    setLlmResponse(response);
  };

  const startRecording = () => {
    if (voiceCommandButtonRef.current) {
      voiceCommandButtonRef.current.startRecording();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <VoiceCommandButton onEmpatheticText={handleLlmResponse} ref={voiceCommandButtonRef} />
      {llmResponse ? <TextToSpeechPlayer response_data={llmResponse} startRecording={startRecording} /> : null}
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // You can set a background color here
  },
});
