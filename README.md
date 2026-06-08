![Expo](https://img.shields.io/badge/Expo-000000?logo=expo)
![React Native](https://img.shields.io/badge/React_Native-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)
![Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?logo=google)

# ChoiceCraft

AI-Powered Decision Making Assistant built with Expo, React Native, Gemini AI, and Supabase.

## Overview

ChoiceCraft is a mobile application designed to help users make informed decisions through AI-assisted analysis. Instead of relying solely on intuition, users can organize their options, evaluate different factors, and receive intelligent recommendations powered by Google's Gemini AI.

The application combines structured decision-making with artificial intelligence to provide insights, comparisons, and recommendations for everyday choices.

## Features

* AI-powered decision analysis using Gemini
* Create and manage decision scenarios
* Compare multiple options efficiently
* Personalized recommendations and reasoning
* Secure user authentication
* Cloud synchronization with Supabase
* Interactive and intuitive mobile interface
* Cross-platform support through Expo

## Tech Stack

### Frontend

* React Native
* Expo
* TypeScript

### Backend & Services

* Supabase
* Supabase Authentication
* Supabase Database

### Artificial Intelligence

* Google Gemini API

### Navigation & State Management

* React Navigation
* React Context API

## Architecture

```text
User
  │
  ▼
React Native (Expo)
  │
  ├── UI Components
  ├── Decision Management
  ├── Navigation
  │
  ├──────────────► Gemini API
  │                 │
  │                 ▼
  │          AI Recommendations
  │
  ▼
Supabase
  ├── Authentication
  ├── User Data
  └── Decision Storage
```

## Project Structure

```text
ChoiceCraft
│
├── assets/                  # Images, icons, and static resources
├── components/              # Reusable UI components
├── constants/               # Application constants
├── lib/                     # Supabase integrations and services
├── navigation/              # Navigation configuration
│
├── App.tsx                  # Root application component
├── index.js                 # Entry point
├── app.config.js            # Expo configuration
├── eas.json                 # EAS build configuration
└── package.json             # Dependencies and scripts
```

## Key Components

### Decision Management

Handles creation, organization, and evaluation of user decisions.

### AI Assistant

Processes decision data through Gemini AI to generate recommendations and insights.

### Authentication

Provides secure sign-in and account management through Supabase Authentication.

### Cloud Sync

Stores and synchronizes user data using Supabase.

## Installation

### Prerequisites

* Node.js (18+ recommended)
* npm
* Expo CLI
* Gemini API Key
* Supabase Project

### Clone Repository

```bash
git clone https://github.com/Hitorido/ChoiceCraft.git
cd ChoiceCraft
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Start Development Server

```bash
npx expo start
```

## Screenshots

Add screenshots here after deployment.

```md
![Home Screen](screenshots/home.png)

![Decision Analysis](screenshots/analysis.png)

![AI Recommendation](screenshots/recommendation.png)
```

## Future Enhancements

* Decision history analytics
* Collaborative decision making
* AI-generated pros and cons
* Advanced decision scoring
* Export and sharing capabilities
* Decision outcome tracking

## Learning Outcomes

This project demonstrates:

* Mobile application development with React Native
* Expo application architecture
* Integration of Generative AI APIs
* Authentication and cloud services using Supabase
* Component-based UI design
* TypeScript development practices
* State management using React Context

## License

This project is available for educational and portfolio purposes.

## Author

**Gemver Harry Santos**

GitHub: https://github.com/Hitorido
