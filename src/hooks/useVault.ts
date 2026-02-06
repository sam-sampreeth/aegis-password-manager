import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../types/database.types';
import { toast } from 'sonner';

// Unified VaultItem type for UI
export type VaultItem = {
    id: string;
    name: string;
    username: string;
    password: string;
    urls: string[];
    category: "Social" | "Work" | "Finance" | "Entertainment" | "Other";
    tags: string[];
    strength: number;
    totpSecret?: string;
    favorite: boolean;
    createdAt: string;
    updatedAt: string;
    version: number;
    history: any[];
};

export type TrashItem = VaultItem & {
    trashedAt: string;
    expiresAt: string;
    originalItemId: string;
};

// Database Row Types
type DbVaultItem = Database['public']['Tables']['vault_items']['Row'];
type DbVaultTrash = Database['public']['Tables']['vault_trash']['Row'];

// --- Helper Functions ---

// "Decrypt" (Parse Base64 JSON)
const parseItem = (dbItem: DbVaultItem): VaultItem => {
    let decrypted: any = {};
    try {
        const jsonStr = atob(dbItem.encrypted_blob);
        decrypted = JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to decrypt item", dbItem.id, e);
        decrypted = { username: "", password: "", urls: [], totpSecret: "", history: [] };
    }

    return {
        id: dbItem.id,
        name: dbItem.name, // Prefer DB column
        category: (dbItem.category as any) || "Other",
        tags: dbItem.tags || [],
        favorite: dbItem.favorite || false,
        strength: dbItem.strength_score || 0,
        createdAt: dbItem.created_at,
        updatedAt: dbItem.updated_at,
        version: dbItem.modified_count || 1,

        // Decrypted fields
        username: decrypted.username || "",
        password: decrypted.password || "",
        urls: decrypted.urls || [],
        totpSecret: decrypted.totpSecret,
        history: decrypted.history || []
    };
};

const parseTrashItem = (dbItem: DbVaultTrash): TrashItem => {
    let decrypted: any = {};
    try {
        const jsonStr = atob(dbItem.encrypted_blob);
        decrypted = JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to decrypt trash item", dbItem.id, e);
        // Minimal fallback
        decrypted = { name: "Corrupted Item" };
    }

    return {
        id: dbItem.id, // Trash ID
        originalItemId: dbItem.original_item_id || "",
        trashedAt: dbItem.trashed_at,
        expiresAt: dbItem.expires_at,

        // Recovered fields from blob
        name: decrypted.name || "Unknown",
        category: decrypted.category || "Other",
        username: decrypted.username || "",
        password: decrypted.password || "",
        urls: decrypted.urls || [],
        tags: decrypted.tags || [],
        strength: decrypted.strength || 0,
        totpSecret: decrypted.totpSecret,
        favorite: decrypted.favorite || false,
        createdAt: decrypted.createdAt || new Date().toISOString(),
        updatedAt: decrypted.updatedAt || new Date().toISOString(),
        version: decrypted.version || 1,
        history: decrypted.history || []
    };
}

// "Encrypt" (Stringify + Base64)
// Now includes ALL fields to ensure Trash items are self-contained
const packItemBlob = (item: Partial<VaultItem>) => {
    const payload = {
        name: item.name,
        category: item.category,
        username: item.username,
        password: item.password,
        urls: item.urls,
        tags: item.tags,
        strength: item.strength,
        totpSecret: item.totpSecret,
        favorite: item.favorite,
        history: item.history, // Include history
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
    };
    return btoa(JSON.stringify(payload));
};


// --- Hooks ---

export function useVaultItems() {
    const { user } = useAuth();
    const [items, setItems] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vault_items')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const parsedItems = (data || []).map(parseItem);
            setItems(parsedItems);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            toast.error("Failed to load vault items");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [user]);

    const addItem = async (item: Partial<VaultItem>) => {
        if (!user) return;

        try {
            const encryptedBlob = packItemBlob(item);

            const insertPayload: Database['public']['Tables']['vault_items']['Insert'] = {
                user_id: user.id,
                name: item.name || "New Item",
                category: item.category,
                tags: item.tags,
                favorite: item.favorite,
                strength_score: Math.min(item.strength || 0, 4), // Clamp to 4 for DB constraint
                encrypted_blob: encryptedBlob,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                has_totp: !!item.totpSecret,
                encryption_version: 1,
                modified_count: 0
            };

            // @ts-ignore
            const { data, error } = await supabase
                .from('vault_items')
                .insert(insertPayload as any)
                .select()
                .single();

            if (error) throw error;

            const newItem = parseItem(data);
            setItems((prev) => [newItem, ...prev]);
            return newItem; // Toast handled by caller or here? Caller in VaultPage used toast, but let's be consistent.
            // Actually VaultPage handled toast. I'll remove toast here to avoid double toast if caller does it.
            // But previous version had it. I'll keep it simple.
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to create item: " + err.message);
            throw err;
        }
    };

    const updateItem = async (id: string, updates: Partial<VaultItem>) => {
        if (!user) return;

        try {
            // Merge with existing item to ensure blob has everything
            const currentItem = items.find(i => i.id === id);
            // Detect changes for history
            const history = [...(currentItem?.history || [])];
            const changes: string[] = [];

            if (updates.password && updates.password !== currentItem?.password) changes.push("Password changed");
            if (updates.username && updates.username !== currentItem?.username) changes.push("Username changed");
            if (updates.totpSecret && updates.totpSecret !== currentItem?.totpSecret) changes.push("TOTP secret updated");

            if (changes.length > 0) {
                history.unshift({
                    action: changes.join(", "),
                    revisedAt: new Date().toISOString()
                });
            }

            const merged = { ...currentItem, ...updates, history };

            const encryptedBlob = packItemBlob(merged);

            const updatePayload: Database['public']['Tables']['vault_items']['Update'] = {
                name: updates.name,
                category: updates.category,
                tags: updates.tags,
                favorite: updates.favorite,
                strength_score: updates.strength !== undefined ? Math.min(updates.strength, 4) : undefined,
                encrypted_blob: encryptedBlob,
                updated_at: new Date().toISOString(),
                has_totp: !!updates.totpSecret,
                modified_count: (currentItem?.version || 0) + 1
            };

            // @ts-ignore
            const { error } = await supabase
                .from('vault_items')
                .update(updatePayload as any)
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates, version: (currentItem?.version || 0) + 1, history } : item)));
            // toast.success("Item updated"); // Let caller handle UI feedback for finer control?
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to update item: " + err.message);
            throw err;
        }
    };

    const deleteItem = async (id: string) => {
        if (!user) return;
        const item = items.find(i => i.id === id);
        if (!item) return;

        try {
            // Pack full item into blob for trash
            const encryptedBlob = packItemBlob(item);

            // @ts-ignore
            const { error: trashError } = await supabase
                .from('vault_trash')
                .insert({
                    user_id: user.id,
                    original_item_id: item.id,
                    encrypted_blob: encryptedBlob,
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                } as any);

            if (trashError) throw trashError;

            const { error } = await supabase
                .from('vault_items')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            setItems((prev) => prev.filter((item) => item.id !== id));
            // toast.success("Item moved to trash");
        } catch (err: any) {
            toast.error("Failed to delete item: " + err.message);
        }
    };

    return { items, loading, error, fetchItems, addItem, updateItem, deleteItem };
}

export function useVaultTrash() {
    const { user } = useAuth();
    const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTrash = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vault_trash')
                .select('*')
                .eq('user_id', user.id)
                .order('trashed_at', { ascending: false });

            if (error) throw error;

            const parsed = (data || []).map(parseTrashItem);
            setTrashItems(parsed);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash();
    }, [user]);

    const restoreFromTrash = async (trashId: string) => {
        if (!user) return;

        try {
            const trashItem = trashItems.find(i => i.id === trashId);
            if (!trashItem) return;

            // Prepare restore payload
            // use original ID? Optional.
            // We'll create a new item basically, but try to keep ID if we want or just let DB assign new one?
            // DB vault_items.id is uuid default gen.
            // If we restore, we can insert with 'id' if we really want to preserve it, assuming it's not taken.
            // But let's just insert as new entry to be safe/simple.
            // Actually, we should probably keep usage history etc.

            // Re-pack blob from trash item details
            const blob = packItemBlob(trashItem);

            const insertPayload: Database['public']['Tables']['vault_items']['Insert'] = {
                user_id: user.id,
                name: trashItem.name,
                category: trashItem.category,
                tags: trashItem.tags,
                favorite: trashItem.favorite,
                strength_score: trashItem.strength,
                encrypted_blob: blob,
                created_at: trashItem.createdAt, // Preserve original creation?
                updated_at: new Date().toISOString(), // New update time?
                has_totp: !!trashItem.totpSecret
            };

            // @ts-ignore
            const { error: insertError } = await supabase.from('vault_items').insert(insertPayload as any);
            if (insertError) throw insertError;

            // Delete from trash
            const { error: deleteError } = await supabase.from('vault_trash').delete().eq('id', trashId);
            if (deleteError) throw deleteError;

            setTrashItems(prev => prev.filter(i => i.id !== trashId));
            toast.success("Item restored");
            // Note: useVaultItems hook in other components will need to refetch or listen to realtime to see this.
            // We won't update the other hook's state here directly.
        } catch (e: any) {
            toast.error("Failed to restore: " + e.message);
            console.error(e);
        }
    }

    const permanentDelete = async (trashId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('vault_trash').delete().eq('id', trashId);
            if (error) throw error;
            setTrashItems((prev) => prev.filter((item) => item.id !== trashId));
            toast.success("Item permanently deleted");
        } catch (e: any) {
            toast.error("Failed to delete: " + e.message);
        }
    }

    // Empty Trash
    const emptyTrash = async () => {
        if (!user) return;
        const { error } = await supabase.from('vault_trash').delete().eq('user_id', user.id);
        if (error) {
            toast.error("Failed to empty trash");
            return;
        }
        setTrashItems([]);
        toast.success("Trash emptied");
    }

    return { trashItems, loading, error, restoreFromTrash, permanentDelete, emptyTrash };
}
