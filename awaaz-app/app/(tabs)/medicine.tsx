import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, FlatList, SafeAreaView, Alert } from 'react-native';
import { getMedicines, insertMedicine } from '../../database'; // Adjust path as necessary
import { formatMedicineSpeech } from '../../utils/speechFormatter';
import TextToSpeechPlayer from '../../components/TextToSpeechPlayer';
import AddMedicineCommand from '../../components/AddMedicineCommand';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
}

interface BackendResponse {
  action: 'display_list' | 'add_medicine' | string;
  data?: { name: string; strength: string; frequency: string; };
}

export default function MedicineScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [status, setStatus] = useState('Idle');
  const [speechResponse, setSpeechResponse] = useState({ response_text: '', is_final: false });

  useEffect(() => {
    // Initial load of medicines without playing audio automatically
    const initialLoad = async () => {
      try {
        setSpeechResponse({ response_text: '', is_final: false }); // Clear speech response on mount
        const storedMedicines = await getMedicines();
        setMedicines(storedMedicines);
        setStatus('Medicines loaded from storage.');
      } catch (error) {
        console.error("Failed to load medicines from storage:", error);
        setStatus('Failed to load medicines from storage.');
      }
    };
    initialLoad();
  }, []);

  const loadMedicinesAndTriggerSpeech = async () => {
    console.log("loadMedicinesAndTriggerSpeech called");
    try {
      const storedMedicines = await getMedicines();
      setMedicines(storedMedicines);
      const formattedSpeech = formatMedicineSpeech(storedMedicines);
      setSpeechResponse({ response_text: formattedSpeech, is_final: true });
      setStatus('Medicines loaded from storage and speech triggered.');
    } catch (error) {
      console.error("Failed to load medicines from storage:", error);
      setStatus('Failed to load medicines from storage.');
    }
  };

  const handleBackendResponse = async (data: BackendResponse) => {
    if (data.action === 'display_list') {
      const storedMedicines = await getMedicines();
      setMedicines(storedMedicines);
      const formattedSpeech = formatMedicineSpeech(storedMedicines);
      setSpeechResponse({ response_text: formattedSpeech, is_final: true });
      setStatus('Displaying medicines from storage.');
    } else if (data.action === 'add_medicine') {
      const { name, strength, frequency } = data.data as { name: string, strength: string, frequency: string };
      await insertMedicine(name, strength, frequency); // Insert medicine here
      await loadMedicinesAndTriggerSpeech(); // Reload medicines after adding
      setStatus(`Added ${name} to storage.`);
      Alert.alert("Medicine Added", `${name} has been added to your schedule.`);
      // Trigger speech for confirmation without passing action/data for insertion
      setSpeechResponse({
        response_text: `Added ${name} with dosage ${strength} and frequency ${frequency}.`,
        is_final: true,
      });
    } else {
      setStatus('Unknown action from backend.');
    }
  };

  const startRecording = () => {
    // Placeholder for starting recording, if needed by TextToSpeechPlayer
    console.log("Start recording called from MedicineScreen (placeholder)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button
            title="Load Medicines"
            onPress={loadMedicinesAndTriggerSpeech}
            color="#4CAF50"
          />
        <AddMedicineCommand onResponseReceived={handleBackendResponse} />
      </View>
      <TextToSpeechPlayer response_data={speechResponse} startRecording={startRecording} />
      <Text style={styles.status}>Status: {status}</Text>
      <FlatList
        data={medicines}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={styles.medicineItem}>
            Name: {item.name}, Dosage: {item.dosage}, Frequency: {item.frequency}
          </Text>
        )}
        ListHeaderComponent={medicines.length > 0 ? <Text style={styles.listHeader}>Available Medicines:</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 50,
    marginHorizontal: 16,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  status: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  medicineItem: {
    padding: 10,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});
