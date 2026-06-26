import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBztKU5tmt2yYCy5N0ABIjVwG9kuSXz_HU",
  authDomain: "scar-max.firebaseapp.com",
  projectId: "scar-max",
  storageBucket: "scar-max.firebasestorage.app",
  messagingSenderId: "677519848580",
  appId: "1:677519848580:web:c807a911630b3747fdbed1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;