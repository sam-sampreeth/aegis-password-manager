export const generatePassword = (length: number, options: { upper: boolean; number: boolean; symbol: boolean; excludeAmbiguous: boolean }) => {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const number = "0123456789";
    const symbol = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let chars = lower;
    if (options.upper) chars += upper;
    if (options.number) chars += number;
    if (options.symbol) chars += symbol;

    if (options.excludeAmbiguous) {
        chars = chars.replace(/[Il1O0]/g, "");
    }

    let pass = "";
    for (let i = 0; i < length; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
};

export const evaluateStrength = (password: string) => {
    let score = 0;
    if (!password) return 0;
    if (password.length > 8) score++;
    if (password.length > 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // Max 5
};

export const getStrengthColor = (score: number) => {
    if (score >= 4) return "bg-emerald-500";
    if (score === 3) return "bg-blue-400";
    if (score === 2) return "bg-yellow-500";
    if (score === 1) return "bg-orange-500";
    return "bg-red-500";
};

export const getStrengthLabel = (score: number) => {
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
    return labels[Math.min(score, 5)];
};
