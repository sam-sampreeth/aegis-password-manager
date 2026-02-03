import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
    CalendarIcon,
    X,
    Filter,
    Tags,
    ShieldAlert,
    Clock,
    RotateCw
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface FilterState {
    categories: string[];
    tags: string[];
    strengthRange: [number, number];
    hasTotp: boolean | "any";
    isFavorite: boolean | "any";
    dateRange: { from?: Date; to?: Date };
    showArchived: boolean;
}

const DEFAULT_FILTERS: FilterState = {
    categories: [],
    tags: [],
    strengthRange: [0, 4],
    hasTotp: "any",
    isFavorite: "any",
    dateRange: {},
    showArchived: false,
};

// Mock data for filter options
const AVAILABLE_CATEGORIES = ["Social", "Work", "Finance", "Entertainment", "Other"];
const AVAILABLE_TAGS = ["email", "work", "banking", "streaming", "dev", "gaming", "shopping"];

interface AdvancedFilterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (filters: FilterState) => void;
    currentFilters: FilterState;  // Accept current filters state
}

export function AdvancedFilterDialog({ open, onOpenChange, onApply, currentFilters }: AdvancedFilterDialogProps) {
    const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters || DEFAULT_FILTERS);

    const toggleCategory = (cat: string) => {
        setLocalFilters(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    const toggleTag = (tag: string) => {
        setLocalFilters(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    };

    const resetFilters = () => {
        setLocalFilters(DEFAULT_FILTERS);
    };

    const handleApply = () => {
        onApply(localFilters);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-zinc-950 border-white/10 text-white p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/30">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <Filter className="w-5 h-5 text-blue-500" />
                        Advanced Filters
                    </DialogTitle>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Categories Section */}
                    <div className="space-y-3">
                        <Label className="text-neutral-400 uppercase text-xs font-bold tracking-wider">Categories</Label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_CATEGORIES.map(cat => (
                                <Badge
                                    key={cat}
                                    variant="outline"
                                    className={cn(
                                        "cursor-pointer px-3 py-1.5 border-white/10 transition-all select-none hover:border-blue-500/50",
                                        localFilters.categories.includes(cat)
                                            ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                                            : "bg-zinc-900/50 text-neutral-400 hover:text-neutral-200"
                                    )}
                                    onClick={() => toggleCategory(cat)}
                                >
                                    {cat}
                                    {localFilters.categories.includes(cat) && <X className="w-3 h-3 ml-2 hover:text-white" />}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Tags Section */}
                    <div className="space-y-3">
                        <Label className="text-neutral-400 uppercase text-xs font-bold tracking-wider flex items-center gap-2">
                            <Tags className="w-3 h-3" />
                            Tags
                        </Label>
                        <div className="flex flex-wrap gap-2 p-4 rounded-lg border border-white/5 bg-zinc-900/20 max-h-32 overflow-y-auto">
                            {AVAILABLE_TAGS.map(tag => (
                                <div
                                    key={tag}
                                    className={cn(
                                        "cursor-pointer text-sm px-3 py-1 rounded-md flex items-center gap-2 transition-colors",
                                        localFilters.tags.includes(tag)
                                            ? "bg-purple-500/20 text-purple-400"
                                            : "bg-zinc-800/50 text-neutral-500 hover:bg-zinc-800 hover:text-neutral-300"
                                    )}
                                    onClick={() => toggleTag(tag)}
                                >
                                    <span>#{tag}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Strength Slider */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-neutral-400 uppercase text-xs font-bold tracking-wider flex items-center gap-2">
                                <ShieldAlert className="w-3 h-3" />
                                Password Strength
                            </Label>
                            <span className="text-xs font-mono text-blue-400">
                                {localFilters.strengthRange[0]} - {localFilters.strengthRange[1]}
                            </span>
                        </div>
                        <div className="px-2">
                            <Slider
                                defaultValue={[0, 4]}
                                value={localFilters.strengthRange}
                                max={4}
                                step={1}
                                minStepsBetweenThumbs={0}
                                onValueChange={(val) => setLocalFilters(prev => ({ ...prev, strengthRange: val as [number, number] }))}
                                className="py-4"
                            />
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 px-1">
                            <span>V. Weak</span>
                            <span>Weak</span>
                            <span>Fair</span>
                            <span>Good</span>
                            <span>Strong</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Date Range */}
                        <div className="space-y-3">
                            <Label className="text-neutral-400 uppercase text-xs font-bold tracking-wider flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Last Updated
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal bg-zinc-900/50 border-white/10 hover:bg-zinc-900",
                                            !localFilters.dateRange?.from && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {localFilters.dateRange?.from ? (
                                            localFilters.dateRange.to ? (
                                                <>
                                                    {format(localFilters.dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(localFilters.dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(localFilters.dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-950 border-white/10" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={localFilters.dateRange?.from}
                                        selected={localFilters.dateRange}
                                        onSelect={(range) => setLocalFilters(prev => ({ ...prev, dateRange: range as any }))}
                                        numberOfMonths={2}
                                        className="bg-zinc-950 text-white"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-3">
                            <Label className="text-neutral-400 uppercase text-xs font-bold tracking-wider">Properties</Label>
                            <div className="space-y-4 pt-1">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="totp"
                                        checked={localFilters.hasTotp === true}
                                        onCheckedChange={(c) => setLocalFilters(prev => ({ ...prev, hasTotp: c ? true : "any" }))}
                                        className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <Label htmlFor="totp" className="leading-none cursor-pointer">Has TOTP enabled</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="fav"
                                        checked={localFilters.isFavorite === true}
                                        onCheckedChange={(c) => setLocalFilters(prev => ({ ...prev, isFavorite: c ? true : "any" }))}
                                        className="border-white/20 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500 text-black"
                                    />
                                    <Label htmlFor="fav" className="leading-none cursor-pointer">Only Favorites</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="archived"
                                        checked={localFilters.showArchived}
                                        onCheckedChange={(c) => setLocalFilters(prev => ({ ...prev, showArchived: !!c }))}
                                        className="border-white/20"
                                    />
                                    <Label htmlFor="archived" className="leading-none cursor-pointer text-neutral-400">Include Archived Items</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 border-t border-white/10 bg-zinc-900/30">
                    <div className="flex justify-between w-full items-center">
                        <div className="text-xs text-neutral-500">
                            {(localFilters.categories.length + localFilters.tags.length) > 0 &&
                                `${localFilters.categories.length + localFilters.tags.length} filters active`
                            }
                        </div>
                        <div className="flex gap-2 w-full justify-between">
                            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-neutral-400 hover:text-white h-9 px-2 hover:bg-white/5">
                                <RotateCw className="w-3.5 h-3.5 mr-2" />
                                Reset Defaults
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/5">Cancel</Button>
                                <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
