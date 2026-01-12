import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

declare const jsQR: any;

interface QRScannerProps {
  onScanSuccess: (qrData: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const [statusMessage, setStatusMessage] = useState<string>('Requesting camera access...');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const scanTick = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          stopCamera();
          // The location is already verified by the parent component.
          // Directly call onScanSuccess for a faster user experience.
          setStatusMessage('QR Code terdeteksi! Memproses absensi...');
          setMessageType('success');
          onScanSuccess(code.data);
          return; // Stop the loop
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanTick);
  }, [stopCamera, onScanSuccess]);
  

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true"); // Required for iOS
          await videoRef.current.play();
          animationFrameId.current = requestAnimationFrame(scanTick);
          setStatusMessage('Arahkan kamera ke QR code.');
          setMessageType('info');
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setStatusMessage('Akses kamera ditolak. Izinkan akses kamera di pengaturan browser Anda.');
        setMessageType('error');
      } finally {
        setIsLoading(false);
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      stopCamera();
    };
  }, [scanTick, stopCamera]);


  const messageClasses = {
    info: 'text-blue-700 bg-blue-100',
    success: 'text-green-700 bg-green-100',
    error: 'text-red-700 bg-red-100',
  };

  return (
    <Card title="Scan QR Code untuk Absensi">
      <div className="space-y-4">
        <div className="w-full bg-black rounded-md overflow-hidden aspect-square relative">
            <video
              ref={videoRef}
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
             {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <Spinner />
              </div>
            )}
        </div>
        
        <div className={`p-3 rounded-md text-sm text-center ${messageClasses[messageType]}`}>
          {statusMessage}
        </div>

        <Button onClick={() => { stopCamera(); onClose(); }} variant="secondary" className="w-full !py-3">
          Tutup
        </Button>
      </div>
    </Card>
  );
};

export default QRScanner;