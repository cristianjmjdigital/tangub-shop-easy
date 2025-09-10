import { useEffect, useState } from "react";
// Using public asset path handled by Vite
const logo = "/logo.jpg";

interface SplashScreenProps {
  minDuration?: number; // ms
  onFinish?: () => void;
}

const SplashScreen = ({ minDuration = 1200, onFinish }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, minDuration);
    return () => clearTimeout(timer);
  }, [minDuration, onFinish]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity animate-fade-in">
      <div className="flex flex-col items-center">
  <img src={logo} alt="Tangub City Shopeasy" className="h-32 w-auto mb-6 animate-pulse-slow drop-shadow-md" />
        <div className="h-2 w-40 bg-secondary rounded-full overflow-hidden">
          <div className="h-full w-full bg-accent animate-loading-bar" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;