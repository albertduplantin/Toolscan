'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface Tool {
  id: string;
  name: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ToolDetectionOverlayProps {
  imageUrl: string;
  tools: Tool[];
  highlightedToolIds?: string[];
  showLabels?: boolean;
  className?: string;
}

export function ToolDetectionOverlay({
  imageUrl,
  tools,
  highlightedToolIds = [],
  showLabels = true,
  className = '',
}: ToolDetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tool rectangles
    tools.forEach((tool) => {
      if (!tool.position) return;

      const { x, y, width, height } = tool.position;
      const isHighlighted = highlightedToolIds.includes(tool.id);

      // Set style based on highlight status
      if (isHighlighted) {
        // Highlighted tools (present) - Green
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)'; // green-500
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.lineWidth = 4;
      } else {
        // Non-highlighted tools (missing) - Red
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)'; // red-500
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.lineWidth = 4;
      }

      // Draw semi-transparent fill
      ctx.fillRect(x, y, width, height);

      // Draw border with rounded corners
      ctx.beginPath();
      const radius = 8;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.stroke();

      // Add glow effect for highlighted tools
      if (isHighlighted) {
        ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw label if enabled
      if (showLabels) {
        const labelPadding = 8;
        const labelHeight = 32;

        // Background for label
        ctx.fillStyle = isHighlighted
          ? 'rgba(34, 197, 94, 0.95)'
          : 'rgba(239, 68, 68, 0.95)';

        // Measure text to determine label width
        ctx.font = 'bold 14px sans-serif';
        const textWidth = ctx.measureText(tool.name).width;
        const labelWidth = textWidth + labelPadding * 2;

        // Draw rounded label background
        const labelY = y - labelHeight - 4;
        ctx.beginPath();
        ctx.moveTo(x + radius, labelY);
        ctx.lineTo(x + labelWidth - radius, labelY);
        ctx.quadraticCurveTo(x + labelWidth, labelY, x + labelWidth, labelY + radius);
        ctx.lineTo(x + labelWidth, labelY + labelHeight - radius);
        ctx.quadraticCurveTo(
          x + labelWidth,
          labelY + labelHeight,
          x + labelWidth - radius,
          labelY + labelHeight
        );
        ctx.lineTo(x + radius, labelY + labelHeight);
        ctx.quadraticCurveTo(x, labelY + labelHeight, x, labelY + labelHeight - radius);
        ctx.lineTo(x, labelY + radius);
        ctx.quadraticCurveTo(x, labelY, x + radius, labelY);
        ctx.closePath();
        ctx.fill();

        // Draw text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tool.name, x + labelPadding, labelY + labelHeight / 2);
      }
    });
  }, [imageLoaded, tools, highlightedToolIds, showLabels]);

  const handleImageLoad = (e: any) => {
    const img = e.target;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });

    if (canvasRef.current) {
      canvasRef.current.width = img.naturalWidth;
      canvasRef.current.height = img.naturalHeight;
    }

    setImageLoaded(true);
  };

  return (
    <div className={`relative ${className}`}>
      <Image
        src={imageUrl}
        alt="Cabinet with tool detection"
        width={imageDimensions.width || 800}
        height={imageDimensions.height || 600}
        className="w-full h-auto rounded-lg"
        onLoad={handleImageLoad}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
}
