import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    ShieldAlert,
    CheckCircle2,
    X,
    LockKeyhole,
    Info,
    Check,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { Loader2 } from "lucide-react";

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { notifications, loading, dismissNotification, clearAll } = useNotifications();

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'critical': return ShieldAlert;
            case 'warning': return LockKeyhole;
            case 'success': return Check; // Or CheckCircle2
            case 'info': default: return Info;
        }
    };

    const getTypeStyles = (type: Notification['type']) => {
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

    const getIconColor = (type: Notification['type']) => {
        switch (type) {
            case "critical": return "text-red-500";
            case "warning": return "text-amber-500";
            case "success": return "text-emerald-500";
            default: return "text-blue-500";
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Simple relative time formatting
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
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
                                onClick={clearAll}
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
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {notifications.length > 0 ? (
                                notifications.map((notification) => {
                                    const Icon = getIcon(notification.type);
                                    return (
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
                                                    <Icon className="w-5 h-5" />
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
                                                                onClick={() => dismissNotification(notification.id)}
                                                                className="text-neutral-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
                                                                title="Dismiss"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                            <span className="text-xs font-medium opacity-50 whitespace-nowrap">
                                                                {formatDate(notification.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {notification.action_label && notification.action_link && (
                                                        <div className="mt-2 flex items-center gap-3">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => navigate(notification.action_link!)}
                                                                className={`h-8 px-3 text-xs font-medium border border-white/10 hover:bg-white/5 ${getIconColor(notification.type)}`}
                                                            >
                                                                {notification.action_label}
                                                                <ArrowRight className="w-3 h-3 ml-2" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
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
                    )}
                </div>
            </div>
        </div>
    );
}
