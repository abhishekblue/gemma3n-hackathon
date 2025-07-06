import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import VoiceCommandButton from '../../components/VoiceCommandButton'; // NOTE: Adjust this path if your folder structure is different
import TextToSpeechPlayer from '../../components/TextToSpeechPlayer';

export default function App() {
  const [empatheticText, setEmpatheticText] = useState('');

  const handleEmpatheticText = (text: string) => {
    setEmpatheticText(text);
  };

  return (
    <SafeAreaView style={styles.container}>
      <VoiceCommandButton onEmpatheticText={handleEmpatheticText} />
      {empatheticText ? <TextToSpeechPlayer text={empatheticText} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // You can set a background color here
  },
});
