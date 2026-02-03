import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
    User,
    Mail,
    Lock,
    ShieldCheck,
    Save,
    Upload,
    Camera
} from "lucide-react";

export default function ProfilePage() {
    return (
        <div className="flex-1 h-screen overflow-y-auto bg-black text-white p-6 md:p-12 pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-8"
            >
                {/* Header */}
                <div className="flex items-end justify-between border-b border-white/10 pb-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold group-hover:opacity-80 transition-opacity cursor-pointer">
                                S
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Sampreeth</h1>
                            <p className="text-neutral-400">sam@example.com</p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="secondary" className="bg-green-900/30 text-green-400 border-green-500/20">Active Subscription</Badge>
                                <Badge variant="outline" className="border-white/10 text-neutral-400">Basic Plan</Badge>
                            </div>
                        </div>
                    </div>
                    <Button className="hidden md:flex gap-2">
                        <Save className="w-4 h-4" />
                        Save Changes
                    </Button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-lg font-semibold text-blue-400">
                            <User className="w-5 h-5" />
                            <h2>Personal Information</h2>
                        </div>
                        <div className="space-y-4 p-6 rounded-xl border border-white/10 bg-zinc-900/30">
                            <div className="space-y-2">
                                <Label>Display Name</Label>
                                <Input defaultValue="Sampreeth" className="bg-zinc-950/50 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Job Title</Label>
                                <Input defaultValue="Software Engineer" className="bg-zinc-950/50 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input defaultValue="San Francisco, CA" className="bg-zinc-950/50 border-white/10" />
                            </div>
                        </div>
                    </div>

                    {/* Security Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-lg font-semibold text-emerald-400">
                            <ShieldCheck className="w-5 h-5" />
                            <h2>Security & Login</h2>
                        </div>
                        <div className="space-y-4 p-6 rounded-xl border border-white/10 bg-zinc-900/30">
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-neutral-500" />
                                    <Input defaultValue="sam@example.com" disabled className="bg-zinc-950/30 border-white/5 text-neutral-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Master Password</Label>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="w-full justify-start text-neutral-400 border-white/10 hover:bg-white/5 hover:text-white">
                                        <Lock className="w-4 h-4 mr-2" />
                                        Change Master Password
                                    </Button>
                                </div>
                            </div>
                            <div className="pt-2">
                                <Label className="mb-2 block">Two-Factor Authentication</Label>
                                <div className="flex items-center justify-between p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-green-400">Enabled</div>
                                            <div className="text-xs text-green-400/60">Using Authenticator App</div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300 hover:bg-green-500/10">
                                        Configure
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-6 pt-8 border-t border-white/10">
                    <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
                    <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="font-medium text-red-400">Delete Account</h3>
                            <p className="text-sm text-red-400/60">Permanently delete your account and all stored passwords.</p>
                        </div>
                        <Button variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 border">
                            Delete Account
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
