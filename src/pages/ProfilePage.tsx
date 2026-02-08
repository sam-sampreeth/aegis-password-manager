import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
    User,
    Lock,
    ShieldCheck,
    Save,
    LogOut,
    ShieldAlert,
    Unlock,
    KeyRound,
    Settings,
    Laptop,
    Smartphone,
    Globe,
    Loader2,
    Calendar,
    Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLock } from "@/context/LockContext";
import { useProfile } from "@/hooks/useProfiles";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const navigate = useNavigate();
    const { isLocked, lockVault } = useLock();
    const { user, signOut, isDemo } = useAuth();
    const { profile: dbProfile, loading, updateProfile } = useProfile();
    const [isEditing, setIsEditing] = useState(false);

    // Data States
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [currentSession, setCurrentSession] = useState<any>(null);

    const [showFullId, setShowFullId] = useState(false);

    // Temp state for editing
    const [tempDisplayName, setTempDisplayName] = useState("");
    const [tempUsername, setTempUsername] = useState("");

    // Sync DB profile to temp state and load avatar
    useEffect(() => {
        if (dbProfile) {
            setTempDisplayName(dbProfile.display_name || "");
            setTempUsername(dbProfile.username || "");
        }
    }, [dbProfile, isEditing]);

    // Fetch extra data (MFA, Session)
    useEffect(() => {
        const fetchData = async () => {
            // 1. Check MFA
            const { data: mfaData, error: mfaError } = await supabase.auth.mfa.listFactors();
            if (!mfaError) {
                const totpFactor = mfaData?.totp.find(f => f.status === 'verified');
                setMfaEnabled(!!totpFactor);
            }

            // 2. Get Current Session Info
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
                // Parse rudimentary device info from User Agent
                const ua = navigator.userAgent;
                let device = "Unknown Device";
                let icon = Globe;

                if (/Mobi|Android/i.test(ua)) {
                    device = "Mobile Device";
                    icon = Smartphone;
                } else {
                    const platform = navigator.platform.toLowerCase();
                    if (platform.includes('mac')) device = "Mac";
                    else if (platform.includes('win')) device = "Windows PC";
                    else if (platform.includes('linux')) device = "Linux PC";
                    else device = "Desktop";
                    icon = Laptop;
                }

                // Detect Browser
                let browser = "Unknown Browser";
                if (ua.indexOf("Chrome") > -1) browser = "Chrome";
                else if (ua.indexOf("Safari") > -1) browser = "Safari";
                else if (ua.indexOf("Firefox") > -1) browser = "Firefox";
                else if (ua.indexOf("Edg") > -1) browser = "Edge";

                let ip = "Loading...";
                setCurrentSession({
                    device,
                    browser,
                    ip,
                    lastActive: "Active Now",
                    isCurrent: true,
                    icon
                });

                // Fetch real IP
                try {
                    const res = await fetch("https://api.ipify.org?format=json");
                    const data = await res.json();
                    setCurrentSession((prev: any) => prev ? { ...prev, ip: data.ip } : null);
                } catch (e) {
                    console.error("Failed to fetch IP:", e);
                    setCurrentSession((prev: any) => prev ? { ...prev, ip: "Unknown" } : null);
                }
            }
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        if (isDemo) {
            toast.error("Action not allowed in Demo Mode");
            return;
        }
        try {
            await updateProfile({
                display_name: tempDisplayName,
                username: tempUsername
            });
            setIsEditing(false);
            toast.success("Profile updated successfully");
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        }
    };

    const handleCancel = () => {
        if (dbProfile) {
            setTempDisplayName(dbProfile.display_name || "");
            setTempUsername(dbProfile.username || "");
        }
        setIsEditing(false);
    };



    const handleCreateProfile = async () => {
        if (!user) return;
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                username: user.email?.split('@')[0] || 'user',
                display_name: 'New User',
            } as any);

            if (error) throw error;
            toast.success("Profile created successfully! Refreshing...");
            window.location.reload();
        } catch (error: any) {
            toast.error("Failed to create profile: " + error.message);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigate("/auth");
            toast.success("Logged out successfully");
        } catch (error) {
            toast.error("Error logging out");
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-neutral-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!dbProfile && user) {
        return (
            <div className="flex-1 h-screen flex items-center justify-center bg-black text-white p-6">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <User className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h2 className="text-2xl font-bold">Profile Not Found</h2>
                    <p className="text-neutral-400">It seems your user account exists but the profile data is missing. This can happen if the account creation process was interrupted.</p>
                    <Button onClick={handleCreateProfile} className="w-full bg-blue-600 hover:bg-blue-700">Create Missing Profile</Button>
                </div>
            </div>
        );
    }

    const MemberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
        : "Unknown";

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-zinc-950 text-white p-6 md:p-12 pb-24 relative">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none fixed" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto space-y-8 relative z-10"
            >
                {/* Header Profile Section */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b border-white/5 pb-8 gap-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-full border-4 border-zinc-950 ring-2 ring-white/10 overflow-hidden bg-zinc-900 relative flex items-center justify-center">
                                <User className="w-12 h-12 text-zinc-700" />
                            </div>
                            <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-zinc-950" title="Online" />
                        </div>

                        <div className="space-y-1.5">
                            <h1 className="text-4xl font-bold tracking-tight">{tempDisplayName || "User"}</h1>
                            <div className="flex items-center gap-2 text-neutral-400">
                                <span className="font-mono text-sm text-neutral-500">@{tempUsername || "user"}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 px-3 py-1">
                                    Pro Plan
                                </Badge>
                                <Badge variant="outline" className="text-neutral-400 border-white/10 gap-1.5 pl-2">
                                    <Calendar className="w-3 h-3" />
                                    Joined {MemberSince}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        {isEditing ? (
                            <>
                                <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
                                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setIsEditing(true)} className="border-white/10 hover:bg-white/5">
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Personal Info & Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Basic Info Card */}
                        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white text-lg">
                                    <User className="w-5 h-5 text-blue-500" />
                                    Personal Information
                                </CardTitle>
                                <CardDescription>Manage your public profile details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300">Display Name</Label>
                                        <Input
                                            value={tempDisplayName}
                                            onChange={(e) => setTempDisplayName(e.target.value)}
                                            disabled={!isEditing}
                                            className="bg-zinc-950/50 border-white/10 disabled:opacity-70 focus:border-blue-500/50 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300">Username</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-neutral-500 select-none">@</span>
                                            <Input
                                                value={tempUsername}
                                                onChange={(e) => setTempUsername(e.target.value)}
                                                disabled={!isEditing}
                                                className="bg-zinc-950/50 border-white/10 pl-7 disabled:opacity-70 focus:border-blue-500/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-neutral-300">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                                            <Input
                                                value={user?.email || ""}
                                                disabled
                                                className="bg-zinc-950/50 border-white/10 text-neutral-200 pl-9 cursor-not-allowed opacity-100"
                                            />
                                            <div className="absolute right-3 top-2.5">
                                                <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10 h-5 text-[10px]">Verified</Badge>
                                            </div>
                                        </div>
                                        <p className="text-xs text-neutral-500 pl-1">Email cannot be changed directly.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sessions Card */}
                        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white text-lg">
                                    <Globe className="w-5 h-5 text-purple-500" />
                                    Current Session
                                </CardTitle>
                                <CardDescription>Device currently accessing your account</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {currentSession && (
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                                                <currentSession.icon className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium flex items-center gap-2 text-white">
                                                    {currentSession.device}
                                                    <Badge variant="secondary" className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] h-5 px-2">
                                                        Current Device
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-neutral-400 flex items-center gap-2 mt-0.5">
                                                    <span>{currentSession.browser}</span>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                                    <span>{currentSession.ip}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <div className="text-xs text-green-400 font-medium">Active Now</div>
                                        </div>
                                    </div>
                                )}

                                {/* Session Info Info Box removed */}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Security & Actions */}
                    <div className="space-y-8">
                        {/* Security Summary */}
                        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white text-lg">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    Security Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Auth Method */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/30 border border-white/5 hover:bg-white/5 transition-colors group cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                                            <KeyRound className="w-4 h-4 text-neutral-400" />
                                        </div>
                                        <div className="text-sm">
                                            <div className="font-medium text-white">Auth Method</div>
                                            <div className="text-xs text-neutral-500">Email & Password</div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white" onClick={() => navigate('/vault/settings')}>
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Vault Status */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/30 border border-white/5 hover:bg-white/5 transition-colors group cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded bg-zinc-900 group-hover:bg-zinc-800 transition-colors", isLocked ? "text-orange-400" : "text-green-400")}>
                                            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </div>
                                        <div className="text-sm">
                                            <div className="font-medium text-white">Vault Status</div>
                                            <div className={isLocked ? "text-orange-400 text-xs" : "text-green-400 text-xs"}>
                                                {isLocked ? "Locked" : "Unlocked"}
                                            </div>
                                        </div>
                                    </div>
                                    {!isLocked && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 h-8 text-xs"
                                            onClick={() => lockVault("manual")}
                                        >
                                            Lock
                                        </Button>
                                    )}
                                </div>

                                {/* MFA */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/30 border border-white/5 hover:bg-white/5 transition-colors group cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded bg-zinc-900 group-hover:bg-zinc-800 transition-colors", mfaEnabled ? "text-green-400" : "text-neutral-400")}>
                                            <ShieldAlert className="w-4 h-4" />
                                        </div>
                                        <div className="text-sm">
                                            <div className="font-medium text-white">2FA</div>
                                            <div className={mfaEnabled ? "text-green-400 text-xs" : "text-neutral-500 text-xs"}>
                                                {mfaEnabled ? "Enabled" : "Disabled"}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-8 text-xs hover:bg-transparent", mfaEnabled ? "text-green-400 hover:text-green-300" : "text-blue-400 hover:text-blue-300")}
                                        onClick={() => navigate('/vault/settings')}
                                    >
                                        {mfaEnabled ? "Manage" : "Enable"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Account Actions */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">Account Actions</h3>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-red-400 border-red-500/10 hover:bg-red-500/5 hover:text-red-300 hover:border-red-500/20 transition-all bg-red-500/[0.02]"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Log Out
                            </Button>
                        </div>

                        <div className="text-xs text-center text-neutral-500 space-y-2 pt-6">
                            <p>Last login: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "N/A"}</p>
                            <div
                                onClick={() => setShowFullId(!showFullId)}
                                className="font-mono text-[10px] cursor-pointer hover:text-neutral-300 transition-colors select-none py-1 px-2 rounded hover:bg-white/5 inline-block"
                                title="Click to reveal full ID"
                            >
                                ID: {showFullId ? user?.id : (user?.id.split('-')[0] + '...' + user?.id.slice(-4))}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div >
        </div >
    );
}
