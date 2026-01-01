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
      affiliate_notes: {
        Row: {
          affiliate_id: string
          claim_id: string
          created_at: string
          id: string
          note: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          claim_id: string
          created_at?: string
          id?: string
          note: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          claim_id?: string
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_notes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "marketing_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_notes_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "injury_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_accounts: {
        Row: {
          created_at: string | null
          current_balance: number
          id: string
          interest_rate: number
          late_fee_amount: number | null
          next_payment_date: string
          payment_amount: number
          payment_frequency: string | null
          principal_amount: number
          status: string | null
          updated_at: string | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_balance: number
          id?: string
          interest_rate: number
          late_fee_amount?: number | null
          next_payment_date: string
          payment_amount: number
          payment_frequency?: string | null
          principal_amount: number
          status?: string | null
          updated_at?: string | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_balance?: number
          id?: string
          interest_rate?: number
          late_fee_amount?: number | null
          next_payment_date?: string
          payment_amount?: number
          payment_frequency?: string | null
          principal_amount?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_receipts: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string
          receipt_date: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url: string
          receipt_date?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string
          receipt_date?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      dropdown_options: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          updated_at: string | null
          value: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          classification: string | null
          created_at: string
          created_by: string | null
          debtor: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string | null
          transaction_type: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          classification?: string | null
          created_at?: string
          created_by?: string | null
          debtor?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          transaction_type: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          classification?: string | null
          created_at?: string
          created_by?: string | null
          debtor?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          transaction_type?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      injury_claims: {
        Row: {
          accident_date: string
          address: string | null
          affiliate_id: string | null
          agreement_amount: number | null
          assigned_to: string | null
          at_fault: string
          attachments: string[] | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          injury_area: string
          notes: string | null
          phone: string
          referral_source: string | null
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          accident_date: string
          address?: string | null
          affiliate_id?: string | null
          agreement_amount?: number | null
          assigned_to?: string | null
          at_fault: string
          attachments?: string[] | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          injury_area: string
          notes?: string | null
          phone: string
          referral_source?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          accident_date?: string
          address?: string | null
          affiliate_id?: string | null
          agreement_amount?: number | null
          assigned_to?: string | null
          at_fault?: string
          attachments?: string[] | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          injury_area?: string
          notes?: string | null
          phone?: string
          referral_source?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_claims_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "marketing_affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_affiliates: {
        Row: {
          contracts_sent: number
          contracts_signed: number
          created_at: string
          email: string
          flat_fee: number
          id: string
          name: string
          phone: string | null
          referral_code: string
          status: string
          total_earnings: number
          total_referrals: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contracts_sent?: number
          contracts_signed?: number
          created_at?: string
          email: string
          flat_fee?: number
          id?: string
          name: string
          phone?: string | null
          referral_code: string
          status?: string
          total_earnings?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contracts_sent?: number
          contracts_signed?: number
          created_at?: string
          email?: string
          flat_fee?: number
          id?: string
          name?: string
          phone?: string | null
          referral_code?: string
          status?: string
          total_earnings?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_affiliates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          account_id: string
          error_message: string | null
          id: string
          reminder_type: string
          sent_at: string
          sent_via: string
          status: string
        }
        Insert: {
          account_id: string
          error_message?: string | null
          id?: string
          reminder_type: string
          sent_at?: string
          sent_via: string
          status?: string
        }
        Update: {
          account_id?: string
          error_message?: string | null
          id?: string
          reminder_type?: string
          sent_at?: string
          sent_via?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string | null
          id: string
          instructions: string | null
          is_enabled: boolean | null
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          interest_paid: number
          late_fee_paid: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          principal_paid: number
          receipt_url: string | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          interest_paid: number
          late_fee_paid?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          principal_paid: number
          receipt_url?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          interest_paid?: number
          late_fee_paid?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          principal_paid?: number
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_applications: {
        Row: {
          address: string | null
          created_at: string
          desired_term_months: number
          down_payment: number
          email: string
          estimated_monthly_payment: number | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          status: string
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          desired_term_months?: number
          down_payment?: number
          email: string
          estimated_monthly_payment?: number | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          desired_term_months?: number
          down_payment?: number
          email?: string
          estimated_monthly_payment?: number | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_applications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          permission_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          permission_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          permission_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          make: string
          mileage: number | null
          model: string
          price: number
          status: string | null
          updated_at: string | null
          vin: string
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          make: string
          mileage?: number | null
          model: string
          price: number
          status?: string | null
          updated_at?: string | null
          vin: string
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          make?: string
          mileage?: number | null
          model?: string
          price?: number
          status?: string | null
          updated_at?: string | null
          vin?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_affiliate_referrals: {
        Args: { affiliate_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "affiliate"
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
      app_role: ["admin", "customer", "affiliate"],
    },
  },
} as const
