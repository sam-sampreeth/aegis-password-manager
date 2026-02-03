import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    ShieldAlert,
    CheckCircle2,
    X,
    ArrowRight,
    LockKeyhole,
    Smartphone,
    CloudOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

type NotificationType = "critical" | "warning" | "info" | "success";

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    description: string;
    date: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    icon: React.ElementType;
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: "1",
            type: "critical",
            title: "Data Breach Alert",
            description: "5 of your passwords were found in a recent data breach (Glacier Corp). We recommend changing them immediately.",
            date: "Just now",
            icon: ShieldAlert,
            action: {
                label: "Review Compromised Items",
                onClick: () => navigate("/vault?filter=weak")
            }
        },
        {
            id: "2",
            type: "warning",
            title: "Security Check Required",
            description: "You have 3 weak passwords that are easy to guess. Update them to improve your vault health.",
            date: "2 hours ago",
            icon: LockKeyhole,
            action: {
                label: "Go to Action Center",
                onClick: () => navigate("/vault/action-center")
            }
        },
        {
            id: "3",
            type: "warning",
            title: "Missing 2FA Protection",
            description: "Enable 2-Factor Authentication on your Banking and Finance items for extra security.",
            date: "1 day ago",
            icon: Smartphone,
            action: {
                label: "View Finance Items",
                onClick: () => navigate("/vault?category=Finance")
            }
        },
        {
            id: "4",
            type: "info",
            title: "Backup Overdue",
            description: "Your last encrypted backup was 14 days ago. It is recommended to backup your vault weekly.",
            date: "2 days ago",
            icon: CloudOff,
            action: {
                label: "Backup Now",
                onClick: () => navigate("/vault/settings")
            }
        }
    ]);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getTypeStyles = (type: NotificationType) => {
        switch (type) {
            case "critical":
                return "bg-red-500/10 border-red-500/20 text-red-200 hover:border-red-500/30";
            case "warning":
                return "bg-amber-500/10 border-amber-500/20 text-amber-200 hover:border-amber-500/30";
            case "success":
                return "bg-emerald-500/10 border-emerald-500/20 text-emerald-200 hover:border-emerald-500/30";
            case "info":
            default:
                return "bg-blue-500/10 border-blue-500/20 text-blue-200 hover:border-blue-500/30";
        }
    };

    const getIconColor = (type: NotificationType) => {
        switch (type) {
            case "critical": return "text-red-500";
            case "warning": return "text-amber-500";
            case "success": return "text-emerald-500";
            default: return "text-blue-500";
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden relative">
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-900/10 via-zinc-950/50 to-zinc-950 pointer-events-none" />

            <div className="flex-1 w-full max-w-4xl mx-auto p-6 z-10 overflow-y-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <Bell className="w-6 h-6 text-purple-400" />
                            Notifications
                        </h1>
                        <p className="text-neutral-400 mt-1">
                            Security alerts and system updates for your vault.
                        </p>
                    </div>
                    {notifications.length > 0 && (
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-neutral-400 hover:text-white"
                                onClick={() => setNotifications([])}
                            >
                                Mark all as read
                            </Button>
                            <Badge variant="secondary" className="bg-white/5 text-neutral-300 pointer-events-none">
                                {notifications.length} Unread
                            </Badge>
                        </div>
                    )}
                </header>

                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <motion.div
                                    key={notification.id}
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                    className={`relative p-5 rounded-xl border backdrop-blur-sm transition-all duration-200 group ${getTypeStyles(notification.type)}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg bg-zinc-950/40 border border-white/5 shrink-0 ${getIconColor(notification.type)}`}>
                                            <notification.icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg leading-tight mb-1">
                                                        {notification.title}
                                                    </h3>
                                                    <p className="text-sm opacity-80 leading-relaxed max-w-2xl">
                                                        {notification.description}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                                                    <button
                                                        onClick={() => removeNotification(notification.id)}
                                                        className="text-neutral-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
                                                        title="Dismiss"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-xs font-medium opacity-50 whitespace-nowrap">
                                                        {notification.date}
                                                    </span>
                                                </div>
                                            </div>

                                            {notification.action && (
                                                <div className="mt-2 flex items-center gap-3">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={notification.action.onClick}
                                                        className={`h-8 px-3 text-xs font-medium border border-white/10 hover:bg-white/5 ${getIconColor(notification.type)}`}
                                                    >
                                                        {notification.action.label}
                                                        <ArrowRight className="w-3 h-3 ml-2" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-20 text-center space-y-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-medium text-white">All caught up!</h3>
                                    <p className="text-neutral-500 mt-1">No new notifications at the moment.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
