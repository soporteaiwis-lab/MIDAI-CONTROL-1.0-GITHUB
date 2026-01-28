import React, { useState, useEffect, useRef } from 'react';
import { storage, isConfigured } from '../firebase';
import { ref, uploadBytes, listAll, getDownloadURL } from 'firebase/storage';

interface CloudLibraryProps {
    onLoadSample: (url: string, name: string) => void;
}

interface CloudFile {
    name: string;
    fullPath: string;
    url?: string; // Optional URL for demo files
}

// Public samples for Demo Mode
const DEMO_FILES: CloudFile[] = [
    { name: "808 Kick", fullPath: "demo/kick", url: "https://tonejs.github.io/audio/drum-samples/808/kick.mp3" },
    { name: "808 Snare", fullPath: "demo/snare", url: "https://tonejs.github.io/audio/drum-samples/808/snare.mp3" },
    { name: "Salamander Piano C4", fullPath: "demo/piano", url: "https://tonejs.github.io/audio/salamander/C4.mp3" },
    { name: "Loop: Industrial", fullPath: "demo/loop", url: "https://tonejs.github.io/audio/loop/industrial.mp3" }
];

export const CloudLibrary: React.FC<CloudLibraryProps> = ({ onLoadSample }) => {
    const [files, setFiles] = useState<CloudFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isConfigured) {
            fetchFiles();
        } else {
            // Load demo files if Firebase is not configured
            setFiles(DEMO_FILES);
        }
    }, []);

    const fetchFiles = async () => {
        if (!storage) return;
        setLoading(true);
        try {
            const listRef = ref(storage, 'samples/');
            const res = await listAll(listRef);
            
            const fileList = res.items.map((item) => ({
                name: item.name,
                fullPath: item.fullPath,
            }));
            setFiles(fileList);
        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isConfigured) {
            alert("Please configure firebase.ts with your API keys to enable uploads.");
            return;
        }

        if (!storage || !e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        setUploading(true);

        try {
            const storageRef = ref(storage, `samples/${file.name}`);
            await uploadBytes(storageRef, file);
            console.log('Uploaded a blob or file!');
            await fetchFiles(); // Refresh list
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSelectSound = async (file: CloudFile) => {
        // If it's a demo file with a direct URL, use it
        if (file.url) {
            onLoadSample(file.url, file.name);
            return;
        }

        // Otherwise fetch from Firebase
        if (!storage) return;
        try {
            setLoading(true);
            const url = await getDownloadURL(ref(storage, file.fullPath));
            onLoadSample(url, file.name);
        } catch (error) {
            console.error("Error getting URL:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[300px]">
            {/* Cloud Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${isConfigured ? 'text-cyan-500' : 'text-amber-500'}`}>
                        <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
                        <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                    </svg>
                    <h3 className="font-tech text-slate-300 tracking-wider text-sm">
                        {isConfigured ? 'CLOUD LIBRARY' : 'DEMO LIBRARY'}
                    </h3>
                </div>
                <div>
                     <input 
                        type="file" 
                        accept="audio/*" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleUpload}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !isConfigured}
                        title={!isConfigured ? "Setup Firebase keys to upload" : "Upload File"}
                        className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1
                            ${uploading ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-wait' : ''}
                            ${!isConfigured ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'}
                        `}
                    >
                        {!isConfigured ? (
                           <><span>LOCKED</span></>
                        ) : uploading ? (
                            'UPLOADING...'
                        ) : (
                            '+ UPLOAD'
                        )}
                    </button>
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {loading && files.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-slate-500 text-xs animate-pulse">SYNCING...</div>
                ) : files.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-slate-600 text-xs">NO SAMPLES FOUND</div>
                ) : (
                    <div className="grid grid-cols-1 gap-1">
                        {files.map((file) => (
                            <button
                                key={file.fullPath}
                                onClick={() => handleSelectSound(file)}
                                className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700 text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded bg-slate-950 flex items-center justify-center transition-colors
                                        ${file.url ? 'text-amber-500/80 group-hover:text-amber-400' : 'text-slate-600 group-hover:text-cyan-400 group-hover:bg-slate-900'}
                                    `}>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298 1.049l-3.25 5.629a.75.75 0 01-.298.351l-.5.25a.75.75 0 01-.671 0l-.5-.25a.75.75 0 01-.298-.351l-3.25-5.63a.75.75 0 011.048-.298L13.5 3.39l2.451-1.414a.75.75 0 011.05.298zM3 13.5a1.5 1.5 0 011.5-1.5h15a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 19.5v-6z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-slate-300 group-hover:text-white truncate max-w-[150px]">{file.name}</span>
                                        <span className="text-[10px] text-slate-600 font-mono">
                                            {file.url ? 'DEMO ASSET' : 'CLOUD ASSET'}
                                        </span>
                                    </div>
                                </div>
                                <div className={`text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity ${file.url ? 'text-amber-500' : 'text-cyan-500'}`}>
                                    LOAD
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <div className={`p-2 text-[10px] text-center border-t font-mono ${isConfigured ? 'bg-slate-950 text-slate-600 border-slate-900' : 'bg-amber-900/20 text-amber-500/70 border-amber-900/30'}`}>
                {isConfigured ? 'CONNECTED TO FIREBASE STORAGE' : 'DEMO MODE - NO CLOUD KEY'}
            </div>
        </div>
    );
};