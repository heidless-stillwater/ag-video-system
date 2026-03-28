import dotenv from 'dotenv';
import path from 'path';
import { renderEngine } from '../src/lib/services/render-engine';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function validateRenderEngine() {
    console.log('🔍 Validating Render Engine configuration...');
    
    const projectId = 'test-project';
    const cloudRunUrl = process.env.CLOUD_RUN_RENDER_URL || 'http://localhost:8080';
    
    console.log(`📡 Expected Cloud Run URL: ${cloudRunUrl}`);
    
    // Test killProject method (this won't actually kill anything if the URL is wrong, 
    // it will just time out or fail with a specific error)
    console.log('\n🛠️ Testing killProject() proxy logic...');
    try {
        const result = await renderEngine.killProject(projectId);
        console.log(`✅ killProject returned: ${result} (Note: Result might be false if no processes existed on the worker)`);
    } catch (err: any) {
        console.error('❌ killProject failed:', err.message);
        if (err.message.includes('undefined')) {
            console.error('CRITICAL: cloudRunUrl is still undefined in the proxy!');
        }
    }

    console.log('\n🛠️ Testing killAllProcesses() proxy logic...');
    try {
        const result = await renderEngine.killAllProcesses();
        console.log(`✅ killAllProcesses returned: ${result}`);
    } catch (err: any) {
        console.error('❌ killAllProcesses failed:', err.message);
    }
    
    console.log('\n✨ Validation complete.');
}

validateRenderEngine().catch(console.error);
