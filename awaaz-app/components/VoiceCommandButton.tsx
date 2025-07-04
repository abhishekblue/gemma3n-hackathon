import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

// It's recommended to use environment variables for the API URL
const API_URL = 'https://symmetrical-invention-vg4pvpjvrvxcprw9-8000.app.github.dev'; // Replace with your actual backend URL

const VoiceCommandButton = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleVoiceCommand = async () => {
    console.log('Voice command button pressed');
    setIsLoading(true);
    setError(null);

    // In a real application, you would get the voice input here
    // and convert it to text to send to the backend.
    const medicineData = {
      medicine_name: 'Paracetamol', // This should come from voice input
      dosage: '500mg', // This should also come from voice input
    };

    try {
      const response = await fetch(`${API_URL}/add_medicine_log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicineData),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('API Response:', responseData);
        // You might want to show a success message to the user
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setError(`Error: ${response.status} - ${errorText}`);
      }
    } catch (e) {
      console.error('API Request Failed:', e);
      setError('Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonLoading]}
        onPress={handleVoiceCommand}
        disabled={isLoading}
        accessibilityLabel="Start voice command"
      >
        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          <FontAwesome name="microphone" size={80} color="black" />
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLoading: {
    backgroundColor: '#CCCCCC',
  },
  errorText: {
    marginTop: 20,
    color: 'red',
    textAlign: 'center',
  },
});

export default VoiceCommandButton;