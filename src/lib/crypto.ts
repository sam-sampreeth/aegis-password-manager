// Crypto utilities for zero-knowledge password manager
// All encryption happens client-side

/**
 * Generate a random vault key (used to encrypt all vault data)
 */
export function generateVaultKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random salt for KDF
 */
export function generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive master key from password using PBKDF2
 */
export async function deriveMasterKey(password: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    // Convert hex salt to buffer
    const saltBuffer = new Uint8Array(salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    // Derive key using PBKDF2
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt vault key with master key
 */
export async function encryptVaultKey(vaultKey: string, masterKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(vaultKey);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        masterKey,
        data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to hex
    return Array.from(combined, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Decrypt vault key with master key
 * Returns null if decryption fails (wrong password)
 */
export async function decryptVaultKey(encryptedHex: string, masterKey: CryptoKey): Promise<string | null> {
    try {
        // Convert hex to buffer
        const combined = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            masterKey,
            encrypted
        );

        // Convert to string
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        // Decryption failed = wrong password
        return null;
    }
}

/**
 * Generate recovery codes in format xxxxx-xxxxx
 * Uses unambiguous characters: lowercase letters + numbers (excluding 0, o, 1, l, i)
 */
export function generateRecoveryCodes(count: number = 10): string[] {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // Exclude ambiguous: 0, o, 1, l, i
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
        let code = '';
        for (let j = 0; j < 10; j++) {
            const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % chars.length;
            code += chars[randomIndex];
            if (j === 4) code += '-'; // Add dash after 5 chars
        }
        codes.push(code);
    }

    return codes;
}

/**
 * Encrypt recovery codes with vault key
 */
export async function encryptRecoveryCodes(codes: string[], vaultKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(codes));

    // Import vault key
    const keyBuffer = new Uint8Array(vaultKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to hex
    return Array.from(combined, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Decrypt recovery codes with vault key
 */
export async function decryptRecoveryCodes(encryptedHex: string, vaultKey: string): Promise<string[]> {
    try {
        // Import vault key
        const keyBuffer = new Uint8Array(vaultKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            'AES-GCM',
            false,
            ['encrypt', 'decrypt']
        );

        // Convert hex to buffer
        const combined = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            encrypted
        );

        // Convert to string and parse JSON
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
        console.error('Failed to decrypt recovery codes:', error);
        return [];
    }
}

/**
 * Hash a recovery code to use as encryption key
 */
async function hashRecoveryCode(code: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const codeBuffer = encoder.encode(code);

    // Import code as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        codeBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Use a fixed salt for recovery codes (since the code itself is random)
    const salt = encoder.encode('aegis-recovery-salt-v1');

    // Derive key
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 10000, // Lower iterations since codes are already random
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt vault key with a recovery code
 * Each recovery code can independently decrypt the vault key
 */
export async function encryptVaultKeyWithRecoveryCode(vaultKey: string, recoveryCode: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(vaultKey);

    // Derive key from recovery code
    const cryptoKey = await hashRecoveryCode(recoveryCode);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to hex
    return Array.from(combined, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Try to decrypt vault key with a recovery code
 * Returns vault key if successful, null if code is invalid
 */
export async function decryptVaultKeyWithRecoveryCode(encryptedHex: string, recoveryCode: string): Promise<string | null> {
    try {
        // Derive key from recovery code
        const cryptoKey = await hashRecoveryCode(recoveryCode);

        // Convert hex to buffer
        const combined = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            encrypted
        );

        // Convert to string
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        // Decryption failed = invalid recovery code
        return null;
    }
}

/**
 * Generate recovery code data structure
 * Returns: { codes: string[], encryptedVaultKeys: string[] }
 * Each code has a corresponding encrypted vault key
 */
export async function generateRecoveryCodeData(vaultKey: string, count: number = 10): Promise<{
    codes: string[];
    encryptedVaultKeys: string[];
}> {
    const codes = generateRecoveryCodes(count);
    const encryptedVaultKeys: string[] = [];

    // Encrypt vault key with each recovery code
    for (const code of codes) {
        const encrypted = await encryptVaultKeyWithRecoveryCode(vaultKey, code);
        encryptedVaultKeys.push(encrypted);
    }

    return { codes, encryptedVaultKeys };
}

/**
 * Verify a recovery code and return vault key if valid
 */
export async function verifyRecoveryCodeAndGetVaultKey(
    inputCode: string,
    storedDataJson: string
): Promise<string | null> {
    try {
        const data: { codes: string[]; encryptedVaultKeys: string[] } = JSON.parse(storedDataJson);

        // Find the index of the matching code
        const index = data.codes.findIndex(code => code === inputCode);

        if (index === -1) {
            return null; // Code not found
        }

        // Try to decrypt vault key with this code
        const vaultKey = await decryptVaultKeyWithRecoveryCode(
            data.encryptedVaultKeys[index],
            inputCode
        );

        return vaultKey;
    } catch (error) {
        console.error('Recovery code verification failed:', error);
        return null;
    }
}

/**
 * Export vault data as encrypted JSON
 * 
 * Logic:
 * 1. Generate new random salt
 * 2. Derive key from password + salt
 * 3. Encrypt the whole JSON payload
 * 4. Return structured export format
 */
export async function exportVault(items: any[], password: string): Promise<string> {
    // 1. Generate salt
    const salt = generateSalt();

    // 2. Derive key
    const masterKey = await deriveMasterKey(password, salt);

    // 3. Encrypt data
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(items));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        masterKey,
        data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to hex
    const ciphertext = Array.from(combined, byte => byte.toString(16).padStart(2, '0')).join('');

    // 4. Construct export object
    const exportData = {
        format: "aegis-encrypted-vault",
        version: 1,
        createdAt: new Date().toISOString(),
        kdf: {
            algorithm: "PBKDF2",
            salt: salt,
            params: {
                iterations: 100000,
                hash: "SHA-256"
            }
        },
        encryption: {
            algorithm: "AES-256-GCM",
            iv_included: true // IV is prefixed to ciphertext
        },
        ciphertext: ciphertext
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Import and decrypt vault from JSON
 */
export async function importVault(jsonString: string, password: string): Promise<any[]> {
    try {
        const data = JSON.parse(jsonString);

        // Validate format
        if (data.format !== "aegis-encrypted-vault" || !data.ciphertext || !data.kdf) {
            throw new Error("Invalid vault format");
        }

        // 1. Derive key using file's KDF params
        const salt = data.kdf.salt;
        const iterations = data.kdf.params.iterations;
        const hash = data.kdf.params.hash;

        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const saltBuffer = new Uint8Array(salt.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));

        const masterKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: iterations,
                hash: hash
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // 2. Decrypt
        const encryptedHex = data.ciphertext;
        const combined = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));

        // Extract IV (first 12 bytes)
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            masterKey,
            ciphertext
        );

        // 3. Parse result
        const decoder = new TextDecoder();
        const decryptedJson = decoder.decode(decrypted);
        return JSON.parse(decryptedJson);

    } catch (error) {
        console.error("Import failed:", error);
        throw new Error("Decryption failed. Wrong password or corrupted file.");
    }
}

