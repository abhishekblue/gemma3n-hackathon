import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alert } from 'react-native';

interface Medicine {
  name: string;
  dosage: string;
  times: string[]; // Example: ["18:30", "21:00"]
}


export async function scheduleRemindersForMedicine(medicine: Medicine) {
  if (Platform.OS === 'web') {
    console.warn('Notifications are not supported on web platforms.');
    return;
  }

  try {
    // ✅ Check and request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.error('Notification permissions not granted!');
      Alert.alert("Permission Denied", "Notification permissions were not granted. Please enable them in your device settings to receive medicine reminders.");
      return;
    }

    for (const timeString of medicine.times) {
      try {
        const [hourStr, minuteStr] = timeString.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);

        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(hour, minute, 0, 0);

        if (targetTime > now) {
          const secondsUntilTarget = Math.floor((targetTime.getTime() - now.getTime()) / 1000);

          await Notifications.scheduleNotificationAsync({
            identifier: `${medicine.name}-today-${timeString}`,
            content: {
              title: 'Medicine Reminder',
              body: `Time for your ${medicine.name}, ${medicine.dosage}.`,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsUntilTarget,
              repeats: false,
            },
          });
          console.log(`Scheduled TODAY'S reminder for ${medicine.name}`);
        }

        await Notifications.scheduleNotificationAsync({
          identifier: `${medicine.name}-daily-${timeString}`,
          content: {
            title: 'Medicine Reminder',
            body: `Time for your ${medicine.name}, ${medicine.dosage}.`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
        console.log(`Scheduled DAILY reminder for ${medicine.name} at ${timeString}`);
      } catch (scheduleError) {
        console.error(`Error scheduling reminder for ${medicine.name} at ${timeString}:`, scheduleError);
        Alert.alert("Error", `Failed to schedule a reminder for ${medicine.name} at ${timeString}.`);
      }
    }
  } catch (error) {
    console.error('Error in scheduleRemindersForMedicine:', error);
    Alert.alert("Error", "An unexpected error occurred while trying to schedule reminders. Please try again.");
  }
}
