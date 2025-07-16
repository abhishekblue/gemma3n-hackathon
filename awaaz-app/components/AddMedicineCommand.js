// AddMedicineCommand.js
import addAudio from '../assets/sounds/list_medicines.wav';

import React from 'react';

const AddMedicineCommand = ({ onResponseReceived }) => {
  const handleSendAudio = async () => {
    console.log("Sending 'Add audio command...");
    // Fetch the audio file from public folder
    const response = await fetch(addAudio);
    const blob = await response.blob();
    console.log("Audio file fetched:", blob);
    // Create FormData to send as file
    const formData = new FormData();
    formData.append('audio_file', new File([blob], 'list_medicines.wav', { type: 'audio/wav' }));

    // Send to backend (update URL as needed)
    const res = await fetch('http://localhost:8000/awaaz-command', {
      method: 'POST',
      body: formData,
    });
    console.log("Response from server:", res);
    const data = await res.json();
    // alert(JSON.stringify(data, null, 2)); // Removed alert as it's handled by parent
    if (onResponseReceived) {
      onResponseReceived(data);
    }
  };
  return (
    <button onClick={handleSendAudio}>
      Send "Add cetrizine" Audio Command
    </button>
  );
};

export default AddMedicineCommand;
