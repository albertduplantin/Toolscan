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
  cabinetId?: string;
}

export function CameraCapture({
  value,
  onCapture,
  onRetake,
  referenceImageUrl,
  silhouettes,
  showOverlay = false,
  cabinetId,
}: CameraCaptureProps) {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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
      console.log('[CameraCapture] Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      console.log('[CameraCapture] Camera stream obtained:', stream.getVideoTracks());

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
        setError(null);
        console.log('[CameraCapture] Camera started successfully');
      }
    } catch (err) {
      console.error('[CameraCapture] Error accessing camera:', err);
      console.error('[CameraCapture] Error name:', (err as Error).name);
      console.error('[CameraCapture] Error message:', (err as Error).message);
      setError(
        'Impossible d\'accéder à la caméra. Veuillez autoriser l\'accès à la caméra ou utiliser le bouton "Choisir une photo".'
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

  const uploadImage = async (dataUrl: string): Promise<string> => {
    if (!cabinetId) {
      console.log('[CameraCapture] No cabinetId, returning data URL');
      return dataUrl;
    }

    console.log('[CameraCapture] Starting upload for cabinet:', cabinetId);
    console.log('[CameraCapture] Data URL length:', dataUrl.length);

    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    console.log('[CameraCapture] Blob created, size:', blob.size, 'type:', blob.type);

    // Create File from Blob
    const file = new File([blob], `verification-${Date.now()}.jpg`, { type: 'image/jpeg' });
    console.log('[CameraCapture] File created, size:', file.size);

    // Upload to server
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cabinetId', cabinetId);
    formData.append('imageType', 'verification');

    console.log('[CameraCapture] Uploading to /api/upload...');
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    console.log('[CameraCapture] Upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[CameraCapture] Upload failed:', errorText);
      throw new Error(`Failed to upload image: ${uploadResponse.status} ${errorText}`);
    }

    const responseData = await uploadResponse.json();
    console.log('[CameraCapture] Upload successful, URL:', responseData.url);
    return responseData.url;
  };

  const capturePhoto = async () => {
    console.log('[CameraCapture] capturePhoto called, cabinetId:', cabinetId);

    if (!canvasRef.current) {
      console.error('[CameraCapture] No canvas ref');
      return;
    }

    if (!videoRef.current) {
      console.error('[CameraCapture] No video ref');
      return;
    }

    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      console.log('[CameraCapture] Capturing photo, video dimensions:', video.videoWidth, 'x', video.videoHeight);

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('[CameraCapture] Invalid video dimensions');
        setError('Erreur: dimensions vidéo invalides');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[CameraCapture] Could not get canvas context');
        return;
      }

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log('[CameraCapture] Photo captured, data URL length:', dataUrl.length);
        console.log('[CameraCapture] Data URL preview:', dataUrl.substring(0, 100));
        stopCamera();

        // Upload image if cabinetId is provided
        console.log('[CameraCapture] Checking cabinetId...', { cabinetId, hasCabinetId: !!cabinetId });

        if (cabinetId) {
          console.log('[CameraCapture] Cabinet ID exists, starting upload process...');
          setUploading(true);
          setError(null);
          try {
            console.log('[CameraCapture] Uploading captured photo...');
            const uploadedUrl = await uploadImage(dataUrl);
            console.log('[CameraCapture] Upload complete, calling onCapture with URL:', uploadedUrl);
            onCapture(uploadedUrl);
          } catch (err) {
            console.error('[CameraCapture] Error uploading image:', err);
            console.error('[CameraCapture] Error details:', {
              name: (err as Error).name,
              message: (err as Error).message,
              stack: (err as Error).stack
            });
            setError('Erreur lors de l\'enregistrement de la photo: ' + (err as Error).message);
            // Fallback to data URL
            console.log('[CameraCapture] Falling back to data URL');
            onCapture(dataUrl);
          } finally {
            setUploading(false);
          }
        } else {
          console.warn('[CameraCapture] No cabinetId provided, using data URL directly');
          onCapture(dataUrl);
        }
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
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('[CameraCapture] File selected:', file?.name, file?.size, file?.type);

    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        console.log('[CameraCapture] File loaded as data URL, length:', dataUrl.length);

        // Upload image if cabinetId is provided
        if (cabinetId) {
          setUploading(true);
          setError(null);
          try {
            console.log('[CameraCapture] Uploading selected file...');
            const uploadedUrl = await uploadImage(dataUrl);
            console.log('[CameraCapture] File upload complete, calling onCapture with URL:', uploadedUrl);
            onCapture(uploadedUrl);
          } catch (err) {
            console.error('[CameraCapture] Error uploading file:', err);
            setError('Erreur lors de l\'enregistrement de la photo: ' + (err as Error).message);
            // Fallback to data URL
            console.log('[CameraCapture] Falling back to data URL');
            onCapture(dataUrl);
          } finally {
            setUploading(false);
          }
        } else {
          console.log('[CameraCapture] No cabinetId, using data URL');
          onCapture(dataUrl);
        }
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
          <Button onClick={stopCamera} variant="outline" className="flex-1" disabled={uploading}>
            Annuler
          </Button>
          <Button onClick={capturePhoto} className="flex-1" disabled={uploading}>
            <Camera className="mr-2 h-4 w-4" />
            {uploading ? 'Enregistrement...' : 'Capturer'}
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
