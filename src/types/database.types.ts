export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    username: string
                    display_name: string
                    mfa_enabled: boolean | null
                    mfa_type: 'totp' | 'email' | null
                    created_at: string
                    last_login_at: string | null
                }
                Insert: {
                    id: string
                    username: string
                    display_name: string
                    mfa_enabled?: boolean | null
                    mfa_type?: 'totp' | 'email' | null
                    created_at?: string
                    last_login_at?: string | null
                }
                Update: {
                    id?: string
                    username?: string
                    display_name?: string
                    mfa_enabled?: boolean | null
                    mfa_type?: 'totp' | 'email' | null
                    created_at?: string
                    last_login_at?: string | null
                }
            }
            user_settings: {
                Row: {
                    user_id: string
                    auto_lock_minutes: number | null
                    lock_on_tab_close: boolean | null
                    lock_on_sleep: boolean | null
                    clipboard_clear_seconds: number | null
                    notify_breach_alerts: boolean | null
                    notify_password_reminders: boolean | null
                    username_presets: string[] | null
                    encrypted_recovery_codes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    auto_lock_minutes?: number | null
                    lock_on_tab_close?: boolean | null
                    lock_on_sleep?: boolean | null
                    clipboard_clear_seconds?: number | null
                    notify_breach_alerts?: boolean | null
                    notify_password_reminders?: boolean | null
                    username_presets?: string[] | null
                    encrypted_recovery_codes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    auto_lock_minutes?: number | null
                    lock_on_tab_close?: boolean | null
                    lock_on_sleep?: boolean | null
                    clipboard_clear_seconds?: number | null
                    notify_breach_alerts?: boolean | null
                    notify_password_reminders?: boolean | null
                    username_presets?: string[] | null
                    encrypted_recovery_codes?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            vault_activity: {
                Row: {
                    id: string
                    user_id: string | null
                    event_type: string
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    event_type: string
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    event_type?: string
                    metadata?: Json | null
                    created_at?: string
                }
            }
            vault_items: {
                Row: {
                    id: string
                    user_id: string | null
                    name: string
                    category: string | null
                    tags: string[] | null
                    favorite: boolean | null
                    has_totp: boolean | null
                    strength_score: number | null
                    encryption_version: number | null
                    modified_count: number | null
                    created_at: string
                    updated_at: string
                    encrypted_blob: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    name: string
                    category?: string | null
                    tags?: string[] | null
                    favorite?: boolean | null
                    has_totp?: boolean | null
                    strength_score?: number | null
                    encryption_version?: number | null
                    modified_count?: number | null
                    created_at?: string
                    updated_at?: string
                    encrypted_blob: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    name?: string
                    category?: string | null
                    tags?: string[] | null
                    favorite?: boolean | null
                    has_totp?: boolean | null
                    strength_score?: number | null
                    encryption_version?: number | null
                    modified_count?: number | null
                    created_at?: string
                    updated_at?: string
                    encrypted_blob?: string
                }
            }
            vault_trash: {
                Row: {
                    id: string
                    user_id: string | null
                    original_item_id: string | null
                    encrypted_blob: string
                    trashed_at: string
                    expires_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    original_item_id?: string | null
                    encrypted_blob: string
                    trashed_at?: string
                    expires_at: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    original_item_id?: string | null
                    encrypted_blob?: string
                    trashed_at?: string
                    expires_at?: string
                }
            }
        }
    }
}
