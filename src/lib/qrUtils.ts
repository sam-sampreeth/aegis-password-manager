import jsQR from "jsqr";

/**
 * Scans a QR code from a file and returns the decoded string.
 */
export async function scanQrCode(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const imageDataUrl = event.target?.result as string;
            if (!imageDataUrl) {
                reject(new Error("Failed to read file"));
                return;
            }

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                if (!context) {
                    reject(new Error("Failed to get 2d context"));
                    return;
                }

                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    resolve(code.data);
                } else {
                    reject(new Error("No QR code found in the image"));
                }
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = imageDataUrl;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

/**
 * Parses an otpauth URI and extracts the secret.
 */
export function extractTotpSecret(uri: string): string | null {
    try {
        const url = new URL(uri);
        if (url.protocol !== "otpauth:") return null;

        const params = new URLSearchParams(url.search);
        return params.get("secret");
    } catch (e) {
        // If it's not a URL, it might just be the secret itself
        // or a malformed string. We'll return the string if it looks like a base32 secret
        const cleanStr = uri.trim().toUpperCase();
        if (/^[A-Z2-7]+=*$/.test(cleanStr)) {
            return cleanStr;
        }
        return null;
    }
}
