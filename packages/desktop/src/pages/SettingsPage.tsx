interface SettingsPageProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function SettingsPage({ showToast }: SettingsPageProps) {
  void showToast;
  return (
    <div className="text-neon-text-secondary text-sm">
      <h1 className="text-xl font-semibold text-neon-text mb-4">Settings</h1>
      <p>Settings page — coming soon.</p>
    </div>
  );
}
