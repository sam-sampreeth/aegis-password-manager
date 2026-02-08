import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { VaultItemDialog } from "@/components/vault/VaultItemDialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Search,
    Plus,
    Filter,
    User,
    KeyRound,
    Unlock,
    Cloud,
    Check,
    ArrowUpDown,
    X,
    Ghost,
    Copy,
    Star,
    SlidersHorizontal
} from "lucide-react";
import { motion } from "framer-motion";

import { VaultItemIcon } from "@/components/vault/VaultItemIcon";
import { AdvancedFilterDialog, FilterState } from "@/components/vault/AdvancedFilterDialog";
import { useVaultItems, VaultItem } from "@/hooks/useVault";
import { useVaultActivity } from "@/hooks/useVaultActivity";
import { useClipboard } from "@/context/ClipboardContext";
import { useProfile } from "@/hooks/useProfiles";

const AnimatedFilterList = ({ categories, selectedCategory, onSelect, onAdvancedClick }: { categories: string[], selectedCategory: string, onSelect: (c: string) => void, onAdvancedClick: () => void }) => {
    // ... (rest of the file until handleCreateNew)


    const specialFilters = ["All", "Favorites", "Weak"];
    const normalCategories = categories.filter(c => !specialFilters.includes(c));

    const renderItem = (cat: string) => (
        <DropdownMenuItem
            key={cat}
            onClick={() => onSelect(cat)}
            className="justify-between cursor-pointer"
        >
            <span className={selectedCategory === cat ? "text-blue-400 font-medium" : "text-neutral-300"}>
                {cat === "Weak" ? "Weak Passwords" : cat}
            </span>
            {selectedCategory === cat && (
                <motion.div
                    layoutId="filter-check"
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                </motion.div>
            )}
        </DropdownMenuItem>
    );

    return (
        <div className="flex flex-col">
            {specialFilters.map(renderItem)}
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <div className="px-2 py-1.5 text-xs text-neutral-500 font-medium uppercase tracking-wider">
                Categories
            </div>
            {normalCategories.map(renderItem)}

            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuItem
                onClick={onAdvancedClick}
                className="justify-between cursor-pointer group"
            >
                <span className="text-neutral-300 group-hover:text-white transition-colors">Advanced Filters...</span>
                <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 group-hover:text-blue-400" />
            </DropdownMenuItem>
        </div>
    );
};

export default function VaultPage() {
    const { items: vaultItems, loading: itemsLoading, addItem, updateItem, deleteItem } = useVaultItems();
    const { profile } = useProfile();
    const { logActivity } = useVaultActivity();
    const { copyToClipboard } = useClipboard();

    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [sortOption, setSortOption] = useState<"edited" | "created" | "name">("edited");
    const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // URL Deep Linking
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const openId = searchParams.get("openId");
        if (openId && !itemsLoading && vaultItems.length > 0) {
            const item = vaultItems.find(i => i.id === openId);
            if (item) {
                setSelectedItem(item);
                setIsDialogOpen(true);
                // Optional: clear param so refresh doesn't re-open, 
                // but keeping it is fine for "sharing" URLs conceptually.
                // For now, let's clear it to avoid stuck state if they close dialog.
                setSearchParams({}, { replace: true });
            }
        }
    }, [searchParams, vaultItems, itemsLoading, setSearchParams]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if active element is an input-like element
            const target = e.target as HTMLElement;
            const tagName = target.tagName ? target.tagName.toUpperCase() : "";

            if (
                tagName === "INPUT" ||
                tagName === "TEXTAREA" ||
                target.isContentEditable ||
                isDialogOpen // Disable shortcuts if dialog is open
            ) {
                return;
            }

            // Search shortcut: / or Ctrl+K
            if (e.key === "/" || (e.ctrlKey && e.key === "k")) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isDialogOpen]); // Re-bind when dialog state changes

    // Advanced Filter State
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        categories: [],
        tags: [],
        strengthRange: [0, 4],
        hasTotp: "any",
        isFavorite: "any",
        dateRange: {},
        showArchived: false,
    });

    const categories = ["All", "Social", "Work", "Finance", "Entertainment", "Other"];

    const [searchQuery, setSearchQuery] = useState("");

    const securityStats = useMemo(() => {
        const total = vaultItems.length;
        if (total === 0) return { score: 0, weakCount: 0, reusedCount: 0, oldCount: 0 };

        const now = new Date();
        const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90));

        // Create a map to count password occurrences
        const passwordCounts = new Map<string, number>();
        vaultItems.forEach(item => {
            passwordCounts.set(item.password, (passwordCounts.get(item.password) || 0) + 1);
        });

        let totalStrength = 0;
        let withTotp = 0;
        let weakItems = 0;
        let reusedItems = 0;
        let oldItems = 0;

        vaultItems.forEach(item => {
            totalStrength += item.strength;
            if (item.totpSecret) withTotp++;

            const isReused = (passwordCounts.get(item.password) || 0) > 1;
            if (isReused) reusedItems++;

            const isOld = new Date(item.updatedAt) < ninetyDaysAgo;
            if (isOld) oldItems++;

            // Weak Definition: Strength < 3 OR Old OR Reused
            if (item.strength < 3 || isOld || isReused) {
                weakItems++;
            }
        });

        const avgStrength = totalStrength / total;

        // Formula: Base (80 max) + Bonus (20 max) - Penalties
        const baseScore = (avgStrength / 4) * 80;
        const mfaBonus = (withTotp / total) * 20;
        const reusePenalty = (reusedItems / total) * 15;
        const oldPenalty = (oldItems / total) * 15;

        // Clamp between 0 and 100
        const score = Math.max(0, Math.min(100, Math.round(baseScore + mfaBonus - reusePenalty - oldPenalty)));

        return {
            score,
            weakCount: weakItems,
            reusedCount: reusedItems,
            oldCount: oldItems
        };
    }, [vaultItems]);

    const filteredItems = useMemo(() => {
        if (itemsLoading) return [];
        let items = [...vaultItems];

        // 1. Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            items = items.filter(item => {
                const matchesName = item.name.toLowerCase().includes(query);
                const matchesUsername = item.username.toLowerCase().includes(query);
                const matchesTags = item.tags.some(t => t.toLowerCase().includes(query));
                return matchesName || matchesUsername || matchesTags;
            });
        }

        // 2. Quick Filters (Dropdown)
        if (selectedCategory === "Favorites") {
            items = items.filter(item => item.favorite);
        } else if (selectedCategory === "Weak") {
            items = items.filter(item => item.strength < 3);
        } else if (selectedCategory !== "All") {
            items = items.filter(item => item.category === selectedCategory);
        }

        // 3. Advanced Filters
        if (activeFilters.categories.length > 0) {
            items = items.filter(item => activeFilters.categories.includes(item.category));
        }

        if (activeFilters.tags.length > 0) {
            items = items.filter(item => item.tags ? item.tags.some(t => activeFilters.tags.includes(t)) : false);
        }

        if (activeFilters.strengthRange[0] !== 0 || activeFilters.strengthRange[1] !== 4) {
            items = items.filter(item => item.strength >= activeFilters.strengthRange[0] && item.strength <= activeFilters.strengthRange[1]);
        }

        if (activeFilters.hasTotp !== "any") {
            items = items.filter(item => activeFilters.hasTotp === true ? !!item.totpSecret : !item.totpSecret);
        }

        if (activeFilters.isFavorite !== "any") {
            items = items.filter(item => activeFilters.isFavorite === true ? item.favorite : !item.favorite);
        }

        if (activeFilters.dateRange.from) {
            items = items.filter(item => {
                const itemDate = new Date(item.updatedAt);
                if (itemDate < activeFilters.dateRange.from!) return false;
                if (activeFilters.dateRange.to && itemDate > activeFilters.dateRange.to) return false;
                return true;
            });
        }

        // 4. Sorting
        items.sort((a, b) => {
            if (sortOption === "edited") {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            if (sortOption === "created") {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            if (sortOption === "name") {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });

        return items;
    }, [vaultItems, searchQuery, selectedCategory, sortOption, activeFilters, itemsLoading]);

    const handleItemClick = (item: VaultItem) => {
        setSelectedItem(item);
        setIsCreating(false);
        setIsDialogOpen(true);
    };

    const handleCreateNew = () => {
        const newItem: VaultItem = {
            id: "", // Will be assigned by DB
            name: "",
            username: "",
            password: "",
            urls: [],
            category: "Other",
            tags: [],
            strength: 0,
            favorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: [],
            version: 1
        };
        setSelectedItem(newItem);
        setIsCreating(true);
        setIsDialogOpen(true);
    };

    const toggleFavorite = async (e: React.MouseEvent, id: string, isFav: boolean) => {
        e.stopPropagation();
        await updateItem(id, { favorite: !isFav });
        logActivity("favorite", id);

        if (selectedItem?.id === id) {
            setSelectedItem(prev => prev ? ({ ...prev, favorite: !isFav }) : null);
        }
    };



    const confirmDelete = async () => {
        if (itemToDelete) {
            await deleteItem(itemToDelete);
            logActivity("delete", itemToDelete);
            setIsDeleteAlertOpen(false);
            setItemToDelete(null);
        }
    };

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white selection:bg-blue-500/30 overflow-hidden relative">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-900/10 via-zinc-950/50 to-zinc-950 pointer-events-none" />

            <main className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/30 backdrop-blur-md gap-4">
                    <div className="flex items-center gap-6 flex-1">
                        <div>
                            <h1 className="text-xl font-semibold whitespace-nowrap">
                                {useMemo(() => {
                                    const hour = new Date().getHours();
                                    const greetings = {
                                        late: ["Working late", "Burning the midnight oil", "The night is young"],
                                        early: ["Rise and shine", "Early bird gets the worm"],
                                        morning: ["Good morning", "Have a great day"],
                                        afternoon: ["Good afternoon", "How's the day going?"],
                                        evening: ["Good evening", "Winding down?"],
                                        night: ["Getting late", "Time to wrap up?"]
                                    };

                                    let timeSlot: keyof typeof greetings = "morning";
                                    if (hour < 4) timeSlot = "late";
                                    else if (hour < 7) timeSlot = "early";
                                    else if (hour < 12) timeSlot = "morning";
                                    else if (hour < 17) timeSlot = "afternoon";
                                    else if (hour < 22) timeSlot = "evening";
                                    else timeSlot = "night";

                                    const opts = greetings[timeSlot];
                                    return opts[Math.floor(Math.random() * opts.length)];
                                }, [])}, {profile?.display_name || "User"}
                            </h1>
                            <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                                <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <Unlock className="w-3 h-3" />
                                    <span className="font-medium">Unlocked</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-blue-400">
                                    <Cloud className="w-3 h-3" />
                                    <span>Backup Synced</span>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative max-w-md w-full hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search vault items (Press '/')..."
                                className="pl-9 w-full bg-zinc-900/50 border-white/10 focus:border-blue-500/50 transition-colors h-9 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button size="icon" variant="ghost" className="md:hidden text-neutral-400">
                            <Search className="w-4 h-4" />
                        </Button>

                        {/* Sort Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 border-white/10 bg-zinc-900/50 text-neutral-400 hover:text-white hover:bg-white/5 gap-2">
                                    <ArrowUpDown className="w-4 h-4" />
                                    <span className="hidden sm:inline">Sort</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-white/10 text-white">
                                <DropdownMenuItem onClick={() => setSortOption("edited")} className="justify-between">
                                    <span>Last Edited</span>
                                    {sortOption === "edited" && <Check className="w-4 h-4 text-blue-500" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOption("created")} className="justify-between">
                                    <span>Date Created</span>
                                    {sortOption === "created" && <Check className="w-4 h-4 text-blue-500" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOption("name")} className="justify-between">
                                    <span>Name (A-Z)</span>
                                    {sortOption === "name" && <Check className="w-4 h-4 text-blue-500" />}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Quick Filter Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className={`h-9 border-white/10 bg-zinc-900/50 hover:bg-white/5 gap-2 ${selectedCategory !== "All" ? "text-blue-400 border-blue-500/30" : "text-neutral-400 hover:text-white"}`}>
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">{selectedCategory === "All" ? "Filter" : selectedCategory}</span>
                                    {selectedCategory !== "All" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-white/10 text-white">
                                <AnimatedFilterList
                                    categories={categories}
                                    selectedCategory={selectedCategory}
                                    onSelect={setSelectedCategory}
                                    onAdvancedClick={() => setIsAdvancedFilterOpen(true)}
                                />
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 shadow-lg shadow-blue-500/20"
                            onClick={handleCreateNew}
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New Item</span>
                        </Button>
                    </div>
                </header>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="group p-4 rounded-xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all hover:border-blue-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="text-neutral-400 text-sm mb-1 relative z-10">Total Passwords</div>
                            <div className="text-2xl font-bold relative z-10">{itemsLoading ? "..." : vaultItems.length}</div>
                        </div>
                        <div className="group p-4 rounded-xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all hover:border-orange-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="text-neutral-400 text-sm mb-1 relative z-10">Weak Passwords</div>
                            <div className="text-2xl font-bold text-orange-400 relative z-10">
                                {itemsLoading ? "..." : securityStats.weakCount}
                            </div>
                        </div>
                        <div className="group p-4 rounded-xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all hover:border-emerald-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="text-neutral-400 text-sm mb-1 relative z-10">Security Score</div>
                            <div className={`text-2xl font-bold relative z-10 ${securityStats.score >= 80 ? "text-emerald-400" : securityStats.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                {itemsLoading ? "..." : securityStats.score}%
                            </div>
                        </div>
                    </div>

                    {/* List Header */}
                    <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md py-4 mb-4 -mx-6 px-6 border-b border-white/5 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-medium">{selectedCategory} Items</h2>
                            {/* Reset Buttons */}
                            <div className="flex items-center gap-2">
                                {sortOption !== "edited" && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-blue-400 hover:text-white hover:bg-white/10"
                                        onClick={() => setSortOption("edited")}
                                    >
                                        Reset Sort
                                        <X className="w-3 h-3 ml-1" />
                                    </Button>
                                )}
                                {(selectedCategory !== "All" ||
                                    activeFilters.categories.length > 0 ||
                                    activeFilters.tags.length > 0 ||
                                    activeFilters.strengthRange[0] !== 0 ||
                                    activeFilters.strengthRange[1] !== 4 ||
                                    activeFilters.hasTotp !== "any" ||
                                    activeFilters.isFavorite !== "any" ||
                                    activeFilters.dateRange.from ||
                                    activeFilters.showArchived
                                ) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs text-blue-400 hover:text-white hover:bg-white/10"
                                            onClick={() => {
                                                setSelectedCategory("All");
                                                setActiveFilters({
                                                    categories: [],
                                                    tags: [],
                                                    strengthRange: [0, 4],
                                                    hasTotp: "any",
                                                    isFavorite: "any",
                                                    dateRange: {},
                                                    showArchived: false,
                                                });
                                            }}
                                        >
                                            Reset Filters
                                            <X className="w-3 h-3 ml-1" />
                                        </Button>
                                    )}
                            </div>
                        </div>
                        <span className="text-sm text-white">{filteredItems.length} entries</span>
                    </div>

                    {/* Empty State */}
                    {filteredItems.length === 0 && !itemsLoading && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-white/5">
                                <Ghost className="w-8 h-8 text-neutral-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No items found</h3>
                            <p className="text-neutral-500 max-w-sm mb-6">
                                We couldn't find any items matching your current search or filters. Try adjusting them.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedCategory("All");
                                    setActiveFilters({
                                        categories: [],
                                        tags: [],
                                        strengthRange: [0, 4],
                                        hasTotp: "any",
                                        isFavorite: "any",
                                        dateRange: {},
                                        showArchived: false,
                                    });
                                }}
                            >
                                Clear All Filters
                            </Button>
                        </div>
                    )}

                    {/* List View */}
                    <div className="space-y-1 pb-20">
                        {itemsLoading ? (
                            // Skeleton Loading
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-16 bg-zinc-900/50 rounded-lg border border-white/5 animate-pulse" />
                            ))
                        ) : (
                            filteredItems.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    layoutId={item.id}
                                    onClick={() => handleItemClick(item)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="group flex items-center justify-between p-3 rounded-lg border border-white/5 bg-zinc-900/30 transition-all cursor-pointer hover:bg-zinc-900/80 hover:border-transparent hover:shadow-[0_0_0_1px_rgba(59,130,246,0.5)] relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 rounded-lg pointer-events-none transition-all duration-300 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20" style={{ padding: '1px', zIndex: -1, margin: '-1px' }} />
                                    <div className="absolute inset-0 rounded-lg bg-zinc-900/95 -z-10" />
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="relative shrink-0">
                                            <VaultItemIcon item={item} className="w-10 h-10 rounded-lg" />
                                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900 ${item.strength >= 4 ? 'bg-emerald-500' : item.strength >= 2 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-white truncate">{item.name || "Untitled"}</h3>
                                                {item.favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                            </div>
                                            <p className="text-xs text-neutral-500 truncate">{item.username || "—"}</p>
                                        </div>
                                    </div>

                                    {/* Desktop Columns */}
                                    <div className="hidden md:flex items-center gap-8 mr-8">
                                        <div className="w-32 truncate text-right">
                                            {(() => {
                                                const categoryColors: Record<string, string> = {
                                                    "Work": "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
                                                    "Personal": "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
                                                    "Social": "bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20",
                                                    "Finance": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
                                                    "Entertainment": "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
                                                    "Other": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20",
                                                };
                                                const colorClass = categoryColors[item.category] || categoryColors["Other"];
                                                return (
                                                    <Badge variant="outline" className={`${colorClass} font-normal transition-colors`}>
                                                        {item.category}
                                                    </Badge>
                                                );
                                            })()}
                                        </div>
                                        <div className="w-24 text-right text-xs text-neutral-400 font-mono">
                                            {new Date(item.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-neutral-400 hover:text-yellow-500 hover:bg-yellow-500/10"
                                            onClick={(e) => toggleFavorite(e, item.id, item.favorite)}
                                        >
                                            <Star className={`w-4 h-4 ${item.favorite ? "fill-current" : ""}`} />
                                        </Button>
                                        <div className="w-px h-4 bg-white/10 mx-1" />

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-neutral-400 hover:text-white hover:bg-white/10 gap-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Copy</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-white/10 text-white z-[60]">
                                                {item.username && (
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(item.username, "Username");
                                                    }}>
                                                        <User className="w-4 h-4 mr-2 text-neutral-400" /> Copy Username
                                                    </DropdownMenuItem>
                                                )}
                                                {item.password && (
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(item.password, "Password");
                                                    }}>
                                                        <KeyRound className="w-4 h-4 mr-2 text-neutral-400" /> Copy Password
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <VaultItemDialog
                item={selectedItem}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                isCreating={isCreating}
                onDelete={(id) => {
                    setIsDialogOpen(false);
                    setItemToDelete(id);
                    setIsDeleteAlertOpen(true);
                }}
                onSave={async (itemData) => {
                    try {
                        if (isCreating) {
                            await addItem(itemData);
                            logActivity("create", itemData.id as string || "new");
                        } else if (selectedItem?.id) {
                            await updateItem(selectedItem.id, itemData);
                            logActivity("update", selectedItem.id);
                        }
                        setIsDialogOpen(false);
                    } catch (e) {
                        // Error handled in hook (toast)
                    }
                }}
                onToggleFavorite={(id) => {
                    const item = vaultItems.find(i => i.id === id);
                    if (item) toggleFavorite({ stopPropagation: () => { } } as any, id, item.favorite);
                }}
            />

            <AdvancedFilterDialog
                open={isAdvancedFilterOpen}
                onOpenChange={setIsAdvancedFilterOpen}
                onApply={setActiveFilters}
                currentFilters={activeFilters}
            />

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-400">
                            This action cannot be undone. This will permanently delete the
                            password item from your vault.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}
