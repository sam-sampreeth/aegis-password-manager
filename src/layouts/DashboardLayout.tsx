import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    UserCircle,
    Settings,
    LogOut,
    Shield,
    ShieldAlert,
    Sparkles,
    Trash2,
    LockKeyhole,
    Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LockProvider, useLock } from "@/context/LockContext";
import { LockScreen } from "@/components/vault/LockScreen";
import { useAuth } from "@/context/AuthContext";

export function DashboardLayout() {
    return (
        <LockProvider>
            <DashboardContent />
        </LockProvider>
    );
}

function DashboardContent() {
    const [open, setOpen] = useState(false);
    const { isLocked, lockVault } = useLock();
    const { user, loading: authLoading, signOut } = useAuth();
    const [isSecuring, setIsSecuring] = useState(false);
    const [securingType, setSecuringType] = useState<"lock" | "logout" | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        }
    }, [authLoading, user, navigate]);

    // Persistent Demo Toast
    useEffect(() => {
        if (user?.id === "demo-user") {
            // Check if toast already exists to avoid duplicates? 
            // Sonner might handle this, or we can just fire it. 
            // Setting a unique ID prevents duplicates.
            toast("Demo Mode Active", {
                id: "demo-mode-toast",
                description: "Master Password: demo123",
                duration: Infinity,
                action: {
                    label: "Dismiss",
                    onClick: () => {
                        // Optional: Allow dismissal but maybe remember it? 
                        // For now just dismiss.
                    }
                },
                className: "bg-blue-900/20 border-blue-500/20 text-blue-200"
            });
        } else {
            // Dismiss if not demo (e.g. logout/login)
            toast.dismiss("demo-mode-toast");
        }
    }, [user]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Determine if the current route requires a lock
    // Safe routes: Settings, Generator, Profile
    // Protected routes: Vault (index), Trash, Action Center, Notifications
    const isRouteProtected = () => {
        const path = location.pathname;
        if (path.startsWith("/vault/settings")) return false;
        if (path.startsWith("/vault/generator")) return false;
        if (path.startsWith("/profile")) return false;

        // Block main vault and other sub-routes
        if (path.startsWith("/vault")) return true;

        return false;
    };

    const showLockScreen = isLocked && isRouteProtected();

    const handleSecureAction = (type: "lock" | "logout") => {
        setIsSecuring(true);
        setSecuringType(type);

        setTimeout(async () => {
            setIsSecuring(false);
            setSecuringType(null);

            if (type === "lock") {
                lockVault("manual");
            } else {
                await signOut();
                navigate("/auth");
            }
        }, 1500);
    };

    const links = [
        {
            label: "Dashboard",
            href: "/vault",
            icon: (
                <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Action Center",
            href: "/vault/action-center",
            icon: (
                <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Generator",
            href: "/vault/generator",
            icon: (
                <Sparkles className="h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Notifications",
            href: "/vault/notifications",
            icon: (
                <Bell className="h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Trash",
            href: "/vault/trash",
            icon: (
                <Trash2 className="h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Settings",
            href: "/vault/settings",
            icon: (
                <Settings className="h-5 w-5 flex-shrink-0" />
            ),
        },
    ];

    return (
        <div
            className={cn(
                "flex flex-col md:flex-row bg-zinc-950 w-full flex-1 mx-auto border border-neutral-800 overflow-hidden relative",
                "h-screen"
            )}
        >
            {/* Secure Action Overlay */}
            {isSecuring && (
                <div className="absolute inset-0 z-[60] bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <div className="text-xl font-medium text-white">
                            {securingType === "lock" ? "Securing Vault..." : "Logging Out securely..."}
                        </div>
                        <div className="text-sm text-neutral-400">Please wait while we encrypt your session</div>
                    </div>
                </div>
            )}

            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10 bg-zinc-950 border-r border-white/10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="flex flex-col gap-4 mb-4">
                            <div className="flex items-center justify-between pl-2 pr-2 py-2">
                                <Link to="/vault" className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Shield className="w-8 h-8 text-white shrink-0" />
                                    <motion.div
                                        animate={{
                                            opacity: open ? 1 : 0,
                                            display: open ? "block" : "none",
                                        }}
                                        className="font-bold text-2xl text-white whitespace-pre"
                                    >
                                        Aegis
                                    </motion.div>
                                </Link>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            {links.map((link, idx) => (
                                <SidebarLink key={idx} link={link} className="hover:bg-white/5 rounded-md" />
                            ))}
                        </div>
                    </div>
                    <div>
                        <SidebarLink
                            link={{
                                label: "Lock Vault",
                                href: "#",
                                icon: (
                                    <LockKeyhole className="h-5 w-5 flex-shrink-0" />
                                ),
                            }}
                            className="hover:bg-blue-500/10 hover:text-blue-400 rounded-md"
                            onClick={() => handleSecureAction("lock")}
                        />

                        <div className="my-2 border-t border-white/10" />

                        <SidebarLink
                            link={{
                                label: "Profile",
                                href: "/profile",
                                icon: (
                                    <UserCircle className="h-5 w-5 flex-shrink-0" />
                                ),
                            }}
                            className="hover:bg-white/5 rounded-md"
                        />
                        <SidebarLink
                            link={{
                                label: "Logout",
                                href: "#",
                                icon: (
                                    <LogOut className="h-5 w-5 flex-shrink-0" />
                                ),
                            }}
                            className="hover:bg-red-500/10 hover:text-red-400 rounded-md"
                            onClick={() => handleSecureAction("logout")}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
            <div className="flex-1 flex flex-col overflow-hidden bg-black text-white relative">
                {showLockScreen ? (
                    <LockScreen />
                ) : (
                    <Outlet />
                )}

            </div>
        </div>
    );
}
