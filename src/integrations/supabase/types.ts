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
          status: string
          tenant_id: string | null
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
          status: string
          tenant_id?: string | null
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
          status?: string
          tenant_id?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string
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
      get_user_tenant_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      user_has_role_in_tenant: {
        Args: { role_name: string; tenant_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
