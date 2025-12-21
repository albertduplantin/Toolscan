'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw } from 'lucide-react';
import Image from 'next/image';

interface CameraCaptureProps {
  value: string | null;
  onCapture: (imageUrl: string) => void;
  onRetake: () => void;
  referenceImageUrl: string | null;
  silhouettes: any[];
  showOverlay?: boolean;
}

export function CameraCapture({
  value,
  onCapture,
  onRetake,
  referenceImageUrl,
  silhouettes,
  showOverlay = false,
}: CameraCaptureProps) {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (showOverlay && value && overlayCanvasRef.current) {
      drawOverlay();
    }
  }, [showOverlay, value, silhouettes]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(
        'Impossible d\'accéder à la caméra. Veuillez autoriser l\'accès à la caméra.'
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        stopCamera();
        onCapture(imageUrl);
      }
    }
  };

  const handleRetake = () => {
    onRetake();
    setError(null);
  };

  const drawOverlay = () => {
    if (!overlayCanvasRef.current || !value) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load captured image to get dimensions
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the captured image
      ctx.drawImage(img, 0, 0);

      // Draw red silhouettes for missing tools
      // TODO: Implement actual detection logic
      // For now, draw random silhouettes as demonstration
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';

      silhouettes.forEach((tool) => {
        if (tool.position) {
          const { x, y, width, height } = tool.position;
          // Draw semi-transparent red rectangle
          ctx.fillRect(x, y, width, height);
          // Draw red border
          ctx.strokeRect(x, y, width, height);

          // Draw tool name
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(x, y - 25, width, 25);
          ctx.fillStyle = 'rgba(255, 0, 0, 1)';
          ctx.font = '16px sans-serif';
          ctx.fillText(tool.name, x + 5, y - 7);
          ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        }
      });
    };
    img.src = value;
  };

  // Use file input as fallback if camera is not available
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        onCapture(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  if (value) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          {showOverlay ? (
            <canvas
              ref={overlayCanvasRef}
              className="h-full w-full object-contain"
            />
          ) : (
            <Image
              src={value}
              alt="Photo capturée"
              fill
              className="object-contain"
            />
          )}
        </div>

        <Button onClick={handleRetake} variant="outline" className="w-full">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reprendre la photo
        </Button>
      </div>
    );
  }

  if (streaming) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={stopCamera} variant="outline" className="flex-1">
            Annuler
          </Button>
          <Button onClick={capturePhoto} className="flex-1">
            <Camera className="mr-2 h-4 w-4" />
            Capturer
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
        <div className="text-center">
          <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Appuyez sur le bouton ci-dessous pour démarrer la caméra
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={startCamera} className="flex-1">
          <Camera className="mr-2 h-4 w-4" />
          Démarrer la caméra
        </Button>

        <label className="flex-1">
          <Button variant="outline" className="w-full" asChild>
            <span>Choisir une photo</span>
          </Button>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={overlayCanvasRef} className="hidden" />
    </div>
  );
}
