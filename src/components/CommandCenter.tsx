import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Sparkles, Upload, AlertCircle, Check } from 'lucide-react';
import { validateExplainJSON } from '../utils/parser';
import { demoExplainJSON } from '../data/demo';
import type { MySQLExplainJSON } from '../types';

interface CommandCenterProps {
  onVisualize: (data: MySQLExplainJSON) => void;
  isVisible: boolean;
}

export default function CommandCenter({ onVisualize, isVisible }: CommandCenterProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setError(null);
    setIsValid(false);

    if (value.trim()) {
      const result = validateExplainJSON(value);
      if (result.valid) {
        setIsValid(true);
      } else {
        setError(result.error || 'Invalid JSON');
      }
    }
  }, []);

  const handleVisualize = useCallback(() => {
    const result = validateExplainJSON(input);
    if (result.valid && result.data) {
      onVisualize(result.data);
    }
  }, [input, onVisualize]);

  const handleLoadDemo = useCallback(() => {
    const demoString = JSON.stringify(demoExplainJSON, null, 2);
    setInput(demoString);
    setIsValid(true);
    setError(null);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleInputChange(text);
    } catch {
      setError('Failed to read clipboard');
    }
  }, [handleInputChange]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10, 10, 10, 0.95)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-3xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4"
              >
                <Sparkles size={16} className="text-cyan-400" />
                <span className="text-sm text-gray-300">Query Plan Visualizer</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
              >
                Visualize Your Query Plan
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-400 max-w-lg mx-auto"
              >
                Paste your MySQL <code className="text-cyan-400 font-mono">EXPLAIN FORMAT=JSON</code> output
                to explore it as an interactive flow chart.
              </motion.p>
            </div>

            {/* Input Area */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl overflow-hidden"
            >
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-400 font-mono">JSON Input</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePaste}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                  >
                    <Upload size={14} />
                    Paste
                  </button>
                  <button
                    onClick={handleLoadDemo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors"
                  >
                    <Sparkles size={14} />
                    Load Demo
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder='Paste your EXPLAIN FORMAT=JSON output here...'
                  className="w-full h-64 p-4 bg-transparent font-mono text-sm text-gray-200
                    placeholder-gray-600 resize-none focus:outline-none"
                  spellCheck={false}
                />

                {/* Validation indicator */}
                <AnimatePresence>
                  {input && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={`absolute top-3 right-3 p-2 rounded-lg ${
                        isValid
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {isValid ? <Check size={16} /> : <AlertCircle size={16} />}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-3 bg-red-500/10 border-t border-red-500/20"
                  >
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <AlertCircle size={14} />
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Visualize Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex justify-center"
            >
              <button
                onClick={handleVisualize}
                disabled={!isValid}
                className={`
                  relative px-8 py-3 rounded-xl font-medium text-lg
                  transition-all duration-300
                  ${isValid
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles size={20} />
                  Visualize
                </span>
                {isValid && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 opacity-50 blur-xl"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </button>
            </motion.div>

            {/* Hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-xs text-gray-500 mt-4"
            >
              Tip: Run <code className="text-gray-400">EXPLAIN FORMAT=JSON SELECT ...</code> in MySQL to get the JSON output
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
