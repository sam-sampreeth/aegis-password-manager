# Aegis Password Manager

Aegis is a modern, zero-knowledge password manager designed for security, privacy, and visual excellence. All encryption and decryption happen client-side, ensuring your master password and vault keys never leave your browser.

## Core Security

- **Zero-Knowledge Architecture:** No password hashes or sensitive keys are stored on our servers.
- **AES-256-GCM Encryption:** All vault data is encrypted using industry-standard AES-256-GCM before being synced to the cloud.
- **Master Key Derivation:** Uses PBKDF2 with high iterations and unique salts to derive strong master keys from your password.
- **Recovery System:** Generates 10 unique, cryptographic recovery codes for independent vault access if you forget your master password.

## Key Features

- **Integrated TOTP Authenticator:** Store 2FA seeds and generate time-based one-time passwords directly within Aegis.
- **Multiple URL Support:** Link several domains to a single set of credentials for maximum flexibility.
- **Secure Synchronization:** Real-time cloud sync with Supabase, protected by client-side encryption.
- **Advanced Metadata:** Track creation dates, version history, and item strength in a unified dashboard.
- **Account Sovereignty:** Full support for account deletion and data export in secure JSON format.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Vanilla CSS, Tailwind CSS, Framer Motion
- **UI Components:** ShadCn UI, Aceternity UI, Radix UI, Lucide Icons
- **Backend:** Supabase (Auth & Database)
- **Encryption:** Web Crypto API

## Getting Started

### Configuration

1. Create a .env file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. OAuth Setup:
   - **GitHub OAuth:** Register a new OAuth application in your GitHub Developer Settings. Set the Authorization Callback URL to `https://[YOUR_PROJECT_ID].supabase.co/auth/v1/callback`.
   - **Google OAuth:** Create an OAuth client ID in the Google Cloud Console. Add the Authorized Redirect URI as `https://[YOUR_PROJECT_ID].supabase.co/auth/v1/callback`.
   - **Custom SMTP (via Resend):**
     1. Go to **Authentication -> Auth Settings -> SMTP Settings**.
     2. Enable **Custom SMTP**.
     3. **Sender Email**: `hello+accounts@sampreeth.in` (Verify domain in Resend first).
     4. **Host**: `smtp.resend.com`
     5. **Port**: `465` or `587`
     6. **Username**: `resend`
     7. **Password**: `[YOUR_RESEND_API_KEY]`
     8. **Minimum Interval**: `60` seconds.

### Running the Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

## Development

This project is built with a focus on high-fidelity UI and robust security. For local development, ensure your Supabase instance includes the necessary tables for profiles, user_settings, vault_items, and vault_trash.

---
