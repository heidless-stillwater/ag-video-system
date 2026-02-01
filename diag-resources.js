const os = require('os');
const { execSync } = require('child_process');

function getSystemPressure() {
    const load = os.loadavg()[0];
    const cores = os.cpus().length;
    return Math.min(1.0, load / cores);
}

function getRecommendedThreads() {
    const cores = os.cpus().length;
    const pressure = getSystemPressure();
    let recommended = cores - 2;
    // Check if WSL
    let isWSL = false;
    try {
        const version = execSync('cat /proc/version').toString().toLowerCase();
        isWSL = version.includes('microsoft');
    } catch (e) { }

    if (pressure > 0.7 || isWSL) {
        recommended = Math.floor(cores / 2);
    }
    if (pressure > 0.9) {
        recommended = 1;
    }
    return Math.max(1, recommended);
}

console.log('--- System Info ---');
console.log('Cores (vCPUs):', os.cpus().length);
console.log('Load Avg:', os.loadavg());
console.log('Pressure:', getSystemPressure());
console.log('Rec. Threads:', getRecommendedThreads());
process.exit(0);
