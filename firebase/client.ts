// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAzoC5XLMACGj198OCVz9S6bIz4ScygFFQ",
  authDomain: "ai-interview-96d9b.firebaseapp.com",
  projectId: "ai-interview-96d9b",
  storageBucket: "ai-interview-96d9b.firebasestorage.app",
  messagingSenderId: "501497679705",
  appId: "1:501497679705:web:4e28ff00a198bd97d7c648",
  measurementId: "G-L4T5JGE7J9"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);