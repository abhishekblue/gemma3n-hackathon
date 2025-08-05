import React, { useState, useRef } from 'react';
import { Button, SafeAreaView, StyleSheet, View, Text, Platform, StatusBar } from 'react-native';
import { getMedicines } from '../../database';
import { formatMedicineSpeech } from '../../utils/speechFormatter';
import VoiceCommandButton from '../../components/VoiceCommandButton';
import TextToSpeechPlayer from '../../components/TextToSpeechPlayer';
import TestNotificationButton from '../../components/TestNotificationButton';
import * as Notifications from 'expo-notifications';

interface Medicine {
  name: string;
  strength: string; 
  times: string[]; 
}

interface LlmResponseData {
  response_text: string;
  is_final: boolean;
  action?: string;
  data?: {
    name: string;
    strength: string;
    times: string[];
  };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const voiceCommandButtonRef = useRef<{ startRecording: () => void }>(null);
  const [activeSpeech, setActiveSpeech] = useState<LlmResponseData | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]); // Kept for potential future use, though not displayed
  const [status, setStatus] = useState('Idle'); // Kept for potential future use, though not displayed


  const handleLlmResponse = (response: LlmResponseData) => {
    if (response.action === 'list_medicines') {
      loadMedicines();
    } else {
      setActiveSpeech(response); 
    }
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
      <View style={styles.headerBar}>
        <Text style={styles.headerText}>Awaaz App (Medicine Guard)</Text>
      </View>
      <VoiceCommandButton onEmpatheticText={handleLlmResponse} ref={voiceCommandButtonRef} />
      {activeSpeech ? <TextToSpeechPlayer response_data={activeSpeech} onSpeechFinish={() => setActiveSpeech(null)} startRecording={startRecording} /> : null}
        <Button
          title="Load Medicines"
          onPress={loadMedicines}
          color="#9955ff"
        />
      <TestNotificationButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerBar: {
    backgroundColor: '#000',
    padding: 15,
    marginTop: 5,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});