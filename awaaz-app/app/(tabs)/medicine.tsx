import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, FlatList, SafeAreaView, Alert } from 'react-native';
import { getMedicines } from '../../database'; // Adjust path as necessary
import { formatMedicineSpeech } from '../../utils/speechFormatter';
import TextToSpeechPlayer from '../../components/TextToSpeechPlayer';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
}

export default function MedicineScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [status, setStatus] = useState('Idle');
  const [speechResponse, setSpeechResponse] = useState({ response_text: '', is_final: false });

  useEffect(() => {
    // Initial load of medicines without playing audio automatically
    const initialLoad = async () => {
      try {
        const storedMedicines = await getMedicines();
        setMedicines(storedMedicines);
        setStatus('Medicines loaded from storage.');
        // Do NOT call ttsPlayerRef.current.loadAndPlay() here
      } catch (error) {
        console.error("Failed to load medicines from storage:", error);
        setStatus('Failed to load medicines from storage.');
      }
    };
    initialLoad();
  }, []);

  const loadMedicines = async () => {
    console.log("loadMedicines called");
    try {
      const storedMedicines = await getMedicines();
      setMedicines(storedMedicines);
      const formattedSpeech = formatMedicineSpeech(storedMedicines);
      setSpeechResponse({ response_text: formattedSpeech, is_final: true });
      setStatus('Medicines loaded from storage.');
    } catch (error) {
      console.error("Failed to load medicines from storage:", error);
      setStatus('Failed to load medicines from storage.');
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button
            title="Load Medicines"
            onPress={loadMedicines}
            color="#4CAF50"
          />
      </View>
      <TextToSpeechPlayer response_data={speechResponse} />
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  listHeader: {
    color: '#fff'!,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  medicineItem: {
    color: '#fff'!,
    padding: 10,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});
