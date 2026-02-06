import { useState } from "react";
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
    Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLock } from "@/context/LockContext";
import { useProfile } from "@/hooks/useProfiles";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

export default function ProfilePage() {
    const navigate = useNavigate();
    const { isLocked, lockVault } = useLock();
    const { user, signOut } = useAuth();
    const { profile: dbProfile, loading, updateProfile } = useProfile();
    const [isEditing, setIsEditing] = useState(false);

    // Temp state for editing
    const [tempDisplayName, setTempDisplayName] = useState("");
    const [tempUsername, setTempUsername] = useState("");

    // Sync DB profile to temp state when loaded or editing starts
    useEffect(() => {
        if (dbProfile) {
            setTempDisplayName(dbProfile.display_name || "");
            setTempUsername(dbProfile.username || "");
        }
    }, [dbProfile, isEditing]);

    const handleSave = async () => {
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
            });

            if (error) throw error;
            toast.success("Profile created successfully! refresh the page.");
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
        return <div className="p-12 text-center text-white">Loading profile...</div>;
    }

    if (!dbProfile && user) {
        return (
            <div className="flex-1 h-screen flex items-center justify-center bg-black text-white p-6">
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-bold">Profile Not Found</h2>
                    <p className="text-neutral-400">It seems your user account exists but the profile data is missing.</p>
                    <Button onClick={handleCreateProfile}>Create Missing Profile</Button>
                </div>
            </div>
        );
    }

    const displayProfile = {
        displayName: dbProfile?.display_name || "User",
        username: dbProfile?.username || "user",
        email: user?.email || "No Email",
        // These fields are not in the DB schema provided, so placeholders for now or remove if strictly adhering.
        // Keeping structure compatible with UI but static.
        jobTitle: "Software Engineer",
        location: "San Francisco, CA"
    };


    const sessions = [
        {
            device: "MacBook Pro 16\"",
            browser: "Chrome 120.0",
            location: "San Francisco, US",
            lastActive: "Active Now",
            isCurrent: true,
            icon: Laptop
        },
        {
            device: "iPhone 15 Pro",
            browser: "Safari Mobile",
            location: "San Francisco, US",
            lastActive: "2 hours ago",
            isCurrent: false,
            icon: Smartphone
        }
    ];

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-black text-white p-6 md:p-12 pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-8"
            >
                {/* Header Profile Section */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b border-white/10 pb-8 gap-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full border-2 border-white/10 overflow-hidden">
                                <img src="https://github.com/shadcn.png" alt="Profile" className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold">{displayProfile.displayName}</h1>
                            <div className="flex items-center gap-2 text-neutral-400">
                                <span>@{displayProfile.username}</span>
                                <span>•</span>
                                <span>{displayProfile.email}</span>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
                                    Pro Plan
                                </Badge>
                                <Badge variant="outline" className="text-neutral-400 border-white/10">
                                    Member since Jan 2024
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
                        <Card className="bg-zinc-900/30 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <User className="w-5 h-5 text-blue-400" />
                                    Personal Information
                                </CardTitle>
                                <CardDescription>Manage your public profile details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Display Name</Label>
                                        <Input
                                            value={tempDisplayName}
                                            onChange={(e) => setTempDisplayName(e.target.value)}
                                            disabled={!isEditing}
                                            className="bg-zinc-950/50 border-white/10 disabled:opacity-100"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Username</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-neutral-500">@</span>
                                            <Input
                                                value={tempUsername}
                                                onChange={(e) => setTempUsername(e.target.value)}
                                                disabled={!isEditing}
                                                className="bg-zinc-950/50 border-white/10 pl-7 disabled:opacity-100"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Email Address</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={displayProfile.email}
                                                disabled
                                                className="bg-zinc-950/30 border-white/5 text-neutral-500"
                                            />
                                            {isEditing && (
                                                <Button variant="outline" size="sm" className="border-white/10">Change</Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sessions Card */}
                        <Card className="bg-zinc-900/30 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Globe className="w-5 h-5 text-purple-400" />
                                    Active Sessions
                                </CardTitle>
                                <CardDescription>Manage devices logged into your account</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {sessions.map((session, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                                <session.icon className="w-5 h-5 text-neutral-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {session.device}
                                                    {session.isCurrent && (
                                                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 text-[10px] h-5 px-1.5">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-neutral-400 flex items-center gap-2">
                                                    <span>{session.browser}</span>
                                                    <span>•</span>
                                                    <span>{session.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">{session.lastActive}</div>
                                            {!session.isCurrent && (
                                                <Button variant="link" className="text-red-400 h-auto p-0 text-xs hover:text-red-300">
                                                    Revoke
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full border-white/10 text-neutral-400 hover:text-white hover:bg-white/5">
                                    Log out all other devices
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Security & Actions */}
                    <div className="space-y-8">
                        {/* Security Summary */}
                        <Card className="bg-zinc-900/30 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                    Security Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Auth Method */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <KeyRound className="w-4 h-4 text-neutral-400" />
                                        <div className="text-sm">
                                            <div className="font-medium text-white">Auth Method</div>
                                            <div className="text-xs text-neutral-500">Email & Password</div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Vault Status */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        {isLocked ? (
                                            <Lock className="w-4 h-4 text-orange-400" />
                                        ) : (
                                            <Unlock className="w-4 h-4 text-green-400" />
                                        )}
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
                                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 h-8"
                                            onClick={() => lockVault("manual")}
                                        >
                                            Lock
                                        </Button>
                                    )}
                                </div>

                                {/* MFA */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <ShieldAlert className="w-4 h-4 text-neutral-400" />
                                        <div className="text-sm">
                                            <div className="font-medium text-white">MFA</div>
                                            <div className="text-xs text-neutral-500">Disabled</div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-blue-400 h-8 p-0 hover:text-blue-300">Enable</Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Account Actions */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-neutral-400 px-1">Account Actions</h3>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-red-400 border-red-500/10 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Log Out
                            </Button>
                        </div>

                        <div className="text-xs text-center text-neutral-600 space-y-1">
                            <p>Last login: Today at 2:30 PM</p>
                            <p>Account ID: #882-991-002</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
