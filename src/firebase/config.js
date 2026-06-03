import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB88y0-oj3z0cO3NCWBlPgFSi7hYepn1do",
  authDomain: "connektin-staging.firebaseapp.com",
  projectId: "connektin-staging",
  storageBucket: "connektin-staging.firebasestorage.app",
  messagingSenderId: "468026290326",
  appId: "1:468026290326:web:0736f79a9cbd56b11712b7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
