import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }

      if (firebaseUser) {
        setUser(firebaseUser);
        // Real-time profile listener — updates profile everywhere instantly
        profileUnsub = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
          if (snap.exists()) setProfile(snap.data());
        });
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  async function fetchProfile(uid) {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        setProfile(snap.data());
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }

  async function login(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  }

  async function signup(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;
    const isTherMite = sessionStorage.getItem("ref") === "thermite";
    const newProfile = {
      uid, email, displayName, isTherMite,
      industry: null,
      subscriptionStatus: "free_trial",
      trialStartDate: serverTimestamp(),
      trialEndDate: null,
      plan: "trial",
      tier: isTherMite ? "thermite" : "regular",
      userType: isTherMite ? "thermite" : "seeker",
      createdAt: serverTimestamp(),
      onboardingComplete: false,
      onboardingDone: false,
      jobPostCount: 0,
      savedJobs: [],
      readArticles: [],
      readCounts: { beginner: 0, intermediate: 0, advanced: 0 },
    };
    await setDoc(doc(db, "users", uid), newProfile);
    setProfile(newProfile);
    sessionStorage.removeItem("ref");
    return result;
  }

  // Google Sign-In — signInWithPopup on ALL devices
  // signInWithRedirect is broken on mobile browsers in Firebase v9+
  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    await ensureProfile(result.user);
    return result;
  }

  async function ensureProfile(firebaseUser) {
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const isTherMite = sessionStorage.getItem("ref") === "thermite";
      const newProfile = {
        uid:                firebaseUser.uid,
        email:              firebaseUser.email || "",
        displayName:        firebaseUser.displayName || firebaseUser.phoneNumber || "User",
        photoURL:           firebaseUser.photoURL || null,
        isTherMite,
        industry:           null,
        subscriptionStatus: "free_trial",
        trialStartDate:     serverTimestamp(),
        trialEndDate:       null,
        plan:               "trial",
        tier:               isTherMite ? "thermite" : "regular",
        userType:           isTherMite ? "thermite" : "seeker",
        createdAt:          serverTimestamp(),
        onboardingComplete: false,
        onboardingDone:     false,
        jobPostCount:       0,
        savedJobs:          [],
        readArticles:       [],
        readCounts:         { beginner: 0, intermediate: 0, advanced: 0 },
      };
      await setDoc(ref, newProfile);
      setProfile(newProfile);
      sessionStorage.removeItem("ref");
    }
  }

  async function sendOTP(phoneNumber, recaptchaContainerId) {
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: "invisible" });
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return confirmationResult;
  }

  async function verifyOTP(confirmationResult, otp) {
    const result = await confirmationResult.confirm(otp);
    await ensureProfile(result.user);
    return result;
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  function isTrialActive() {
    if (!profile) return false;
    if (profile.subscriptionStatus !== "free_trial") return false;
    if (!profile.trialStartDate) return true;
    const start = profile.trialStartDate.toDate?.() || new Date(profile.trialStartDate);
    const diffDays = (new Date() - start) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }

  function isSubscribed() {
    return profile?.subscriptionStatus === "active";
  }

  async function patchProfile(updates) {
    setProfile(prev => prev ? { ...prev, ...updates } : updates);
    if (user?.uid) {
      try {
        await updateDoc(doc(db, "users", user.uid), updates);
      } catch (err) {
        console.error("patchProfile Firestore write failed:", err);
      }
    }
  }

  const value = {
    user, profile, setProfile, loading,
    login, signup, logout, resetPassword,
    fetchProfile, patchProfile,
    isTrialActive, isSubscribed,
    loginWithGoogle,
    handleRedirectResult: () => {},
    sendOTP, verifyOTP, ensureProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
