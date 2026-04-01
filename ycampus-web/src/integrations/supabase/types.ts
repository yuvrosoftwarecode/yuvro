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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_url: string | null
          category: Database["public"]["Enums"]["announcement_category"]
          created_at: string
          department_id: string | null
          description: string
          expiry_date: string | null
          full_content: string | null
          id: string
          posted_by: string
          posted_date: string
          priority: Database["public"]["Enums"]["announcement_priority"]
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["announcement_category"]
          created_at?: string
          department_id?: string | null
          description: string
          expiry_date?: string | null
          full_content?: string | null
          id?: string
          posted_by: string
          posted_date?: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["announcement_category"]
          created_at?: string
          department_id?: string | null
          description?: string
          expiry_date?: string | null
          full_content?: string | null
          id?: string
          posted_by?: string
          posted_date?: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string
          id: string
          is_present: boolean
          session_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_present?: boolean
          session_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_present?: boolean
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          batch_id: string | null
          course_id: string
          created_at: string
          department_id: string
          faculty_id: string
          id: string
          is_cancelled: boolean
          is_finalized: boolean
          section: string
          semester: number
          session_date: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          course_id: string
          created_at?: string
          department_id: string
          faculty_id: string
          id?: string
          is_cancelled?: boolean
          is_finalized?: boolean
          section: string
          semester: number
          session_date: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          course_id?: string
          created_at?: string
          department_id?: string
          faculty_id?: string
          id?: string
          is_cancelled?: boolean
          is_finalized?: boolean
          section?: string
          semester?: number
          session_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_ids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_ids: {
        Row: {
          created_at: string
          department_id: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_ids_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_semesters: {
        Row: {
          batch_id_ref: string
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          semester_number: number
          updated_at: string
        }
        Insert: {
          batch_id_ref: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          semester_number: number
          updated_at?: string
        }
        Update: {
          batch_id_ref?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          semester_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      batches: {
        Row: {
          batch_id_ref: string
          created_at: string
          end_year: number
          id: string
          is_archived: boolean
          start_year: number
          updated_at: string
        }
        Insert: {
          batch_id_ref: string
          created_at?: string
          end_year: number
          id?: string
          is_archived?: boolean
          start_year: number
          updated_at?: string
        }
        Update: {
          batch_id_ref?: string
          created_at?: string
          end_year?: number
          id?: string
          is_archived?: boolean
          start_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_batch_id_ref_fkey"
            columns: ["batch_id_ref"]
            isOneToOne: false
            referencedRelation: "batch_ids"
            referencedColumns: ["id"]
          },
        ]
      }
      community_bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_hidden: boolean
          likes_count: number
          parent_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          likes_count?: number
          parent_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          likes_count?: number
          parent_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          audience: Database["public"]["Enums"]["post_audience"]
          author_id: string
          batch_id: string | null
          comments_count: number
          content: string
          created_at: string
          department_id: string | null
          id: string
          images: string[] | null
          is_hidden: boolean
          is_pinned: boolean
          likes_count: number
          tags: Database["public"]["Enums"]["post_tag"][] | null
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["post_audience"]
          author_id: string
          batch_id?: string | null
          comments_count?: number
          content: string
          created_at?: string
          department_id?: string | null
          id?: string
          images?: string[] | null
          is_hidden?: boolean
          is_pinned?: boolean
          likes_count?: number
          tags?: Database["public"]["Enums"]["post_tag"][] | null
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["post_audience"]
          author_id?: string
          batch_id?: string | null
          comments_count?: number
          content?: string
          created_at?: string
          department_id?: string | null
          id?: string
          images?: string[] | null
          is_hidden?: boolean
          is_pinned?: boolean
          likes_count?: number
          tags?: Database["public"]["Enums"]["post_tag"][] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credits: number
          department_id: string | null
          description: string | null
          id: string
          name: string
          semester: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          credits?: number
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          semester: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          semester?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_sections: {
        Row: {
          created_at: string
          id: string
          name: string
          semester_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          semester_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          semester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_sections_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "department_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      department_semesters: {
        Row: {
          created_at: string
          department_id: string
          id: string
          number: number
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          number: number
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          number?: number
        }
        Relationships: [
          {
            foreignKeyName: "department_semesters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      faculty_subject_mapping: {
        Row: {
          academic_year: string
          assigned_at: string
          course_id: string
          department_id: string
          faculty_id: string
          id: string
          is_active: boolean
          section: string | null
          semester: number
        }
        Insert: {
          academic_year: string
          assigned_at?: string
          course_id: string
          department_id: string
          faculty_id: string
          id?: string
          is_active?: boolean
          section?: string | null
          semester: number
        }
        Update: {
          academic_year?: string
          assigned_at?: string
          course_id?: string
          department_id?: string
          faculty_id?: string
          id?: string
          is_active?: boolean
          section?: string | null
          semester?: number
        }
        Relationships: [
          {
            foreignKeyName: "faculty_subject_mapping_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_subject_mapping_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_subject_mapping_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_department_mapping: {
        Row: {
          assigned_at: string
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_department_mapping_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_department_mapping_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_logs: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          job_id: string
          new_status: Database["public"]["Enums"]["job_approval_status"]
          previous_status:
            | Database["public"]["Enums"]["job_approval_status"]
            | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          job_id: string
          new_status: Database["public"]["Enums"]["job_approval_status"]
          previous_status?:
            | Database["public"]["Enums"]["job_approval_status"]
            | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          job_id?: string
          new_status?: Database["public"]["Enums"]["job_approval_status"]
          previous_status?:
            | Database["public"]["Enums"]["job_approval_status"]
            | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_status_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "placement_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_drives: {
        Row: {
          company_name: string
          created_at: string
          drive_date: string
          end_date: string | null
          id: string
          job_id: string | null
          notes: string | null
          reminder_sent: boolean | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          drive_date: string
          end_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          drive_date?: string
          end_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_drives_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "placement_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_jobs: {
        Row: {
          ai_risk_level: Database["public"]["Enums"]["ai_risk_level"] | null
          bond_details: string | null
          created_at: string
          created_by: string | null
          ctc_fixed: number | null
          ctc_total: number | null
          ctc_variable: number | null
          deadline: string | null
          eligible_branches: string[] | null
          eligible_years: number[] | null
          hold_remarks: string | null
          id: string
          jd_attachment_url: string | null
          job_type: string
          location: string | null
          min_cgpa: number | null
          posted_date: string
          recruiter_id: string
          rejection_reason: string | null
          role_description: string | null
          role_title: string
          selected_count: number | null
          selection_rounds: string[] | null
          shortlisted_count: number | null
          skills_required: string[] | null
          status: Database["public"]["Enums"]["job_approval_status"]
          total_applications: number | null
          updated_at: string
          vacancies: number | null
        }
        Insert: {
          ai_risk_level?: Database["public"]["Enums"]["ai_risk_level"] | null
          bond_details?: string | null
          created_at?: string
          created_by?: string | null
          ctc_fixed?: number | null
          ctc_total?: number | null
          ctc_variable?: number | null
          deadline?: string | null
          eligible_branches?: string[] | null
          eligible_years?: number[] | null
          hold_remarks?: string | null
          id?: string
          jd_attachment_url?: string | null
          job_type?: string
          location?: string | null
          min_cgpa?: number | null
          posted_date?: string
          recruiter_id: string
          rejection_reason?: string | null
          role_description?: string | null
          role_title: string
          selected_count?: number | null
          selection_rounds?: string[] | null
          shortlisted_count?: number | null
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["job_approval_status"]
          total_applications?: number | null
          updated_at?: string
          vacancies?: number | null
        }
        Update: {
          ai_risk_level?: Database["public"]["Enums"]["ai_risk_level"] | null
          bond_details?: string | null
          created_at?: string
          created_by?: string | null
          ctc_fixed?: number | null
          ctc_total?: number | null
          ctc_variable?: number | null
          deadline?: string | null
          eligible_branches?: string[] | null
          eligible_years?: number[] | null
          hold_remarks?: string | null
          id?: string
          jd_attachment_url?: string | null
          job_type?: string
          location?: string | null
          min_cgpa?: number | null
          posted_date?: string
          recruiter_id?: string
          rejection_reason?: string | null
          role_description?: string | null
          role_title?: string
          selected_count?: number | null
          selection_rounds?: string[] | null
          shortlisted_count?: number | null
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["job_approval_status"]
          total_applications?: number | null
          updated_at?: string
          vacancies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "placement_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_jobs_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiters"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_job_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_job_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_job_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_notifications_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "placement_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      principal_department_mapping: {
        Row: {
          assigned_at: string
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "principal_department_mapping_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "principal_department_mapping_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      recruiters: {
        Row: {
          company_industry: string | null
          company_location: string | null
          company_logo_url: string | null
          company_name: string
          company_website: string | null
          created_at: string
          designation: string | null
          email: string
          id: string
          is_verified: boolean
          linkedin_url: string | null
          name: string
          phone: string | null
          rating: number | null
          trust_score: number | null
          updated_at: string
        }
        Insert: {
          company_industry?: string | null
          company_location?: string | null
          company_logo_url?: string | null
          company_name: string
          company_website?: string | null
          created_at?: string
          designation?: string | null
          email: string
          id?: string
          is_verified?: boolean
          linkedin_url?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          trust_score?: number | null
          updated_at?: string
        }
        Update: {
          company_industry?: string | null
          company_location?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_website?: string | null
          created_at?: string
          designation?: string | null
          email?: string
          id?: string
          is_verified?: boolean
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          trust_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      student_applications: {
        Row: {
          branch: string | null
          cgpa: number | null
          created_at: string
          ctc_offered: number | null
          id: string
          interview_round: string | null
          job_id: string
          joining_date: string | null
          offer_status: string | null
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          cgpa?: number | null
          created_at?: string
          ctc_offered?: number | null
          id?: string
          interview_round?: string | null
          job_id: string
          joining_date?: string | null
          offer_status?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
          student_name: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          cgpa?: number | null
          created_at?: string
          ctc_offered?: number | null
          id?: string
          interview_round?: string | null
          job_id?: string
          joining_date?: string | null
          offer_status?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "placement_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_semester_mapping: {
        Row: {
          academic_year: string
          department_id: string
          enrollment_date: string
          id: string
          is_active: boolean
          semester: number
          student_id: string
        }
        Insert: {
          academic_year: string
          department_id: string
          enrollment_date?: string
          id?: string
          is_active?: boolean
          semester: number
          student_id: string
        }
        Update: {
          academic_year?: string
          department_id?: string
          enrollment_date?: string
          id?: string
          is_active?: boolean
          semester?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_semester_mapping_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_semester_mapping_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subtopic_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          subject_id: string
          subtopic_id: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          subject_id: string
          subtopic_id: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          subject_id?: string
          subtopic_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      ai_risk_level: "low" | "medium" | "high"
      announcement_category: "college" | "department"
      announcement_priority: "normal" | "important" | "urgent"
      app_role:
        | "admin"
        | "faculty"
        | "student"
        | "hod"
        | "principal"
        | "college_admin"
        | "placement_officer"
      application_status:
        | "applied"
        | "shortlisted"
        | "interview"
        | "selected"
        | "rejected"
        | "offer_accepted"
        | "offer_declined"
      job_approval_status: "pending" | "approved" | "rejected" | "hold"
      post_audience: "college" | "department" | "batch"
      post_tag: "exam" | "event" | "doubt" | "placement" | "general"
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
      ai_risk_level: ["low", "medium", "high"],
      announcement_category: ["college", "department"],
      announcement_priority: ["normal", "important", "urgent"],
      app_role: [
        "admin",
        "faculty",
        "student",
        "hod",
        "principal",
        "college_admin",
        "placement_officer",
      ],
      application_status: [
        "applied",
        "shortlisted",
        "interview",
        "selected",
        "rejected",
        "offer_accepted",
        "offer_declined",
      ],
      job_approval_status: ["pending", "approved", "rejected", "hold"],
      post_audience: ["college", "department", "batch"],
      post_tag: ["exam", "event", "doubt", "placement", "general"],
    },
  },
} as const
