#!/bin/bash

# VideoSystem Render Process Manager
# Quick diagnostic and kill script for hung render jobs

echo "🔍 VideoSystem Render Process Manager"
echo "======================================"
echo ""

# Check for FFmpeg processes
echo "📊 Checking for active FFmpeg processes..."
FFMPEG_COUNT=$(ps aux | grep -i ffmpeg | grep -v grep | wc -l)
echo "   Found: $FFMPEG_COUNT FFmpeg process(es)"

if [ $FFMPEG_COUNT -gt 0 ]; then
    echo ""
    echo "   Details:"
    ps aux | grep -i ffmpeg | grep -v grep | awk '{print "   PID:", $2, "| CPU:", $3"%", "| MEM:", $4"%", "| CMD:", substr($0, index($0,$11))}'
fi

echo ""

# Check for Compositor processes
echo "📊 Checking for active Compositor processes..."
COMP_COUNT=$(ps aux | grep -i compositor | grep -v grep | wc -l)
echo "   Found: $COMP_COUNT Compositor process(es)"

if [ $COMP_COUNT -gt 0 ]; then
    echo ""
    echo "   Details:"
    ps aux | grep -i compositor | grep -v grep | awk '{print "   PID:", $2, "| CPU:", $3"%", "| MEM:", $4"%", "| CMD:", substr($0, index($0,$11))}'
fi

echo ""
echo "======================================"

TOTAL=$((FFMPEG_COUNT + COMP_COUNT))

if [ $TOTAL -eq 0 ]; then
    echo "✅ No active render processes found"
    echo ""
    exit 0
fi

echo "⚠️  Total active processes: $TOTAL"
echo ""

# Ask if user wants to kill processes
read -p "Do you want to KILL all render processes? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ] || [ "$CONFIRM" = "y" ]; then
    echo ""
    echo "🔪 Killing all render processes..."
    pkill -9 -f ffmpeg
    pkill -9 -f compositor
    echo "✅ Kill signals sent"
    echo ""
    
    # Verify
    sleep 1
    REMAINING=$(ps aux | grep -E 'ffmpeg|compositor' | grep -v grep | wc -l)
    if [ $REMAINING -eq 0 ]; then
        echo "✅ All processes terminated successfully"
    else
        echo "⚠️  Warning: $REMAINING process(es) may still be running"
        echo "   Try running this script again or manually kill with: sudo pkill -9 -f ffmpeg"
    fi
else
    echo "❌ Cancelled - no processes were killed"
fi

echo ""
