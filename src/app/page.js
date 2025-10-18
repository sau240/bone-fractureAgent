"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronsDown, History, Loader2, MessageSquare, RotateCcw, X } from 'lucide-react';
import { useState } from 'react'; // Removed useEffect, as history fetching/auth are gone

// Use environment variables or a static string for the API base URL
const API_BASE_URL = "http://127.0.0.1:5000";

// 2. Gemini API Configuration
const apiKey = "AIzaSyCavrbXga2WUDXzjt45_NTjSVzPO66d8kw"; // The Canvas will provide it at runtime.
// Model used for text generation with Google Search grounding enabled
const LLM_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

// --- Utility Components for Single File Mandate ---

const WavesBackground = () => (
    <div className="absolute inset-0 overflow-hidden -z-10">
        {/* Layer 1: Stronger Indigo/Blue Glow from the bottom */}
        <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-indigo-900/40 to-transparent">
        </div>
        {/* Layer 2: Overall Dark Overlay */}
        <div className="absolute inset-0 bg-gray-950 opacity-90"></div>
    </div>
);
// --- Main Application Component ---

const App = () => {
    // --- Removed Firebase State & Config ---
    // const [db, setDb] = useState(null);
    // const [auth, setAuth] = useState(null);
    // const [userId, setUserId] = useState(null);
    // const [isAuthReady, setIsAuthReady] = useState(false);
    // const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    // const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    // const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Simplified Authentication Status (always ready without Firebase)
    const isAuthReady = true; 
    const userId = "anonymous-local-session"; // Placeholder
    const appId = "standalone-app"; // Placeholder

    // --- Core App State ---
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);
    const [result, setResult] = useState(null);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(false);

    // State for Detailed AI Analysis
    const [detailedAnalysis, setDetailedAnalysis] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState(false);
    const [analysisExpanded, setAnalysisExpanded] = useState(false);
    
    // --- History State (Now local mock data only) ---
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState(false);

    // --- Removed Firebase Listener Effect ---

    // --- Removed savePredictionHistory (Now a mock function) ---
    const savePredictionHistory = async (yoloData, aiText) => {
        const newHistoryItem = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            userId: userId,
            fileName: file ? file.name : "unknown_file",
            yoloDetections: yoloData?.detections || [],
            aiAnalysisText: aiText || "Analysis failed to generate/not requested.",
            appId: appId,
        };
        // Add to local history state (in-memory only)
        setHistory(prevHistory => [newHistoryItem, ...prevHistory]);
        console.log("Analysis history saved to local state successfully.");
        // Note: Real Firestore saving has been removed.
    };


    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        if (fileUrl) URL.revokeObjectURL(fileUrl);
        if (selectedFile) {
            setFileUrl(URL.createObjectURL(selectedFile));
            // Reset status when a new file is selected
            setDone(false);
            setError(false);
            setProgress(0);
            setResult(null);
            // Reset new analysis states
            setDetailedAnalysis(null);
            setAnalysisExpanded(false);
        } else {
            setFileUrl(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            console.error("Please select an image first!");
            return;
        }

        // Reset all states
        setProgress(0);
        setDone(false);
        setError(false);
        setLoading(true);
        setResult(null);
        setDetailedAnalysis(null);
        setAnalysisExpanded(false);

        let predictionData = null;

        try {
            // Simulate progress bar filling up to 80% while preparing
            for (let i = 0; i <= 80; i += 10) {
                await new Promise((r) => setTimeout(r, 100));
                setProgress(i);
            }

            // --- YOLO Prediction Call ---
            const formData = new FormData();
            formData.append("file", file); // Flask expects "file" key

            const res = await fetch(`${API_BASE_URL}/predict_yolo`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server returned status ${res.status}: ${errorText}`);
            }

            predictionData = await res.json();
            setResult(predictionData);
            setProgress(100);
            setDone(true);

            console.log("Prediction result:", predictionData);
            
            // Automatically call detailed analysis after successful YOLO detection
            if (predictionData && predictionData.detections && predictionData.detections.length > 0) {
                // Pass predictionData directly to avoid state sync issues
                handleDetailedAnalysis(predictionData); 
            } else {
                // If no fracture, just save the YOLO result and end.
                // Call the new local save function
                savePredictionHistory(predictionData, "No detailed AI analysis requested (no fracture detected by YOLO)."); 
            }

        } catch (err) {
            console.error("Upload Error:", err);
            setError(true);
        } finally {
            setLoading(false);
            setProgress(100);
        }
    };

    const handleRedo = () => {
        setFile(null);
        setFileUrl(null);
        setProgress(0);
        setDone(false);
        setError(false);
        setResult(null);
        // Reset new analysis states
        setDetailedAnalysis(null);
        setAnalysisExpanded(false);
    };

    // Function to call Gemini for detailed analysis and save history
    const handleDetailedAnalysis = async (yoloResult) => {
        // Use yoloResult passed from handleUpload, or fallback to state if triggered by button
        const currentResult = yoloResult || result;

        // If analysis is already loaded, just toggle the view
        if (detailedAnalysis && !analysisError && !yoloResult) {
            setAnalysisExpanded(!analysisExpanded);
            return;
        }
        
        // If analysis is already loaded via auto-trigger, expand it immediately
        if (detailedAnalysis && !analysisError && yoloResult) {
            setAnalysisExpanded(true);
            return;
        }

        setAnalysisLoading(true);
        setAnalysisError(false);
        
        if (!currentResult || !currentResult.detections || currentResult.detections.length === 0) {
            setAnalysisError(true);
            setDetailedAnalysis("No fracture detected to analyze.");
            setAnalysisLoading(false);
            return;
        }
        
        const primaryDetection = currentResult.detections[0];
        const fractureType = primaryDetection.name || "fracture";
        const confidence = (primaryDetection.confidence * 100).toFixed(2);

        // Define the LLM instructions for a non-diagnostic, informational explanation
        const systemPrompt = "You are a friendly, professional AI assistant for medical analysis. Your goal is to provide a non-diagnostic, informational explanation of a detected bone injury in plain language. Do not offer medical advice. Structure your response into an Explanation, Potential Treatment Options, and a Disclaimer. Use Markdown for formatting.";

        const userQuery = `The AI model detected a '${fractureType}' in a bone X-ray with ${confidence}% confidence. Please provide a detailed analysis for a patient, including: 1. A simple explanation of this fracture type. 2. Common, general treatment options for this type of injury. 3. A strong medical disclaimer emphasizing that this is NOT a diagnosis.`;

        let analysisText = "";

        // Use retry logic for robustness (exponential backoff)
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch(LLM_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: userQuery }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        tools: [{ "google_search": {} }], 
                    })
                });

                if (!response.ok) throw new Error(`API returned status ${response.status}`);

                const apiResult = await response.json();
                const text = apiResult.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                    analysisText = text;
                    setDetailedAnalysis(text);
                    setAnalysisExpanded(true);
                    
                    // SAVE HISTORY HERE after successful AI analysis
                    await savePredictionHistory(currentResult, text);
                    
                    return; // Success, exit loop
                } else {
                    throw new Error("Received empty response from AI.");
                }
            } catch (e) {
                console.error(`Attempt ${attempt + 1} failed:`, e);
                if (attempt === 2) {
                    setAnalysisError(true);
                    setDetailedAnalysis("Failed to generate detailed analysis due to an API error.");
                    analysisText = "Failed to generate detailed analysis due to an API error.";
                }
                await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000)); // Exponential backoff
            } finally {
                setAnalysisLoading(false);
            }
        }
        // Save history even if AI analysis failed
        if (currentResult) {
            await savePredictionHistory(currentResult, analysisText);
        }
    };


    // Dynamic content based on prediction result, including the new AI Analysis section
    const renderResult = () => {
        if (!result) return null;

        // Filter out non-fracture detections if needed, but display all for now
        const fractureDetections = result.detections.filter(d => d.name && d.name !== "Unknown");

        const hasFracture = fractureDetections.length > 0;

        const firstDetection = hasFracture ? fractureDetections[0] : null;

        return (
            <div className="space-y-4">
                <div className={`text-center py-2 rounded-lg font-bold text-xl ${hasFracture ? 'text-red-300' : 'text-green-300'}`}>
                    {hasFracture ? <><Check className="inline w-6 h-6 mr-2" />Fracture Detected! ({fractureDetections.length} objects)</> : "Analysis Complete: No fracture detected."}
                </div>

                {/* Display primary detection details */}
                {firstDetection && (
                    <div className="text-left text-sm text-gray-200 bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-2">
                        <p className="font-semibold text-white">Detection #1: <span className="text-blue-300">{firstDetection.name}</span></p>
                        <p>Confidence: <span className="font-medium text-white">{(firstDetection.confidence * 100).toFixed(2)}%</span></p>
                        <p className="text-xs text-gray-400">
                            Bounding Box (Normalized): xmin={firstDetection.xmin.toFixed(3)}, ymin={firstDetection.ymin.toFixed(3)}, ...
                        </p>
                    </div>
                )}
                
                {/* Display User ID (Placeholder for standalone) */}
                {isAuthReady && userId && (
                    <div className="text-center text-xs text-gray-500 pt-1">
                        Session ID: <span className="text-gray-400 font-mono text-[10px] sm:text-xs break-all">{userId}</span>
                    </div>
                )}

                {/* Detailed Analysis Button and Content */}
                {hasFracture && (
                    <div className="flex flex-col items-center pt-2">
                        <motion.button
                            onClick={() => handleDetailedAnalysis()} // Call with no args to toggle/load
                            disabled={analysisLoading}
                            className={`px-5 py-2 rounded-full font-semibold text-sm flex items-center transition-all ${
                                analysisLoading
                                    ? "bg-gray-700/50 text-gray-300 cursor-wait"
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 text-white"
                                }`}
                            whileTap={{ scale: 0.95 }}
                        >
                            {analysisLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <MessageSquare className="w-4 h-4 mr-2" />
                            )}
                            {detailedAnalysis && !analysisError ? (analysisExpanded ? "Hide Detailed Analysis" : "Detailed AI Analysis") : "Detailed AI Analysis"}
                            {detailedAnalysis && !analysisError && <ChevronsDown className={`w-4 h-4 ml-2 transition-transform ${analysisExpanded ? 'rotate-180' : 'rotate-0'}`} />}
                        </motion.button>

                        {/* Detailed Analysis Content - uses AnimatePresence for smooth expansion */}
                        <AnimatePresence>
                            {analysisExpanded && detailedAnalysis && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="mt-4 w-full p-4 bg-gray-700/50 rounded-xl overflow-hidden text-gray-100 text-sm border border-gray-600"
                                >
                                    {/* Render the LLM text (which is Markdown) using dangerouslySetInnerHTML */}
                                    <div
                                        dangerouslySetInnerHTML={{ __html: detailedAnalysis.replace(/\n/g, '<br/>') }}
                                        className="prose prose-invert max-w-none space-y-4 leading-relaxed"
                                    />
                                </motion.div>
                            )}
                            {analysisError && (
                                <div className="mt-4 p-3 text-red-400 text-center border border-red-500/50 bg-red-900/30 rounded-lg w-full">
                                    {detailedAnalysis}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        );
    };

    const renderHistory = () => {
        return (
            <div className="w-full mt-8">
                <button
                    onClick={() => setHistoryExpanded(!historyExpanded)}
                    disabled={historyLoading}
                    className="w-full px-5 py-3 rounded-xl font-semibold text-white flex items-center justify-center transition-all bg-gray-700/50 hover:bg-gray-700/80 border border-gray-600/50"
                >
                    {historyLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <History className="w-4 h-4 mr-2" />
                    )}
                    Prediction History ({history.length} saved locally)
                    <ChevronsDown className={`w-4 h-4 ml-2 transition-transform ${historyExpanded ? 'rotate-180' : 'rotate-0'}`} />
                </button>

                <AnimatePresence>
                    {historyExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="mt-4 w-full bg-gray-900/70 rounded-xl overflow-hidden border border-gray-700"
                        >
                            {historyError && (
                                <div className="p-4 text-red-400 text-sm">Error loading history.</div>
                            )}
                            {history.length === 0 && !historyLoading && !historyError && (
                                <div className="p-4 text-gray-500 text-sm text-center">No history saved yet. Analyze an X-ray to start! (History is local to this session only)</div>
                            )}

                            <ul className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                                {history.map((item, index) => {
                                    const timestamp = new Date(item.timestamp);
                                    const detectionCount = item.yoloDetections.length;
                                    const hasFracture = detectionCount > 0;
                                    const firstDetection = hasFracture ? item.yoloDetections[0].name : 'No Fracture';

                                    return (
                                        <li key={item.id} className="p-4 hover:bg-gray-800/80 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-base">
                                                        {timestamp.toLocaleDateString()} at {timestamp.toLocaleTimeString()}
                                                    </p>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                        hasFracture ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'
                                                    }`}>
                                                        {hasFracture ? `Detected: ${firstDetection}` : 'Clean'}
                                                    </span>
                                                    <p className="text-gray-400 text-xs mt-1 truncate">File: {item.fileName}</p>
                                                </div>
                                                <button 
                                                    onClick={() => alert(`Full AI Analysis for ${timestamp.toLocaleString()}:\n\n${item.aiAnalysisText.substring(0, 500)}...`)} 
                                                    className="text-blue-400 hover:text-blue-300 text-sm p-1 ml-4 flex-shrink-0"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }


    return (
        <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-slate-900 to-gray-950 text-gray-100 relative overflow-hidden font-sans">
            <WavesBackground />

            {/* Top Section - Display and Progress */}
            <div className="flex flex-col items-center justify-center mt-16 relative w-full px-4">
                <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: done && !error ? 1.05 : 1 }}
                    transition={{
                        duration: 0.8,
                        repeat: done && !error ? Infinity : 0,
                        repeatType: "reverse",
                    }}
                    className={`relative w-full max-w-xl h-80 rounded-2xl flex items-center justify-center overflow-hidden transition-shadow duration-500 
                        ${error ? "shadow-[0_0_40px_rgba(239,68,68,0.6)]" : "shadow-[0_0_40px_rgba(59,130,246,0.6)]"} 
                        bg-gradient-to-br from-gray-800 to-gray-900 border-4 ${error ? "border-red-500" : "border-blue-500"}`}
                >
                    {/* Image/Preview Area */}
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl overflow-hidden bg-gray-700/50">
                        {fileUrl ? (
                            <img
                                src={fileUrl}
                                alt="X-ray Preview"
                                className="object-contain w-full h-full p-2"
                                style={{ filter: error ? 'grayscale(80%)' : 'none' }}
                            />
                        ) : (
                            <div className="text-gray-400 text-center p-8">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto mb-2 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                <p>Upload an X-ray image to begin analysis.</p>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-gray-900/50">
                        <div
                            className={`h-full transition-all duration-500 ${
                                error
                                    ? "bg-red-600"
                                    : done
                                        ? "bg-green-600"
                                        : "bg-blue-500"
                                }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Progress Text */}
                    <span className="absolute bottom-4 left-4 text-sm font-semibold text-white/80">
                        {loading ? `Analyzing... ${progress}%` : (done ? 'Done' : 'Ready')}
                    </span>

                    {/* Icons */}
                    <AnimatePresence>
                        {done && !error && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-400 p-4 rounded-full bg-black/50"
                            >
                                <Check className="w-12 h-12 stroke-2" />
                            </motion.div>
                        )}
                        {error && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 p-4 rounded-full bg-black/50"
                            >
                                <X className="w-12 h-12 stroke-2" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Prediction Results/Error Popup */}
                <AnimatePresence mode="wait">
                    {(done || error) && (
                        <motion.div
                            key={error ? "error" : "result"}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className={`mt-8 w-full max-w-xl p-6 rounded-xl shadow-xl border ${
                                error ? "bg-red-900/30 border-red-500/50" : "bg-green-900/30 border-green-500/50"
                                } flex flex-col items-center text-center`}
                        >
                            {error ? (
                                <>
                                    <p className="text-red-400 font-semibold mb-3">Model Prediction Failed</p>
                                    <p className="text-sm text-red-300">
                                        Could not connect to the model server or an error occurred during prediction. Check your Flask console for details.
                                    </p>
                                </>
                            ) : (
                                renderResult()
                            )}

                            <button
                                onClick={handleRedo}
                                className="mt-4 px-5 py-2 bg-gray-700/50 hover:bg-gray-600/70 rounded-full font-semibold text-sm text-white flex items-center transition-all"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" /> Start New Analysis
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Section - Controls and History */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="mb-12 w-[95%] max-w-3xl bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-[0_0_40px_rgba(30,58,138,0.4)] p-8 flex flex-col items-center border border-blue-800/50"
            >
                <h1 className="text-4xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">
                    AI Bone Detector (YOLO)
                </h1>
                <p className="text-center text-gray-400 text-sm mb-6 max-w-2xl leading-relaxed">
                    Upload your X-ray image. The YOLO object detection model will attempt to locate and classify any potential fractures.
                </p>

                <input
                    type="file"
                    id="file-upload" // Added ID for easier clicking
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mb-6 text-gray-300 text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30 transition-all"
                />

                {!done && !loading && (
                    <button
                        onClick={handleUpload}
                        disabled={!file || loading || !isAuthReady}
                        className={`px-8 py-3 rounded-full font-bold transition-all shadow-xl text-white text-lg
                            ${!file || loading || !isAuthReady
                                ? "bg-gray-600 cursor-not-allowed opacity-70"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/50 hover:shadow-blue-500/70"
                            }`}
                    >
                        {"Upload & Predict"}
                    </button>
                )}
                {loading && (
                    <div className="px-8 py-3 rounded-full font-bold text-lg text-white bg-gray-700 flex items-center">
                        <Loader2 className="w-5 h-5 mr-3 animate-spin text-blue-400" />
                        Loading...
                    </div>
                )}

                {/* History Log Component */}
                {isAuthReady && renderHistory()}

            </motion.div>
        </div>
    );
}

export default App;