'use client';
import { useState, useEffect, useRef } from 'react';

interface CallButtonProps {
  phone: string;
  name: string;
  orderId: string;
}

declare global {
  interface Window {
    DailyIframe: {
      createFrame: (el: HTMLElement, options: Record<string, unknown>) => DailyCallObject;
    };
  }
}

interface DailyCallObject {
  join: (options: { url: string }) => Promise<void>;
  destroy: () => void;
  on: (event: string, handler: () => void) => DailyCallObject;
}

export default function CallButton({ phone, name, orderId }: CallButtonProps) {
  const [calling, setCalling] = useState(false);
  const [callObj, setCallObj] = useState<DailyCallObject | null>(null);
  const callFrameRef = useRef<HTMLDivElement>(null);

  // Load Daily.co SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.DailyIframe) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, []);

  const handleStartCall = async () => {
    if (!callFrameRef.current) return;

    try {
      // Create a Daily.co room (in production you'd create this via Daily API)
      // Using a demo room for now — replace with your Daily domain
      const roomUrl = `https://wus-delivery.daily.co/${orderId}`;

      if (!window.DailyIframe) {
        alert('ไม่สามารถเริ่มการโทรได้ กรุณาลองใหม่');
        return;
      }

      const frame = window.DailyIframe.createFrame(callFrameRef.current, {
        iframeStyle: {
          width: '100%',
          height: '400px',
          border: 'none',
          borderRadius: '12px',
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });

      frame.on('left-meeting', () => {
        setCalling(false);
        frame.destroy();
        setCallObj(null);
      });

      await frame.join({ url: roomUrl });
      setCallObj(frame);
      setCalling(true);
    } catch {
      alert('ไม่สามารถเชื่อมต่อการโทรได้');
    }
  };

  const handleEndCall = () => {
    if (callObj) {
      callObj.destroy();
      setCallObj(null);
    }
    setCalling(false);
  };

  return (
    <div className="call-section">
      {/* Tap to call (phone) */}
      <a href={`tel:${phone}`} className="tap-call-btn" title={`โทรหา ${name}`}>
        📞 {phone}
      </a>

      {/* In-app call */}
      {!calling ? (
        <button className="video-call-btn" onClick={handleStartCall}>
          🎥 โทรในแอป
        </button>
      ) : (
        <button className="end-call-btn" onClick={handleEndCall}>
          📵 วางสาย
        </button>
      )}

      {/* Daily.co iframe container */}
      <div
        ref={callFrameRef}
        className={`call-frame ${calling ? 'call-frame-active' : ''}`}
      />
    </div>
  );
}
