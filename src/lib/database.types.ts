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
          generation_count: number
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
          generation_count?: number
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
          generation_count?: number
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
      development_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          evidence_url: string | null
          id: string
          month_index: number | null
          notes: string | null
          plan_id: string
          skill_id: string | null
          sort_order: number
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          month_index?: number | null
          notes?: string | null
          plan_id: string
          skill_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          month_index?: number | null
          notes?: string | null
          plan_id?: string
          skill_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_activities_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "development_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_activities_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plans: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          objective: string | null
          origin: string
          profile_id: string
          start_date: string | null
          status: string
          target_role: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          objective?: string | null
          origin?: string
          profile_id: string
          start_date?: string | null
          status?: string
          target_role?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          objective?: string | null
          origin?: string
          profile_id?: string
          start_date?: string | null
          status?: string
          target_role?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_profile_id_fkey"
            columns: ["profile_id"]
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
      level_scales: {
        Row: {
          description: string | null
          label: string
          level: number
          updated_at: string
        }
        Insert: {
          description?: string | null
          label: string
          level: number
          updated_at?: string
        }
        Update: {
          description?: string | null
          label?: string
          level?: number
          updated_at?: string
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          created_at: string
          id: string
          overall_score: number | null
          period_label: string | null
          period_year: number
          profile_id: string
          rating: string | null
          recorded_by: string | null
          source: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          overall_score?: number | null
          period_label?: string | null
          period_year: number
          profile_id: string
          rating?: string | null
          recorded_by?: string | null
          source?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          overall_score?: number | null
          period_label?: string | null
          period_year?: number
          profile_id?: string
          rating?: string | null
          recorded_by?: string | null
          source?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_scores: {
        Row: {
          dimension: string
          review_id: string
          score: number
        }
        Insert: {
          dimension: string
          review_id: string
          score: number
        }
        Update: {
          dimension?: string
          review_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_scores_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skills: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          certification_name: string | null
          confidence: string | null
          created_at: string
          is_certified: boolean
          last_used: string | null
          level: number
          profile_id: string
          score: number | null
          skill_id: string
          source: string
          target_level: number | null
          target_score: number | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          certification_name?: string | null
          confidence?: string | null
          created_at?: string
          is_certified?: boolean
          last_used?: string | null
          level: number
          profile_id: string
          score?: number | null
          skill_id: string
          source?: string
          target_level?: number | null
          target_score?: number | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          certification_name?: string | null
          confidence?: string | null
          created_at?: string
          is_certified?: boolean
          last_used?: string | null
          level?: number
          profile_id?: string
          score?: number | null
          skill_id?: string
          source?: string
          target_level?: number | null
          target_score?: number | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_skills_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          career_level: string | null
          created_at: string
          email: string | null
          employee_id: string | null
          full_name: string
          grade: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          join_date: string | null
          location: string | null
          manager_id: string | null
          organization: string | null
          photo_path: string | null
          position_title: string | null
          role: Database["public"]["Enums"]["user_role"]
          squad: string | null
          updated_at: string
        }
        Insert: {
          career_level?: string | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          full_name?: string
          grade?: string | null
          id: string
          is_active?: boolean
          is_demo?: boolean
          join_date?: string | null
          location?: string | null
          manager_id?: string | null
          organization?: string | null
          photo_path?: string | null
          position_title?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          squad?: string | null
          updated_at?: string
        }
        Update: {
          career_level?: string | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          full_name?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          join_date?: string | null
          location?: string | null
          manager_id?: string | null
          organization?: string | null
          photo_path?: string | null
          position_title?: string | null
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
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      talent_ai_requests: {
        Row: {
          created_at: string
          id: string
          input_tokens: number | null
          kind: string
          model: string | null
          output_tokens: number | null
          profile_id: string
          question: string | null
          request_date: string
          response: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_tokens?: number | null
          kind: string
          model?: string | null
          output_tokens?: number | null
          profile_id: string
          question?: string | null
          request_date?: string
          response: Json
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          input_tokens?: number | null
          kind?: string
          model?: string | null
          output_tokens?: number | null
          profile_id?: string
          question?: string | null
          request_date?: string
          response?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_ai_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_ai_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_certifications: {
        Row: {
          created_at: string
          created_by: string | null
          credential_id: string | null
          expires_on: string | null
          file_path: string | null
          id: string
          issued_on: string | null
          issuer: string | null
          name: string
          profile_id: string
          skill_id: string | null
          updated_at: string
          url: string | null
          verification: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credential_id?: string | null
          expires_on?: string | null
          file_path?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          name: string
          profile_id: string
          skill_id?: string | null
          updated_at?: string
          url?: string | null
          verification?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credential_id?: string | null
          expires_on?: string | null
          file_path?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          name?: string
          profile_id?: string
          skill_id?: string | null
          updated_at?: string
          url?: string | null
          verification?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_certifications_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_certifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_evidence: {
        Row: {
          certification_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          evidence_date: string | null
          evidence_type: string
          id: string
          position_id: string | null
          profile_id: string
          skill_id: string | null
          talent_project_id: string | null
          title: string
          updated_at: string
          url: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certification_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          evidence_date?: string | null
          evidence_type: string
          id?: string
          position_id?: string | null
          profile_id: string
          skill_id?: string | null
          talent_project_id?: string | null
          title: string
          updated_at?: string
          url?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certification_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          evidence_date?: string | null
          evidence_type?: string
          id?: string
          position_id?: string | null
          profile_id?: string
          skill_id?: string | null
          talent_project_id?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_evidence_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "talent_certification_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_evidence_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "talent_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_evidence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_evidence_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "talent_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_evidence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_evidence_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_evidence_talent_project_id_fkey"
            columns: ["talent_project_id"]
            isOneToOne: false
            referencedRelation: "talent_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_evidence_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_positions: {
        Row: {
          achievements: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          organization: string | null
          position_title: string
          profile_id: string
          responsibilities: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          achievements?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          organization?: string | null
          position_title: string
          profile_id: string
          responsibilities?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          achievements?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          organization?: string | null
          position_title?: string
          profile_id?: string
          responsibilities?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_positions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_positions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_projects: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string | null
          end_date: string | null
          id: string
          name: string
          organization: string | null
          outcomes: string | null
          profile_id: string
          project_id: string | null
          responsibilities: string | null
          role: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization?: string | null
          outcomes?: string | null
          profile_id: string
          project_id?: string | null
          responsibilities?: string | null
          role?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization?: string | null
          outcomes?: string | null
          profile_id?: string
          project_id?: string | null
          responsibilities?: string | null
          role?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      competency_gaps: {
        Row: {
          assessed_at: string | null
          category: string | null
          current_level: number | null
          current_value: number | null
          evidence_count: number | null
          gap: number | null
          kind: string | null
          profile_id: string | null
          skill_id: string | null
          skill_name: string | null
          source: string | null
          target_level: number | null
          target_value: number | null
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
      talent_certification_status: {
        Row: {
          created_at: string | null
          created_by: string | null
          credential_id: string | null
          expires_on: string | null
          file_path: string | null
          id: string | null
          issued_on: string | null
          issuer: string | null
          name: string | null
          profile_id: string | null
          skill_id: string | null
          status: string | null
          updated_at: string | null
          url: string | null
          verification: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          expires_on?: string | null
          file_path?: string | null
          id?: string | null
          issued_on?: string | null
          issuer?: string | null
          name?: string | null
          profile_id?: string | null
          skill_id?: string | null
          status?: never
          updated_at?: string | null
          url?: string | null
          verification?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          expires_on?: string | null
          file_path?: string | null
          id?: string | null
          issued_on?: string | null
          issuer?: string | null
          name?: string | null
          profile_id?: string | null
          skill_id?: string | null
          status?: never
          updated_at?: string | null
          url?: string | null
          verification?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_certifications_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_certifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      can_develop_talent: { Args: { target: string }; Returns: boolean }
      can_view_talent: { Args: { target: string }; Returns: boolean }
      certification_status: {
        Args: { p_expires_on: string; p_verification: string }
        Returns: string
      }
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
      is_in_reporting_line: { Args: { target: string }; Returns: boolean }
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
      talent_context: { Args: { p_profile_id: string }; Returns: Json }
      talent_file_owner: { Args: { object_name: string }; Returns: string }
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
        | "hr"
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
        "hr",
        "admin",
        "guest",
      ],
    },
  },
} as const
