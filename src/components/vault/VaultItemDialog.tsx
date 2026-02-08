import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as OTPAuth from "otpauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Copy,
    Eye,
    EyeOff,
    ExternalLink,
    Edit2,
    Save,
    RefreshCw,

    Plus,
    X,
    Check,
    ShieldCheck,
    Hash,
    ChevronDown,
    Trash2,
    Globe,
    Star,
    FileText,
    QrCode
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VaultItemIcon } from "./VaultItemIcon";
import { generatePassword, evaluateStrength, getStrengthColor } from "@/lib/passwordUtils";
import { VaultItem } from "@/hooks/useVault";
import { useClipboard } from "@/context/ClipboardContext";
import { useUserSettings } from "@/hooks/useProfiles";
import { decryptData } from "@/lib/crypto";
import { useAuth } from "@/context/AuthContext";
import { scanQrCode, extractTotpSecret } from "@/lib/qrUtils";
import { toast } from "sonner";

interface VaultItemDialogProps {
    item: VaultItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isCreating?: boolean;
    onDelete?: (id: string) => void;
    onToggleFavorite?: (id: string) => void;
    onSave?: (item: Partial<VaultItem>) => Promise<void>;
}

const CATEGORIES: VaultItem['category'][] = ["Social", "Work", "Finance", "Entertainment", "Other"];

const categoryColorMap: Record<string, string> = {
    "Social": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Work": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Finance": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Entertainment": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    "Other": "bg-zinc-800 text-neutral-300 border-white/5"
};

export function VaultItemDialog({ item, open, onOpenChange, isCreating, onDelete, onToggleFavorite, onSave }: VaultItemDialogProps) {
    const { settings } = useUserSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // View State
    const [showPassword, setShowPassword] = useState(false);
    const [showTotp, setShowTotp] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const result = await scanQrCode(file);
            const secret = extractTotpSecret(result);

            if (secret) {
                setFormData(prev => ({ ...prev, totpSecret: secret }));
                toast.success("TOTP secret extracted successfully!");
            } else {
                toast.error("Could not find a valid TOTP secret in this QR code.");
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to scan QR code");
        } finally {
            // Reset input so the same file can be uploaded again
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const [totpProgress, setTotpProgress] = useState(30);
    const { isDemo } = useAuth();
    const [decryptedPresets, setDecryptedPresets] = useState<string[]>([]);

    useEffect(() => {
        const loadPresets = async () => {
            if (!settings?.username_presets) {
                setDecryptedPresets([]);
                return;
            }
            if (isDemo) {
                setDecryptedPresets(settings.username_presets);
                return;
            }
            const vaultKey = sessionStorage.getItem('vaultKey');
            if (vaultKey) {
                const decrypted = await Promise.all(settings.username_presets.map(async (p) => {
                    const d = await decryptData(p, vaultKey);
                    return d || p;
                }));
                // Filter distinct
                setDecryptedPresets([...new Set(decrypted)]);
            }
        };
        loadPresets();
    }, [settings?.username_presets, isDemo]);

    const [decryptedNotes, setDecryptedNotes] = useState<string>("");

    // Form State (Controlled)
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        password: "",
        category: "Other",
        tags: "",
        urls: [""],
        totpSecret: "",
        notes: ""
    });

    // Reset state when dialog opens/closes
    useEffect(() => {
        const initForm = async () => {
            if (!open) {
                setIsEditing(false);
                setShowPassword(false);
                setShowTotp(false);
                setDecryptedNotes("");
            } else {
                if (isCreating) {
                    setIsEditing(true);
                    // Reset form for new item
                    setFormData({
                        name: "",
                        username: "",
                        password: "",
                        category: "Other",
                        tags: "",
                        urls: [""],
                        totpSecret: "",
                        notes: ""
                    });
                    setDecryptedNotes("");
                } else if (item) {
                    setIsEditing(false);

                    // Handle Decryption
                    let notes = item.notes || "";
                    const vaultKey = sessionStorage.getItem('vaultKey');

                    if (notes && !isDemo && vaultKey) {
                        try {
                            const decrypted = await decryptData(notes, vaultKey);
                            if (decrypted) notes = decrypted;
                        } catch (e) {
                            console.error("Failed to decrypt notes:", e);
                        }
                    }

                    setDecryptedNotes(notes);

                    // Pre-fill form for editing
                    setFormData({
                        name: item.name,
                        username: item.username,
                        password: item.password,
                        category: item.category,
                        tags: item.tags?.join(", ") || "",
                        urls: item.urls && item.urls.length > 0 ? item.urls : [""],
                        totpSecret: item.totpSecret || "",
                        notes: notes
                    });
                }
            }
        };
        initForm();
    }, [open, item?.id, isCreating, isDemo]);

    // Real TOTP Generation
    const [totpCode, setTotpCode] = useState<string>("--- ---");

    useEffect(() => {
        if (!open || !item?.totpSecret) {
            setTotpCode("--- ---");
            return;
        }

        const updateTotp = () => {
            try {
                // Remove spaces and make uppercase
                const secret = item.totpSecret?.replace(/\s/g, '').toUpperCase();
                if (!secret) return;

                const totp = new OTPAuth.TOTP({
                    secret: OTPAuth.Secret.fromBase32(secret),
                    algorithm: 'SHA1',
                    digits: 6,
                    period: 30
                });

                const token = totp.generate();
                // Format: 123 456
                setTotpCode(token.slice(0, 3) + " " + token.slice(3));

                // Calculate progress (seconds remaining in 30s window)
                const seconds = 30 - (Math.floor(Date.now() / 1000) % 30);
                setTotpProgress(seconds);

            } catch (e) {
                console.error("Invalid TOTP Secret", e);
                setTotpCode("Error");
            }
        };

        updateTotp(); // Initial call
        const interval = setInterval(updateTotp, 1000);
        return () => clearInterval(interval);
    }, [open, item?.totpSecret]);

    const handleGeneratePassword = () => {
        const newPass = generatePassword(16, { upper: true, number: true, symbol: true, excludeAmbiguous: false });
        setFormData(prev => ({ ...prev, password: newPass }));
    };

    const { copyToClipboard: secureCopy } = useClipboard();

    const copyToClipboard = (text: string, field: string) => {
        secureCopy(text, field === "username" ? "Username" : field === "password" ? "Password" : "Link");
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const strengthScore = evaluateStrength(formData.password);

    if (!item && !isCreating) return null;

    // Use a placeholder item for display in "Add" mode to avoid null checks
    const displayItem = item || {
        id: "new",
        name: formData.name || "New Item",
        username: formData.username,
        password: formData.password,
        category: formData.category,
        urls: formData.urls.filter(u => u.trim() !== ""),
        favorite: false,
        folderId: "",
        strength: 0,
        history: [],
        tags: [],
        totpSecret: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white p-0 gap-0 overflow-hidden outline-none">
                {/* Header Banner */}
                <div className="h-32 bg-gradient-to-r from-blue-900/40 to-black relative shrink-0">
                    <div className="absolute -bottom-10 left-8">
                        <VaultItemIcon item={displayItem} className="w-20 h-20 text-3xl shadow-xl bg-zinc-900" />
                    </div>
                </div>

                <div className="px-8 pt-12 pb-8 flex-1 overflow-y-auto max-h-[80vh]">
                    <DialogHeader className="mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                    {isCreating ? "New Item" : displayItem.name}
                                    {!isCreating && (
                                        <button
                                            onClick={() => displayItem.id && onToggleFavorite?.(displayItem.id)}
                                            className="focus:outline-none hover:scale-110 transition-transform"
                                        >
                                            <Star
                                                className={`w-6 h-6 transition-colors ${displayItem.favorite ? "text-yellow-500 fill-yellow-500" : "text-neutral-500 hover:text-yellow-500"}`}
                                            />
                                        </button>
                                    )}
                                </DialogTitle>
                                {!isEditing && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className={`font-normal border ${categoryColorMap[displayItem.category] || categoryColorMap["Other"]}`}>
                                            {displayItem.category}
                                        </Badge>
                                        {displayItem.tags?.map(tag => (
                                            <Badge key={tag} variant="secondary" className="bg-blue-500/10 text-blue-400 border-0">
                                                #{tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Strength Badge - Show mostly in View or when Password has content */}
                            {(formData.password || !isEditing) && (
                                <div className="flex flex-col items-end gap-1">
                                    <div className="text-xs font-mono text-neutral-500">STRENGTH</div>
                                    <div className="flex items-center gap-1">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 w-3 rounded-full transition-colors duration-300 ${i < Math.max(1, (isEditing ? strengthScore : displayItem.strength))
                                                    ? getStrengthColor(isEditing ? strengthScore : displayItem.strength)
                                                    : "bg-neutral-800"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {/* View Mode */}
                    {!isEditing ? (
                        <div className="space-y-6">
                            {/* Credentials Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs text-neutral-500 uppercase tracking-wider">Username</Label>
                                    <div className="flex items-center gap-2 group">
                                        <div className="flex-1 p-3 bg-zinc-900/50 border border-white/5 rounded-md font-mono text-sm truncate">
                                            {displayItem.username}
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-neutral-400 hover:text-white"
                                            onClick={() => copyToClipboard(displayItem.username, "username")}
                                        >
                                            {copiedField === "username" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-neutral-500 uppercase tracking-wider">Password</Label>
                                    <div className="flex items-center gap-2 group">
                                        <div className="flex-1 p-3 bg-zinc-900/50 border border-white/5 rounded-md font-mono text-sm truncate tracking-wider">
                                            {showPassword ? displayItem.password : "••••••••••••••••"}
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-neutral-400 hover:text-white"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-neutral-400 hover:text-white"
                                            onClick={() => copyToClipboard(displayItem.password, "password")}
                                        >
                                            {copiedField === "password" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* URLs */}
                            <div className="space-y-2">
                                <Label className="text-xs text-neutral-500 uppercase tracking-wider">Websites</Label>
                                <div className="space-y-2">
                                    {displayItem.urls.map((url, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 p-2 bg-zinc-900/30 rounded-md text-blue-400 hover:underline text-sm truncate flex items-center gap-2"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {url}
                                            </a>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-neutral-500"
                                                onClick={() => copyToClipboard(url, `url-${idx}`)}
                                            >
                                                {copiedField === `url-${idx}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                            </Button>
                                        </div>
                                    ))}
                                    {displayItem.urls.length === 0 && (
                                        <div className="text-sm text-neutral-500 italic">No websites linked</div>
                                    )}
                                </div>
                            </div>

                            {/* TOTP Section */}
                            {displayItem.totpSecret && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg relative overflow-hidden group">
                                    {/* ... TOTP Logic Same as Before ... */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                                            <ShieldCheck className="w-4 h-4" />
                                            TOTP Authenticator
                                        </div>
                                        {showTotp && (
                                            <div className="text-xs text-blue-300/50 font-mono">
                                                {totpProgress}s
                                            </div>
                                        )}
                                    </div>

                                    {showTotp ? (
                                        <div className="flex items-center justify-between animate-in fade-in duration-300">
                                            <div className="font-mono text-xl md:text-2xl tracking-[0.2em] text-white font-bold tabular-nums">
                                                {totpCode}
                                            </div>
                                            <div className="relative w-6 h-6 flex items-center justify-center">
                                                <svg className="w-full h-full -rotate-90">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" className="text-zinc-800" />
                                                    <circle
                                                        cx="12" cy="12" r="10"
                                                        stroke="currentColor" strokeWidth="2" fill="none"
                                                        className="text-blue-500 transition-all duration-1000 ease-linear"
                                                        strokeDasharray={63}
                                                        strokeDashoffset={63 - (63 * totpProgress) / 30}
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="absolute inset-0 bg-zinc-900/90 z-10 flex items-center justify-center cursor-pointer hover:bg-zinc-900/80 transition-colors"
                                            onClick={() => setShowTotp(true)}
                                        >
                                            <span className="text-sm font-medium text-blue-400 flex items-center gap-2">
                                                <Eye className="w-4 h-4" />
                                                Click to reveal code
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* History Section - Always Show Metadata */}
                            {!isCreating && (
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <Label className="text-xs text-neutral-500 uppercase tracking-wider block">Item Metadata</Label>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="text-xs text-neutral-500">Created</div>
                                            <div className="text-sm font-mono text-neutral-300">
                                                {new Date(displayItem.createdAt).toLocaleDateString()}
                                                <span className="text-neutral-600 ml-1">{new Date(displayItem.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-neutral-500">Last Modified</div>
                                            <div className="text-sm font-mono text-neutral-300">
                                                {new Date(displayItem.updatedAt).toLocaleDateString()}
                                                <span className="text-neutral-600 ml-1">{new Date(displayItem.updatedAt).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-neutral-500">History</div>
                                            <div className="text-sm font-mono text-neutral-300">
                                                Total times modified: {Math.max(0, (displayItem.version || 1) - 1)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes Section - View Mode */}
                            {decryptedNotes && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Secret Notes</Label>
                                    <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-lg text-sm text-neutral-300 whitespace-pre-wrap font-sans leading-relaxed">
                                        {decryptedNotes}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Edit Mode Form */
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-4">
                            <div className="space-y-2">
                                <Label>Item Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-zinc-900 border-white/10"
                                    placeholder="e.g. Netflix"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between border-white/10 bg-zinc-900">
                                                {formData.category}
                                                <ChevronDown className="w-4 h-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                            {CATEGORIES.map(cat => (
                                                <DropdownMenuItem key={cat} onClick={() => setFormData({ ...formData, category: cat })}>
                                                    {cat}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="space-y-3">
                                    <Label className="flex justify-between items-center">
                                        Websites
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1 px-2"
                                            onClick={() => setFormData(prev => ({ ...prev, urls: [...prev.urls, ""] }))}
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            ADD URL
                                        </Button>
                                    </Label>
                                    <div className="space-y-2">
                                        {formData.urls.map((url, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                                    <Input
                                                        value={url}
                                                        onChange={(e) => {
                                                            const newUrls = [...formData.urls];
                                                            newUrls[idx] = e.target.value;
                                                            setFormData({ ...formData, urls: newUrls });
                                                        }}
                                                        className="bg-zinc-900 border-white/10 pl-9"
                                                        placeholder="https://example.com"
                                                    />
                                                </div>
                                                {formData.urls.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 text-neutral-500 hover:text-red-400 hover:bg-red-400/10"
                                                        onClick={() => {
                                                            const newUrls = formData.urls.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, urls: newUrls });
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Username</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="bg-zinc-900 border-white/10 flex-1"
                                        placeholder="email@domain.com"
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="border-white/10 px-3 bg-zinc-900">
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[200px]">
                                            {decryptedPresets.length > 0 ? (
                                                decryptedPresets.map(u => (
                                                    <DropdownMenuItem key={u} onClick={() => setFormData({ ...formData, username: u })}>
                                                        {u}
                                                    </DropdownMenuItem>
                                                ))
                                            ) : (
                                                <div className="p-2 text-xs text-neutral-500 text-center">
                                                    No presets. Add them in Settings.
                                                </div>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex justify-between">
                                    Password
                                    <span className="text-xs text-neutral-500 font-normal">
                                        Strength: <span className={getStrengthColor(strengthScore).replace("bg-", "text-")}>{strengthScore}/5</span>
                                    </span>
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        type="text"
                                        className="bg-zinc-900 border-white/10 flex-1 font-mono"
                                        placeholder="Hidden until generated"
                                    />
                                    <Button
                                        variant="outline"
                                        className="border-white/10 bg-zinc-900 hover:bg-zinc-800"
                                        onClick={handleGeneratePassword}
                                        title="Generate Strong Password"
                                    >
                                        <RefreshCw className="w-4 h-4 text-blue-400" />
                                    </Button>
                                </div>
                                {/* Live Strength Bar */}
                                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${getStrengthColor(strengthScore)}`}
                                        style={{ width: `${(strengthScore / 5) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex justify-between items-center">
                                    TOTP Secret
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1 px-2"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <QrCode className="w-3 h-3 mr-1" />
                                        SCAN QR CODE
                                    </Button>
                                    <span className="text-xs text-neutral-500 font-normal">Optional (Base32)</span>
                                </Label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleQrUpload}
                                />
                                <div className="flex items-center gap-2 border border-white/10 rounded-md bg-zinc-900 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/50">
                                    <ShieldCheck className="w-4 h-4 text-neutral-500" />
                                    <input
                                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-600 font-mono"
                                        value={formData.totpSecret}
                                        onChange={(e) => setFormData({ ...formData, totpSecret: e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, "") })}
                                        placeholder="JBSWY3DPEHPK3PXP"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Tags</Label>
                                <div className="flex items-center gap-2 border border-white/10 rounded-md bg-zinc-900 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/50">
                                    <Hash className="w-4 h-4 text-neutral-500" />
                                    <input
                                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-600"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        placeholder="Comma separated (e.g. work, social)"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex justify-between items-center">
                                    Notes
                                    <span className="text-[10px] text-blue-400/50 flex items-center gap-1 font-normal">
                                        <ShieldCheck className="w-3 h-3" />
                                        CLIENT-SIDE ENCRYPTED
                                    </span>
                                </Label>
                                <div className="flex items-start gap-2 border border-white/10 rounded-md bg-zinc-900 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/50">
                                    <FileText className="w-4 h-4 text-neutral-500 mt-1" />
                                    <textarea
                                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-600 font-sans min-h-[100px] resize-none"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Add private notes... (Securely encrypted)"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-0 flex justify-between items-center bg-zinc-950 shrink-0">
                    {!isCreating ? (
                        <Button
                            variant="outline"
                            className="text-red-400 border-red-500/20 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/30"
                            onClick={() => displayItem.id && onDelete?.(displayItem.id)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Item
                        </Button>
                    ) : (
                        <div></div> // Spacer
                    )}

                    <div className="flex gap-2">
                        {!isEditing ? (
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="bg-white text-black hover:bg-neutral-200"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                        ) : (
                            <Button
                                disabled={isSaving}
                                onClick={async () => {
                                    setIsSaving(true);
                                    try {
                                        // Construct payload
                                        const payload: Partial<VaultItem> = {
                                            name: formData.name,
                                            username: formData.username,
                                            password: formData.password,
                                            category: formData.category as any,
                                            urls: formData.urls.filter(u => u.trim() !== ""),
                                            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                                            totpSecret: formData.totpSecret,
                                            strength: strengthScore,
                                            notes: formData.notes
                                        };

                                        // Encrypt notes if not in demo
                                        if (!isDemo && payload.notes) {
                                            const vaultKey = sessionStorage.getItem('vaultKey');
                                            if (vaultKey) {
                                                const { encryptData } = await import("@/lib/crypto");
                                                payload.notes = await encryptData(payload.notes, vaultKey);
                                            }
                                        }

                                        if (onSave) {
                                            await onSave(payload);
                                        }

                                        onOpenChange(false);
                                        setIsEditing(false);
                                    } catch (e) {
                                        console.error(e);
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        {isCreating ? "Create Item" : "Save Changes"}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
