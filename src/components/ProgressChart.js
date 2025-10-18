"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select an image first!");
    setProgress(0);
    setDone(false);
    setError(false);
    setLoading(true);

    try {
      // Animate smooth progress (fake but elegant)
      for (let i = 0; i <= 90; i += 10) {
        await new Promise((r) => setTimeout(r, 150));
        setProgress(i);
      }

      // Simulate model connection
      const modelConnected = false; // 👈 change this to true when backend works
      if (!modelConnected) throw new Error("Model not responding");

      await new Promise((r) => setTimeout(r, 400)); // fake final wait
      setProgress(100);
      setDone(true);
      setLoading(false);
    } catch (err) {
      console.error("Upload error:", err);
      setProgress(100);
      setError(true);
      setLoading(false);
    }
  };

  const handleRedo = () => {
    setFile(null);
    setProgress(0);
    setDone(false);
    setError(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-b from-[#0d1724] via-[#111d2f] to-[#1a263b] text-[#f1f5f9] relative overflow-hidden">
      
      {/* Top Section - Circle */}
      <div className="flex flex-col items-center justify-center mt-20 relative">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: done ? 1.05 : 1 }}
          transition={{ duration: 0.8, repeat: done ? Infinity : 0, repeatType: "reverse" }}
          className={`relative w-52 h-52 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)] ${
            error ? "shadow-[0_0_40px_rgba(239,68,68,0.6)]" : ""
          }`}
        >
          <svg className="absolute inset-0" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke={error ? "#ef4444" : "#3b82f6"}
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${(progress / 100) * 283} 283`}
              strokeLinecap="round"
              className="transition-all duration-300 ease-linear"
            />
          </svg>

          {/* Bot Image */}
          <Image
            src="/aibot.png"
            alt="AI Bot"
            width={70}
            height={70}
            className={`rounded-full ${error ? "opacity-60 grayscale" : ""}`}
          />

          {/* Progress Text */}
          <span className="absolute bottom-3 text-sm font-semibold text-blue-300">
            {progress}%
          </span>

          {/* Success or Error Icon */}
          <AnimatePresence>
            {done && !error && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute text-green-400 text-5xl font-bold"
              >
                ✓
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute text-red-500 text-5xl font-bold"
              >
                ✕
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 bg-red-500/10 text-red-400 border border-red-400 px-6 py-3 rounded-xl shadow-lg flex flex-col items-center"
            >
              <p>Model failed to load. Please re-upload your image.</p>
              <button
                onClick={handleRedo}
                className="mt-3 px-5 py-2 bg-red-600/70 hover:bg-red-700 rounded-md font-semibold text-sm"
              >
                🔁 Redo Upload
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Section */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="mb-12 w-[95%] max-w-3xl bg-[#1b2433]/90 backdrop-blur-md rounded-2xl shadow-[0_0_40px_rgba(30,58,138,0.4)] p-10 flex flex-col items-center"
      >
        <h1 className="text-3xl font-bold mb-3 text-blue-300">
          Bone Fracture Detection
        </h1>
        <p className="text-center text-gray-200 text-base mb-6 max-w-2xl leading-relaxed">
          Upload your X-ray image below. Our advanced AI model will analyze your scan
          for possible fractures and bone irregularities.
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4 text-gray-300 text-sm cursor-pointer"
        />

        {!error && (
          <button
            onClick={handleUpload}
            disabled={loading}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            }`}
          >
            {loading ? "Analyzing..." : "Upload & Predict"}
          </button>
        )}
      </motion.div>
    </div>
  );
}
