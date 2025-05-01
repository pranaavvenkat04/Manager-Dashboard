// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAP17kMsBQ1IQA_kmSX96qGF1wh8uENk_4",
  authDomain: "bus-trak-d9cec.firebaseapp.com",
  databaseURL: "https://bus-trak-d9cec-default-rtdb.firebaseio.com",
  projectId: "bus-trak-d9cec",
  storageBucket: "bus-trak-d9cec.firebasestorage.app",
  messagingSenderId: "804485729710",
  appId: "1:804485729710:web:ec78f450350767336b4c3f",
  measurementId: "G-JFQ116D0PL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);