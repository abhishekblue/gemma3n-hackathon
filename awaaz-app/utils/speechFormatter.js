const intro_templates = [
  "Okay, here are your current medications: {medicine_list}.",
  "Here is the list of medicines you're taking: {medicine_list}.",
  "Let's review your medicines. You currently have: {medicine_list}."
];

const empty_templates = [
  "It looks like you haven't added any medicines yet.",
  "Your medicine list is currently empty."
];

// Helper function to convert 24-hour HH:MM to a more natural speech format
const formatTimeForSpeech = (time24hr) => {
  const [hours, minutes] = time24hr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes === 0 ? '' : ` ${minutes}`; // Only add minutes if not 00

  return `${displayHours}${displayMinutes} ${ampm}`;
};

export const formatMedicineSpeech = (medicines) => {
  if (medicines.length === 0) {
    const randomIndex = Math.floor(Math.random() * empty_templates.length);
    return empty_templates[randomIndex];
  } else {
    const medicineStrings = medicines.map(medicine => {
      const formattedTimes = medicine.times.map(formatTimeForSpeech);
      const timesString = formattedTimes.length > 0 ? `at ${formattedTimes.join(" and ")}` : "at unspecified times";
      return `${medicine.name} with a strength of ${medicine.strength} to be taken ${timesString}`;
    });

    let medicineListString;
    if (medicineStrings.length === 1) {
      medicineListString = medicineStrings[0];
    } else if (medicineStrings.length === 2) {
      medicineListString = `${medicineStrings[0]} and ${medicineStrings[1]}`;
    } else {
      medicineListString = `${medicineStrings.slice(0, -1).join(", ")}, and ${medicineStrings[medicineStrings.length - 1]}`;
    }

    const randomIndex = Math.floor(Math.random() * intro_templates.length);
    return intro_templates[randomIndex].replace("{medicine_list}", medicineListString);
  }
};
