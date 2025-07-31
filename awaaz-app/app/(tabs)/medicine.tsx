import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, FlatList, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMedicines } from '../../database';


interface Medicine {
  name: string;
  strength: string;
  times: string[];
}

export default function MedicineScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [status, setStatus] = useState('Idle');

  useFocusEffect(
    useCallback(() => {
      const loadMedicines = async () => {
        try {
          const storedMedicines = await getMedicines();
          setMedicines(storedMedicines);
          setStatus('Medicines loaded from storage.');
        } catch (error) {
          console.error("Failed to load medicines from storage:", error);
          setStatus('Failed to load medicines from storage.');
        }
      };

      loadMedicines();
    }, [])
  );


  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.status}>Status: {status}</Text>
      <FlatList
        data={medicines}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={styles.medicineItem}>
            Name: {item.name}, Dosage: {item.strength}, Times: {(item.times || []).join(", ")}
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
