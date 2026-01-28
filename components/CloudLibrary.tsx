import React, { useState, useEffect, useRef } from 'react';

interface CloudLibraryProps {
    onLoadSample: (url: string, name: string) => void;
}

interface LibraryItem {
    id: string;
    name: string;
    category: string;
    url: string; 
    isLocal: boolean;
}

const CATEGORIES = [
    'User Uploads',
    'Drums',
    'Bass',
    'Synths',
    'FX',
    'Orchestral'
];

// --- IndexedDB Logic (Same as before, just ensured stability) ---
const DB_NAME = 'midAI_Library_DB_v2';
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
            const items = results.map((r: any) => ({
                id: r.id,
                name: r.name,
                category: 'User Uploads', // Force local uploads to this category
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
    const [activeCategory, setActiveCategory] = useState<string>('Drums');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            const items: LibraryItem[] = [];
            
            // Demos
            const demos: LibraryItem[] = [
                 { id: 'd1', name: 'Kick_Hard_01', category: 'Drums', isLocal: false, url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/kick.mp3' },
                 { id: 'd2', name: 'Snare_Dry', category: 'Drums', isLocal: false, url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/snare.mp3' },
                 { id: 'd3', name: 'HiHat_Closed', category: 'Drums', isLocal: false, url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/hihat.mp3' },
                 { id: 'd4', name: 'Piano_C4_Clean', category: 'Orchestral', isLocal: false, url: 'https://tonejs.github.io/audio/salamander/C4.mp3' },
                 { id: 'd5', name: 'Bass_Upright', category: 'Bass', isLocal: false, url: 'https://tonejs.github.io/audio/berklee/Pbass_1.mp3' },
                 { id: 'd6', name: 'Industrial_Loop', category: 'FX', isLocal: false, url: 'https://tonejs.github.io/audio/loop/industrial.mp3' },
                 { id: 'd7', name: 'Synth_Pulse_A', category: 'Synths', isLocal: false, url: 'https://tonejs.github.io/audio/casio/A1.mp3' },
            ];
            items.push(...demos);

            try {
                const localItems = await getAllFromLocalDB();
                items.push(...localItems);
            } catch (e) { console.error(e); }

            setLibrary(items);
        };
        load();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploading(true);
        
        const newItem: LibraryItem = {
            id: Date.now().toString(),
            name: file.name.replace(/\.[^/.]+$/, "").substring(0, 20),
            category: 'User Uploads',
            isLocal: true,
            url: URL.createObjectURL(file)
        };

        try {
            await saveToLocalDB(newItem, file);
            setLibrary(prev => [...prev, newItem]);
            setActiveCategory('User Uploads');
            // Auto select newly uploaded
            setSelectedId(newItem.id);
            onLoadSample(newItem.url, newItem.name);
        } catch (err) {
            alert("Storage limit reached or error.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSelectSample = (item: LibraryItem) => {
        setSelectedId(item.id);
        onLoadSample(item.url, item.name);
    };

    const filteredItems = library.filter(i => i.category === activeCategory);

    return (
        <div className="flex flex-col h-full bg-black text-cyan-500 font-mono text-xs select-none">
             {/* Header / Action Bar */}
             <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-900/50">
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-slate-500 font-tech tracking-wider">BROWSER // </span>
                     <span className="text-cyan-300 font-bold">{activeCategory.toUpperCase()}</span>
                 </div>
                 <div>
                    <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-cyan-900/40 hover:bg-cyan-500 hover:text-black border border-cyan-700/50 text-cyan-400 px-3 py-1 rounded-sm text-[9px] font-bold transition-all uppercase tracking-wide flex items-center gap-1"
                    >
                        {uploading ? 'UPLOADING...' : '[ + IMPORT SAMPLE ]'}
                    </button>
                 </div>
             </div>

             {/* Main Browser View */}
             <div className="flex-1 flex min-h-0">
                 {/* Left Column: Categories */}
                 <div className="w-1/3 border-r border-slate-800 bg-slate-950 flex flex-col overflow-y-auto scrollbar-none">
                     {CATEGORIES.map(cat => (
                         <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-2 text-left truncate transition-colors border-l-2 ${activeCategory === cat ? 'bg-cyan-900/20 text-white border-cyan-500' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`}
                         >
                            {activeCategory === cat && <span className="mr-1 text-cyan-500">›</span>}
                            {cat}
                         </button>
                     ))}
                 </div>

                 {/* Right Column: Files */}
                 <div className="w-2/3 bg-black flex flex-col overflow-y-auto relative">
                     {/* Background Grid */}
                     <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,1)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                     {filteredItems.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-full text-slate-600">
                             <span className="mb-2 opacity-50 text-2xl">∅</span>
                             <span>NO DATA FOUND</span>
                         </div>
                     ) : (
                         <div className="flex flex-col p-1 z-10">
                             {filteredItems.map(item => (
                                 <button
                                    key={item.id}
                                    onClick={() => handleSelectSample(item)}
                                    className={`flex items-center justify-between p-2 mb-1 rounded-sm border border-transparent group transition-all
                                        ${selectedId === item.id 
                                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                                            : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                                        }
                                    `}
                                 >
                                     <span className="truncate">{item.name}</span>
                                     {item.isLocal && <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded">USR</span>}
                                 </button>
                             ))}
                         </div>
                     )}
                 </div>
             </div>

             {/* Footer Info */}
             <div className="p-1 bg-slate-900 border-t border-slate-800 flex justify-between text-[9px] text-slate-600 font-mono">
                 <span>ITEMS: {filteredItems.length}</span>
                 <span>DB: {uploading ? 'WRITING...' : 'READY'}</span>
             </div>
        </div>
    );
};