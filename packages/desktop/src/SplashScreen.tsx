import { motion } from 'framer-motion';

interface SplashScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export function SplashScreen({ error, onRetry }: SplashScreenProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-neon-bg">
      {/* Logo with orbital rings */}
      <div className="relative mb-8" style={{ width: 120, height: 120 }}>
        {/* Outer ring */}
        <motion.svg
          className="absolute inset-0"
          viewBox="0 0 120 120"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="60" cy="60" r="54" fill="none"
            stroke="var(--color-neon-green)" strokeWidth="2" opacity="0.15" />
          <circle cx="60" cy="60" r="54" fill="none"
            stroke="var(--color-neon-green)" strokeWidth="2"
            strokeDasharray="80 260" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.4))' }} />
        </motion.svg>

        {/* Inner ring */}
        <motion.svg
          className="absolute inset-0"
          viewBox="0 0 120 120"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="60" cy="60" r="42" fill="none"
            stroke="var(--color-neon-indigo)" strokeWidth="2" opacity="0.1" />
          <circle cx="60" cy="60" r="42" fill="none"
            stroke="var(--color-neon-indigo)" strokeWidth="2"
            strokeDasharray="60 204" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.3))' }} />
        </motion.svg>

        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl
                         bg-gradient-to-br from-neon-green to-[#00cc6a]
                         shadow-glow-green">
            <span className="text-2xl font-black text-neon-bg">F</span>
          </div>
        </div>
      </div>

      {/* Status text */}
      {error ? (
        <div className="text-center">
          <p className="text-sm text-neon-red">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 rounded-md bg-neon-green/10 border border-neon-green/15
                         px-4 py-2 text-xs font-medium text-neon-green
                         hover:bg-neon-green/15 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <motion.p
          className="text-xs text-neon-text-muted"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Starting up...
        </motion.p>
      )}
    </div>
  );
}
