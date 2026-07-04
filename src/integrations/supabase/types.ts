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
      achievement_definitions: {
        Row: {
          category: string
          created_at: string
          criteria_json: Json
          description: string
          icon: string
          id: string
          key: string
          points_reward: number
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          criteria_json?: Json
          description: string
          icon?: string
          id?: string
          key: string
          points_reward?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          criteria_json?: Json
          description?: string
          icon?: string
          id?: string
          key?: string
          points_reward?: number
          title?: string
        }
        Relationships: []
      }
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
      biomedicine_clinical_cases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          room_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id: string
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "biomedicine_clinical_cases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "biomedicine_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      biomedicine_forms: {
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
            foreignKeyName: "biomedicine_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "biomedicine_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      biomedicine_participants: {
        Row: {
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
            foreignKeyName: "biomedicine_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "biomedicine_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      biomedicine_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          clinical_case_id: string | null
          created_at: string
          form_id: string
          id: string
          pair_index: number
          room_id: string
          submitted_at: string | null
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          pair_index?: number
          room_id: string
          submitted_at?: string | null
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          pair_index?: number
          room_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biomedicine_responses_clinical_case_id_fkey"
            columns: ["clinical_case_id"]
            isOneToOne: false
            referencedRelation: "biomedicine_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biomedicine_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "biomedicine_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biomedicine_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "biomedicine_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      biomedicine_rooms: {
        Row: {
          access_code: string
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          module_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      class_announcements: {
        Row: {
          body: string | null
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          pinned: boolean
          semester_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          semester_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          semester_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_announcements_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          created_at: string
          id: string
          justification: string | null
          lesson_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          justification?: string | null
          lesson_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string | null
          lesson_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "class_schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "class_students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_documents: {
        Row: {
          category: string
          class_id: string
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          link_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          class_id: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          link_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          class_id?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          link_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_documents_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_grade_columns: {
        Row: {
          class_id: string
          created_at: string
          id: string
          label: string
          max_score: number
          order_index: number
          semester_id: string
          source_ref_id: string | null
          source_type: string
          updated_at: string
          weight: number
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          label: string
          max_score?: number
          order_index?: number
          semester_id: string
          source_ref_id?: string | null
          source_type?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          label?: string
          max_score?: number
          order_index?: number
          semester_id?: string
          source_ref_id?: string | null
          source_type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_grade_columns_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_grade_columns_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      class_grade_entries: {
        Row: {
          column_id: string
          comment: string | null
          created_at: string
          id: string
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          column_id: string
          comment?: string | null
          created_at?: string
          id?: string
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          column_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_grade_entries_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "class_grade_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_grade_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "class_students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_holidays: {
        Row: {
          class_id: string | null
          created_at: string
          holiday_date: string
          id: string
          name: string
          recurring_yearly: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          holiday_date: string
          id?: string
          name: string
          recurring_yearly?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
          recurring_yearly?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_holidays_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_lesson_templates: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          lesson_type: string
          name: string
          schema: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          lesson_type: string
          name: string
          schema?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          lesson_type?: string
          name?: string
          schema?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      class_lesson_visits: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          location: string | null
          notes: string | null
          order_index: number
          preceptor_name: string | null
          preceptor_phone: string | null
          student_ids: string[]
          teacher_id: string | null
          template_id: string | null
          time_slot: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          location?: string | null
          notes?: string | null
          order_index?: number
          preceptor_name?: string | null
          preceptor_phone?: string | null
          student_ids?: string[]
          teacher_id?: string | null
          template_id?: string | null
          time_slot?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          location?: string | null
          notes?: string | null
          order_index?: number
          preceptor_name?: string | null
          preceptor_phone?: string | null
          student_ids?: string[]
          teacher_id?: string | null
          template_id?: string | null
          time_slot?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_lesson_visits_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "class_schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_lesson_visits_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "class_teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_lesson_visits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "class_visit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      class_rubrics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          rubric_json: Json
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rubric_json: Json
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rubric_json?: Json
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      class_schedule_items: {
        Row: {
          created_at: string
          holiday_name: string | null
          id: string
          is_holiday: boolean
          lesson_date: string | null
          lesson_type: string
          notes: string | null
          order_index: number
          rubric_id: string | null
          rubric_json: Json
          semester_id: string
          status: string
          teacher_id: string | null
          template_data: Json
          template_id: string | null
          time_slot: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          holiday_name?: string | null
          id?: string
          is_holiday?: boolean
          lesson_date?: string | null
          lesson_type?: string
          notes?: string | null
          order_index?: number
          rubric_id?: string | null
          rubric_json?: Json
          semester_id: string
          status?: string
          teacher_id?: string | null
          template_data?: Json
          template_id?: string | null
          time_slot?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          holiday_name?: string | null
          id?: string
          is_holiday?: boolean
          lesson_date?: string | null
          lesson_type?: string
          notes?: string | null
          order_index?: number
          rubric_id?: string | null
          rubric_json?: Json
          semester_id?: string
          status?: string
          teacher_id?: string | null
          template_data?: Json
          template_id?: string | null
          time_slot?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_items_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "class_rubrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedule_items_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedule_items_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "class_teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedule_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "class_lesson_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      class_semesters: {
        Row: {
          class_id: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          label: string
          order_index: number
          start_date: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          label: string
          order_index?: number
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          label?: string
          order_index?: number
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_semesters_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_seminar_evaluations: {
        Row: {
          answers: Json
          created_at: string
          id: string
          lesson_id: string
          max_score: number
          notes: string | null
          percent: number
          student_id: string
          time_seconds: number | null
          total_score: number
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_id: string
          max_score?: number
          notes?: string | null
          percent?: number
          student_id: string
          time_seconds?: number | null
          total_score?: number
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_id?: string
          max_score?: number
          notes?: string | null
          percent?: number
          student_id?: string
          time_seconds?: number | null
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_seminar_evaluations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "class_schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_seminar_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "class_students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          created_at: string
          id: string
          semester_id: string | null
          student_email: string | null
          student_name: string
          student_registration: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          semester_id?: string | null
          student_email?: string | null
          student_name: string
          student_registration?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          semester_id?: string | null
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
          {
            foreignKeyName: "class_students_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teachers: {
        Row: {
          class_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          order_index: number
          role: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          order_index?: number
          role?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          order_index?: number
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_virtual_patients: {
        Row: {
          access_code: string
          class_id: string
          created_at: string
          group_label: string | null
          id: string
          patient_id: string
          semester_id: string | null
          status: string
        }
        Insert: {
          access_code?: string
          class_id: string
          created_at?: string
          group_label?: string | null
          id?: string
          patient_id: string
          semester_id?: string | null
          status?: string
        }
        Update: {
          access_code?: string
          class_id?: string
          created_at?: string
          group_label?: string | null
          id?: string
          patient_id?: string
          semester_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_virtual_patients_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_virtual_patients_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      class_visit_templates: {
        Row: {
          class_id: string
          created_at: string
          default_student_ids: string[]
          id: string
          location: string | null
          notes: string | null
          preceptor_name: string | null
          preceptor_phone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          default_student_ids?: string[]
          id?: string
          location?: string | null
          notes?: string | null
          preceptor_name?: string | null
          preceptor_phone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          default_student_ids?: string[]
          id?: string
          location?: string | null
          notes?: string | null
          preceptor_name?: string | null
          preceptor_phone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_visit_templates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_vp_assignments: {
        Row: {
          class_id: string
          class_student_id: string
          class_virtual_patient_id: string
          created_at: string
          id: string
          student_email: string
          student_name: string
        }
        Insert: {
          class_id: string
          class_student_id: string
          class_virtual_patient_id: string
          created_at?: string
          id?: string
          student_email: string
          student_name: string
        }
        Update: {
          class_id?: string
          class_student_id?: string
          class_virtual_patient_id?: string
          created_at?: string
          id?: string
          student_email?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_vp_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_vp_assignments_class_student_id_fkey"
            columns: ["class_student_id"]
            isOneToOne: false
            referencedRelation: "class_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_vp_assignments_class_virtual_patient_id_fkey"
            columns: ["class_virtual_patient_id"]
            isOneToOne: false
            referencedRelation: "class_virtual_patients"
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
          weekly_schedule: Json
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
          weekly_schedule?: Json
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
          weekly_schedule?: Json
        }
        Relationships: []
      }
      clinical_case_bank: {
        Row: {
          content: string
          created_at: string
          id: string
          phase: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          phase: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          phase?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinical_observation_sessions: {
        Row: {
          complexity: string
          created_at: string
          duration_minutes: number | null
          evaluator_email: string
          evaluator_name: string
          feedback: string | null
          global_score: number | null
          id: string
          observation_id: string
          scores_json: Json
          setting: string | null
          student_email: string | null
          student_name: string
        }
        Insert: {
          complexity?: string
          created_at?: string
          duration_minutes?: number | null
          evaluator_email?: string
          evaluator_name?: string
          feedback?: string | null
          global_score?: number | null
          id?: string
          observation_id: string
          scores_json?: Json
          setting?: string | null
          student_email?: string | null
          student_name?: string
        }
        Update: {
          complexity?: string
          created_at?: string
          duration_minutes?: number | null
          evaluator_email?: string
          evaluator_name?: string
          feedback?: string | null
          global_score?: number | null
          id?: string
          observation_id?: string
          scores_json?: Json
          setting?: string | null
          student_email?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_observation_sessions_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "clinical_observations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_observations: {
        Row: {
          access_code: string
          class_id: string | null
          competency_domains_json: Json
          competency_ids: string[] | null
          created_at: string
          deleted_at: string | null
          id: string
          semester_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          class_id?: string | null
          competency_domains_json?: Json
          competency_ids?: string[] | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          semester_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          class_id?: string | null
          competency_domains_json?: Json
          competency_ids?: string[] | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          semester_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_observations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_observations_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_definitions: {
        Row: {
          area: string
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      competency_scores: {
        Row: {
          competency_id: string
          created_at: string
          evaluated_at: string
          id: string
          max_score: number
          score: number
          source_id: string | null
          source_label: string | null
          source_type: string
          student_email: string
          user_id: string
        }
        Insert: {
          competency_id: string
          created_at?: string
          evaluated_at?: string
          id?: string
          max_score?: number
          score?: number
          source_id?: string | null
          source_label?: string | null
          source_type: string
          student_email: string
          user_id: string
        }
        Update: {
          competency_id?: string
          created_at?: string
          evaluated_at?: string
          id?: string
          max_score?: number
          score?: number
          source_id?: string | null
          source_label?: string | null
          source_type?: string
          student_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_scores_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competency_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_virtual_patients: {
        Row: {
          age: number
          baseline_context: string
          baseline_vitals: Json
          category: string
          clinical_case: Json
          clinical_context: string
          created_at: string
          description: string
          id: string
          name: string
          profession: string
          system_prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          baseline_context?: string
          baseline_vitals?: Json
          category: string
          clinical_case?: Json
          clinical_context: string
          created_at?: string
          description: string
          id?: string
          name: string
          profession: string
          system_prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          baseline_context?: string
          baseline_vitals?: Json
          category?: string
          clinical_case?: Json
          clinical_context?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          profession?: string
          system_prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dentistry_clinical_cases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          room_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id: string
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentistry_clinical_cases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dentistry_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      dentistry_forms: {
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
            foreignKeyName: "dentistry_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dentistry_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      dentistry_participants: {
        Row: {
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
            foreignKeyName: "dentistry_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dentistry_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      dentistry_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          clinical_case_id: string | null
          created_at: string
          form_id: string
          id: string
          pair_index: number
          room_id: string
          submitted_at: string | null
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          pair_index?: number
          room_id: string
          submitted_at?: string | null
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          pair_index?: number
          room_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dentistry_responses_clinical_case_id_fkey"
            columns: ["clinical_case_id"]
            isOneToOne: false
            referencedRelation: "dentistry_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentistry_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "dentistry_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentistry_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dentistry_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      dentistry_rooms: {
        Row: {
          access_code: string
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          module_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documentation_clinical_cases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          reconciliation_case_id: string | null
          room_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          reconciliation_case_id?: string | null
          room_id: string
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          reconciliation_case_id?: string | null
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_clinical_cases_reconciliation_case_id_fkey"
            columns: ["reconciliation_case_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_clinical_cases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "documentation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_forms: {
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
            foreignKeyName: "documentation_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "documentation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_participants: {
        Row: {
          created_at: string
          id: string
          pair_index: number
          pair_position: string
          participant_role: string
          reconciliation_participant_id: string | null
          room_id: string
          status: string
          student_email: string | null
          student_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          pair_index?: number
          pair_position?: string
          participant_role?: string
          reconciliation_participant_id?: string | null
          room_id: string
          status?: string
          student_email?: string | null
          student_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          pair_index?: number
          pair_position?: string
          participant_role?: string
          reconciliation_participant_id?: string | null
          room_id?: string
          status?: string
          student_email?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_participants_reconciliation_participant_id_fkey"
            columns: ["reconciliation_participant_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "documentation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          clinical_case_id: string | null
          created_at: string
          form_id: string
          id: string
          pair_index: number
          room_id: string
          submitted_at: string | null
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          pair_index?: number
          room_id: string
          submitted_at?: string | null
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          pair_index?: number
          room_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentation_responses_clinical_case_id_fkey"
            columns: ["clinical_case_id"]
            isOneToOne: false
            referencedRelation: "documentation_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "documentation_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "documentation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_rooms: {
        Row: {
          access_code: string
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          reconciliation_room_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          reconciliation_room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          reconciliation_room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_rooms_reconciliation_room_id_fkey"
            columns: ["reconciliation_room_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_audit_logs: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_audit_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          device_fingerprint: Json | null
          finished_at: string | null
          id: string
          max_score: number | null
          photo_url: string | null
          publication_id: string
          started_at: string
          status: string
          student_email: string | null
          student_id: string | null
          student_name: string | null
          submission_hash: string | null
          total_score: number | null
          violation_count: number | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: Json | null
          finished_at?: string | null
          id?: string
          max_score?: number | null
          photo_url?: string | null
          publication_id: string
          started_at?: string
          status?: string
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          submission_hash?: string | null
          total_score?: number | null
          violation_count?: number | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: Json | null
          finished_at?: string | null
          id?: string
          max_score?: number | null
          photo_url?: string | null
          publication_id?: string
          started_at?: string
          status?: string
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          submission_hash?: string | null
          total_score?: number | null
          violation_count?: number | null
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
          proctoring_config: Json | null
          semester_id: string | null
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
          proctoring_config?: Json | null
          semester_id?: string | null
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
          proctoring_config?: Json | null
          semester_id?: string | null
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
          {
            foreignKeyName: "exams_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      form_drafts: {
        Row: {
          answers_json: Json
          created_at: string
          draft_key: string
          id: string
          module: string
          updated_at: string
        }
        Insert: {
          answers_json?: Json
          created_at?: string
          draft_key: string
          id?: string
          module: string
          updated_at?: string
        }
        Update: {
          answers_json?: Json
          created_at?: string
          draft_key?: string
          id?: string
          module?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_template_shares: {
        Row: {
          created_at: string
          id: string
          shared_by: string
          shared_with: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shared_by: string
          shared_with: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shared_by?: string
          shared_with?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_template_shares_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          area: string
          content_json: Json
          created_at: string
          description: string | null
          form_type: string
          id: string
          is_native: boolean
          module_type: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          area: string
          content_json?: Json
          created_at?: string
          description?: string | null
          form_type?: string
          id?: string
          is_native?: boolean
          module_type: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          area?: string
          content_json?: Json
          created_at?: string
          description?: string | null
          form_type?: string
          id?: string
          is_native?: boolean
          module_type?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kfe_answers: {
        Row: {
          answer_json: Json
          created_at: string
          id: string
          key_feature_id: string
          score: number | null
          session_id: string
        }
        Insert: {
          answer_json?: Json
          created_at?: string
          id?: string
          key_feature_id: string
          score?: number | null
          session_id: string
        }
        Update: {
          answer_json?: Json
          created_at?: string
          id?: string
          key_feature_id?: string
          score?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kfe_answers_key_feature_id_fkey"
            columns: ["key_feature_id"]
            isOneToOne: false
            referencedRelation: "kfe_key_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kfe_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kfe_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kfe_cases: {
        Row: {
          clinical_scenario: string
          created_at: string
          id: string
          kfe_exam_id: string
          position: number
          title: string
        }
        Insert: {
          clinical_scenario?: string
          created_at?: string
          id?: string
          kfe_exam_id: string
          position?: number
          title?: string
        }
        Update: {
          clinical_scenario?: string
          created_at?: string
          id?: string
          kfe_exam_id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "kfe_cases_kfe_exam_id_fkey"
            columns: ["kfe_exam_id"]
            isOneToOne: false
            referencedRelation: "kfe_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      kfe_exams: {
        Row: {
          class_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          semester_id: string | null
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
          id?: string
          semester_id?: string | null
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
          id?: string
          semester_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kfe_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kfe_exams_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      kfe_key_features: {
        Row: {
          case_id: string
          correct_answer_json: Json
          created_at: string
          explanation: string | null
          id: string
          max_score: number
          options_json: Json
          position: number
          question_text: string
          question_type: string
        }
        Insert: {
          case_id: string
          correct_answer_json?: Json
          created_at?: string
          explanation?: string | null
          id?: string
          max_score?: number
          options_json?: Json
          position?: number
          question_text?: string
          question_type?: string
        }
        Update: {
          case_id?: string
          correct_answer_json?: Json
          created_at?: string
          explanation?: string | null
          id?: string
          max_score?: number
          options_json?: Json
          position?: number
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kfe_key_features_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "kfe_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      kfe_sessions: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          kfe_exam_id: string
          max_score: number | null
          started_at: string
          status: string
          student_email: string | null
          student_name: string | null
          total_score: number | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          kfe_exam_id: string
          max_score?: number | null
          started_at?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          total_score?: number | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          kfe_exam_id?: string
          max_score?: number | null
          started_at?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kfe_sessions_kfe_exam_id_fkey"
            columns: ["kfe_exam_id"]
            isOneToOne: false
            referencedRelation: "kfe_exams"
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
      medicine_clinical_cases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          room_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id: string
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_clinical_cases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "medicine_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_forms: {
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
            foreignKeyName: "medicine_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "medicine_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_participants: {
        Row: {
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
            foreignKeyName: "medicine_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "medicine_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          clinical_case_id: string | null
          created_at: string
          form_id: string
          id: string
          pair_index: number
          room_id: string
          submitted_at: string | null
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          pair_index?: number
          room_id: string
          submitted_at?: string | null
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          pair_index?: number
          room_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicine_responses_clinical_case_id_fkey"
            columns: ["clinical_case_id"]
            isOneToOne: false
            referencedRelation: "medicine_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "medicine_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "medicine_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_rooms: {
        Row: {
          access_code: string
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          module_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_trial_assignments: {
        Row: {
          case_id: string
          created_at: string
          group_id: string
          id: string
          role: string
        }
        Insert: {
          case_id: string
          created_at?: string
          group_id: string
          id?: string
          role?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          group_id?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_trial_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_attendance: {
        Row: {
          case_id: string
          created_at: string
          id: string
          mock_trial_id: string
          notes: string | null
          score_override: number | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          mock_trial_id: string
          notes?: string | null
          score_override?: number | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          mock_trial_id?: string
          notes?: string | null
          score_override?: number | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      mock_trial_case_bank: {
        Row: {
          case_number: string | null
          characters_json: Json
          created_at: string
          id: string
          images_json: Json
          learning_objectives: string | null
          process_content: string
          source_case_id: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_number?: string | null
          characters_json?: Json
          created_at?: string
          id?: string
          images_json?: Json
          learning_objectives?: string | null
          process_content?: string
          source_case_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_number?: string | null
          characters_json?: Json
          created_at?: string
          id?: string
          images_json?: Json
          learning_objectives?: string | null
          process_content?: string
          source_case_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_trial_case_images: {
        Row: {
          anchor: string
          attempts: number
          caption: string
          case_id: string
          created_at: string
          error_message: string | null
          id: string
          image_url: string | null
          prompt: string
          slug: string
          status: string
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          anchor: string
          attempts?: number
          caption?: string
          case_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          prompt?: string
          slug: string
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          anchor?: string
          attempts?: number
          caption?: string
          case_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          prompt?: string
          slug?: string
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_case_images_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_cases: {
        Row: {
          case_number: string
          characters_json: Json
          created_at: string
          generation_status: string
          id: string
          learning_objectives: string | null
          mock_trial_id: string
          position: number
          process_content: string | null
          sections_json: Json
          teacher_guide: string | null
          title: string
        }
        Insert: {
          case_number?: string
          characters_json?: Json
          created_at?: string
          generation_status?: string
          id?: string
          learning_objectives?: string | null
          mock_trial_id: string
          position?: number
          process_content?: string | null
          sections_json?: Json
          teacher_guide?: string | null
          title?: string
        }
        Update: {
          case_number?: string
          characters_json?: Json
          created_at?: string
          generation_status?: string
          id?: string
          learning_objectives?: string | null
          mock_trial_id?: string
          position?: number
          process_content?: string | null
          sections_json?: Json
          teacher_guide?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_cases_mock_trial_id_fkey"
            columns: ["mock_trial_id"]
            isOneToOne: false
            referencedRelation: "mock_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_evaluation_forms: {
        Row: {
          created_at: string
          evaluator_type: string
          fields_json: Json
          id: string
          mock_trial_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluator_type: string
          fields_json?: Json
          id?: string
          mock_trial_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluator_type?: string
          fields_json?: Json
          id?: string
          mock_trial_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_evaluation_forms_mock_trial_id_fkey"
            columns: ["mock_trial_id"]
            isOneToOne: false
            referencedRelation: "mock_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_evaluations: {
        Row: {
          ai_generated: boolean
          case_id: string
          created_at: string
          criteria_json: Json
          edited_by_teacher: boolean
          evaluated_role: string
          evaluator_name: string | null
          evaluator_type: string
          feedback: string | null
          group_id: string
          id: string
          max_score: number
          score: number
          session_id: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          case_id: string
          created_at?: string
          criteria_json?: Json
          edited_by_teacher?: boolean
          evaluated_role: string
          evaluator_name?: string | null
          evaluator_type: string
          feedback?: string | null
          group_id: string
          id?: string
          max_score?: number
          score?: number
          session_id: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          case_id?: string
          created_at?: string
          criteria_json?: Json
          edited_by_teacher?: boolean
          evaluated_role?: string
          evaluator_name?: string | null
          evaluator_type?: string
          feedback?: string | null
          group_id?: string
          id?: string
          max_score?: number
          score?: number
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_evaluations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_trial_evaluations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_trial_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_forms: {
        Row: {
          created_at: string
          fields_json: Json
          id: string
          mock_trial_id: string
          target_role: string
          title: string
        }
        Insert: {
          created_at?: string
          fields_json?: Json
          id?: string
          mock_trial_id: string
          target_role?: string
          title?: string
        }
        Update: {
          created_at?: string
          fields_json?: Json
          id?: string
          mock_trial_id?: string
          target_role?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_forms_mock_trial_id_fkey"
            columns: ["mock_trial_id"]
            isOneToOne: false
            referencedRelation: "mock_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_generation_jobs: {
        Row: {
          attempts: number
          blueprint_json: Json | null
          case_id: string | null
          case_number: string | null
          completed_steps: number
          created_at: string
          current_step: string | null
          finished_at: string | null
          id: string
          last_error: string | null
          learning_objectives: string | null
          mock_trial_id: string
          mode: string
          pdf_content: string | null
          progress: number
          result_case_id: string | null
          sections_json: Json
          status: string
          total_steps: number
          updated_at: string
          user_id: string
          validation_issues: Json
        }
        Insert: {
          attempts?: number
          blueprint_json?: Json | null
          case_id?: string | null
          case_number?: string | null
          completed_steps?: number
          created_at?: string
          current_step?: string | null
          finished_at?: string | null
          id?: string
          last_error?: string | null
          learning_objectives?: string | null
          mock_trial_id: string
          mode?: string
          pdf_content?: string | null
          progress?: number
          result_case_id?: string | null
          sections_json?: Json
          status?: string
          total_steps?: number
          updated_at?: string
          user_id: string
          validation_issues?: Json
        }
        Update: {
          attempts?: number
          blueprint_json?: Json | null
          case_id?: string | null
          case_number?: string | null
          completed_steps?: number
          created_at?: string
          current_step?: string | null
          finished_at?: string | null
          id?: string
          last_error?: string | null
          learning_objectives?: string | null
          mock_trial_id?: string
          mode?: string
          pdf_content?: string | null
          progress?: number
          result_case_id?: string | null
          sections_json?: Json
          status?: string
          total_steps?: number
          updated_at?: string
          user_id?: string
          validation_issues?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_generation_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_trial_generation_jobs_mock_trial_id_fkey"
            columns: ["mock_trial_id"]
            isOneToOne: false
            referencedRelation: "mock_trials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_trial_generation_jobs_result_case_id_fkey"
            columns: ["result_case_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_groups: {
        Row: {
          created_at: string
          group_number: number
          id: string
          mock_trial_id: string
          name: string
        }
        Insert: {
          created_at?: string
          group_number?: number
          id?: string
          mock_trial_id: string
          name?: string
        }
        Update: {
          created_at?: string
          group_number?: number
          id?: string
          mock_trial_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_groups_mock_trial_id_fkey"
            columns: ["mock_trial_id"]
            isOneToOne: false
            referencedRelation: "mock_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_responses: {
        Row: {
          created_at: string
          form_id: string
          group_id: string
          id: string
          response_json: Json
          session_id: string
          student_email: string | null
          student_name: string | null
        }
        Insert: {
          created_at?: string
          form_id: string
          group_id: string
          id?: string
          response_json?: Json
          session_id: string
          student_email?: string | null
          student_name?: string | null
        }
        Update: {
          created_at?: string
          form_id?: string
          group_id?: string
          id?: string
          response_json?: Json
          session_id?: string
          student_email?: string | null
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_trial_responses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_trial_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_sessions: {
        Row: {
          case_id: string
          created_at: string
          current_phase_started_at: string | null
          id: string
          is_paused: boolean
          judge_notes: string | null
          paused_remaining_seconds: number | null
          phase_duration_seconds: number | null
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          current_phase_started_at?: string | null
          id?: string
          is_paused?: boolean
          judge_notes?: string | null
          paused_remaining_seconds?: number | null
          phase_duration_seconds?: number | null
          status?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          current_phase_started_at?: string | null
          id?: string
          is_paused?: boolean
          judge_notes?: string | null
          paused_remaining_seconds?: number | null
          phase_duration_seconds?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trial_students: {
        Row: {
          created_at: string
          group_id: string
          id: string
          student_email: string | null
          student_name: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          student_email?: string | null
          student_name: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          student_email?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_trial_students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mock_trial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trials: {
        Row: {
          access_code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          judge_name: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          judge_name?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          judge_name?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nursing_clinical_cases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          room_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id: string
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nursing_clinical_cases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "nursing_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_forms: {
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
            foreignKeyName: "nursing_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "nursing_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_participants: {
        Row: {
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
            foreignKeyName: "nursing_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "nursing_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          clinical_case_id: string | null
          created_at: string
          form_id: string
          id: string
          pair_index: number
          room_id: string
          submitted_at: string | null
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          pair_index?: number
          room_id: string
          submitted_at?: string | null
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          pair_index?: number
          room_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nursing_responses_clinical_case_id_fkey"
            columns: ["clinical_case_id"]
            isOneToOne: false
            referencedRelation: "nursing_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nursing_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "nursing_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nursing_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "nursing_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_rooms: {
        Row: {
          access_code: string
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          module_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_clinical_cases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          room_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id: string
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_clinical_cases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "nutrition_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_forms: {
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
            foreignKeyName: "nutrition_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "nutrition_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_participants: {
        Row: {
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
            foreignKeyName: "nutrition_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "nutrition_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          clinical_case_id: string | null
          created_at: string
          form_id: string
          id: string
          pair_index: number
          room_id: string
          submitted_at: string | null
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          pair_index?: number
          room_id: string
          submitted_at?: string | null
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          pair_index?: number
          room_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_responses_clinical_case_id_fkey"
            columns: ["clinical_case_id"]
            isOneToOne: false
            referencedRelation: "nutrition_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "nutrition_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "nutrition_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_rooms: {
        Row: {
          access_code: string
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          module_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          semester_id: string | null
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
          semester_id?: string | null
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
          semester_id?: string | null
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
          {
            foreignKeyName: "osce_circuits_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
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
          semester_id: string | null
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
          semester_id?: string | null
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
          semester_id?: string | null
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
          {
            foreignKeyName: "osce_exams_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
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
          competency_ids: string[] | null
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
          competency_ids?: string[] | null
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
          competency_ids?: string[] | null
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
      physiotherapy_clinical_cases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          room_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id: string
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "physiotherapy_clinical_cases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "physiotherapy_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      physiotherapy_forms: {
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
            foreignKeyName: "physiotherapy_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "physiotherapy_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      physiotherapy_participants: {
        Row: {
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
            foreignKeyName: "physiotherapy_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "physiotherapy_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      physiotherapy_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          clinical_case_id: string | null
          created_at: string
          form_id: string
          id: string
          pair_index: number
          room_id: string
          submitted_at: string | null
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          pair_index?: number
          room_id: string
          submitted_at?: string | null
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          pair_index?: number
          room_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "physiotherapy_responses_clinical_case_id_fkey"
            columns: ["clinical_case_id"]
            isOneToOne: false
            referencedRelation: "physiotherapy_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physiotherapy_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "physiotherapy_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physiotherapy_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "physiotherapy_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      physiotherapy_rooms: {
        Row: {
          access_code: string
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          module_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_entries: {
        Row: {
          created_at: string
          entry_date: string
          entry_type: string
          id: string
          max_score: number | null
          metadata_json: Json | null
          portfolio_id: string
          score: number | null
          title: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          entry_type: string
          id?: string
          max_score?: number | null
          metadata_json?: Json | null
          portfolio_id: string
          score?: number | null
          title: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          max_score?: number | null
          metadata_json?: Json | null
          portfolio_id?: string
          score?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_entries_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "student_portfolios"
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
      progress_test_answers: {
        Row: {
          answer_json: Json
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          response_type: string
          session_id: string
        }
        Insert: {
          answer_json?: Json
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          response_type?: string
          session_id: string
        }
        Update: {
          answer_json?: Json
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          response_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "progress_test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_test_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "progress_test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_test_questions: {
        Row: {
          created_at: string
          expected_year: number
          id: string
          position: number
          question_id: string
          test_id: string
        }
        Insert: {
          created_at?: string
          expected_year?: number
          id?: string
          position?: number
          question_id: string
          test_id: string
        }
        Update: {
          created_at?: string
          expected_year?: number
          id?: string
          position?: number
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "progress_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_test_sessions: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          max_score: number | null
          started_at: string
          status: string
          student_email: string | null
          student_name: string | null
          student_year: number
          test_id: string
          total_score: number | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          max_score?: number | null
          started_at?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          student_year?: number
          test_id: string
          total_score?: number | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          max_score?: number | null
          started_at?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          student_year?: number
          test_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_test_sessions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "progress_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_tests: {
        Row: {
          application_date: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          status: string
          target_years_json: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_date?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          status?: string
          target_years_json?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_date?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          status?: string
          target_years_json?: Json
          title?: string
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
          parent_id: string | null
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
          parent_id?: string | null
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
          parent_id?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      question_competencies: {
        Row: {
          competency_id: string
          id: string
          question_id: string
        }
        Insert: {
          competency_id: string
          id?: string
          question_id: string
        }
        Update: {
          competency_id?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competency_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_competencies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_clinical_cases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          room_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id: string
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          room_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_clinical_cases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_forms: {
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
            foreignKeyName: "reconciliation_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_participants: {
        Row: {
          created_at: string
          id: string
          pair_index: number
          pair_position: string
          participant_role: string
          room_id: string
          soap_participant_id: string | null
          status: string
          student_email: string | null
          student_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          pair_index?: number
          pair_position?: string
          participant_role?: string
          room_id: string
          soap_participant_id?: string | null
          status?: string
          student_email?: string | null
          student_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          pair_index?: number
          pair_position?: string
          participant_role?: string
          room_id?: string
          soap_participant_id?: string | null
          status?: string
          student_email?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_participants_soap_participant_id_fkey"
            columns: ["soap_participant_id"]
            isOneToOne: false
            referencedRelation: "soap_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          clinical_case_id: string | null
          created_at: string
          form_id: string
          id: string
          pair_index: number
          room_id: string
          submitted_at: string | null
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          pair_index?: number
          room_id: string
          submitted_at?: string | null
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          clinical_case_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          pair_index?: number
          room_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_responses_clinical_case_id_fkey"
            columns: ["clinical_case_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_rooms: {
        Row: {
          access_code: string
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          soap_room_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          soap_room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          soap_room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_rooms_soap_room_id_fkey"
            columns: ["soap_room_id"]
            isOneToOne: false
            referencedRelation: "soap_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      sct_exams: {
        Row: {
          class_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          expert_panel_size: number
          id: string
          semester_id: string | null
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
          expert_panel_size?: number
          id?: string
          semester_id?: string | null
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
          expert_panel_size?: number
          id?: string
          semester_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sct_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sct_exams_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      sct_expert_responses: {
        Row: {
          created_at: string
          expert_email: string
          expert_name: string
          id: string
          likert_value: number
          scenario_id: string
        }
        Insert: {
          created_at?: string
          expert_email?: string
          expert_name?: string
          id?: string
          likert_value?: number
          scenario_id: string
        }
        Update: {
          created_at?: string
          expert_email?: string
          expert_name?: string
          id?: string
          likert_value?: number
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sct_expert_responses_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "sct_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sct_scenarios: {
        Row: {
          clinical_vignette: string
          created_at: string
          hypothesis: string
          id: string
          new_information: string
          position: number
          sct_exam_id: string
        }
        Insert: {
          clinical_vignette?: string
          created_at?: string
          hypothesis?: string
          id?: string
          new_information?: string
          position?: number
          sct_exam_id: string
        }
        Update: {
          clinical_vignette?: string
          created_at?: string
          hypothesis?: string
          id?: string
          new_information?: string
          position?: number
          sct_exam_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sct_scenarios_sct_exam_id_fkey"
            columns: ["sct_exam_id"]
            isOneToOne: false
            referencedRelation: "sct_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      sct_student_answers: {
        Row: {
          created_at: string
          id: string
          likert_value: number
          scenario_id: string
          score: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          likert_value?: number
          scenario_id: string
          score?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          likert_value?: number
          scenario_id?: string
          score?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sct_student_answers_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "sct_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sct_student_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sct_student_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sct_student_sessions: {
        Row: {
          access_code: string
          created_at: string
          finished_at: string | null
          id: string
          max_score: number | null
          sct_exam_id: string
          started_at: string
          status: string
          student_email: string | null
          student_name: string | null
          total_score: number | null
        }
        Insert: {
          access_code?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          max_score?: number | null
          sct_exam_id: string
          started_at?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          total_score?: number | null
        }
        Update: {
          access_code?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          max_score?: number | null
          sct_exam_id?: string
          started_at?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sct_student_sessions_sct_exam_id_fkey"
            columns: ["sct_exam_id"]
            isOneToOne: false
            referencedRelation: "sct_exams"
            referencedColumns: ["id"]
          },
        ]
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
          makeup_status: string | null
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
          makeup_status?: string | null
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
          makeup_status?: string | null
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
          is_makeup: boolean
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
          is_makeup?: boolean
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
          is_makeup?: boolean
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
          competency_ids: string[] | null
          created_at: string
          current_cycle: number
          current_round: number
          description: string | null
          duration_minutes: number
          id: string
          is_archived: boolean
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          current_cycle?: number
          current_round?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          is_archived?: boolean
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          competency_ids?: string[] | null
          created_at?: string
          current_cycle?: number
          current_round?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          is_archived?: boolean
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
          case_index: number | null
          created_at: string
          id: string
          is_reused_role: boolean
          pair_index: number
          participant_id: string
          round_id: string
        }
        Insert: {
          assigned_role?: string
          case_index?: number | null
          created_at?: string
          id?: string
          is_reused_role?: boolean
          pair_index?: number
          participant_id: string
          round_id: string
        }
        Update: {
          assigned_role?: string
          case_index?: number | null
          created_at?: string
          id?: string
          is_reused_role?: boolean
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
          is_makeup: boolean
          makeup_batch: number
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
          is_makeup?: boolean
          makeup_batch?: number
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
          is_makeup?: boolean
          makeup_batch?: number
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
      simulation_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          room_id: string
          session_number: number
          started_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          room_id: string
          session_number: number
          started_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          room_id?: string
          session_number?: number
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "simulation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      sjt_answers: {
        Row: {
          created_at: string
          id: string
          scenario_id: string
          score: number | null
          session_id: string
          student_ranking_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          scenario_id: string
          score?: number | null
          session_id: string
          student_ranking_json?: Json
        }
        Update: {
          created_at?: string
          id?: string
          scenario_id?: string
          score?: number | null
          session_id?: string
          student_ranking_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sjt_answers_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "sjt_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjt_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sjt_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sjt_exams: {
        Row: {
          class_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          scoring_method: string
          semester_id: string | null
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
          id?: string
          scoring_method?: string
          semester_id?: string | null
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
          id?: string
          scoring_method?: string
          semester_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sjt_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjt_exams_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "class_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      sjt_scenarios: {
        Row: {
          actions_json: Json
          correct_ranking_json: Json
          created_at: string
          id: string
          position: number
          scenario_text: string
          sjt_exam_id: string
        }
        Insert: {
          actions_json?: Json
          correct_ranking_json?: Json
          created_at?: string
          id?: string
          position?: number
          scenario_text?: string
          sjt_exam_id: string
        }
        Update: {
          actions_json?: Json
          correct_ranking_json?: Json
          created_at?: string
          id?: string
          position?: number
          scenario_text?: string
          sjt_exam_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sjt_scenarios_sjt_exam_id_fkey"
            columns: ["sjt_exam_id"]
            isOneToOne: false
            referencedRelation: "sjt_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      sjt_sessions: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          max_score: number | null
          sjt_exam_id: string
          started_at: string
          status: string
          student_email: string | null
          student_name: string | null
          total_score: number | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          max_score?: number | null
          sjt_exam_id: string
          started_at?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          total_score?: number | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          max_score?: number | null
          sjt_exam_id?: string
          started_at?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sjt_sessions_sjt_exam_id_fkey"
            columns: ["sjt_exam_id"]
            isOneToOne: false
            referencedRelation: "sjt_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_forms: {
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
            foreignKeyName: "soap_forms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "soap_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_participants: {
        Row: {
          anamnesis_participant_id: string | null
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
          anamnesis_participant_id?: string | null
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
          anamnesis_participant_id?: string | null
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
            foreignKeyName: "soap_participants_anamnesis_participant_id_fkey"
            columns: ["anamnesis_participant_id"]
            isOneToOne: false
            referencedRelation: "simulation_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "soap_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_responses: {
        Row: {
          admin_feedback: string | null
          admin_score: number | null
          ai_feedback_json: Json | null
          ai_score: number | null
          answers_json: Json
          created_at: string
          form_id: string
          id: string
          needs_teacher_peer_eval: boolean
          participant_id: string
          room_id: string
          submitted_at: string | null
          target_participant_id: string | null
          teacher_filled: boolean
        }
        Insert: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          created_at?: string
          form_id: string
          id?: string
          needs_teacher_peer_eval?: boolean
          participant_id: string
          room_id: string
          submitted_at?: string | null
          target_participant_id?: string | null
          teacher_filled?: boolean
        }
        Update: {
          admin_feedback?: string | null
          admin_score?: number | null
          ai_feedback_json?: Json | null
          ai_score?: number | null
          answers_json?: Json
          created_at?: string
          form_id?: string
          id?: string
          needs_teacher_peer_eval?: boolean
          participant_id?: string
          room_id?: string
          submitted_at?: string | null
          target_participant_id?: string | null
          teacher_filled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "soap_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "soap_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "soap_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "soap_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_responses_target_participant_id_fkey"
            columns: ["target_participant_id"]
            isOneToOne: false
            referencedRelation: "soap_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_rooms: {
        Row: {
          access_code: string
          anamnesis_room_id: string | null
          competency_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code?: string
          anamnesis_room_id?: string | null
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code?: string
          anamnesis_room_id?: string | null
          competency_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soap_rooms_anamnesis_room_id_fkey"
            columns: ["anamnesis_room_id"]
            isOneToOne: false
            referencedRelation: "simulation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_achievements: {
        Row: {
          achievement_id: string
          id: string
          student_email: string
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          id?: string
          student_email: string
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          id?: string
          student_email?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_ai_feedbacks: {
        Row: {
          content_json: Json
          created_at: string
          feedback_type: string
          generated_by: string | null
          id: string
          source_ids: string[] | null
          source_type: string | null
          student_email: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          feedback_type?: string
          generated_by?: string | null
          id?: string
          source_ids?: string[] | null
          source_type?: string | null
          student_email: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          feedback_type?: string
          generated_by?: string | null
          id?: string
          source_ids?: string[] | null
          source_type?: string | null
          student_email?: string
        }
        Relationships: []
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
      student_points: {
        Row: {
          created_at: string
          id: string
          metadata_json: Json | null
          points: number
          source: string
          source_id: string | null
          student_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata_json?: Json | null
          points?: number
          source: string
          source_id?: string | null
          student_email: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata_json?: Json | null
          points?: number
          source?: string
          source_id?: string | null
          student_email?: string
        }
        Relationships: []
      }
      student_portfolios: {
        Row: {
          config_json: Json | null
          created_at: string
          id: string
          student_email: string
          student_name: string | null
          updated_at: string
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          id?: string
          student_email: string
          student_name?: string | null
          updated_at?: string
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          id?: string
          student_email?: string
          student_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_updates: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          priority: string
          title: string
          type: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          priority?: string
          title: string
          type?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          priority?: string
          title?: string
          type?: string
        }
        Relationships: []
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
      virtual_patient_grades: {
        Row: {
          bonus_penalidades: Json | null
          class_virtual_patient_id: string
          created_at: string
          feedback_released: boolean
          feedback_released_at: string | null
          feedback_resumido: string | null
          flags_seguranca: Json | null
          id: string
          nota_final: number | null
          nota_microlearning: number | null
          orientacoes_melhoria: string | null
          session_id: string
          subscores: Json
        }
        Insert: {
          bonus_penalidades?: Json | null
          class_virtual_patient_id: string
          created_at?: string
          feedback_released?: boolean
          feedback_released_at?: string | null
          feedback_resumido?: string | null
          flags_seguranca?: Json | null
          id?: string
          nota_final?: number | null
          nota_microlearning?: number | null
          orientacoes_melhoria?: string | null
          session_id: string
          subscores?: Json
        }
        Update: {
          bonus_penalidades?: Json | null
          class_virtual_patient_id?: string
          created_at?: string
          feedback_released?: boolean
          feedback_released_at?: string | null
          feedback_resumido?: string | null
          flags_seguranca?: Json | null
          id?: string
          nota_final?: number | null
          nota_microlearning?: number | null
          orientacoes_melhoria?: string | null
          session_id?: string
          subscores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "virtual_patient_grades_class_virtual_patient_id_fkey"
            columns: ["class_virtual_patient_id"]
            isOneToOne: false
            referencedRelation: "class_virtual_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_patient_grades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "virtual_patient_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_patient_mai_scores: {
        Row: {
          created_at: string
          id: string
          mai_json: Json
          session_id: string
          total_score: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          mai_json?: Json
          session_id: string
          total_score?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          mai_json?: Json
          session_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_patient_mai_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "virtual_patient_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_patient_messages: {
        Row: {
          content: string
          created_at: string
          encounter: number
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          encounter?: number
          id?: string
          role?: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          encounter?: number
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_patient_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "virtual_patient_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_patient_sessions: {
        Row: {
          class_virtual_patient_id: string | null
          created_at: string
          current_encounter: number
          group_id: string | null
          id: string
          mai_answers_json: Json | null
          module: string
          patient_id: string
          status: string
          student_email: string | null
          student_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_virtual_patient_id?: string | null
          created_at?: string
          current_encounter?: number
          group_id?: string | null
          id?: string
          mai_answers_json?: Json | null
          module?: string
          patient_id: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_virtual_patient_id?: string | null
          created_at?: string
          current_encounter?: number
          group_id?: string | null
          id?: string
          mai_answers_json?: Json | null
          module?: string
          patient_id?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_patient_sessions_class_virtual_patient_id_fkey"
            columns: ["class_virtual_patient_id"]
            isOneToOne: false
            referencedRelation: "class_virtual_patients"
            referencedColumns: ["id"]
          },
        ]
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
