import { useEffect, useState, useRef } from 'react'

/**
 * DecryptedText
 *
 * Customize the animation of revealing text by "decrypting" it.
 *
 * @param {string} text - The text to display.
 * @param {number} speed - The interval in ms between character updates.
 * @param {number} maxIterations - Maximum times a character scrambles before settling.
 * @param {string} className - Additional classes for the container.
 * @param {string} parentClassName - Additional classes for the parent container (if any).
 * @param {boolean} encryptedClassName - Class to apply to scrambling characters.
 * @param {boolean} animateOn - 'view' (default) or 'hover'.
 * @param {boolean} revealDirection - 'start' (default), 'end', or 'center'.
 * @param {boolean} sequential - If true, reveals one by one.
 * @param {boolean} useOriginalCharsOnly - If true, only uses chars from the original string for scrambling.
 * @param {string} characters - String of available characters for scrambling.
 */

interface DecryptedTextProps {
    text: string
    speed?: number
    maxIterations?: number
    sequential?: boolean
    revealDirection?: 'start' | 'end' | 'center'
    useOriginalCharsOnly?: boolean
    characters?: string
    className?: string
    parentClassName?: string
    encryptedClassName?: string
    animateOn?: 'view' | 'hover'
}

export default function DecryptedText({
    text,
    speed = 50,
    maxIterations = 10,
    sequential = false,
    revealDirection = 'start',
    useOriginalCharsOnly = false,
    characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+',
    className = '',
    parentClassName = '',
    animateOn = 'hover',
}: DecryptedTextProps) {
    const [displayText, setDisplayText] = useState<string>(text)
    const intervalRef = useRef<number | null>(null)

    useEffect(() => {
        if (animateOn === 'view') {
            scramble()
        }
        // Cleanup on unmount
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [animateOn, text, speed, maxIterations, sequential, revealDirection, useOriginalCharsOnly, characters])

    const scramble = () => {
        let iter = 0;
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = window.setInterval(() => {
            setDisplayText(
                text
                    .split('')
                    .map((_, index) => {
                        if (index < iter) {
                            return text[index];
                        }
                        return characters[Math.floor(Math.random() * characters.length)];
                    })
                    .join('')
            );

            if (iter >= text.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
            }

            iter += 1 / 3;
        }, speed);
    }

    return (
        <span
            className={parentClassName}
            onMouseEnter={() => {
                if (animateOn === 'hover') {
                    scramble()
                }
            }}
        >
            <span className={className}>{displayText}</span>
        </span>
    )
}
