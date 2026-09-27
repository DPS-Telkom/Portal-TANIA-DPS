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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          category: Database["public"]["Enums"]["activity_category"]
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["activity_category"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["activity_category"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      allocations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          percent: number
          period_month: string
          profile_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          percent: number
          period_month: string
          profile_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          percent?: number
          period_month?: string
          profile_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
          value: number
        }
        Update: {
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          changed_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          changed_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          changed_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      budget_entries: {
        Row: {
          amount: number
          budget_line_id: string
          created_at: string
          created_by: string
          description: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["budget_entry_type"]
          feasibility_case_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          budget_line_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          entry_date?: string
          entry_type: Database["public"]["Enums"]["budget_entry_type"]
          feasibility_case_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_line_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["budget_entry_type"]
          feasibility_case_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_entries_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_summary"
            referencedColumns: ["budget_line_id"]
          },
          {
            foreignKeyName: "budget_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_feasibility_case_id_fkey"
            columns: ["feasibility_case_id"]
            isOneToOne: false
            referencedRelation: "feasibility_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          category: string
          created_at: string
          fiscal_year: number
          id: string
          notes: string | null
          plan_amount: number
          program: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          fiscal_year: number
          id?: string
          notes?: string | null
          plan_amount: number
          program: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          plan_amount?: number
          program?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: Database["public"]["Enums"]["chat_role"]
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: Database["public"]["Enums"]["chat_role"]
          user_id?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: Database["public"]["Enums"]["chat_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_briefings: {
        Row: {
          briefing_date: string
          content: string
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          briefing_date?: string
          content: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          briefing_date?: string
          content?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_briefings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feasibility_cases: {
        Row: {
          created_at: string
          customer: string | null
          decided_at: string | null
          decided_by: string | null
          decision: Database["public"]["Enums"]["feasibility_decision"] | null
          decision_rationale: string | null
          description: string | null
          est_duration_months: number | null
          est_effort_hours: number | null
          est_revenue: number | null
          id: string
          project_id: string | null
          score_financial: number
          score_resource: number
          score_risk: number
          score_strategic: number
          score_technical: number
          start_month: string | null
          submitted_by: string
          title: string
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["feasibility_decision"] | null
          decision_rationale?: string | null
          description?: string | null
          est_duration_months?: number | null
          est_effort_hours?: number | null
          est_revenue?: number | null
          id?: string
          project_id?: string | null
          score_financial?: number
          score_resource?: number
          score_risk?: number
          score_strategic?: number
          score_technical?: number
          start_month?: string | null
          submitted_by?: string
          title: string
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["feasibility_decision"] | null
          decision_rationale?: string | null
          description?: string | null
          est_duration_months?: number | null
          est_effort_hours?: number | null
          est_revenue?: number | null
          id?: string
          project_id?: string | null
          score_financial?: number
          score_resource?: number
          score_risk?: number
          score_strategic?: number
          score_technical?: number
          start_month?: string | null
          submitted_by?: string
          title?: string
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_cases_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_cases_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feasibility_required_skills: {
        Row: {
          case_id: string
          headcount: number
          min_level: number
          skill_id: string
        }
        Insert: {
          case_id: string
          headcount?: number
          min_level?: number
          skill_id: string
        }
        Update: {
          case_id?: string
          headcount?: number
          min_level?: number
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_required_skills_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "feasibility_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_required_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skills: {
        Row: {
          certification_name: string | null
          created_at: string
          is_certified: boolean
          level: number
          profile_id: string
          skill_id: string
          updated_at: string
        }
        Insert: {
          certification_name?: string | null
          created_at?: string
          is_certified?: boolean
          level: number
          profile_id: string
          skill_id: string
          updated_at?: string
        }
        Update: {
          certification_name?: string | null
          created_at?: string
          is_certified?: boolean
          level?: number
          profile_id?: string
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          grade: string | null
          id: string
          is_active: boolean
          location: string | null
          manager_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          squad: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id: string
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          squad?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          squad?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string
          created_at: string
          customer: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          pm_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          customer?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          pm_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          customer?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          pm_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_pm_id_fkey"
            columns: ["pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          activity_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          hours: number
          id: string
          note: string | null
          profile_id: string
          project_id: string
          review_note: string | null
          status: Database["public"]["Enums"]["timesheet_status"]
          submitted_at: string | null
          updated_at: string
          work_date: string
        }
        Insert: {
          activity_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          hours: number
          id?: string
          note?: string | null
          profile_id?: string
          project_id: string
          review_note?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_at?: string | null
          updated_at?: string
          work_date: string
        }
        Update: {
          activity_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          hours?: number
          id?: string
          note?: string | null
          profile_id?: string
          project_id?: string
          review_note?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_at?: string | null
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      budget_monthly: {
        Row: {
          budget_line_id: string | null
          category: string | null
          committed: number | null
          fiscal_year: number | null
          period_month: string | null
          program: string | null
          realized: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_entries_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_summary"
            referencedColumns: ["budget_line_id"]
          },
        ]
      }
      budget_summary: {
        Row: {
          budget_line_id: string | null
          category: string | null
          committed: number | null
          committed_pct: number | null
          fiscal_year: number | null
          plan_amount: number | null
          program: string | null
          realized: number | null
          realized_pct: number | null
          remaining: number | null
        }
        Relationships: []
      }
      utilization_monthly: {
        Row: {
          approved_hours: number | null
          base_capacity_hours: number | null
          capacity_hours: number | null
          full_name: string | null
          leave_hours: number | null
          period_month: string | null
          planned_pct: number | null
          profile_id: string | null
          squad: string | null
          utilization_pct: number | null
        }
        Relationships: []
      }
      utilization_squad_monthly: {
        Row: {
          approved_hours: number | null
          avg_planned_pct: number | null
          avg_utilization_pct: number | null
          capacity_hours: number | null
          max_planned_pct: number | null
          max_utilization_pct: number | null
          people: number | null
          period_month: string | null
          squad: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      feasibility_resource_check: {
        Args: { p_case_id: string }
        Returns: {
          headcount: number
          min_candidates: number
          min_free_fte: number
          min_level: number
          months: number
          period_start: string
          skill_id: string
          skill_name: string
          status: string
        }[]
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: { roles: Database["public"]["Enums"]["user_role"][] }
        Returns: boolean
      }
      is_manager_of: { Args: { target: string }; Returns: boolean }
      is_member: { Args: never; Returns: boolean }
      staffing_candidates: {
        Args: { p_min_level?: number; p_month?: string; p_skill_id?: string }
        Returns: {
          allocated_pct: number
          available_pct: number
          email: string
          full_name: string
          grade: string
          is_certified: boolean
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
          skill_level: number
          squad: string
        }[]
      }
      timesheet_compliance: {
        Args: { week_start: string }
        Returns: {
          email: string
          full_name: string
          manager_id: string
          profile_id: string
          squad: string
          total_hours: number
          week_status: string
        }[]
      }
    }
    Enums: {
      activity_category:
        | "delivery"
        | "presales"
        | "internal"
        | "leave"
        | "training"
      budget_entry_type: "commitment" | "realization"
      chat_role: "user" | "assistant"
      feasibility_decision: "go" | "no_go" | "hold"
      project_status:
        | "candidate"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      timesheet_status: "draft" | "submitted" | "approved" | "rejected"
      user_role:
        | "executive"
        | "chapter_lead"
        | "manager"
        | "pm"
        | "talent"
        | "admin"
        | "guest"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_category: [
        "delivery",
        "presales",
        "internal",
        "leave",
        "training",
      ],
      budget_entry_type: ["commitment", "realization"],
      chat_role: ["user", "assistant"],
      feasibility_decision: ["go", "no_go", "hold"],
      project_status: [
        "candidate",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      timesheet_status: ["draft", "submitted", "approved", "rejected"],
      user_role: [
        "executive",
        "chapter_lead",
        "manager",
        "pm",
        "talent",
        "admin",
        "guest",
      ],
    },
  },
} as const
