# Aegis Password Manager

Aegis is a modern, **zero knowledge** password manager built with a strong focus on **security**, **privacy**, and refined user experience. All encryption and decryption occur client-side, ensuring that your master password and vault keys never leave your browser.

## Security Architecture

### Zero Knowledge Design
- No password hashes, master keys, or decrypted vault data are stored on the server.
- The backend only stores encrypted data.

### AES-256-GCM Encryption
- All vault entries are encrypted using **AES-256-GCM** before being synchronized to the cloud.

### Secure Key Derivation
- Master keys are derived using **PBKDF2** with high iteration counts and unique salts to protect against brute-force attacks.

### Recovery System
- Each account generates **10 unique cryptographically secure recovery codes** that allow independent vault access if the master password is lost.

## Features

- **Integrated TOTP Authenticator**  
  Store 2FA secrets and generate time-based one-time passwords directly inside Aegis.

- **Multiple URL Support**  
  Associate multiple domains with a single credential entry.

- **Secure Cloud Synchronization**  
  Encrypted vault data is synced in real time using **Supabase**.

- **Advanced Metadata Tracking**  
  Track creation timestamps, version history, password strength, and item activity within a unified dashboard.

- **Account Control**  
  Supports secure account deletion and encrypted JSON data export.

## Technology Stack

### Frontend
- React
- TypeScript
- Vite

### Styling and UI
- Tailwind CSS
- Vanilla CSS
- Framer Motion
- ShadCN UI
- Aceternity UI
- Radix UI
- Lucide Icons

### Backend
- Supabase Authentication
- Supabase Database

### Cryptography
- Web Crypto API

## Getting Started

### Environment Configuration
Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
### OAuth Configuration

#### GitHub OAuth
1. Register a new OAuth application in GitHub Developer Settings.
2. Set the **Authorization callback URL** to:  `https://[YOUR_PROJECT_ID].supabase.co/auth/v1/callback`

#### Google OAuth
1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Add the **Authorized redirect URI**:  `https://[YOUR_PROJECT_ID].supabase.co/auth/v1/callback`


#### Custom SMTP via Resend
1. In Supabase dashboard go to: **Authentication → Settings → SMTP**
2. Enable **Custom SMTP**
3. Fill in these values:

- **Sender Email**: `hello+accounts@sampreeth.in`
- **Host**: `smtp.resend.com`
- **Port**: `465` or `587`
- **Username**: `resend`
- **Password**: `[YOUR_RESEND_API_KEY]`
- **Minimum Interval**: `60` seconds

4. Make sure your sending domain is verified in Resend first.

### Running the Project

#### Install dependencies
```bash
npm install
```
#### Start development server
```bash
npm run dev
```

## Development Notes
Aegis is built with a security-first mindset and clean, high-fidelity UI.
For local development, confirm your Supabase project has these tables:
- profiles
- user_settings
- vault_items
- vault_trash

Row Level Security (RLS) should be enabled and configured so that users can only read/write their own encrypted data — all decryption happens exclusively client-side.
