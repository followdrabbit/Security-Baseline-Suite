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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_provider_configs: {
        Row: {
          api_key_encrypted: string | null
          connection_status: string
          created_at: string
          enabled: boolean
          extra_config: Json | null
          id: string
          is_default: boolean
          provider_id: string
          selected_model: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          connection_status?: string
          created_at?: string
          enabled?: boolean
          extra_config?: Json | null
          id?: string
          is_default?: boolean
          provider_id: string
          selected_model: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          connection_status?: string
          created_at?: string
          enabled?: boolean
          extra_config?: Json | null
          id?: string
          is_default?: boolean
          provider_id?: string
          selected_model?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      baseline_versions: {
        Row: {
          changes_summary: string
          control_count: number
          controls_snapshot: Json
          created_at: string
          id: string
          project_id: string
          status: string
          user_id: string
          version: number
        }
        Insert: {
          changes_summary?: string
          control_count?: number
          controls_snapshot?: Json
          created_at?: string
          id?: string
          project_id: string
          status?: string
          user_id: string
          version?: number
        }
        Update: {
          changes_summary?: string
          control_count?: number
          controls_snapshot?: Json
          created_at?: string
          id?: string
          project_id?: string
          status?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      controls: {
        Row: {
          applicability: string | null
          automation: string | null
          category: string | null
          confidence_score: number | null
          control_id: string
          created_at: string
          criticality: string
          default_behavior_limitations: string | null
          description: string | null
          framework_mappings: string[] | null
          id: string
          project_id: string
          references: string[] | null
          review_status: string
          reviewer_notes: string | null
          security_risk: string | null
          source_traceability: Json | null
          threat_scenarios: Json | null
          title: string
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          applicability?: string | null
          automation?: string | null
          category?: string | null
          confidence_score?: number | null
          control_id: string
          created_at?: string
          criticality?: string
          default_behavior_limitations?: string | null
          description?: string | null
          framework_mappings?: string[] | null
          id?: string
          project_id: string
          references?: string[] | null
          review_status?: string
          reviewer_notes?: string | null
          security_risk?: string | null
          source_traceability?: Json | null
          threat_scenarios?: Json | null
          title: string
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          applicability?: string | null
          automation?: string | null
          category?: string | null
          confidence_score?: number | null
          control_id?: string
          created_at?: string
          criticality?: string
          default_behavior_limitations?: string | null
          description?: string | null
          framework_mappings?: string[] | null
          id?: string
          project_id?: string
          references?: string[] | null
          review_status?: string
          reviewer_notes?: string | null
          security_risk?: string | null
          source_traceability?: Json | null
          threat_scenarios?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          control_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          project_id: string | null
          team_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          control_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          project_id?: string | null
          team_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          control_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          project_id?: string | null
          team_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          avg_confidence: number | null
          category: string | null
          control_count: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          output_language: string | null
          source_count: number | null
          status: string
          tags: string[] | null
          team_id: string | null
          technology: string
          updated_at: string
          user_id: string
          vendor: string | null
          version: string | null
        }
        Insert: {
          avg_confidence?: number | null
          category?: string | null
          control_count?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          output_language?: string | null
          source_count?: number | null
          status?: string
          tags?: string[] | null
          team_id?: string | null
          technology: string
          updated_at?: string
          user_id: string
          vendor?: string | null
          version?: string | null
        }
        Update: {
          avg_confidence?: number | null
          category?: string | null
          control_count?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          output_language?: string | null
          source_count?: number | null
          status?: string
          tags?: string[] | null
          team_id?: string | null
          technology?: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      source_activity_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          new_status: string
          previous_status: string | null
          source_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status: string
          previous_status?: string | null
          source_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string
          previous_status?: string | null
          source_id?: string
          user_id?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          added_at: string
          confidence: number | null
          extracted_content: string | null
          extraction_method: string | null
          file_name: string | null
          file_type: string | null
          id: string
          name: string
          origin: string | null
          preview: string | null
          processed_at: string | null
          project_id: string
          raw_content: string | null
          status: string
          tags: string[] | null
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          confidence?: number | null
          extracted_content?: string | null
          extraction_method?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          name: string
          origin?: string | null
          preview?: string | null
          processed_at?: string | null
          project_id: string
          raw_content?: string | null
          status?: string
          tags?: string[] | null
          type?: string
          url?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          confidence?: number | null
          extracted_content?: string | null
          extraction_method?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          name?: string
          origin?: string | null
          preview?: string | null
          processed_at?: string | null
          project_id?: string
          raw_content?: string | null
          status?: string
          tags?: string[] | null
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_team_ids: { Args: { _user_id: string }; Returns: string[] }
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
