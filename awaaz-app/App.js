import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, FlatList, SafeAreaView } from 'react-native';

export default function App() {
  const [medicines, setMedicines] = useState([]);
  const [status, setStatus] = useState('Idle');

  const fetchMedicines = async () => {
    setStatus('Fetching...');
    try {
      const response = await fetch('http://192.168.1.5:8000/medicines');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setMedicines(data.medicines);
      setStatus('Success');
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus('Failed to fetch medicines.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button
          title="Fetch Medicines from Awaaz Engine"
          onPress={fetchMedicines}
          color="#841584"
        />
      </View>
      <Text style={styles.status}>Status: {status}</Text>
      <FlatList
        data={medicines}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text style={styles.medicineItem}>{item}</Text>}
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