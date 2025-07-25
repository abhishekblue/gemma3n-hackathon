import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native'; // Import Alert for user feedback

export const getMedicines = async () => {
  try {
    const medicinesString = await AsyncStorage.getItem('medicines');
    return medicinesString ? JSON.parse(medicinesString) : [];
  } catch (error) {
    console.error("Error getting medicines:", error);
    Alert.alert("Error", "Failed to retrieve medicines from storage.");
    return [];
  }
};

export const insertMedicine = async (name, strength, times) => {
  try {
    const currentMedicines = await getMedicines();
    const newMedicine = { name, strength, times };
    const updatedMedicines = [...currentMedicines, newMedicine];
    await AsyncStorage.setItem('medicines', JSON.stringify(updatedMedicines));
    Alert.alert("Success", "Medicine saved successfully!");
  } catch (error) {
    console.error("Error inserting medicine:", error);
    Alert.alert("Error", "Failed to save medicine. Please try again.");
  }
};
