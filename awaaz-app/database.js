import AsyncStorage from '@react-native-async-storage/async-storage';

export const getMedicines = async () => {
  try {
    const medicinesString = await AsyncStorage.getItem('medicines');
    return medicinesString ? JSON.parse(medicinesString) : [];
  } catch (error) {
    console.error("Error getting medicines:", error);
    return [];
  }
};

export const insertMedicine = async (name, strength, times) => {
  try {
    const currentMedicines = await getMedicines();
    const newMedicine = { name, strength, times };
    const updatedMedicines = [...currentMedicines, newMedicine];
    await AsyncStorage.setItem('medicines', JSON.stringify(updatedMedicines));
  } catch (error) {
    console.error("Error inserting medicine:", error);
  }
};
