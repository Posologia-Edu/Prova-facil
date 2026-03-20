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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          completed_at: string | null
          created_user_id: string | null
          email: string
          id: string
          invited_at: string
          invited_by: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_user_id?: string | null
          email: string
          id?: string
          invited_at?: string
          invited_by: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_user_id?: string | null
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string
          status?: string
        }
        Relationships: []
      }
      ai_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          created_at: string
          estimated_cost_usd: number | null
          id: string
          model: string | null
          prompt_type: string | null
          provider: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          model?: string | null
          prompt_type?: string | null
          provider: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          model?: string | null
          prompt_type?: string | null
          provider?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          referrer: string | null
          session_id: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string
          created_at: string
          id: string
          student_email: string | null
          student_name: string
          student_registration: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          student_email?: string | null
          student_name: string
          student_registration?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          student_email?: string | null
          student_name?: string
          student_registration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          semester: string | null
          student_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          semester?: string | null
          student_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          semester?: string | null
          student_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_publications: {
        Row: {
          access_code: string
          created_at: string
          end_at: string | null
          exam_id: string
          id: string
          is_active: boolean
          start_at: string | null
          time_limit_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          created_at?: string
          end_at?: string | null
          exam_id: string
          id?: string
          is_active?: boolean
          start_at?: string | null
          time_limit_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          created_at?: string
          end_at?: string | null
          exam_id?: string
          id?: string
          is_active?: boolean
          start_at?: string | null
          time_limit_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_publications_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          points: number | null
          position: number
          question_id: string
          section_name: string | null
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          points?: number | null
          position?: number
          question_id: string
          section_name?: string | null
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          points?: number | null
          position?: number
          question_id?: string
          section_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          max_score: number | null
          publication_id: string
          started_at: string
          status: string
          student_email: string | null
          student_id: string | null
          student_name: string | null
          total_score: number | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          max_score?: number | null
          publication_id: string
          started_at?: string
          status?: string
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          total_score?: number | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          max_score?: number | null
          publication_id?: string
          started_at?: string
          status?: string
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "exam_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          header_config_json: Json
          id: string
          layout_config_json: Json
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          header_config_json?: Json
          id?: string
          layout_config_json?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          header_config_json?: Json
          id?: string
          layout_config_json?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          marketplace_exam_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          marketplace_exam_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          marketplace_exam_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_comments_marketplace_exam_id_fkey"
            columns: ["marketplace_exam_id"]
            isOneToOne: false
            referencedRelation: "marketplace_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_exams: {
        Row: {
          avg_rating: number | null
          created_at: string
          description: string | null
          download_count: number | null
          exam_id: string
          id: string
          is_active: boolean
          question_count: number
          rating_count: number | null
          subject: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_rating?: number | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          exam_id: string
          id?: string
          is_active?: boolean
          question_count?: number
          rating_count?: number | null
          subject?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_rating?: number | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          exam_id?: string
          id?: string
          is_active?: boolean
          question_count?: number
          rating_count?: number | null
          subject?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_exams_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: true
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_ratings: {
        Row: {
          created_at: string
          id: string
          marketplace_exam_id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketplace_exam_id: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketplace_exam_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_ratings_marketplace_exam_id_fkey"
            columns: ["marketplace_exam_id"]
            isOneToOne: false
            referencedRelation: "marketplace_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_chat_messages: {
        Row: {
          circuit_id: string
          content: string
          created_at: string
          id: string
          role: string
          station_id: string
          student_id: string
        }
        Insert: {
          circuit_id: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          station_id: string
          student_id: string
        }
        Update: {
          circuit_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          station_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "osce_chat_messages_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "osce_circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_chat_messages_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "osce_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_chat_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "osce_circuit_students"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_checklist_items: {
        Row: {
          category: string | null
          description: string
          id: string
          is_critical: boolean
          likert_max: number | null
          max_points: number
          position: number
          station_id: string
          type: string
          weight: number
        }
        Insert: {
          category?: string | null
          description?: string
          id?: string
          is_critical?: boolean
          likert_max?: number | null
          max_points?: number
          position?: number
          station_id: string
          type?: string
          weight?: number
        }
        Update: {
          category?: string | null
          description?: string
          id?: string
          is_critical?: boolean
          likert_max?: number | null
          max_points?: number
          position?: number
          station_id?: string
          type?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "osce_checklist_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "osce_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_circuit_students: {
        Row: {
          circuit_id: string
          created_at: string
          current_rotation: number
          current_station_id: string | null
          id: string
          station_entered_at: string | null
          status: string
          student_email: string | null
          student_name: string
          student_registration: string | null
          visited_stations: string[] | null
        }
        Insert: {
          circuit_id: string
          created_at?: string
          current_rotation?: number
          current_station_id?: string | null
          id?: string
          station_entered_at?: string | null
          status?: string
          student_email?: string | null
          student_name?: string
          student_registration?: string | null
          visited_stations?: string[] | null
        }
        Update: {
          circuit_id?: string
          created_at?: string
          current_rotation?: number
          current_station_id?: string | null
          id?: string
          station_entered_at?: string | null
          status?: string
          student_email?: string | null
          student_name?: string
          student_registration?: string | null
          visited_stations?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "osce_circuit_students_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "osce_circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_circuit_students_current_station_id_fkey"
            columns: ["current_station_id"]
            isOneToOne: false
            referencedRelation: "osce_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_circuits: {
        Row: {
          access_code: string
          class_id: string | null
          created_at: string
          current_rotation: number
          id: string
          osce_exam_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          class_id?: string | null
          created_at?: string
          current_rotation?: number
          id?: string
          osce_exam_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          class_id?: string | null
          created_at?: string
          current_rotation?: number
          id?: string
          osce_exam_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "osce_circuits_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_circuits_osce_exam_id_fkey"
            columns: ["osce_exam_id"]
            isOneToOne: false
            referencedRelation: "osce_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_evaluation_items: {
        Row: {
          checklist_item_id: string
          evaluation_id: string
          id: string
          notes: string | null
          value: number
        }
        Insert: {
          checklist_item_id: string
          evaluation_id: string
          id?: string
          notes?: string | null
          value?: number
        }
        Update: {
          checklist_item_id?: string
          evaluation_id?: string
          id?: string
          notes?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "osce_evaluation_items_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "osce_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_evaluation_items_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "osce_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_evaluations: {
        Row: {
          circuit_id: string
          created_at: string
          evaluator_id: string | null
          finished_at: string | null
          id: string
          max_score: number | null
          observations: string | null
          passed: boolean | null
          rotation: number
          started_at: string | null
          station_id: string
          student_email: string | null
          student_name: string
          total_score: number | null
        }
        Insert: {
          circuit_id: string
          created_at?: string
          evaluator_id?: string | null
          finished_at?: string | null
          id?: string
          max_score?: number | null
          observations?: string | null
          passed?: boolean | null
          rotation?: number
          started_at?: string | null
          station_id: string
          student_email?: string | null
          student_name?: string
          total_score?: number | null
        }
        Update: {
          circuit_id?: string
          created_at?: string
          evaluator_id?: string | null
          finished_at?: string | null
          id?: string
          max_score?: number | null
          observations?: string | null
          passed?: boolean | null
          rotation?: number
          started_at?: string | null
          station_id?: string
          student_email?: string | null
          student_name?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "osce_evaluations_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "osce_circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osce_evaluations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "osce_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_exams: {
        Row: {
          class_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_online: boolean
          station_duration_minutes: number
          status: string
          title: string
          transition_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_online?: boolean
          station_duration_minutes?: number
          status?: string
          title?: string
          transition_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_online?: boolean
          station_duration_minutes?: number
          status?: string
          title?: string
          transition_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "osce_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_station_evaluators: {
        Row: {
          created_at: string
          evaluator_email: string
          evaluator_name: string
          id: string
          station_id: string
        }
        Insert: {
          created_at?: string
          evaluator_email?: string
          evaluator_name?: string
          id?: string
          station_id: string
        }
        Update: {
          created_at?: string
          evaluator_email?: string
          evaluator_name?: string
          id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "osce_station_evaluators_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "osce_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_station_materials: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          position: number
          station_id: string
          title: string
          type: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          position?: number
          station_id: string
          title?: string
          type?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          position?: number
          station_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "osce_station_materials_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "osce_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      osce_stations: {
        Row: {
          case_summary: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          is_rest_station: boolean
          learning_objectives: string[] | null
          osce_exam_id: string
          patient_script: string | null
          position: number
          student_instructions: string | null
          title: string
          updated_at: string
          virtual_patient_enabled: boolean
          virtual_patient_system_prompt: string | null
        }
        Insert: {
          case_summary?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_rest_station?: boolean
          learning_objectives?: string[] | null
          osce_exam_id: string
          patient_script?: string | null
          position?: number
          student_instructions?: string | null
          title?: string
          updated_at?: string
          virtual_patient_enabled?: boolean
          virtual_patient_system_prompt?: string | null
        }
        Update: {
          case_summary?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_rest_station?: boolean
          learning_objectives?: string[] | null
          osce_exam_id?: string
          patient_script?: string | null
          position?: number
          student_instructions?: string | null
          title?: string
          updated_at?: string
          virtual_patient_enabled?: boolean
          virtual_patient_system_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "osce_stations_osce_exam_id_fkey"
            columns: ["osce_exam_id"]
            isOneToOne: false
            referencedRelation: "osce_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          institution: string | null
          is_approved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          institution?: string | null
          is_approved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          institution?: string | null
          is_approved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          bloom_level: string | null
          content_json: Json
          created_at: string
          deleted_at: string | null
          difficulty: string
          embed_url: string | null
          id: string
          media_urls: string[] | null
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bloom_level?: string | null
          content_json?: Json
          created_at?: string
          deleted_at?: string | null
          difficulty?: string
          embed_url?: string | null
          id?: string
          media_urls?: string[] | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bloom_level?: string | null
          content_json?: Json
          created_at?: string
          deleted_at?: string | null
          difficulty?: string
          embed_url?: string | null
          id?: string
          media_urls?: string[] | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      simulation_forms: {
        Row: {
          content_json: Json
          created_at: string
          form_type: string
          id: string
          room_id: string
          title: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          form_type?: string
          id?: string
          room_id: string
          title?: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          form_type?: string
          id?: string
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "simulation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_participants: {
        Row: {
          assigned_role: string
          created_at: string
          id: string
          pair_index: number
          pair_position: string
          participant_role: string
          room_id: string
          status: string
          student_email: string | null
          student_name: string
        }
        Insert: {
          assigned_role?: string
          created_at?: string
          id?: string
          pair_index?: number
          pair_position?: string
          participant_role?: string
          room_id: string
          status?: string
          student_email?: string | null
          student_name?: string
        }
        Update: {
          assigned_role?: string
          created_at?: string
          id?: string
          pair_index?: number
          pair_position?: string
          participant_role?: string
          room_id?: string
          status?: string
          student_email?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "simulation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_responses: {
        Row: {
          answers_json: Json
          created_at: string
          form_id: string
          id: string
          participant_id: string
          round_id: string
          score: number | null
          submitted_at: string | null
        }
        Insert: {
          answers_json?: Json
          created_at?: string
          form_id: string
          id?: string
          participant_id: string
          round_id: string
          score?: number | null
          submitted_at?: string | null
        }
        Update: {
          answers_json?: Json
          created_at?: string
          form_id?: string
          id?: string
          participant_id?: string
          round_id?: string
          score?: number | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "simulation_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "simulation_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_responses_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "simulation_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_rooms: {
        Row: {
          access_code: string
          created_at: string
          current_cycle: number
          current_round: number
          description: string | null
          duration_minutes: number
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          created_at?: string
          current_cycle?: number
          current_round?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          created_at?: string
          current_cycle?: number
          current_round?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      simulation_round_assignments: {
        Row: {
          assigned_role: string
          created_at: string
          id: string
          pair_index: number
          participant_id: string
          round_id: string
        }
        Insert: {
          assigned_role?: string
          created_at?: string
          id?: string
          pair_index?: number
          participant_id: string
          round_id: string
        }
        Update: {
          assigned_role?: string
          created_at?: string
          id?: string
          pair_index?: number
          participant_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_round_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "simulation_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_round_assignments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "simulation_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_rounds: {
        Row: {
          created_at: string
          cycle: number
          finished_at: string | null
          id: string
          materials_released: boolean
          released_by: string | null
          room_id: string
          round_number: number
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          cycle?: number
          finished_at?: string | null
          id?: string
          materials_released?: boolean
          released_by?: string | null
          room_id: string
          round_number?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          cycle?: number
          finished_at?: string | null
          id?: string
          materials_released?: boolean
          released_by?: string | null
          room_id?: string
          round_number?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "simulation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_answers: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          answer_json: Json
          answer_text: string | null
          created_at: string
          grading_status: string
          id: string
          is_correct: boolean | null
          max_points: number | null
          points_earned: number | null
          question_id: string
          session_id: string
          teacher_feedback: string | null
          teacher_score: number | null
          updated_at: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          answer_json?: Json
          answer_text?: string | null
          created_at?: string
          grading_status?: string
          id?: string
          is_correct?: boolean | null
          max_points?: number | null
          points_earned?: number | null
          question_id: string
          session_id: string
          teacher_feedback?: string | null
          teacher_score?: number | null
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          answer_json?: Json
          answer_text?: string | null
          created_at?: string
          grading_status?: string
          id?: string
          is_correct?: boolean | null
          max_points?: number | null
          points_earned?: number | null
          question_id?: string
          session_id?: string
          teacher_feedback?: string | null
          teacher_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role_on_signup: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
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
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
