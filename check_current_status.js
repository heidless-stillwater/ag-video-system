const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const serviceAccount = require(path.join(process.cwd(), 'service-account.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore('autovideo-db-0');

async function checkProject() {
  const projectId = 'CK6YN18G1ImuxhlErv1h';
  const doc = await db.collection('projects').doc(projectId).get();
  
  if (!doc.exists) {
    console.log('Project not found');
    return;
  }
  
  const data = doc.data();
  console.log('--- Project Status ---');
  console.log(`Status: ${data.status}`);
  console.log(`Progress: ${data.renderProgress}%`);
  console.log(`Message: ${data.renderMessage}`);
  console.log(`Updated: ${data.updatedAt?.toMillis()}`);
}

checkProject().catch(console.error);
