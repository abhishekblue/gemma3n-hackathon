import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
}

interface MedicineListProps {
  medicines?: Medicine[];
}

const MedicineList: React.FC<MedicineListProps> = ({ medicines }) => {
  if (!medicines || medicines.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noMedicinesText}>No medicines have been added.</Text>
      </View>
    );
  }

  const renderMedicineItem = ({ item }: { item: Medicine }) => (
    <View style={styles.medicineItem}>
      <Text style={styles.medicineName}>{item.name}</Text>
      <Text style={styles.medicineDetail}>Dosage: {item.dosage}</Text>
      <Text style={styles.medicineDetail}>Schedule: {item.schedule}</Text>
    </View>
  );

  return (
    <FlatList
      data={medicines}
      keyExtractor={(item) => item.id}
      renderItem={renderMedicineItem}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 10,
  },
  noMedicinesText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
  },
  medicineItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  medicineDetail: {
    fontSize: 14,
    color: '#555',
  },
});

export default MedicineList;
