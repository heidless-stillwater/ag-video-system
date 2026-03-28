import { youtubeService } from './src/lib/services/youtube';
import { getScript } from './src/lib/services/firestore-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function test() {
  const scriptId = 'JMjMHOaj9sMXbeH1yYoG'; // Re-using script from the previous check
  try {
     const script = await getScript(scriptId);
     if (!script) {
         console.error('Script not found');
         return;
     }
     console.log('Script loaded. Generating metadata (STAGING)...');
     const result = await youtubeService.generateMetadata(script, 'STAGING');
     console.log('Result:', result);
  } catch(e) {
     console.error('Error:', e);
  }
}

test();
