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

async function checkFirstSectionCues() {
  const projectId = 'CK6YN18G1ImuxhlErv1h';
  const doc = await db.collection('projects').doc(projectId).get();
  const data = doc.data();
  const scriptId = data.currentScriptId;
  
  if (!scriptId) {
    console.log('Script ID not found');
    return;
  }

  const scriptDoc = await db.collection('scripts').doc(scriptId).get();
  const script = scriptDoc.data();
  
  const section = script.sections[0];
  console.log('--- First Section ---');
  console.log(`Title: ${section.title}`);
  console.log(`Estimated Duration: ${section.estimatedDuration}`);
  console.log(`Audio URL: ${section.audioUrl}`);
  
  console.log('--- Visual Cues ---');
  section.visualCues.forEach((cue, idx) => {
    console.log(`Cue ${idx}: ID=${cue.id}, TS=${cue.timestamp}, Type=${cue.type}, Dur=${cue.duration}`);
  });
}

checkFirstSectionCues().catch(console.error);
