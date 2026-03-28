# Render Process Management Guide

## Problem: Hung Render Processes

When a render job hangs (usually on "Processing scene 1"), it can consume system resources indefinitely. This guide provides tools to diagnose and resolve the issue.

## Quick Solutions

### Option 1: Web UI (Recommended for Live URL)

1. Navigate to: `https://autovideo-v0-dev.web.app/admin/tools`
2. Click **"Check Process Status"** to see active renders
3. Click **"Kill All Renders"** to terminate hung processes

### Option 2: Command Line (Local/SSH)

```bash
# Run the diagnostic script
./scripts/check-renders.sh

# Or manually check processes
ps aux | grep ffmpeg
ps aux | grep compositor

# Kill all render processes
pkill -9 -f ffmpeg
pkill -9 -f compositor
```

### Option 3: API Endpoints

**Check Status:**
```bash
curl https://autovideo-v0-dev.web.app/api/admin/process-status
```

**Kill All Renders:**
```bash
curl -X POST https://autovideo-v0-dev.web.app/api/admin/kill-renders
```

## Common Causes of Hung Renders

1. **Memory Exhaustion**: FFmpeg runs out of RAM during processing
2. **Missing Assets**: Audio/image files fail to download
3. **Codec Issues**: Incompatible video/audio formats
4. **Network Timeouts**: Cloud storage download failures
5. **Resource Limits**: Cloud Run instance hitting CPU/memory limits

## Debugging Steps

### 1. Check Cloud Run Logs
```bash
# View recent logs
gcloud run services logs read ssrautovideov0dev --region=us-central1 --limit=100
```

### 2. Check Firestore Project Status
- Look at the project document in Firestore
- Check `renderProgress` and `renderMessage` fields
- Status should be `rendering` if active

### 3. Monitor System Resources
- Use the Admin Tools page to check memory usage
- Cloud Run instances have 2GB RAM by default
- Large projects may need instance size increase

## Prevention

### Optimize Render Settings
- Reduce video resolution for testing
- Use shorter clips initially
- Ensure all assets are pre-downloaded
- Monitor Cloud Run instance metrics

### Resource Limits
The system includes automatic safeguards:
- `resourceGovernor` checks system health before starting renders
- Returns 503 error if system is overloaded
- Prevents multiple concurrent renders in low-resource environments

## Emergency Reset

If processes won't die or system is completely hung:

### Cloud Run (Production)
1. Go to Cloud Console → Cloud Run
2. Find `ssrautovideov0dev` service
3. Click "Edit & Deploy New Revision"
4. This will restart all instances

### Local Development
```bash
# Kill Node.js dev server
pkill -9 -f "next dev"

# Restart
npm run dev
```

## Files Created

- `/src/app/api/admin/kill-renders/route.ts` - API to kill processes
- `/src/app/api/admin/process-status/route.ts` - API to check status
- `/src/app/admin/tools/page.tsx` - Web UI for management
- `/scripts/check-renders.sh` - Command-line diagnostic tool

## Notes

- The `killAllProcesses()` function uses `pkill -9` which forcibly terminates processes
- This is safe but will lose any in-progress render work
- Always check Firestore to update project status after killing renders
- Consider increasing Cloud Run instance size for large projects
