'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back
        </button>
        
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
          
          <div className="space-y-6">
            <SettingToggle
              title="Notifications"
              description="Receive learning reminders"
              enabled={notifications}
              onToggle={() => setNotifications(!notifications)}
            />

            <SettingToggle
              title="Dark Mode"
              description="Use dark theme"
              enabled={darkMode}
              onToggle={() => setDarkMode(!darkMode)}
            />

            <SettingToggle
              title="Sound Effects"
              description="Play sounds during activities"
              enabled={soundEffects}
              onToggle={() => setSoundEffects(!soundEffects)}
              noBorder
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingToggleProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  noBorder?: boolean;
}

function SettingToggle({ title, description, enabled, onToggle, noBorder }: SettingToggleProps) {
  const borderClass = noBorder ? "" : "border-b";
  const toggleBg = enabled ? "bg-blue-600" : "bg-gray-200";
  const togglePosition = enabled ? "translate-x-6" : "translate-x-0.5";

  return (
    <div className={"flex items-center justify-between py-4 " + borderClass}>
      <div>
        <h3 className="font-medium text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={"w-12 h-6 rounded-full transition-colors " + toggleBg}
      >
        <span
          className={"block w-5 h-5 bg-white rounded-full shadow transform transition-transform " + togglePosition}
        />
      </button>
    </div>
  );
}
