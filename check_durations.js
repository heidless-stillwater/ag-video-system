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

async function checkProjectScenes() {
  const projectId = 'CK6YN18G1ImuxhlErv1h';
  const doc = await db.collection('projects').doc(projectId).get();
  const data = doc.data();
  const scriptDoc = await db.collection('scripts').doc(data.scriptId).get();
  const script = scriptDoc.data();
  
  console.log('--- Scene Durations ---');
  script.sections.forEach((section, sidx) => {
    section.visualCues.forEach((cue, cidx) => {
      console.log(`Sec ${sidx} Cue ${cidx}: ${cue.duration}ms`);
    });
  });
}

checkProjectScenes().catch(console.error);
