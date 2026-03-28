const { execSync } = require('child_process');
const path = require('path');

async function probeVideo() {
  const url = 'https://storage.googleapis.com/heidless-apps-0.firebasestorage.app/users/nNdenyyfKaN9yNB9Ly3vhhaHLXx1/images/1774029865594-fhhwpm.mp4';
  try {
    const ffprobePath = path.join(process.cwd(), 'node_modules/ffprobe-static/bin/linux/x64/ffprobe');
    const cmd = `${ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${url}"`;
    const duration = execSync(cmd).toString().trim();
    console.log(`Video Duration: ${duration}s`);
  } catch (e) {
    console.error('Probe failed:', e.message);
  }
}

probeVideo().catch(console.error);
