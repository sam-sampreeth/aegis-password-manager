import { useState, useEffect } from "react";
import { Settings, Shield, HardDrive, Bell, Download, Upload, AlertTriangle, Key, Lock, RefreshCw, Smartphone, KeyRound, Loader2, Activity, Clock, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useLock } from "@/context/LockContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsPage() {
    const { lockVault } = useLock();
    const [autoLockTimer, setAutoLockTimer] = useState(15); // 0 = Never
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [recoveryCodesGenerated, setRecoveryCodesGenerated] = useState(false);

    // Password Change State
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    // const [confirmPassword, setConfirmPassword] = useState(""); // Removed
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    // Export Vault State
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportStep, setExportStep] = useState<'warning' | 'verify' | 'processing'>('warning');
    const [exportMasterPassword, setExportMasterPassword] = useState("");
    const [exportCountdown, setExportCountdown] = useState(3);

    const handleManualLock = () => {
        lockVault("manual");
        toast.success("Vault locked successfully");
    };

    // Password Strength
    const getPasswordStrength = (pass: string) => {
        return {
            length: pass.length >= 8,
            number: /\d/.test(pass),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
            uppercase: /[A-Z]/.test(pass),
        };
    };

    const passwordStrength = getPasswordStrength(newPassword);
    const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

    const handleChangePassword = () => {
        if (!isPasswordStrong) {
            toast.error("Please meet all password requirements");
            return;
        }
        // Mock API call
        toast.success("Authentication password updated");
        setIsPasswordDialogOpen(false);
        setOldPassword("");
        setNewPassword("");
        setShowOldPassword(false);
        setShowNewPassword(false);
    };

    const handleRegenerateCodes = () => {
        setRecoveryCodesGenerated(true);
        toast.success("New vault recovery codes generated");
    };

    const handleTriggerReset = () => {
        toast.success("Password reset email sent to your inbox");
    };

    // Export Logic
    const handleExportInitiate = () => {
        setIsExportDialogOpen(true);
        setExportStep('warning');
        setExportMasterPassword("");
        setExportCountdown(3);
    };

    const handleExportVerify = () => {
        if (exportMasterPassword.length < 4) {
            toast.error("Please enter your Master Password");
            return;
        }
        setExportStep('processing');
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (exportStep === 'processing' && exportCountdown > 0) {
            timer = setTimeout(() => setExportCountdown(prev => prev - 1), 1000);
        } else if (exportStep === 'processing' && exportCountdown === 0) {
            // Processing done
            toast.success("Vault exported successfully");
            setIsExportDialogOpen(false);
        }
        return () => clearTimeout(timer);
    }, [exportStep, exportCountdown]);

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden relative">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-neutral-500/10 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-neutral-400" />
                        </div>
                        <h1 className="text-xl font-semibold">Settings</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-3xl mx-auto space-y-10 pb-20">

                        {/* 1. Account Security (Password) */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Account Security</h2>
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <KeyRound className="w-5 h-5 text-blue-500" /> Auth Password
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="text-sm text-neutral-400">Manage your login password</div>
                                        <div className="text-xs text-neutral-500">Last changed: Oct 24, 2023</div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="w-full border-white/10 hover:bg-zinc-800">
                                                    Change Password
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Change Password</DialogTitle>
                                                    <DialogDescription className="text-neutral-400">
                                                        Enter your current password and a new strong password.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Current Password</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showOldPassword ? "text" : "password"}
                                                                value={oldPassword}
                                                                onChange={(e) => setOldPassword(e.target.value)}
                                                                className="bg-zinc-900 border-white/10 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowOldPassword(!showOldPassword)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                                            >
                                                                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>New Password</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showNewPassword ? "text" : "password"}
                                                                value={newPassword}
                                                                onChange={(e) => setNewPassword(e.target.value)}
                                                                className="bg-zinc-900 border-white/10 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                                            >
                                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>

                                                        {/* Password Requirements - Only show if password is not empty */}
                                                        <AnimatePresence>
                                                            {newPassword.length > 0 && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="space-y-2 bg-zinc-900/50 p-3 rounded-md border border-white/5 overflow-hidden"
                                                                >
                                                                    <p className="text-xs font-medium text-muted-foreground mb-2">Password Requirements:</p>
                                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                                        <div className={`flex items-center gap-1.5 ${passwordStrength.length ? "text-green-500" : "text-neutral-500"}`}>
                                                                            {passwordStrength.length ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                                            8+ characters
                                                                        </div>
                                                                        <div className={`flex items-center gap-1.5 ${passwordStrength.number ? "text-green-500" : "text-neutral-500"}`}>
                                                                            {passwordStrength.number ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                                            At least 1 number
                                                                        </div>
                                                                        <div className={`flex items-center gap-1.5 ${passwordStrength.uppercase ? "text-green-500" : "text-neutral-500"}`}>
                                                                            {passwordStrength.uppercase ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                                            Uppercase letter
                                                                        </div>
                                                                        <div className={`flex items-center gap-1.5 ${passwordStrength.special ? "text-green-500" : "text-neutral-500"}`}>
                                                                            {passwordStrength.special ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                                            Special char
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleChangePassword} className="bg-blue-600 hover:bg-blue-700">Update Password</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </div>


                        </div>

                        {/* 2. Vault Settings */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Vault Settings</h2>
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-500" /> Vault Behavior
                                </h3>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base text-neutral-200">Auto-lock Vault</Label>
                                                <p className="text-sm text-neutral-500">
                                                    {autoLockTimer === 0
                                                        ? "Vault will remain unlocked indefinitely"
                                                        : `Lock vault after ${autoLockTimer} minutes of inactivity`}
                                                </p>
                                            </div>

                                            {autoLockTimer > 0 && (
                                                <span className="font-mono text-sm bg-zinc-800 px-2 py-1 rounded w-12 text-center text-white">
                                                    {autoLockTimer}m
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <Slider
                                                value={[autoLockTimer]}
                                                onValueChange={(v) => setAutoLockTimer(v[0])}
                                                max={60}
                                                min={0}
                                                step={1}
                                                className={cn("w-full", autoLockTimer === 0 && "opacity-50")}
                                                disabled={autoLockTimer === 0}
                                            />

                                            <div className="flex flex-wrap gap-2">
                                                {[5, 10, 30].map((time) => (
                                                    <Button
                                                        key={time}
                                                        variant={autoLockTimer === time ? "secondary" : "outline"}
                                                        size="sm"
                                                        onClick={() => setAutoLockTimer(time)}
                                                        className={cn("h-7 text-xs", autoLockTimer === time ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "border-white/10 text-neutral-400 hover:text-white")}
                                                    >
                                                        {time} min
                                                    </Button>
                                                ))}
                                                <div className="h-4 w-px bg-white/10 mx-1 self-center" />
                                                <Button
                                                    variant={autoLockTimer === 0 ? "destructive" : "outline"}
                                                    size="sm"
                                                    onClick={() => setAutoLockTimer(0)}
                                                    className={cn("h-7 text-xs", autoLockTimer === 0 ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" : "border-white/10 text-neutral-400 hover:text-white hover:bg-white/5")}
                                                >
                                                    Never
                                                </Button>
                                            </div>

                                            {autoLockTimer === 0 && (
                                                <div className="flex items-start gap-2 pt-2 text-red-400/80 text-xs bg-red-500/5 p-3 rounded border border-red-500/10">
                                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <p>Warning: Selecting "Never" leaves your vault exposed if you leave your device unattended. Not recommended.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm text-neutral-400">Lock Triggers</Label>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="lock-tab" defaultChecked className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white" />
                                            <Label htmlFor="lock-tab" className="cursor-pointer">Lock when tab is closed</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="lock-sleep" defaultChecked className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white" />
                                            <Label htmlFor="lock-sleep" className="cursor-pointer">Lock when system sleeps</Label>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/5" />

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base text-neutral-200">Clear Clipboard</Label>
                                            <p className="text-sm text-neutral-500">
                                                Clear copied passwords after 30 seconds.
                                                <br />
                                                <span className="text-xs text-orange-400/80">
                                                    Note: This clears the active clipboard only. Your OS may retain clipboard history.
                                                </span>
                                            </p>
                                        </div>
                                        <Checkbox defaultChecked className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white" />
                                    </div>

                                    <div className="pt-2 border-t border-white/5">
                                        <Button variant="secondary" onClick={handleManualLock} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10">
                                            <Lock className="w-4 h-4 mr-2" />
                                            Lock Vault Now
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Recovery Options */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Recovery & MFA</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Recovery */}
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <RefreshCw className="w-5 h-5 text-orange-500" /> Vault Recovery
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium text-white">Status</div>
                                            {recoveryCodesGenerated ? (
                                                <Badge variant="outline" className="text-green-400 border-green-500/20 bg-green-500/10">Active</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-orange-400 border-orange-500/20 bg-orange-500/10">Not Generated</Badge>
                                            )}
                                        </div>

                                        {!recoveryCodesGenerated && (
                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
                                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                                <div>
                                                    <span className="font-bold">Warning:</span> Without Vault Recovery Codes, your data is lost if you forget your password.
                                                </div>
                                            </div>
                                        )}

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" className="w-full border-white/10 hover:bg-zinc-800">
                                                    {recoveryCodesGenerated ? "Regenerate Vault Recovery Codes" : "Generate Vault Recovery Codes"}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Generate New Vault Recovery Codes?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-neutral-400">
                                                        This will invalidate any existing codes. You must verify your Master Password to continue.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <div className="py-2">
                                                    <Label className="text-neutral-300">Master Password</Label>
                                                    <Input type="password" placeholder="Verify identity..." className="mt-2 bg-zinc-900 border-white/10" />
                                                </div>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-zinc-900 border-white/10 hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleRegenerateCodes} className="bg-blue-600 hover:bg-blue-700">Generate Codes</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>

                                {/* MFA */}
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <Smartphone className="w-5 h-5 text-purple-500" /> MFA (Login)
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="font-medium text-white">Authenticator App</div>
                                                <div className="text-sm text-neutral-500">Secure login with 2FA</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="mfa-toggle"
                                                    checked={mfaEnabled}
                                                    onCheckedChange={(c) => setMfaEnabled(c as boolean)}
                                                    className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white w-6 h-6"
                                                />
                                            </div>
                                        </div>

                                        {mfaEnabled && (
                                            <Button variant="outline" size="sm" className="w-full border-white/10 text-neutral-300 hover:text-white hover:bg-zinc-800">
                                                View MFA Backup Codes
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Data Management */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Data & Notifications</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Data */}
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <HardDrive className="w-5 h-5 text-neutral-400" /> Data Management
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded bg-zinc-950/50 border border-white/5">
                                            <Download className="w-5 h-5 text-blue-500" />
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">Export Vault</div>
                                            </div>

                                            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 hover:bg-white/10" onClick={handleExportInitiate}>
                                                        Export
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[500px]">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2 text-red-500">
                                                            <AlertTriangle className="w-5 h-5" />
                                                            Export Vault
                                                        </DialogTitle>
                                                    </DialogHeader>

                                                    {exportStep === 'warning' && (
                                                        <div className="space-y-4">
                                                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-100 text-sm">
                                                                <p className="font-semibold mb-2">Warning: Exposing Sensitive Data</p>
                                                                <p>Exporting your vault will convert all your encrypted passwords into a plain text file. Anyone with access to this file can view all your passwords.</p>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                                                                <Button variant="destructive" onClick={() => setExportStep('verify')}>I Understand, Continue</Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {exportStep === 'verify' && (
                                                        <div className="space-y-4">
                                                            <DialogDescription>
                                                                Please enter your Master Password to authorize this export.
                                                            </DialogDescription>
                                                            <div className="space-y-2">
                                                                <Label>Master Password</Label>
                                                                <Input
                                                                    type="password"
                                                                    value={exportMasterPassword}
                                                                    onChange={(e) => setExportMasterPassword(e.target.value)}
                                                                    className="bg-zinc-900 border-white/10"
                                                                />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                                                                <Button onClick={handleExportVerify} className="bg-blue-600 hover:bg-blue-700">Unlock & Export</Button>
                                                            </DialogFooter>
                                                        </div>
                                                    )}

                                                    {exportStep === 'processing' && (
                                                        <div className="py-8 flex flex-col items-center justify-center space-y-4">
                                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                            <div className="text-center">
                                                                <h3 className="font-medium">Preparing Export</h3>
                                                                <p className="text-sm text-neutral-500">Decrypting vault data...</p>
                                                                {exportCountdown > 0 && <p className="text-xs text-neutral-600 mt-2">Starting in {exportCountdown}s...</p>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </DialogContent>
                                            </Dialog>


                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded bg-zinc-950/50 border border-white/5">
                                            <Upload className="w-5 h-5 text-purple-500" />
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">Import Passwords</div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 hover:bg-white/10">Import</Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-yellow-500" /> Notifications
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="notif-breach" defaultChecked className="border-white/20" />
                                            <Label htmlFor="notif-breach" className="cursor-pointer">Alert me about data breaches</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="notif-weak" defaultChecked className="border-white/20" />
                                            <Label htmlFor="notif-weak" className="cursor-pointer">Remind me to update old passwords</Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Activity */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider pl-1">Security Activity</h2>
                            <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-neutral-400" /> Security Activity
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-3 rounded bg-zinc-950/50 border border-white/5 space-y-1">
                                            <div className="text-xs text-neutral-500">Last Auth Password Change</div>
                                            <div className="text-sm font-mono text-white">Oct 24, 2023 14:30</div>
                                        </div>
                                        <div className="p-3 rounded bg-zinc-950/50 border border-white/5 space-y-1">
                                            <div className="text-xs text-neutral-500">Last Master Password Change</div>
                                            <div className="text-sm font-mono text-white">Sep 12, 2023 09:15</div>
                                        </div>
                                        <div className="p-3 rounded bg-zinc-950/50 border border-white/5 space-y-1">
                                            <div className="text-xs text-neutral-500">Last Recovery Codes Generated</div>
                                            <div className="text-sm font-mono text-white">Jan 10, 2024 16:45</div>
                                        </div>
                                        <div className="p-3 rounded bg-zinc-950/50 border border-white/5 space-y-1">
                                            <div className="text-xs text-neutral-500">Last Vault Export</div>
                                            <div className="text-sm font-mono text-white">Never</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Danger Zone */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-red-500/70 uppercase tracking-wider pl-1">Danger Zone</h2>
                            <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-white">Delete Account</div>
                                        <div className="text-sm text-red-300/70">These actions permanently delete encrypted data and cannot be undone.</div>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">Delete Account</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-neutral-400">
                                                    This action cannot be undone. This will permanently delete your
                                                    account and remove your data from our servers.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
