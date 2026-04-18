import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgsOr1gT0z93AsJYeY8WuihkXN8S-gyYM",
  authDomain: "routetracker-92b42.firebaseapp.com",
  projectId: "routetracker-92b42",
  storageBucket: "routetracker-92b42.firebasestorage.app",
  messagingSenderId: "435769829648",
  appId: "1:435769829648:web:05353e4d5c9bea75625d95",
  measurementId: "G-YB468B9MLT"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;