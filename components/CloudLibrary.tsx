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

// Default Categories
const DEFAULT_CATEGORIES = [
    'User Uploads',
    'Drums',
    'Bass',
    'Synths',
    'FX',
    'Orchestral'
];

// --- IndexedDB Logic ---
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

const deleteFromLocalDB = async (id: string) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
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
                category: r.category || 'User Uploads',
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
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [activeCategory, setActiveCategory] = useState<string>('Drums');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [newCatName, setNewCatName] = useState("");
    const [isAddingCat, setIsAddingCat] = useState(false);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            // Load Categories from LocalStorage
            const storedCats = localStorage.getItem('midAI_categories');
            if (storedCats) {
                setCategories(JSON.parse(storedCats));
            }

            const items: LibraryItem[] = [];
            
            // Fixed Demos (Using more reliable URLs if possible, but keeping originals)
            // Note: github.io is generally reliable but can have rate limits.
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

    // Persist Categories
    useEffect(() => {
        localStorage.setItem('midAI_categories', JSON.stringify(categories));
    }, [categories]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploading(true);
        
        const newItem: LibraryItem = {
            id: Date.now().toString(),
            name: file.name.replace(/\.[^/.]+$/, "").substring(0, 20),
            category: activeCategory, // Use current category
            isLocal: true,
            url: URL.createObjectURL(file)
        };

        try {
            await saveToLocalDB(newItem, file);
            setLibrary(prev => [...prev, newItem]);
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

    const handleDeleteSample = async (e: React.MouseEvent, item: LibraryItem) => {
        e.stopPropagation();
        if (!confirm(`Delete "${item.name}"?`)) return;

        if (item.isLocal) {
            await deleteFromLocalDB(item.id);
        }
        setLibrary(prev => prev.filter(i => i.id !== item.id));
        if (selectedId === item.id) setSelectedId(null);
    };

    const handleAddCategory = () => {
        if (!newCatName.trim()) return;
        if (!categories.includes(newCatName.trim())) {
            setCategories(prev => [...prev, newCatName.trim()]);
            setActiveCategory(newCatName.trim());
        }
        setNewCatName("");
        setIsAddingCat(false);
    };

    const handleDeleteCategory = (e: React.MouseEvent, cat: string) => {
        e.stopPropagation();
        if (DEFAULT_CATEGORIES.includes(cat)) {
            alert("Cannot delete default categories.");
            return;
        }
        if (!confirm(`Delete category "${cat}"? Samples will move to User Uploads.`)) return;

        // Move samples to Default
        setLibrary(prev => prev.map(item => item.category === cat ? { ...item, category: 'User Uploads' } : item));
        
        // Remove Category
        setCategories(prev => prev.filter(c => c !== cat));
        if (activeCategory === cat) setActiveCategory('User Uploads');
    };

    const filteredItems = library.filter(i => i.category === activeCategory);

    return (
        <div className="flex flex-col h-full bg-black text-cyan-500 font-mono text-xs select-none">
             {/* Header / Action Bar */}
             <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-900/50 shrink-0">
                 <div className="flex items-center gap-2 overflow-hidden">
                     <span className="text-[10px] text-slate-500 font-tech tracking-wider hidden sm:inline">BROWSER // </span>
                     <span className="text-cyan-300 font-bold truncate">{activeCategory.toUpperCase()}</span>
                 </div>
                 <div className="shrink-0">
                    <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-cyan-900/40 hover:bg-cyan-500 hover:text-black border border-cyan-700/50 text-cyan-400 px-3 py-1 rounded-sm text-[9px] font-bold transition-all uppercase tracking-wide flex items-center gap-1"
                    >
                        {uploading ? 'UPLOADING...' : '[ + IMPORT ]'}
                    </button>
                 </div>
             </div>

             {/* Main Browser View */}
             <div className="flex-1 flex min-h-0 overflow-hidden">
                 {/* Left Column: Categories */}
                 <div className="w-1/3 md:w-1/4 border-r border-slate-800 bg-slate-950 flex flex-col">
                     <div className="flex-1 overflow-y-auto scrollbar-none">
                        {categories.map(cat => (
                            <div 
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`group px-3 py-2 flex justify-between items-center cursor-pointer border-l-2 transition-colors
                                    ${activeCategory === cat ? 'bg-cyan-900/20 text-white border-cyan-500' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}
                                `}
                            >
                                <span className="truncate text-[10px] md:text-xs">{cat}</span>
                                {!DEFAULT_CATEGORIES.includes(cat) && (
                                    <button 
                                        onClick={(e) => handleDeleteCategory(e, cat)}
                                        className="opacity-0 group-hover:opacity-100 text-[9px] text-red-500 hover:text-red-300 px-1"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                     </div>
                     {/* Add Category Input */}
                     <div className="p-2 border-t border-slate-800 bg-slate-900">
                         {isAddingCat ? (
                             <div className="flex gap-1">
                                 <input 
                                    autoFocus
                                    className="w-full bg-black border border-slate-700 text-white text-[10px] px-1 rounded focus:border-cyan-500 outline-none"
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                    onBlur={() => !newCatName && setIsAddingCat(false)}
                                    placeholder="Name..."
                                 />
                                 <button onClick={handleAddCategory} className="text-cyan-500 text-[10px]">OK</button>
                             </div>
                         ) : (
                             <button 
                                onClick={() => setIsAddingCat(true)}
                                className="w-full text-center text-[9px] text-slate-500 hover:text-cyan-400 border border-dashed border-slate-700 rounded py-1"
                             >
                                 + NEW FOLDER
                             </button>
                         )}
                     </div>
                 </div>

                 {/* Right Column: Files */}
                 <div className="flex-1 bg-black flex flex-col overflow-y-auto relative">
                     {/* Background Grid */}
                     <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,1)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                     {filteredItems.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-full text-slate-600 p-4 text-center">
                             <span className="mb-2 opacity-50 text-2xl">∅</span>
                             <span>EMPTY FOLDER</span>
                             <span className="text-[9px] mt-1 opacity-50">Drop files or click Import</span>
                         </div>
                     ) : (
                         <div className="flex flex-col p-1 z-10">
                             {filteredItems.map(item => (
                                 <div
                                    key={item.id}
                                    className={`flex items-center justify-between p-2 mb-1 rounded-sm border border-transparent group transition-all cursor-pointer
                                        ${selectedId === item.id 
                                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                                            : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                                        }
                                    `}
                                    onClick={() => handleSelectSample(item)}
                                 >
                                     <span className="truncate mr-2">{item.name}</span>
                                     <div className="flex items-center gap-2 shrink-0">
                                         {item.isLocal && <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded">USR</span>}
                                         <button 
                                            onClick={(e) => handleDeleteSample(e, item)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-opacity"
                                            title="Delete Sample"
                                         >
                                             <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                         </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
             </div>

             {/* Footer Info */}
             <div className="p-1 bg-slate-900 border-t border-slate-800 flex justify-between text-[9px] text-slate-600 font-mono shrink-0">
                 <span>{filteredItems.length} SAMPLES</span>
                 <span>{uploading ? 'SAVING...' : 'READY'}</span>
             </div>
        </div>
    );
};