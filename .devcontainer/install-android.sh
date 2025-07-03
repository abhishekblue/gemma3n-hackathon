#!/bin/bash
# Update and install dependencies
sudo apt-get update
sudo apt-get install -y wget unzip openjdk-17-jdk

# Set up Android SDK
export ANDROID_SDK_ROOT="/usr/local/share/android-sdk"
sudo mkdir -p $ANDROID_SDK_ROOT
sudo chown -R codespace $ANDROID_SDK_ROOT

# Download and install command line tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
unzip cmdline-tools.zip -d $ANDROID_SDK_ROOT/cmdline-tools
mv $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/latest
rm cmdline-tools.zip

# Set environment variables for future terminals
echo 'export ANDROID_HOME=/usr/local/share/android-sdk' >> ~/.bashrc
echo 'export ANDROID_SDK_ROOT=/usr/local/share/android-sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools' >> ~/.bashrc

# Accept licenses
yes | /usr/local/share/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses

# Install platform-tools, build-tools, and platform
/usr/local/share/android-sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "Android SDK setup complete."