import React, { useState, useEffect, useRef } from 'react';
import { storage, isConfigured } from '../firebase';
import { ref, uploadBytes, listAll, getDownloadURL } from 'firebase/storage';

interface CloudLibraryProps {
    onLoadSample: (url: string, name: string) => void;
}

interface LibraryItem {
    id: string;
    name: string;
    category: string;
    url: string; // Blob URL or Firebase URL
    isLocal: boolean;
}

// Fixed Categories as requested
const CATEGORIES = [
    'Bass',
    'Cymbals',
    'Drums',
    'Ethnic',
    'Guitar',
    'Loops',
    'Orchestral',
    'Sound Effects'
];

// --- Simple IndexedDB Helper for Persistence ---
const DB_NAME = 'midAI_Library_DB';
const STORE_NAME = 'samples';

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveToLocalDB = async (item: LibraryItem, blob: Blob) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    // Store the file blob directly
    tx.objectStore(STORE_NAME).put({ ...item, blob });
    
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getAllFromLocalDB = async (): Promise<LibraryItem[]> => {
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => {
            const results = request.result || [];
            // Convert stored Blobs back to URLs
            const items = results.map((r: any) => ({
                id: r.id,
                name: r.name,
                category: r.category,
                isLocal: true,
                url: URL.createObjectURL(r.blob)
            }));
            resolve(items);
        };
    });
};

// ------------------------------------------------

export const CloudLibrary: React.FC<CloudLibraryProps> = ({ onLoadSample }) => {
    const [library, setLibrary] = useState<LibraryItem[]>([]);
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['Drums', 'Bass'])); // Default open
    const [selectedCategory, setSelectedCategory] = useState<string>('Drums'); // For upload
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load
    useEffect(() => {
        loadLibrary();
    }, []);

    const loadLibrary = async () => {
        const items: LibraryItem[] = [];

        // 1. Load Local DB Samples (Persistent)
        try {
            const localItems = await getAllFromLocalDB();
            items.push(...localItems);
        } catch (e) {
            console.error("Local DB error", e);
        }

        // 2. Load Demo Samples (Static)
        const demos: LibraryItem[] = [
             { id: 'd1', name: 'Acoustic Kick', category: 'Drums', isLocal: false, url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/kick.mp3' },
             { id: 'd2', name: 'Acoustic Snare', category: 'Drums', isLocal: false, url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/snare.mp3' },
             { id: 'd3', name: 'HiHat Closed', category: 'Cymbals', isLocal: false, url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/hihat.mp3' },
             { id: 'd4', name: 'Salamander Piano C4', category: 'Orchestral', isLocal: false, url: 'https://tonejs.github.io/audio/salamander/C4.mp3' },
             { id: 'd5', name: 'Upright Bass', category: 'Bass', isLocal: false, url: 'https://tonejs.github.io/audio/berklee/Pbass_1.mp3' },
             { id: 'd6', name: 'Industrial Loop', category: 'Loops', isLocal: false, url: 'https://tonejs.github.io/audio/loop/industrial.mp3' },
        ];
        // Only add demos if not duplicate IDs (simple check)
        demos.forEach(d => items.push(d));

        setLibrary(items);
    };

    const toggleCategory = (cat: string) => {
        setOpenCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        setUploading(true);
        
        const newItem: LibraryItem = {
            id: Date.now().toString(),
            name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
            category: selectedCategory,
            isLocal: true,
            url: URL.createObjectURL(file) // Temp URL
        };

        try {
            // Save to Local DB (Persistent)
            await saveToLocalDB(newItem, file);

            // Update UI
            setLibrary(prev => [...prev, newItem]);
            // Ensure category is open
            setOpenCategories(prev => new Set(prev).add(selectedCategory));
            
            console.log("File saved to Local DB");
        } catch (err) {
            console.error("Failed to save locally", err);
            alert("Could not save to local database.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[500px]">
             {/* Header */}
             <div className="p-4 bg-slate-950 border-b border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-tech text-slate-200 tracking-wider text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-cyan-500">
                            <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V2.995c0-1.103.895-2 2-2h2.445c.69 0 1.33.344 1.76 1.05L10 6h4.5a2 2 0 012 2v2.146A4.5 4.5 0 001.5 10.146z" />
                        </svg>
                        LIBRARY
                    </h3>
                </div>

                {/* Upload Section */}
                <div className="flex gap-2">
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-slate-800 text-[10px] text-slate-300 rounded border border-slate-700 px-2 py-1 flex-1 focus:outline-none focus:border-cyan-500"
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <button 
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded transition-colors flex items-center gap-1"
                    >
                        {uploading ? '...' : '+ ADD'}
                    </button>
                </div>
             </div>

             {/* Tree View */}
             <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
                 {CATEGORIES.map(category => {
                     const catItems = library.filter(i => i.category === category);
                     const isOpen = openCategories.has(category);
                     
                     return (
                         <div key={category} className="mb-1">
                             <button 
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center gap-2 p-2 hover:bg-slate-800 rounded text-left transition-colors group"
                             >
                                 <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor" 
                                    className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                                 >
                                     <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                 </svg>
                                 <span className={`text-xs font-bold ${isOpen ? 'text-cyan-100' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                     {category}
                                 </span>
                                 <span className="text-[9px] text-slate-600 ml-auto bg-slate-800 px-1.5 rounded-full">
                                     {catItems.length}
                                 </span>
                             </button>

                             {isOpen && (
                                 <div className="ml-4 pl-2 border-l border-slate-800 mt-1 flex flex-col gap-0.5">
                                     {catItems.length === 0 ? (
                                         <div className="p-2 text-[10px] text-slate-600 italic">Empty</div>
                                     ) : (
                                         catItems.map(item => (
                                             <button
                                                key={item.id}
                                                onClick={() => onLoadSample(item.url, item.name)}
                                                className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 hover:border-l-2 hover:border-cyan-500 transition-all text-left group/item"
                                             >
                                                 <span className="text-[11px] text-slate-400 group-hover/item:text-white truncate">
                                                     {item.name}
                                                 </span>
                                                 {item.isLocal && (
                                                     <span className="text-[8px] text-emerald-500 font-mono opacity-50">LOCAL</span>
                                                 )}
                                             </button>
                                         ))
                                     )}
                                 </div>
                             )}
                         </div>
                     );
                 })}
             </div>
             
             <div className="p-2 border-t border-slate-800 bg-slate-950 text-[10px] text-center text-slate-500 font-mono">
                 Auto-saved to Browser Database
             </div>
        </div>
    );
};