import fs from "fs";
import { parse } from "csv-parse/sync";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importCSV(filename, collectionName) {
  console.log(`Importing ${filename} to ${collectionName}...`);
  if (!fs.existsSync(filename)) {
    console.warn(`File ${filename} not found, skipping.`);
    return;
  }
  const content = fs.readFileSync(filename, "utf-8");
  const records = parse(content, { columns: true, skip_empty_lines: true });

  for (const record of records) {
    const id = record.id;
    const docRef = id ? doc(db, collectionName, id) : doc(collection(db, collectionName));
    
    await setDoc(docRef, record);
  }
  console.log(`Finished ${filename}. Imported ${records.length} records.`);
}

async function main() {
  await importCSV("programs-export-2026-04-14_21-25-04.csv", "programs");
  await importCSV("approval_history-export-2026-04-14_21-24-28.csv", "approval_history");
  await importCSV("user_roles-export-2026-04-14_21-26-24.csv", "user_roles");
  await importCSV("user_addresses-export-2026-04-14_21-26-05.csv", "user_addresses");
  await importCSV("trips-export-2026-04-14_21-25-17.csv", "trips");
  await importCSV("mileage_vouchers-export-2026-04-14_21-24-41.csv", "mileage_vouchers");
  await importCSV("profiles_approver_view-export-2026-04-14_21-25-42.csv", "profiles_approver_view");
  await importCSV("profiles-export-2026-04-14_21-26-45.csv", "profiles");

  console.log("\n🎉 All imports complete!");
  process.exit(0);
}

main().catch(console.error);