import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import VoiceCommandButton from '../../components/VoiceCommandButton'; // NOTE: Adjust this path if your folder structure is different

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <VoiceCommandButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // You can set a background color here
  },
});