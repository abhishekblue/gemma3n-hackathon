# TITLE: 
Awaaz: The Voice-First, Offline AI Health Companion for the Blind


# URL:
awaaz-offline-ai-health-companion


# SUBTITLE:
Voice-first, private medicine management and wellness assistant built for blind and low-vision users, works 100% offline.


# PRODUCT DESCRIPTION:

- Problem & Vision
- Solution Overview
- How It Works / Technical Architecture
- How You Used Gemma 3n
- Key Features & User Experience
- Challenges & Innovations
- Impact & Future Vision


### Problem:
According to the World Health Organization, there are at least 43 million people worldwide who are blind and an additional 295 million with moderate to severe vision impairment that cannot be corrected with glasses or contact lenses [(WHO, 2022)](https://www.who.int/news-room/fact-sheets/detail/blindness-and-visual-impairment)
In India alone, recent research estimates that 2.4 million people are blind and over 21 million are visually impaired [(The Lancet Global Health, 2024)](https://www.thelancet.com/journals/langlo/article/PIIS2214-109X(24)00035-4/fulltext)

Despite advances in technology, millions of blind and low-vision individuals face daily challenges in managing their health and independence:

- Missed or mistimed medicines, which can lead to serious health risks.

- Unlabeled buttons and poor accessibility in apps, making even simple digital tasks frustrating or impossible.

- Bad or incomplete accessibility features in mainstream technology, especially when it comes to health management.

- Unreliable or unavailable internet, especially in rural or low-income regions—leaving most AI-powered tools useless for those who need them most.

- Lack of AI-powered, voice-first health tools specifically built for the blind, that also work fully offline and prioritize user privacy.

From our direct conversations with NGOs and community organizations, we’ve seen firsthand how these barriers create anxiety, reduce independence, and put lives at risk—especially for those with little tech support or family assistance.


### Solution & Overview:
Awaaz is a voice-first, offline AI health companion designed for blind and low-vision individuals. The app enables users to manage their medicines independently, with every interaction powered by natural speech—removing barriers created by inaccessible interfaces or unreliable connectivity.

**How does it work?**

A user simply opens the app and uses their voice to add a new medicine or to hear their current medicine list. All medicine-related data is handled entirely offline, ensuring complete privacy. While medicine reminders are currently delivered through standard notifications, core actions—like adding or listing medicines—are already accessible and intuitive for those who cannot see or navigate typical app UIs. In future releases, Awaaz will also offer voice-based reminders and confirmation, so users can interact with every step by voice alone.

**What makes Awaaz different?**

Unlike general-purpose voice assistants like Google Assistant, Siri, or Alexa—which depend on constant internet access and were not designed with accessibility or privacy as a priority—Awaaz works 100% offline using on-device AI (Gemma 3n via Ollama or compatible Jetson backend). This approach offers:
    
- Voice-driven medicine management: Add and list medicines using natural language.

- Fully offline operation: All features work without any internet connection, ensuring privacy and accessibility even in rural or low-connectivity environments.

- Medicine reminders: Automated notifications support routine and safety (with voice-based reminders and confirmations planned for upcoming releases).

- Peer-to-peer architecture: The AI runs on a second device (Laptop/PC or Jetson), connecting directly without internet or router.

- Support for native languages: Planned for future updates, expanding accessibility beyond English and tailored for India’s linguistic diversity.

- Privacy-first: All voice processing and data storage happen locally.

### How It Works / Technical Architecture
Awaaz is engineered for maximum accessibility, privacy, and true offline operation—delivering the power of AI to users without any dependency on internet connectivity or cloud services.

#### Frontend:

Built in React Native with Expo for cross-platform flexibility and rapid accessibility improvements.

The mobile app handles all user interaction—adding medicines, retrieving medicine lists, and (in future releases) managing reminders—entirely through voice.

#### Backend (“Awaaz Engine”):

Powered by a FastAPI Python server, running locally on a PC (for demo and MVP purposes).

In the future, this architecture could be extended to edge devices like NVIDIA Jetson for full portability.

The mobile app connects to the backend via Wi-Fi hotspot (peer-to-peer) no router or internet required. For development and testing, this can be as simple as scanning the Expo QR code to establish the link.

#### AI Stack:

Speech-to-Text (STT): Uses the open-source Vosk engine for real-time, offline transcription of user voice commands.

Text-to-Speech (TTS): Piper-TTS to provide clear, human-like feedback, ensuring a completely eyes-free experience.

Gemma 3n Integration: Although Gemma 3n does not currently support native audio input/output, it powers the app’s natural language understanding and medicine management logic via local API calls. Future updates will incorporate Unsloth finetuning for direct voice interaction and multilingual capability, all performed offline.

#### Data Storage & Security:

All user data (medicines, reminders, and logs) are stored securely and locally on the user’s device.

No data is ever uploaded or sent to the cloud—ensuring complete privacy by design.

#### Notification & Accessibility:

Medicine reminders are currently delivered via Expo’s native notification system for simplicity and reliability.

The UI and all user flows are designed for full screen-reader compatibility and zero reliance on unlabeled buttons or inaccessible controls.

#### Cool Extras:

The entire system is modular, allowing for easy adaptation to new languages and deployment to other platforms (e.g., Raspberry Pi, Jetson) in the future.

Planned support for native Indian languages will further expand accessibility, bringing truly personalized healthcare management to millions more.

### How I Used Gemma 3n
Gemma 3n is at the heart of Awaaz’s intelligence and user experience.
Here’s how it powers the app and why it was the right choice for this mission:

**Voice Interaction Pipeline:** \
When the user speaks, their voice command is transcribed locally using Vosk (STT). The resulting text is then sent to the Gemma 3n model, which interprets the user’s intent, processes the request, and generates a plain-language response. This response is converted back to speech (TTS) and delivered to the user, completing a seamless voice-driven loop—entirely offline.

**Prompt Engineering and Understanding:** \
Prompt engineering was used to make Gemma 3n understand domain-specific requests like adding or listing medicines, handling confirmations, and managing conversational context. The model is instructed to extract key details such as medicine name, dosage, and timing from the user’s natural language input, even if information is spoken out of order or with uncertainty. If the model detects any missing or ambiguous details, the app prompts the user to clarify, ensuring complete and accurate medicine records.

All instructions are framed to be accessible and clear for blind users, with special focus on common errors, repeated inputs, and robust handling of incomplete or ambiguous voice commands.

**Why Gemma 3n?** \
Gemma 3n was chosen because it is designed to run efficiently on consumer devices, including mobile phones and low-power hardware, without needing a cloud server or high-end GPU. Its lightweight architecture and support for local inference are ideal for rural and privacy-focused scenarios, where other LLMs (like GPT-4 or Gemini) would be unusable. Gemma 3n also offers better customization and offline operation, which matches the needs of blind users who depend on 24/7 access with no reliance on internet or external services.

**Challenges and Engineering:** \
Integrating Gemma 3n with the offline voice stack required custom routing between STT, the LLM, and TTS, along with prompt tuning for medicine-specific tasks. Although direct voice input via Unsloth and true multilingual capability were planned, these remain on the roadmap for future releases.

**Planned Future Use:** \
As Gemma 3n continues to evolve, Awaaz will incorporate finetuning via Unsloth for more natural and accurate voice understanding, full support for native Indian languages, and potentially multimodal interaction for an even richer user experience—all fully offline.

## Key Features & User Experience
Awaaz is designed from the ground up for blind and low-vision users, with every feature focused on independence, privacy, and ease of use.

#### Core Features Available Now:

**Voice-Driven Medicine Management:** \
Users can add new medicines and check their current medicine list using simple, natural language—no screen-tapping or visual menus needed.

**Structured Data Extraction:**
The app intelligently extracts medicine name, dosage, and timing from what the user says, prompting for any missing details to ensure complete accuracy.

**Offline Privacy:**
All features work entirely offline. No health data ever leaves the user’s devices, and there’s no need for cloud or internet—making Awaaz reliable even in rural areas.

**Instant Notifications:**
Users receive local, device-based reminders for upcoming medicines. These notifications do not require any online account or connection.

**Accessible by Design:**
Every interaction is voice-first, with clear, human-like feedback. The interface avoids unlabeled buttons and is fully compatible with screen readers for those who wish to use them.

#### Planned & Upcoming Features:

**Voice-Based Reminders & Confirmation:** \
In future versions, users will receive spoken reminders (“It’s time for your 5mg insulin”), and be able to confirm medicine intake by voice, closing the loop for total hands-free safety.

**Support for Native Languages:** \
Upcoming releases will add native language support, making Awaaz accessible to users across India and beyond.

**Customizable Notificatio and Schedules:** \
More flexible reminder settings, tailored to individual routines and complex medicine regimens.

**Expanded AI Empathy:** \
Plans to incorporate gentle, supportive conversation features inspired by mental health companions, so every user feels truly understood and cared for.

**User Journey Example:** \
A typical user launches the app, speaks the name and details of a new medicine, and receives instant feedback—either a confirmation or a polite follow-up question for any missing info. The app then takes care of reminding the user at the correct time, and soon will support spoken confirmations for added safety and peace of mind.

## Challenges & Innovations (editing needed)
Building Awaaz meant navigating unique obstacles rarely faced in mainstream app development. Our journey surfaced unexpected technical, accessibility, and social challenges—each driving innovation in the way only a mission-focused project can.

Offline Speech Recognition for All:
Achieving reliable, truly offline speech-to-text in Indian environments was a technical wall. Whisper STT, our first choice, proved too resource-hungry for affordable devices. Vosk, though lighter, still faces challenges with strong accents and background noise. Instead of relying on the cloud, we persevered to deliver a voice-first experience that is robust, local, and accessible—demonstrating how real-world constraints can breed real-world innovation.

Accessibility Lessons from the Community:
During discovery interviews with a blind 18-year-old computer science student, we heard stories that mainstream developers often ignore: many so-called “accessible” apps have unlabeled buttons, give no feedback when things go wrong, and leave visually impaired users stranded if the app crashes or hangs. This insight shaped our relentless focus on audible error reporting, zero visual-only controls, and a promise that Awaaz will never go “silent.” It reminded us that building for accessibility is not just about following guidelines, but about empathetic, user-led engineering.

Peer-to-Peer, Internet-Free Architecture:
Designing an AI-powered solution that runs with zero reliance on the internet—especially in rural or low-income regions—required creative problem solving. Our use of direct Wi-Fi hotspot connections and local-only data storage ensures privacy and independence, but also required us to rethink everything from onboarding to device pairing, making Awaaz uniquely resilient where others fail.

Turning Constraints into Features:
Many of our technical limits became defining features. Gemma 3n’s ability to run on low-power devices, combined with entity extraction and prompt engineering, gave us a robust health assistant that respects privacy and never leaks sensitive information. Every barrier forced us to innovate—whether it was adapting local notifications for reminders or designing workflows that make the user feel heard, not just processed.

A Roadmap Built by Real Needs:
Suggestions from the visually impaired community have shaped our vision: uploading a prescription for instant medicine info, reading medicine labels, making X-ray reports accessible, and offering large-text/high-contrast modes for those with low vision. We plan to partner with real users as testers and co-creators, ensuring Awaaz keeps growing with the people it serves.

## Impact & Future Vision
Awaaz exists to ensure that technology becomes a bridge—not a barrier—to independence, especially for individuals who are blind or low-vision. It puts accessible AI health support directly in the hands of those who need it most—without internet, without compromise.

A message from leaders: As Google CEO Sundar Pichai emphasized in his [2024 UN Summit of the Future](https://blog.google/inside-google/message-ceo/united-nations-keynote-2024/?utm_source=chatgpt.com) keynote, _“AI is poised to accelerate progress at unprecedented scale”_ and must not become another divide between those with access and those without. He and Google are investing billions in AI education, digital skills, and accessibility to ensure everyone benefits—especially underserved communities.

This aligns perfectly with Awaaz’s mission: delivering privacy-first, offline AI that empowers users anywhere.

>“We didn’t choose this setup to be clever—we chose it because this is what real people actually have. The architecture wasn’t optimized for benchmarks. It was optimized for reality.”

This mindset defines our roadmap:

Immediate Impact: Awaaz simplifies medicine routines and builds independence for blind users through real voice-first interactions—all while preserving privacy and bypassing connectivity limitations.

Dream-Growth Vision:

Imagine Awaaz as a “Jarvis-like” AI OS tailored for persons with disabilities: reading prescriptions, labelling medicine, offering mental wellness support, and speaking in users’ native languages.

We plan a future of voice-based reminders, multilingual UI, empathetic AI personalities, and multimodal accessibility, built in collaboration with visually impaired communities and NGOs.

Scaling with Community: By maintaining a rigorous feedback loop with aspiring beta testers (such as the blind CS student from earlier interviews), Awaaz will continue to evolve. Future features like prescription uploading, document reading, and assistive haptic/human voice channels will be added based on real needs—not speculation.