const intro_templates = [
  "Okay, here are your current medications: {medicine_list}.",
  "Here is the list of medicines you're taking: {medicine_list}.",
  "Let's review your medicines. You currently have: {medicine_list}."
];

const empty_templates = [
  "It looks like you haven't added any medicines yet.",
  "Your medicine list is currently empty."
];

export const formatMedicineSpeech = (medicines) => {
  if (medicines.length === 0) {
    const randomIndex = Math.floor(Math.random() * empty_templates.length);
    return empty_templates[randomIndex];
  } else {
    const medicineStrings = medicines.map(medicine => {
      return `${medicine.name} with a dosage of ${medicine.dosage} to be taken ${medicine.frequency}`;
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
