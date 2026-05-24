# Tiny Thali AI App

This is a Next.js application built with React, ShadCN UI, Tailwind CSS, and Genkit for AI-powered to generate toddler recipes and plan weekly meals.


## Getting Started Locally

Once you have downloaded the code, follow these steps to run it on your machine:

### 1. Prerequisites
- Install [Node.js](https://nodejs.org/) (v18 or higher recommended).
- A Firebase project with Firestore and Authentication enabled.

### 2. Install Dependencies
In your terminal, run:
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory and add your Firebase and Google AI credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
GEMINI_API_KEY=your_google_ai_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. AI Flow Testing (Genkit)
To test and debug the AI flows using the Genkit Developer UI:
```bash
npm run genkit:dev
```
