export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_activity: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          target_tenant_id: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_tenant_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_tenant_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_events: {
        Row: {
          alert_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          hashed_secret: string
          id: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          hashed_secret: string
          id?: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          hashed_secret?: string
          id?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          action_data: Json
          action_type: string
          created_at: string
          expires_at: string | null
          id: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          action_data: Json
          action_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string | null
          id: string
          ip: string | null
          target: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          id?: string
          ip?: string | null
          target?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          id?: string
          ip?: string | null
          target?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          expires_at: string | null
          id: string
          method_types: Json
          provider: string | null
          provider_session_id: string | null
          qr_image_url: string | null
          redirect_url: string | null
          reference: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          expires_at?: string | null
          id?: string
          method_types: Json
          provider?: string | null
          provider_session_id?: string | null
          qr_image_url?: string | null
          redirect_url?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          method_types?: Json
          provider?: string | null
          provider_session_id?: string | null
          qr_image_url?: string | null
          redirect_url?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      csrf_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          due_at: string | null
          evidence_url: string | null
          id: string
          metadata: Json | null
          payment_id: string
          reason: string | null
          stage: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          due_at?: string | null
          evidence_url?: string | null
          id?: string
          metadata?: Json | null
          payment_id: string
          reason?: string | null
          stage?: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          due_at?: string | null
          evidence_url?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string
          reason?: string | null
          stage?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      go_live_checklist: {
        Row: {
          admin_2fa: boolean | null
          backup_schedule: boolean | null
          created_at: string | null
          domain_tls: boolean | null
          id: string
          logs_alerts: boolean | null
          notes: Json | null
          provider_credentials: boolean | null
          tenant_id: string
          test_transactions: boolean | null
          updated_at: string | null
          webhook_verified: boolean | null
        }
        Insert: {
          admin_2fa?: boolean | null
          backup_schedule?: boolean | null
          created_at?: string | null
          domain_tls?: boolean | null
          id?: string
          logs_alerts?: boolean | null
          notes?: Json | null
          provider_credentials?: boolean | null
          tenant_id: string
          test_transactions?: boolean | null
          updated_at?: string | null
          webhook_verified?: boolean | null
        }
        Update: {
          admin_2fa?: boolean | null
          backup_schedule?: boolean | null
          created_at?: string | null
          domain_tls?: boolean | null
          id?: string
          logs_alerts?: boolean | null
          notes?: Json | null
          provider_credentials?: boolean | null
          tenant_id?: string
          test_transactions?: boolean | null
          updated_at?: string | null
          webhook_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "go_live_checklist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrails: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          rule_config: Json
          rule_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          rule_config?: Json
          rule_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          rule_config?: Json
          rule_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardrails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          key: string
          response: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          key: string
          response: Json
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          key?: string
          response?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_number: string | null
          document_type: Database["public"]["Enums"]["kyc_document_type"]
          document_url: string | null
          expiry_date: string | null
          id: string
          metadata: Json | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["kyc_verification_status"]
          tenant_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_number?: string | null
          document_type: Database["public"]["Enums"]["kyc_document_type"]
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["kyc_verification_status"]
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_number?: string | null
          document_type?: Database["public"]["Enums"]["kyc_document_type"]
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["kyc_verification_status"]
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verification_logs: {
        Row: {
          action: string
          created_at: string
          document_id: string | null
          id: string
          ip_address: unknown
          new_status:
            | Database["public"]["Enums"]["kyc_verification_status"]
            | null
          notes: string | null
          performed_by: string | null
          previous_status:
            | Database["public"]["Enums"]["kyc_verification_status"]
            | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          document_id?: string | null
          id?: string
          ip_address?: unknown
          new_status?:
            | Database["public"]["Enums"]["kyc_verification_status"]
            | null
          notes?: string | null
          performed_by?: string | null
          previous_status?:
            | Database["public"]["Enums"]["kyc_verification_status"]
            | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string | null
          id?: string
          ip_address?: unknown
          new_status?:
            | Database["public"]["Enums"]["kyc_verification_status"]
            | null
          notes?: string | null
          performed_by?: string | null
          previous_status?:
            | Database["public"]["Enums"]["kyc_verification_status"]
            | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verification_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kyc_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_verification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          id: string
          role_id: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          expires_at: string | null
          id: string
          reference: string | null
          slug: string
          status: string | null
          tenant_id: string | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          expires_at?: string | null
          id?: string
          reference?: string | null
          slug: string
          status?: string | null
          tenant_id?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          reference?: string | null
          slug?: string
          status?: string | null
          tenant_id?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          tenant_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          tenant_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          checkout_session_id: string | null
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          method: string | null
          paid_at: string | null
          provider: string | null
          provider_payment_id: string | null
          reconciled_at: string | null
          reconciliation_status: string | null
          settlement_id: string | null
          status: string
          tenant_id: string | null
          type: string | null
        }
        Insert: {
          amount: number
          checkout_session_id?: string | null
          created_at?: string | null
          currency: string
          id?: string
          metadata?: Json | null
          method?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          reconciled_at?: string | null
          reconciliation_status?: string | null
          settlement_id?: string | null
          status: string
          tenant_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          method?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          reconciled_at?: string | null
          reconciliation_status?: string | null
          settlement_id?: string | null
          status?: string
          tenant_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      platform_security_policy: {
        Row: {
          created_at: string
          default_require_2fa_for_admin: boolean
          default_require_2fa_for_owner: boolean
          default_stepup_window_seconds: number
          force_2fa_for_super_admin: boolean
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_require_2fa_for_admin?: boolean
          default_require_2fa_for_owner?: boolean
          default_stepup_window_seconds?: number
          force_2fa_for_super_admin?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_require_2fa_for_admin?: boolean
          default_require_2fa_for_owner?: boolean
          default_stepup_window_seconds?: number
          force_2fa_for_super_admin?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          product_id: string
          recurring: boolean | null
          recurring_interval: string | null
          recurring_interval_count: number | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          product_id: string
          recurring?: boolean | null
          recurring_interval?: string | null
          recurring_interval_count?: number | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          product_id?: string
          recurring?: boolean | null
          recurring_interval?: string | null
          recurring_interval_count?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          google_email: string | null
          google_id: string | null
          google_picture: string | null
          google_verified_email: boolean | null
          id: string
          is_super_admin: boolean | null
          mfa_last_verified_at: string | null
          totp_backup_codes: string[] | null
          totp_enabled: boolean | null
          totp_secret: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          google_email?: string | null
          google_id?: string | null
          google_picture?: string | null
          google_verified_email?: boolean | null
          id: string
          is_super_admin?: boolean | null
          mfa_last_verified_at?: string | null
          totp_backup_codes?: string[] | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          google_email?: string | null
          google_id?: string | null
          google_picture?: string | null
          google_verified_email?: boolean | null
          id?: string
          is_super_admin?: boolean | null
          mfa_last_verified_at?: string | null
          totp_backup_codes?: string[] | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_credentials: {
        Row: {
          created_at: string | null
          id: string
          merchant_id: string | null
          mode: string
          provider: string
          public_key: string | null
          secret_key: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          merchant_id?: string | null
          mode: string
          provider: string
          public_key?: string | null
          secret_key?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          merchant_id?: string | null
          mode?: string
          provider?: string
          public_key?: string | null
          secret_key?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_events: {
        Row: {
          event_id: string
          id: string
          payload: Json
          provider: string
          received_at: string | null
          type: string
        }
        Insert: {
          event_id: string
          id?: string
          payload: Json
          provider: string
          received_at?: string | null
          type: string
        }
        Update: {
          event_id?: string
          id?: string
          payload?: Json
          provider?: string
          received_at?: string | null
          type?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          updated_at: string | null
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          updated_at?: string | null
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          updated_at?: string | null
          window_start?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_id: string | null
          provider_refund_id: string | null
          reason: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_id?: string | null
          provider_refund_id?: string | null
          reason?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_id?: string | null
          provider_refund_id?: string | null
          reason?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments_log: {
        Row: {
          action: string
          assigned_by: string | null
          created_at: string
          id: string
          previous_role_id: string | null
          reason: string | null
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          action: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          previous_role_id?: string | null
          reason?: string | null
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          action?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          previous_role_id?: string | null
          reason?: string | null
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_log_previous_role_id_fkey"
            columns: ["previous_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_log_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_template_permissions: {
        Row: {
          permission_id: string
          template_id: string
        }
        Insert: {
          permission_id: string
          template_id: string
        }
        Update: {
          permission_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_template_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string | null
          cycle: string
          fees: number
          id: string
          net_amount: number
          paid_out_at: string | null
          provider: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cycle: string
          fees?: number
          id?: string
          net_amount: number
          paid_out_at?: string | null
          provider: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cycle?: string
          fees?: number
          id?: string
          net_amount?: number
          paid_out_at?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_security_policy: {
        Row: {
          created_at: string | null
          require_2fa_for_admin: boolean | null
          require_2fa_for_owner: boolean | null
          stepup_window_seconds: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          require_2fa_for_admin?: boolean | null
          require_2fa_for_owner?: boolean | null
          stepup_window_seconds?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          require_2fa_for_admin?: boolean | null
          require_2fa_for_owner?: boolean | null
          stepup_window_seconds?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_security_policy_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string | null
          enforce_2fa_roles: Json | null
          features: Json | null
          provider: string
          security_headers: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enforce_2fa_roles?: Json | null
          features?: Json | null
          provider?: string
          security_headers?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enforce_2fa_roles?: Json | null
          features?: Json | null
          provider?: string
          security_headers?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_wallets: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_logo_url: string | null
          brand_primary_color: string | null
          business_type: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          fee_plan: Json | null
          id: string
          kyc_level: number | null
          kyc_notes: string | null
          kyc_status: string | null
          kyc_verified_at: string | null
          kyc_verified_by: string | null
          name: string
          payout_bank_account: string | null
          payout_bank_name: string | null
          payout_schedule: string | null
          risk_rules: Json | null
          status: string
          tax_id: string | null
        }
        Insert: {
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          business_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          fee_plan?: Json | null
          id?: string
          kyc_level?: number | null
          kyc_notes?: string | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          name: string
          payout_bank_account?: string | null
          payout_bank_name?: string | null
          payout_schedule?: string | null
          risk_rules?: Json | null
          status?: string
          tax_id?: string | null
        }
        Update: {
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          business_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          fee_plan?: Json | null
          id?: string
          kyc_level?: number | null
          kyc_notes?: string | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          name?: string
          payout_bank_account?: string | null
          payout_bank_name?: string | null
          payout_schedule?: string | null
          risk_rules?: Json | null
          status?: string
          tax_id?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          attempts: number | null
          created_at: string | null
          event_type: string | null
          id: string
          last_error: string | null
          payload: Json | null
          provider: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          provider?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          provider?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          secret: string
          tenant_id: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret: string
          tenant_id?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret?: string
          tenant_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { user_uuid: string }; Returns: string }
      is_member_of_tenant: { Args: { tenant_uuid: string }; Returns: boolean }
      is_super_admin: { Args: { user_uuid: string }; Returns: boolean }
      request_tenant: { Args: never; Returns: string }
      user_has_role_in_tenant: {
        Args: { role_name: string; tenant_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      kyc_document_type:
        | "national_id"
        | "passport"
        | "drivers_license"
        | "business_registration"
        | "tax_certificate"
        | "bank_statement"
        | "proof_of_address"
      kyc_verification_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      kyc_document_type: [
        "national_id",
        "passport",
        "drivers_license",
        "business_registration",
        "tax_certificate",
        "bank_statement",
        "proof_of_address",
      ],
      kyc_verification_status: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "expired",
      ],
    },
  },
} as const
