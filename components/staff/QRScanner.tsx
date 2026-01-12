import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import { Spinner } from '../ui/Spinner';

declare const jsQR: any;

interface QRScannerProps {
  onScanSuccess: (qrData: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const [statusMessage, setStatusMessage] = useState<string>('Meminta akses kamera...');
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
  
  const verifyLocationAndProceed = useCallback(async (qrData: string) => {
    setIsLoading(true);
    try {
      setStatusMessage('Memeriksa lokasi Anda...');
      const position = await getCurrentPosition();
      
      if (!isWithinSchoolRadius(position.coords)) {
        setStatusMessage('Gagal: Anda harus berada di area sekolah untuk absen.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      setStatusMessage('Lokasi terverifikasi. Skan berhasil!');
      setMessageType('success');
      onScanSuccess(qrData);

    } catch (error) {
      setStatusMessage('Gagal mendapatkan lokasi. Aktifkan GPS dan coba lagi.');
      setMessageType('error');
      setIsLoading(false);
    }
  }, [onScanSuccess]);

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
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code) {
          stopCamera();
          verifyLocationAndProceed(code.data);
          return;
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanTick);
  }, [stopCamera, verifyLocationAndProceed]);
  
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          animationFrameId.current = requestAnimationFrame(scanTick);
          setStatusMessage('Arahkan kamera ke QR Code.');
          setMessageType('info');
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setStatusMessage('Akses kamera ditolak. Izinkan akses di pengaturan browser.');
        setMessageType('error');
      } finally {
        setIsLoading(false);
      }
    };
    startCamera();
    return () => stopCamera();
  }, [scanTick, stopCamera]);

  const messageClasses = {
    info: 'text-blue-300 bg-blue-500/20 border-blue-500/30',
    success: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30',
    error: 'text-red-300 bg-red-500/20 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex items-center justify-center">
        <Card title="Scan QR Code Absensi" className="w-full max-w-md">
        <div className="space-y-4">
            <div className="w-full bg-slate-900 rounded-md overflow-hidden aspect-square relative border-2 border-slate-700">
                <video ref={videoRef} playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                    <Spinner />
                </div>
                )}
            </div>
            
            <div className={`p-3 rounded-md text-sm text-center border ${messageClasses[messageType]}`}>
            {statusMessage}
            </div>

            <Button onClick={() => { stopCamera(); onClose(); }} variant="secondary" className="w-full !py-3">
            Tutup
            </Button>
        </div>
        </Card>
    </div>
  );
};

export default QRScanner;