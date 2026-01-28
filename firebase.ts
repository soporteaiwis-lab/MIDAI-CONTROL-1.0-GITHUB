import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// --------------------------------------------------------
// IMPORTANT: REPLACE THIS CONFIG WITH YOUR OWN FIREBASE KEYS
// Go to console.firebase.google.com -> Create Project
// -> Web App -> Copy config
// --------------------------------------------------------
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
// We wrap in a try-catch to prevent the app from crashing if config is invalid during demo
let app;
let storage;
let isConfigured = false;

try {
    if (firebaseConfig.apiKey !== "REPLACE_WITH_YOUR_API_KEY") {
        app = initializeApp(firebaseConfig);
        storage = getStorage(app);
        isConfigured = true;
    } else {
        console.warn("Firebase config placeholders detected. Cloud features disabled.");
    }
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

export { storage, isConfigured };
