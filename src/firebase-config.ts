// Firebase web config (public by design — security is in Auth + Firestore rules).
export const firebaseConfig = {
  apiKey: 'AIzaSyCdxO1eie2KAkf73dbXMRHgU67gNnVXPDE',
  authDomain: 'family-app-71ea8.firebaseapp.com',
  projectId: 'family-app-71ea8',
  storageBucket: 'family-app-71ea8.firebasestorage.app',
  messagingSenderId: '659040936443',
  appId: '1:659040936443:web:369ea5f68f4db875552b5e',
};
// Shared family space id – both phones must use the same value.
export const FAMILY_ID = 'devilliers';
export const isFirebaseConfigured = () => !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
