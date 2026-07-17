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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          code_entered: string
          created_at: string
          id: string
          intercom_code_id: string | null
          intercom_id: string
          schedule_id: string | null
          status: string
        }
        Insert: {
          code_entered: string
          created_at?: string
          id?: string
          intercom_code_id?: string | null
          intercom_id: string
          schedule_id?: string | null
          status: string
        }
        Update: {
          code_entered?: string
          created_at?: string
          id?: string
          intercom_code_id?: string | null
          intercom_id?: string
          schedule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_intercom_code_id_fkey"
            columns: ["intercom_code_id"]
            isOneToOne: false
            referencedRelation: "intercom_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_intercom_id_fkey"
            columns: ["intercom_id"]
            isOneToOne: false
            referencedRelation: "intercoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      intercom_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          enabled: boolean
          id: string
          intercom_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          intercom_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          intercom_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercom_codes_intercom_id_fkey"
            columns: ["intercom_id"]
            isOneToOne: false
            referencedRelation: "intercoms"
            referencedColumns: ["id"]
          },
        ]
      }
      intercoms: {
        Row: {
          concierge_phone: string
          created_at: string
          dtmf_tone: string
          enabled: boolean
          greeting: string
          id: string
          name: string
          twilio_phone: string
          updated_at: string
        }
        Insert: {
          concierge_phone: string
          created_at?: string
          dtmf_tone?: string
          enabled?: boolean
          greeting?: string
          id?: string
          name: string
          twilio_phone: string
          updated_at?: string
        }
        Update: {
          concierge_phone?: string
          created_at?: string
          dtmf_tone?: string
          enabled?: boolean
          greeting?: string
          id?: string
          name?: string
          twilio_phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          date: string | null
          enabled: boolean
          end_time: string
          id: string
          intercom_code_id: string
          start_time: string
          type: string
          updated_at: string
          week_day: number | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          enabled?: boolean
          end_time: string
          id?: string
          intercom_code_id: string
          start_time: string
          type: string
          updated_at?: string
          week_day?: number | null
        }
        Update: {
          created_at?: string
          date?: string | null
          enabled?: boolean
          end_time?: string
          id?: string
          intercom_code_id?: string
          start_time?: string
          type?: string
          updated_at?: string
          week_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_intercom_code_id_fkey"
            columns: ["intercom_code_id"]
            isOneToOne: false
            referencedRelation: "intercom_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_intercoms: {
        Row: {
          intercom_id: string
          user_id: string
        }
        Insert: {
          intercom_id: string
          user_id: string
        }
        Update: {
          intercom_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_intercoms_intercom_id_fkey"
            columns: ["intercom_id"]
            isOneToOne: false
            referencedRelation: "intercoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_intercoms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
