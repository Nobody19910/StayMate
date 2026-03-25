import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(json)),
      });
    }
  } catch (e) {
    console.error("[firebase-admin] init failed:", e);
  }
}

export const firebaseAdmin = admin;
