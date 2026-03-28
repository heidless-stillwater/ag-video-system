const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const serviceAccount = require(path.join(process.cwd(), 'service-account.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// IMPORTANT: Use the named database as configured in firebase-admin.ts
const db = getFirestore(admin.app(), 'autovideo-db-0');

async function checkLogs() {
  const projectId = 'CK6YN18G1ImuxhlErv1h';
  console.log(`Checking logs for project: ${projectId} in database: autovideo-db-0`);
  
  try {
    const snapshot = await db.collection('analytics_logs')
      .where('projectId', '==', projectId)
      .limit(10)
      .get();
      
    if (snapshot.empty) {
      console.log('No logs found for this project in this database.');
    } else {
      console.log(`Found ${snapshot.size} logs.`);
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`[${data.timestamp?.toDate()?.toISOString() || 'NO_TS'}] Service: ${data.service} | Op: ${data.operation} | Credits: ${data.creditsDeducted}`);
        if (data.operation === 'rendering') {
          console.log(`   -> Rendering Duration: ${data.executionTimeMs}ms`);
        }
      });
    }

    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (projectDoc.exists) {
      const p = projectDoc.data();
      console.log('--- Project Details ---');
      console.log(`Status: ${p.status}`);
      console.log(`Credits Deducted: ${p.creditsDeducted}`);
      console.log(`Download URL: ${p.downloadUrl}`);
      console.log(`Render Progress: ${p.renderProgress}%`);
      console.log(`Render Message: ${p.renderMessage}`);
    } else {
      console.log('Project document NOT FOUND in this database.');
    }
  } catch (err) {
    console.error('Error during Firestore query:', err);
  }
}

checkLogs().catch(console.error);
