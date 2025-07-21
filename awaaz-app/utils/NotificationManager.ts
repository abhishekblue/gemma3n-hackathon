import * as Notifications from 'expo-notifications';

interface Medicine {
  name: string;
  dosage: string;
  times: string[];
}

export async function scheduleRemindersForMedicine(medicine: Medicine) {
  const notificationBody = `Time for your ${medicine.name}, ${medicine.dosage}.`;

  for (const timeString of medicine.times) {
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) {
      console.warn(`Invalid time format for ${medicine.name}: ${timeString}. Skipping.`);
      continue;
    }

    // Generate a unique identifier for each notification
    const identifier = `${medicine.name}-${timeString}-${medicine.dosage}`;

    await Notifications.scheduleNotificationAsync({
      identifier: identifier,
      content: {
        title: 'Medicine Reminder',
        body: notificationBody,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: hour,
        minute: minute,
        repeats: true,
      },
    });
    console.log(`Scheduled reminder for ${medicine.name} at ${timeString}`);
  }
}
