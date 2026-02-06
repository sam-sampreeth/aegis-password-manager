import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, RefreshCcw, Search, MoreVertical, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
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
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils";
import { VaultItemIcon } from "@/components/vault/VaultItemIcon";
import { useVaultTrash } from "@/hooks/useVault";

export default function TrashPage() {
    const { trashItems, loading, restoreFromTrash, permanentDelete, emptyTrash } = useVaultTrash();
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmAction, setConfirmAction] = useState<null | 'restore_all' | 'empty_trash'>(null);

    const filteredItems = trashItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleConfirmAction = async () => {
        if (confirmAction === 'empty_trash') {
            await emptyTrash();
        } else if (confirmAction === 'restore_all') {
            // Restore all currently filtered/available items
            // Sequential for now, or batch if API supported
            for (const item of trashItems) {
                await restoreFromTrash(item.id);
            }
        }
        setConfirmAction(null);
    };

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden relative">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <h1 className="text-xl font-semibold">Trash</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64 hidden md:block">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                            <Input
                                placeholder="Search deleted items..."
                                className="pl-8 bg-zinc-900/50 border-white/10 focus:border-red-500/50 focus:ring-red-500/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {trashItems.length > 0 && (
                            <div className="flex items-center gap-2">
                                {/* Restore All Button - disabled for now as it's complex */}
                                {/* 
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-white/10 hover:bg-zinc-800 text-neutral-400 hover:text-white"
                                    onClick={() => setConfirmAction('restore_all')}
                                >
                                    <RefreshCcw className="w-4 h-4 mr-2" /> Restore All
                                </Button> 
                                */}
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                                    onClick={() => setConfirmAction('empty_trash')}
                                >
                                    Empty Trash
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center gap-2 mb-6 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-yellow-500/80 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Items in trash will be permanently deleted after 30 days.</span>
                        </div>

                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                <div className="flex justify-center p-10"><div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-blue-500 rounded-full" /></div>
                            ) : filteredItems.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center h-64 text-neutral-500 gap-4"
                                >
                                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                                        <Trash2 className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p>Trash is empty</p>
                                </motion.div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredItems.map((item) => (
                                        <motion.div
                                            key={item.id} // Trash ID
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="group flex items-center justify-between p-4 rounded-lg border border-white/5 bg-zinc-900/30 hover:bg-zinc-900 hover:border-white/10 transition-all cursor-default"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <VaultItemIcon item={item} className="w-10 h-10 rounded-lg" />
                                                <div className="min-w-0">
                                                    <div className="font-medium text-white truncate decoration-neutral-500">{item.name}</div>
                                                    <div className="text-sm text-neutral-500 truncate">{item.username}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-neutral-400 hover:text-white"
                                                    onClick={() => restoreFromTrash(item.id)}
                                                >
                                                    <RefreshCcw className="w-4 h-4 mr-2" /> Restore
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-white">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-white/10 text-white">
                                                        <DropdownMenuItem onClick={() => restoreFromTrash(item.id)}>
                                                            <RefreshCcw className="w-4 h-4 mr-2 text-neutral-400" />
                                                            <span>Restore</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => permanentDelete(item.id)} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            <span>Delete Forever</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                    <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-neutral-400">
                                {confirmAction === 'empty_trash'
                                    ? "This will permanently delete all items in the trash. This action cannot be undone."
                                    : "This will restore all items from the trash back to your vault."
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className={cn(
                                    "text-white",
                                    confirmAction === 'empty_trash' ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                                )}
                                onClick={handleConfirmAction}
                            >
                                {confirmAction === 'empty_trash' ? "Delete Forever" : "Restore All"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
