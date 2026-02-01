const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { exec } = require('child_process');
const serviceAccount = require('./service-account.json');

const projectId = 'heidless-firebase-2';
const serviceName = 'ssrautovideov0dev';
const region = 'us-central1';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
    });
}

const db = getFirestore(admin.app(), 'autovideo-db-0');

async function getCloudRunLogs() {
    return new Promise((resolve) => {
        exec(`gcloud run services logs read ${serviceName} --region=${region} --limit=10 --format=json`, (error, stdout, stderr) => {
            if (error) {
                resolve([]);
                return;
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                resolve([]);
            }
        });
    });
}

async function monitor() {
    console.log(`Monitoring VideoSystem Render status and Cloud Run logs...`);

    let lastLogTimestamp = null;
    let renderingProjectIds = new Set();

    const interval = setInterval(async () => {
        // 1. Check Firestore for rendering projects
        const snapshot = await db.collection('projects').where('status', '==', 'rendering').get();

        if (snapshot.empty) {
            if (renderingProjectIds.size > 0) {
                console.log(`\n[Firestore] No projects currently rendering (previous projects completed or failed).`);
                renderingProjectIds.clear();
            }
        } else {
            snapshot.forEach(doc => {
                const d = doc.data();
                if (!renderingProjectIds.has(doc.id)) {
                    console.log(`\n[Firestore] NEW PROJECT RENDERING: ${doc.id} (${d.title})`);
                    renderingProjectIds.add(doc.id);
                }
                console.log(`[Firestore] ${doc.id} | Progress: ${d.renderProgress}% | Msg: ${d.renderMessage}`);
            });
        }

        // 2. Check Cloud Run Logs
        const logs = await getCloudRunLogs();
        logs.reverse().forEach(log => {
            const timestamp = log.timestamp;
            if (!lastLogTimestamp || timestamp > lastLogTimestamp) {
                const message = log.textPayload || JSON.stringify(log.jsonPayload || log);
                console.log(`[CloudRun Log] ${timestamp} | ${message}`);
                lastLogTimestamp = timestamp;
            }
        });

    }, 5000); // Check every 5 seconds
}

monitor();
