# Awaaz - Voice Assistant for Blind Users

A fully offline voice assistant application designed specifically for blind and visually impaired users. Built for accessibility and ease of use with audio feedback and voice commands.

## 🎯 Project Overview

**Awaaz** is a 2-device voice assistant system that helps blind users interact with technology through voice commands and audio responses. The app provides medicine reminders, habit tracking, and empathetic conversations.

### Architecture
- **Frontend**: Expo React Native (Mobile App)
- **Backend**: FastAPI (PC/Laptop)
- **Connection**: Local hotspot network (Fully Offline)
- **Target Users**: Blind and visually impaired individuals

## 🚀 Features

- **Voice Commands**: Natural language processing for user commands
- **Audio Feedback**: Text-to-speech responses and audio cues
- **Medicine Reminders**: Medication timing and notification system
- **Habit Tracking**: Daily habit monitoring with voice input
- **QR Code Setup**: Automatic network configuration between devices
- **Accessibility First**: Designed specifically for screen reader compatibility

## 📋 Prerequisites

### Backend (PC/Laptop)
- Python 3.8+
- FastAPI
- Uvicorn
- Required Python packages (see `requirements.txt`)

### Frontend (Mobile)
- Node.js 16+
- Expo CLI
- React Native development environment
- Android/iOS device or emulator

## 🛠️ Installation & Setup

### Backend Setup (PC/Laptop)

1. **Clone the repository**
   ```bash
   git clone https://github.com/abhishekblue/gemma3n-hackathon.git
   cd gemma3n-hackathon
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI backend**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

4. **Note the displayed IP address** - it will show a QR code for easy mobile connection

### Frontend Setup (Mobile)

1. **Navigate to the app directory**
   ```bash
   cd awaaz-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the Expo development server**
   ```bash
   expo start
   ```

4. **Connect your mobile device** via Expo Go app or development build

## 📱 Usage Instructions

### For Hackathon Judges/Demo

1. **Setup Backend**: Start the FastAPI server on your laptop
2. **Connect Mobile**: Open the Awaaz app on your mobile device
3. **QR Code Setup**: Scan the QR code displayed by the backend to auto-configure connection
4. **Test Voice Commands**: Tap the microphone button and speak commands
5. **Experience Audio Feedback**: Listen to the app's spoken responses

### Voice Commands Examples
- "Remind me to take medicine at 8 AM"
- "What are my daily habits?"
- "How am I doing today?"
- "Set a reminder for tomorrow"

## 🔧 Technical Architecture

```
┌─────────────────┐    Local Hotspot    ┌──────────────────┐
│   Mobile App    │ ◄─────────────────► │   PC/Laptop      │
│  (React Native) │    QR Code Setup    │   (FastAPI)      │
│                 │                     │                  │
│ - Voice Input   │                     │ - Audio Process  │
│ - Audio Output  │                     │ - AI Responses   │
│ - UI/UX         |                     |                  |
| - Data Storage  |                     │                  │
└─────────────────┘                     └──────────────────┘
```

## 📂 Project Structure

```
gemma3n-hackathon/
├── awaaz-app/                 # React Native frontend
│   ├── components/           
│   │   ├── VoiceCommandButton.tsx
│   │   ├── AddMedicineCommand.js
│   │   └── HabitTable.tsx
│   ├── assets/sounds/        # Audio files
│   └── App.js
├── backend/                  # FastAPI backend
│   ├── main.py
│   ├── audio_processing.py
│   └── requirements.txt
└── README.md
```

## 🎵 Audio Assets

Ensure these audio files are present in `awaaz-app/assets/sounds/`:
- `ding.mp3` - Recording start sound
- `ending.mp3` - Converstaion finished sound
- `processing.mp3` - Processing feedback sound

## 🌐 Network Configuration

The app uses **automatic IP detection** and **QR code setup**:

1. Backend auto-detects its IP address on the local network
2. Generates a QR code with connection details
3. Mobile app scans QR code to automatically configure API endpoint
4. No manual IP address entry required

## 🔒 Offline Operation

This application is designed to work **completely offline**:
- No internet connection required
- All processing happens locally
- Data stored on local devices
- Perfect for privacy-conscious users

## 🏆 Hackathon Submission

This project is designed for easy evaluation:
- **Quick Setup**: QR code eliminates manual configuration
- **Clear Demo Flow**: Voice commands → Audio responses
- **Accessibility Focus**: Built for blind users from ground up
- **Offline First**: No external dependencies

## 🛟 Troubleshooting

### Common Issues

1. **Connection Failed**: Ensure both devices are on the same hotspot network
2. **Audio Not Playing**: Check device volume and audio permissions
3. **QR Code Not Working**: Manually set API URL in the mobile app
4. **Backend Not Starting**: Check if port 8000 is available

### Debug Commands
```bash
# Check backend status
curl http://YOUR_IP:8000/health

# View backend logs
uvicorn main:app --host 0.0.0.0 --port 8000 --log-level debug
```

## 👥 Contributing

This is a hackathon project, but contributions for accessibility improvements are welcome.

## 📄 License

MIT License - Feel free to use this project to help the visually impaired community.

**Made with ❤️ for accessibility and inclusion**

*Empowering blind users through voice technology*