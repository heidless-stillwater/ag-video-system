#!/bin/bash

# VideoSystem Deployment Optimization Script
# This script prunes unnecessary binaries from node_modules to reduce deployment size.

echo "🚀 Optimizing package size for deployment..."

# Path to ffprobe-static binaries
FFPROBE_BIN_DIR="node_modules/ffprobe-static/bin"

if [ -d "$FFPROBE_BIN_DIR" ]; then
    echo "📦 Pruning ffprobe-static binaries..."
    
    # We only need linux/x64 for Cloud Run
    # Remove darwin (Mac), win32 (Windows), and linux/ia32 (32-bit Linux)
    
    BEFORE_SIZE=$(du -sh "$FFPROBE_BIN_DIR" | cut -f1)
    
    rm -rf "$FFPROBE_BIN_DIR/darwin"
    rm -rf "$FFPROBE_BIN_DIR/win32"
    rm -rf "$FFPROBE_BIN_DIR/linux/ia32"
    
    AFTER_SIZE=$(du -sh "$FFPROBE_BIN_DIR" | cut -f1)
    
    echo "✅ ffprobe-static pruned: $BEFORE_SIZE -> $AFTER_SIZE"
else
    echo "⚠️  ffprobe-static/bin not found. Skipping pruning."
fi

# We can also check for .remotion binaries if they are bundled
REMOTION_DIR="node_modules/.remotion"
if [ -d "$REMOTION_DIR" ]; then
    echo "📦 Checking .remotion directory..."
    # Remotion often downloads browser binaries (chromium). 
    # These are needed for rendering, but we should ensure only the linux ones are kept.
    # However, .remotion usually only has what was downloaded on the current OS.
    du -sh "$REMOTION_DIR"
fi

echo "✨ Optimization complete!"
