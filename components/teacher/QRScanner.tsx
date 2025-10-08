
import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import { recordAttendance } from '../../services/attendanceService';
import { Spinner } from '../ui/Spinner';

declare const jsQR: any;

interface QRScannerProps {
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string>('Please select an image of the QR code.');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage('Processing...');
    setMessageType('info');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setStatusMessage('Could not get canvas context.');
            setMessageType('error');
            setIsLoading(false);
            return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          verifyAndRecordAttendance(code.data);
        } else {
          setStatusMessage('No QR code found in the image. Please try again.');
          setMessageType('error');
          setIsLoading(false);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const verifyAndRecordAttendance = async (qrData: string) => {
    if (!user) {
        setStatusMessage('User not logged in.');
        setMessageType('error');
        setIsLoading(false);
        return;
    }

    try {
      setStatusMessage('Checking your location...');
      const position = await getCurrentPosition();
      
      if (!isWithinSchoolRadius(position.coords)) {
        setStatusMessage('Error: You must be within the school area to check in.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      setStatusMessage('Location verified. Recording attendance...');
      const result = await recordAttendance(user, qrData);
      
      setStatusMessage(result.message);
      setMessageType(result.success ? 'success' : 'error');

    } catch (error) {
      setStatusMessage('Could not get location. Please enable GPS and try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const messageClasses = {
    info: 'text-blue-700 bg-blue-100',
    success: 'text-green-700 bg-green-100',
    error: 'text-red-700 bg-red-100',
  };

  return (
    <Card title="Scan QR Code for Attendance">
      <div className="text-center space-y-4">
        <div className={`p-4 rounded-md text-sm ${messageClasses[messageType]}`}>
          {statusMessage}
        </div>

        {isLoading && <Spinner />}

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex space-x-4">
          <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            Scan / Upload QR
          </Button>
          <Button onClick={onClose} variant="secondary" disabled={isLoading}>
            Close
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default QRScanner;