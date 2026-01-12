/*
Firestore migration script (Node + Firebase Admin SDK)
Purpose: create a 'schools' collection, insert a default school document, and set 'schoolId' on existing documents
(Users, masterSchedules, lessonSchedules, eskulSchedules, absenceRecords).

SAFE BEHAVIOR:
 - Uses a single pass to assign existing documents to the default school.
 - Leaves documents that already have schoolId untouched.
 - Does NOT delete or modify other fields.
 - Designed to be idempotent: re-running will not duplicate or harm data.

USAGE:
 - Run with Node on a machine that has Firebase Admin credentials with write access to Firestore.
 - Example: node migrations/001_add_schools_and_school_id_firestore.js
*/

import admin from 'firebase-admin';

// Load your service account key or rely on GOOGLE_APPLICATION_CREDENTIALS env var
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

async function ensureDefaultSchool() {
  const schoolsCol = db.collection('schools');
  const defaultSlug = 'default';
  const q = await schoolsCol.where('slug', '==', defaultSlug).limit(1).get();
  if (!q.empty) {
    return { id: q.docs[0].id, ...q.docs[0].data() };
  }
  const newDocRef = schoolsCol.doc();
  const payload = {
    name: 'Sekolah Utama',
    slug: defaultSlug,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {},
  };
  await newDocRef.set(payload);
  return { id: newDocRef.id, ...payload };
}

async function patchCollectionWithSchoolId(collectionName: string, defaultSchoolId: string) {
  const col = db.collection(collectionName);
  const snapshot = await col.get();
  const batch = db.batch();
  let ops = 0;
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (!('schoolId' in data) || !data.schoolId) {
      batch.update(docSnap.ref, { schoolId: defaultSchoolId });
      ops++;
    }
  });
  if (ops > 0) {
    console.log(`Updating ${ops} docs in ${collectionName}`);
    await batch.commit();
  } else {
    console.log(`No update required for ${collectionName}`);
  }
}

async function run() {
  console.log('Starting Firestore migration: add schools + schoolId');
  const school = await ensureDefaultSchool();
  console.log('Default school id:', school.id);

  const collectionsToPatch = ['users', 'masterSchedules', 'lessonSchedules', 'eskulSchedules', 'absenceRecords', 'classes'];
  for (const c of collectionsToPatch) {
    const colExists = (await db.collection(c).limit(1).get()).size >= 0; // always true; kept for symmetry
    try {
      await patchCollectionWithSchoolId(c, school.id);
    } catch (err) {
      console.warn(`Failed patching ${c}:`, err.message || err);
    }
  }

  console.log('Migration completed. Please verify your Firestore data.');
}

run().catch(err => { console.error('Migration failed', err); process.exit(1); });
