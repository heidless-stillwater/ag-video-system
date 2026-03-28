const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const serviceAccount = require(path.join(process.cwd(), 'service-account.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore(admin.app(), 'autovideo-db-0');

async function inspectScript() {
  const scriptId = 'JMjMHOaj9sMXbeH1yYoG';
  console.log(`Deep inspecting script: ${scriptId}`);
  
  const doc = await db.collection('scripts').doc(scriptId).get();
  if (!doc.exists) return console.log('Script not found');
  
  const s = doc.data();
  console.log(`Associated ProjectId: ${s.projectId}`);
  s.sections.forEach((sec, i) => {
    console.log(`Section ${i}: ${sec.title}`);
    if (sec.visualCues) {
      sec.visualCues.forEach((c, j) => {
        console.log(`  Cue ${j}: ID=${c.id} | TS=${c.timestamp}s | Video=${c.videoUrl || 'NONE'} | Duration=${c.duration || 'N/A'}`);
      });
    }
  });
}

inspectScript().catch(console.error);
