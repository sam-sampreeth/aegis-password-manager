import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import TargetCursor from "@/components/reactbits/TargetCursor";
import { useState } from "react";

export const HeroHighlight = ({
    children,
    className,
    containerClassName,
}: {
    children?: React.ReactNode;
    className?: string;
    containerClassName?: string;
}) => {
    const [isHovering, setIsHovering] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={cn(
                "relative h-[55rem] flex items-center justify-center w-full group pt-20 cursor-none", // Hide default cursor here ONLY in hero
                containerClassName
            )}
        >
            {/* Target Cursor only active/visible in this section */}
            {isHovering && (
                <TargetCursor
                    targetSelector=".cursor-target"
                    hideDefaultCursor={false} // Disable global hiding, we handle it via CSS on container
                    spinDuration={2}
                    parallaxOn={true}
                />
            )}

            <div className="absolute inset-0 bg-grid-white pointer-events-none" />
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

            {/* Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div
                className={cn(
                    "relative z-20",
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
};

export const Highlight = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <motion.span
            initial={{
                backgroundSize: "0% 100%",
            }}
            animate={{
                backgroundSize: "100% 100%",
            }}
            transition={{
                duration: 2,
                ease: "linear",
                delay: 0.5,
            }}
            style={{
                backgroundRepeat: "no-repeat",
                backgroundPosition: "left center",
                display: "inline",
            }}
            className={cn(
                `relative inline-block pb-1 px-1 rounded-lg bg-gradient-to-r from-blue-600/50 to-cyan-600/50 cursor-target`, // Make highlight a target
                className
            )}
        >
            {children}
        </motion.span>
    );
};
