import React, { useEffect } from 'react';
import { Button } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';


const TestNotificationButton: React.FC = () => {
  useEffect(() => {
    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
      }
    })();
  }, []);

  const scheduleTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Awaaz Reminder",
        body: "This is a daily test notification wohoo!",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 17,
        minute: 32,
      },
    });
    alert('Daily notification scheduled');
  };
  const allScheduled = async () => {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log("📋 All Scheduled Notifications:\n", JSON.stringify(allScheduled, null, 2));
  };

  const cancelNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("✅ All scheduled notifications cancelled.");
  }

  // This function clears all keys/values in AsyncStorage!
  const clearAllStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('✅ All local data cleared from AsyncStorage.');
    } catch (e) {
      console.error('❌ Failed to clear storage:', e);
    }
  };

  return (
    <>
    <Button title="Schedule Notification" onPress={scheduleTestNotification} />
    <Button title="Cancel All Notifications" onPress={cancelNotifications}
    color="#990000"
    />
    <Button title="Get All Scheduled Notifications" onPress={allScheduled} color="#009900"/>
    <Button title="Clear All Storage" onPress={clearAllStorage} color="#990099"/>
    </>
  );
};

export default TestNotificationButton;
