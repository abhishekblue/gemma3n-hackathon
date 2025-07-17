import React, { useState, useRef } from 'react';
import { Button, SafeAreaView, StyleSheet } from 'react-native';
import { getMedicines } from '../../database';
import { formatMedicineSpeech } from '../../utils/speechFormatter';
import VoiceCommandButton from '../../components/VoiceCommandButton';
import TextToSpeechPlayer from '../../components/TextToSpeechPlayer';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
}

// Extend the response interface to include action and data
interface LlmResponseData {
  response_text: string;
  is_final: boolean;
  action?: string;
  data?: {
    name: string;
    strength: string;
    frequency: string;
  };
}

export default function App() {
  // const [llmResponse, setLlmResponse] = useState<{ response_text: string; is_final: boolean } | null>(null); // Commented out: Replaced by activeSpeech
  const voiceCommandButtonRef = useRef<{ startRecording: () => void }>(null);
  // const [speechResponse, setSpeechResponse] = useState({ response_text: '', is_final: false }); // Commented out: Replaced by activeSpeech
  const [activeSpeech, setActiveSpeech] = useState<LlmResponseData | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]); // Kept for potential future use, though not displayed
  const [status, setStatus] = useState('Idle'); // Kept for potential future use, though not displayed


  const handleLlmResponse = (response: LlmResponseData) => {
    // setLlmResponse(response); // Commented out: Replaced by activeSpeech
    // Pass the entire response object, including is_final, action, and data
    setActiveSpeech(response); 
  };

  const startRecording = () => {
    if (voiceCommandButtonRef.current) {
      voiceCommandButtonRef.current.startRecording();
    }
  };

  const loadMedicines = async () => {
    console.log("loadMedicines called");
    try {
      const storedMedicines = await getMedicines();
      setMedicines(storedMedicines); // Keep medicines state updated
      const formattedSpeech = formatMedicineSpeech(storedMedicines);
      setActiveSpeech({ response_text: formattedSpeech, is_final: true }); // Medicine list is a final speech
      setStatus('Medicines loaded from storage.');
    } catch (error) {
      console.error("Failed to load medicines from storage:", error);
      setStatus('Failed to load medicines from storage.');
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <VoiceCommandButton onEmpatheticText={handleLlmResponse} ref={voiceCommandButtonRef} />
      {/* {llmResponse ? <TextToSpeechPlayer response_data={llmResponse} startRecording={startRecording} /> : null} */}
      {activeSpeech ? <TextToSpeechPlayer response_data={activeSpeech} onSpeechFinish={() => setActiveSpeech(null)} startRecording={startRecording} /> : null}
      <Button
          title="Load Medicines"
          onPress={loadMedicines}
          color="#9955ff"
        />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // You can set a background color here
  },
});


////////////////////////////////////////////////////////////////////////
