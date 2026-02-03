import { useState } from "react";
import { Settings, Shield, HardDrive, Bell, Download, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
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

export default function SettingsPage() {
    const [autoLockTimer, setAutoLockTimer] = useState(15);

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
                    <div className="max-w-4xl mx-auto space-y-8">

                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="bg-zinc-900 border border-white/5 mx-auto grid min-w-[400px] w-auto grid-cols-3 mb-8">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="security">Security</TabsTrigger>
                                <TabsTrigger value="danger" className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500">Danger Zone</TabsTrigger>
                            </TabsList>

                            {/* General Settings */}
                            <TabsContent value="general" className="space-y-6">
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-blue-500" /> Vault Behavior
                                        </h3>

                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="text-base text-neutral-200">Auto-lock Vault</Label>
                                                    <p className="text-sm text-neutral-500">Automatically lock after inactivity</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-mono text-sm bg-zinc-800 px-2 py-1 rounded">{autoLockTimer} min</span>
                                                    <Slider
                                                        value={[autoLockTimer]}
                                                        onValueChange={(v) => setAutoLockTimer(v[0])}
                                                        max={60}
                                                        min={1}
                                                        step={1}
                                                        className="w-[100px]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5" />

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="text-base text-neutral-200">Clear Clipboard</Label>
                                                    <p className="text-sm text-neutral-500">Clear copied passwords after 30 seconds</p>
                                                </div>
                                                <Checkbox defaultChecked />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium flex items-center gap-2">
                                            <Bell className="w-5 h-5 text-yellow-500" /> Notifications
                                        </h3>
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="notif-breach" defaultChecked />
                                                <Label htmlFor="notif-breach" className="cursor-pointer">Alert me about data breaches</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="notif-weak" defaultChecked />
                                                <Label htmlFor="notif-weak" className="cursor-pointer">Remind me to update old passwords</Label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Security Settings */}
                            <TabsContent value="security" className="space-y-6">
                                <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/50 space-y-6">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <HardDrive className="w-5 h-5 text-emerald-500" /> Data Management
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="p-4 rounded-lg bg-zinc-950 border border-white/5 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-md bg-blue-500/10 text-blue-500"><Download className="w-5 h-5" /></div>
                                                <div>
                                                    <div className="font-medium text-white">Export Vault</div>
                                                    <div className="text-xs text-neutral-500">Download as JSON or CSV</div>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-zinc-800">
                                                Export Data
                                            </Button>
                                        </div>

                                        <div className="p-4 rounded-lg bg-zinc-950 border border-white/5 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-md bg-purple-500/10 text-purple-500"><Upload className="w-5 h-5" /></div>
                                                <div>
                                                    <div className="font-medium text-white">Import Passwords</div>
                                                    <div className="text-xs text-neutral-500">From Chrome, LastPass, etc.</div>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-zinc-800">
                                                Import Data
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Danger Zone */}
                            <TabsContent value="danger" className="space-y-6">
                                <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 space-y-6">
                                    <h3 className="text-lg font-medium flex items-center gap-2 text-red-500">
                                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                                    </h3>

                                    <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <div>
                                            <div className="font-medium text-white">Delete Account</div>
                                            <div className="text-sm text-red-300/70">Permanently delete your account and all data.</div>
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
                            </TabsContent>
                        </Tabs>

                    </div>
                </div>
            </div>
        </div>
    );
}
