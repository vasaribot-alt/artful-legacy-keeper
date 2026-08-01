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
      alliance_outreach_targets: {
        Row: {
          assigned_to: string | null
          category: string
          contact_email: string | null
          contact_person: string | null
          contact_title: string | null
          country: string | null
          created_at: string
          decision_maker_research: string | null
          email_body: string | null
          email_generated_at: string | null
          email_subject: string | null
          id: string
          last_contacted_at: string | null
          name: string
          notes: string | null
          research_at: string | null
          status: string
          tag: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_title?: string | null
          country?: string | null
          created_at?: string
          decision_maker_research?: string | null
          email_body?: string | null
          email_generated_at?: string | null
          email_subject?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          research_at?: string | null
          status?: string
          tag?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_title?: string | null
          country?: string | null
          created_at?: string
          decision_maker_research?: string | null
          email_body?: string | null
          email_generated_at?: string | null
          email_subject?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          research_at?: string | null
          status?: string
          tag?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      artist_invites: {
        Row: {
          added_by: string
          artist_name: string
          bio: string | null
          birth_year: number | null
          born: number | null
          city: string | null
          country: string | null
          created_at: string
          cv_text: string | null
          died: number | null
          email: string | null
          email_draft: string | null
          enriched_at: string | null
          enrichment_sources: Json | null
          enrichment_status: string | null
          galleries: string[] | null
          id: string
          invite_code_id: string | null
          notes: string | null
          phone: string | null
          ranking: string | null
          social_links: Json | null
          status: string
          studio_address: string | null
          tier: Database["public"]["Enums"]["founding_artist_tier"]
          website: string | null
        }
        Insert: {
          added_by: string
          artist_name: string
          bio?: string | null
          birth_year?: number | null
          born?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          cv_text?: string | null
          died?: number | null
          email?: string | null
          email_draft?: string | null
          enriched_at?: string | null
          enrichment_sources?: Json | null
          enrichment_status?: string | null
          galleries?: string[] | null
          id?: string
          invite_code_id?: string | null
          notes?: string | null
          phone?: string | null
          ranking?: string | null
          social_links?: Json | null
          status?: string
          studio_address?: string | null
          tier?: Database["public"]["Enums"]["founding_artist_tier"]
          website?: string | null
        }
        Update: {
          added_by?: string
          artist_name?: string
          bio?: string | null
          birth_year?: number | null
          born?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          cv_text?: string | null
          died?: number | null
          email?: string | null
          email_draft?: string | null
          enriched_at?: string | null
          enrichment_sources?: Json | null
          enrichment_status?: string | null
          galleries?: string[] | null
          id?: string
          invite_code_id?: string | null
          notes?: string | null
          phone?: string | null
          ranking?: string | null
          social_links?: Json | null
          status?: string
          studio_address?: string | null
          tier?: Database["public"]["Enums"]["founding_artist_tier"]
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_invites_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_catalogues: {
        Row: {
          artwork_id: string
          catalogue_id: string
          created_at: string
          id: string
          page_reference: string | null
        }
        Insert: {
          artwork_id: string
          catalogue_id: string
          created_at?: string
          id?: string
          page_reference?: string | null
        }
        Update: {
          artwork_id?: string
          catalogue_id?: string
          created_at?: string
          id?: string
          page_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artwork_catalogues_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_catalogues_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "catalogues"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_documents: {
        Row: {
          artwork_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_documents_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_exhibitions: {
        Row: {
          artwork_id: string
          created_at: string
          cv_entry_id: string
          id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          cv_entry_id: string
          id?: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          cv_entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_exhibitions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_exhibitions_cv_entry_id_fkey"
            columns: ["cv_entry_id"]
            isOneToOne: false
            referencedRelation: "cv_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_images: {
        Row: {
          artwork_id: string
          created_at: string
          display_order: number
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          original_size: number | null
          storage_path: string
          web_storage_path: string | null
          width: number | null
        }
        Insert: {
          artwork_id: string
          created_at?: string
          display_order?: number
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_size?: number | null
          storage_path: string
          web_storage_path?: string | null
          width?: number | null
        }
        Update: {
          artwork_id?: string
          created_at?: string
          display_order?: number
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_size?: number | null
          storage_path?: string
          web_storage_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artwork_images_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_location_history: {
        Row: {
          artwork_id: string
          created_at: string
          id: string
          location: string
          moved_by: string | null
          moved_date: string | null
          notes: string | null
          reason: string | null
          to_box: string | null
          to_cabinet: string | null
          to_facility: string | null
          to_room: string | null
          to_shelf: string | null
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          location: string
          moved_by?: string | null
          moved_date?: string | null
          notes?: string | null
          reason?: string | null
          to_box?: string | null
          to_cabinet?: string | null
          to_facility?: string | null
          to_room?: string | null
          to_shelf?: string | null
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          location?: string
          moved_by?: string | null
          moved_date?: string | null
          notes?: string | null
          reason?: string | null
          to_box?: string | null
          to_cabinet?: string | null
          to_facility?: string | null
          to_room?: string | null
          to_shelf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artwork_location_history_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_match_suggestions: {
        Row: {
          artwork_id: string
          confidence: number
          created_at: string
          crop_height: number | null
          crop_width: number | null
          crop_x: number | null
          crop_y: number | null
          exhibition_id: string
          exhibition_image_id: string
          id: string
          owner_id: string
          reasoning: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          artwork_id: string
          confidence: number
          created_at?: string
          crop_height?: number | null
          crop_width?: number | null
          crop_x?: number | null
          crop_y?: number | null
          exhibition_id: string
          exhibition_image_id: string
          id?: string
          owner_id: string
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          artwork_id?: string
          confidence?: number
          created_at?: string
          crop_height?: number | null
          crop_width?: number | null
          crop_x?: number | null
          crop_y?: number | null
          exhibition_id?: string
          exhibition_image_id?: string
          id?: string
          owner_id?: string
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_match_suggestions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_match_suggestions_exhibition_id_fkey"
            columns: ["exhibition_id"]
            isOneToOne: false
            referencedRelation: "exhibitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_match_suggestions_exhibition_image_id_fkey"
            columns: ["exhibition_image_id"]
            isOneToOne: false
            referencedRelation: "exhibition_images"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_sizes: {
        Row: {
          artist_proofs: number
          artwork_id: string
          created_at: string
          currency: string | null
          edition_count: number
          height: number | null
          id: string
          price: number | null
          size_label: string
          width: number | null
        }
        Insert: {
          artist_proofs?: number
          artwork_id: string
          created_at?: string
          currency?: string | null
          edition_count?: number
          height?: number | null
          id?: string
          price?: number | null
          size_label: string
          width?: number | null
        }
        Update: {
          artist_proofs?: number
          artwork_id?: string
          created_at?: string
          currency?: string | null
          edition_count?: number
          height?: number | null
          id?: string
          price?: number | null
          size_label?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artwork_sizes_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      artworks: {
        Row: {
          acquisition_cost: number | null
          ai_described_at: string | null
          ai_description: string | null
          appraised_at: string | null
          appraised_by: string | null
          appraised_value: number | null
          artist_name: string | null
          artist_proofs: number | null
          artwork_location: string | null
          artwork_type: string | null
          buyer_name: string | null
          catalogue_number: string | null
          cr_number: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          current_market_value: number | null
          decline_reason: string | null
          depth: number | null
          description: string | null
          dimensions: string | null
          edition_count: number | null
          edition_number: string | null
          env_humidity_note: string | null
          env_light_note: string | null
          env_temperature_note: string | null
          estimated_value: number | null
          exhibition_history: string | null
          global_artwork_id: number
          hazard_notes: string | null
          height: number | null
          id: string
          image_url: string | null
          is_unique: boolean
          last_sold_at: string | null
          last_sold_price: number | null
          location_box: string | null
          location_cabinet: string | null
          location_facility: string | null
          location_room: string | null
          location_shelf: string | null
          medium: string | null
          original_retail_price: number | null
          owner_id: string
          price: number | null
          provenance: string | null
          purchase_price: number | null
          replacement_value: number | null
          reserve_price: number | null
          restoration_cost: number | null
          role_context: string
          series: string | null
          signed: string | null
          sold_date: string | null
          status: string
          sub_category: string | null
          support: string | null
          title: string
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          weight: number | null
          width: number | null
          year: number | null
        }
        Insert: {
          acquisition_cost?: number | null
          ai_described_at?: string | null
          ai_description?: string | null
          appraised_at?: string | null
          appraised_by?: string | null
          appraised_value?: number | null
          artist_name?: string | null
          artist_proofs?: number | null
          artwork_location?: string | null
          artwork_type?: string | null
          buyer_name?: string | null
          catalogue_number?: string | null
          cr_number?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_market_value?: number | null
          decline_reason?: string | null
          depth?: number | null
          description?: string | null
          dimensions?: string | null
          edition_count?: number | null
          edition_number?: string | null
          env_humidity_note?: string | null
          env_light_note?: string | null
          env_temperature_note?: string | null
          estimated_value?: number | null
          exhibition_history?: string | null
          global_artwork_id?: number
          hazard_notes?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_unique?: boolean
          last_sold_at?: string | null
          last_sold_price?: number | null
          location_box?: string | null
          location_cabinet?: string | null
          location_facility?: string | null
          location_room?: string | null
          location_shelf?: string | null
          medium?: string | null
          original_retail_price?: number | null
          owner_id: string
          price?: number | null
          provenance?: string | null
          purchase_price?: number | null
          replacement_value?: number | null
          reserve_price?: number | null
          restoration_cost?: number | null
          role_context?: string
          series?: string | null
          signed?: string | null
          sold_date?: string | null
          status?: string
          sub_category?: string | null
          support?: string | null
          title: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          weight?: number | null
          width?: number | null
          year?: number | null
        }
        Update: {
          acquisition_cost?: number | null
          ai_described_at?: string | null
          ai_description?: string | null
          appraised_at?: string | null
          appraised_by?: string | null
          appraised_value?: number | null
          artist_name?: string | null
          artist_proofs?: number | null
          artwork_location?: string | null
          artwork_type?: string | null
          buyer_name?: string | null
          catalogue_number?: string | null
          cr_number?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_market_value?: number | null
          decline_reason?: string | null
          depth?: number | null
          description?: string | null
          dimensions?: string | null
          edition_count?: number | null
          edition_number?: string | null
          env_humidity_note?: string | null
          env_light_note?: string | null
          env_temperature_note?: string | null
          estimated_value?: number | null
          exhibition_history?: string | null
          global_artwork_id?: number
          hazard_notes?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_unique?: boolean
          last_sold_at?: string | null
          last_sold_price?: number | null
          location_box?: string | null
          location_cabinet?: string | null
          location_facility?: string | null
          location_room?: string | null
          location_shelf?: string | null
          medium?: string | null
          original_retail_price?: number | null
          owner_id?: string
          price?: number | null
          provenance?: string | null
          purchase_price?: number | null
          replacement_value?: number | null
          reserve_price?: number | null
          restoration_cost?: number | null
          role_context?: string
          series?: string | null
          signed?: string | null
          sold_date?: string | null
          status?: string
          sub_category?: string | null
          support?: string | null
          title?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          weight?: number | null
          width?: number | null
          year?: number | null
        }
        Relationships: []
      }
      catalogues: {
        Row: {
          authors: string | null
          cover_file_size: number | null
          cover_image_path: string | null
          created_at: string
          id: string
          isbn: string | null
          language: string | null
          page_count: number | null
          publication_year: number | null
          publisher: string | null
          title: string
          user_id: string
        }
        Insert: {
          authors?: string | null
          cover_file_size?: number | null
          cover_image_path?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          language?: string | null
          page_count?: number | null
          publication_year?: number | null
          publisher?: string | null
          title: string
          user_id: string
        }
        Update: {
          authors?: string | null
          cover_file_size?: number | null
          cover_image_path?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          language?: string | null
          page_count?: number | null
          publication_year?: number | null
          publisher?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      collector_facilities: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cr_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          payload: Json | null
          submission_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          submission_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cr_audit_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cr_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cr_committee_members: {
        Row: {
          affiliation: string | null
          artist_user_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          role: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          affiliation?: string | null
          artist_user_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          affiliation?: string | null
          artist_user_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cr_committee_votes: {
        Row: {
          created_at: string
          id: string
          note: string | null
          submission_id: string
          updated_at: string
          vote: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          submission_id: string
          updated_at?: string
          vote: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          submission_id?: string
          updated_at?: string
          vote?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cr_committee_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cr_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cr_submission_images: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          storage_path: string
          submission_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          storage_path: string
          submission_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cr_submission_images_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cr_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cr_submissions: {
        Row: {
          artist_owner_id: string
          condition_notes: string | null
          cr_number: number | null
          created_at: string
          decision_at: string | null
          decision_by: string | null
          depth: number | null
          height: number | null
          id: string
          medium: string | null
          owner_contact: string | null
          provenance: string | null
          public_token: string
          rejection_notes: string | null
          rejection_reason: string | null
          resulting_artwork_id: string | null
          status: string
          submitted_by: string | null
          submitter_email: string | null
          submitter_name: string | null
          title: string
          updated_at: string
          width: number | null
          year_estimated: string | null
        }
        Insert: {
          artist_owner_id: string
          condition_notes?: string | null
          cr_number?: number | null
          created_at?: string
          decision_at?: string | null
          decision_by?: string | null
          depth?: number | null
          height?: number | null
          id?: string
          medium?: string | null
          owner_contact?: string | null
          provenance?: string | null
          public_token?: string
          rejection_notes?: string | null
          rejection_reason?: string | null
          resulting_artwork_id?: string | null
          status?: string
          submitted_by?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          title: string
          updated_at?: string
          width?: number | null
          year_estimated?: string | null
        }
        Update: {
          artist_owner_id?: string
          condition_notes?: string | null
          cr_number?: number | null
          created_at?: string
          decision_at?: string | null
          decision_by?: string | null
          depth?: number | null
          height?: number | null
          id?: string
          medium?: string | null
          owner_contact?: string | null
          provenance?: string | null
          public_token?: string
          rejection_notes?: string | null
          rejection_reason?: string | null
          resulting_artwork_id?: string | null
          status?: string
          submitted_by?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          title?: string
          updated_at?: string
          width?: number | null
          year_estimated?: string | null
        }
        Relationships: []
      }
      cv_entries: {
        Row: {
          created_at: string
          display_order: number
          entry_text: string
          id: string
          profile_id: string
          section: string
          year: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          entry_text?: string
          id?: string
          profile_id: string
          section?: string
          year?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          entry_text?: string
          id?: string
          profile_id?: string
          section?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_entry_images: {
        Row: {
          caption: string | null
          created_at: string
          cv_entry_id: string
          display_order: number
          file_size: number | null
          id: string
          mime_type: string | null
          original_size: number | null
          storage_path: string
          web_storage_path: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          cv_entry_id: string
          display_order?: number
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_size?: number | null
          storage_path: string
          web_storage_path?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          cv_entry_id?: string
          display_order?: number
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_size?: number | null
          storage_path?: string
          web_storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_entry_images_cv_entry_id_fkey"
            columns: ["cv_entry_id"]
            isOneToOne: false
            referencedRelation: "cv_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_subscriptions: {
        Row: {
          amount_cents: number | null
          cancel_at_period_end: boolean | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          kind: string
          price_id: string
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          kind: string
          price_id: string
          product_id?: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          kind?: string
          price_id?: string
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          donor_name: string | null
          email: string | null
          environment: string
          id: string
          kind: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          donor_name?: string | null
          email?: string | null
          environment?: string
          id?: string
          kind: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          donor_name?: string | null
          email?: string | null
          environment?: string
          id?: string
          kind?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      donors: {
        Row: {
          added_by: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_public: boolean
          message: string | null
          tier: Database["public"]["Enums"]["donor_tier"]
        }
        Insert: {
          added_by: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_public?: boolean
          message?: string | null
          tier?: Database["public"]["Enums"]["donor_tier"]
        }
        Update: {
          added_by?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_public?: boolean
          message?: string | null
          tier?: Database["public"]["Enums"]["donor_tier"]
        }
        Relationships: []
      }
      edition_items: {
        Row: {
          artwork_location: string | null
          artwork_size_id: string
          buyer_name: string | null
          created_at: string
          edition_label: string
          id: string
          is_ap: boolean
          provenance: string | null
          sold_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          artwork_location?: string | null
          artwork_size_id: string
          buyer_name?: string | null
          created_at?: string
          edition_label: string
          id?: string
          is_ap?: boolean
          provenance?: string | null
          sold_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          artwork_location?: string | null
          artwork_size_id?: string
          buyer_name?: string | null
          created_at?: string
          edition_label?: string
          id?: string
          is_ap?: boolean
          provenance?: string | null
          sold_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edition_items_artwork_size_id_fkey"
            columns: ["artwork_size_id"]
            isOneToOne: false
            referencedRelation: "artwork_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      exhibition_artworks: {
        Row: {
          artwork_id: string
          created_at: string
          exhibition_id: string
          id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          exhibition_id: string
          id?: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          exhibition_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_artworks_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_artworks_exhibition_id_fkey"
            columns: ["exhibition_id"]
            isOneToOne: false
            referencedRelation: "exhibitions"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibition_documents: {
        Row: {
          created_at: string
          exhibition_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          exhibition_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          exhibition_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_documents_exhibition_id_fkey"
            columns: ["exhibition_id"]
            isOneToOne: false
            referencedRelation: "exhibitions"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibition_images: {
        Row: {
          ai_described_at: string | null
          ai_description: string | null
          caption: string | null
          created_at: string
          display_order: number
          exhibition_id: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          original_size: number | null
          storage_path: string
          web_storage_path: string | null
          width: number | null
        }
        Insert: {
          ai_described_at?: string | null
          ai_description?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          exhibition_id: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_size?: number | null
          storage_path: string
          web_storage_path?: string | null
          width?: number | null
        }
        Update: {
          ai_described_at?: string | null
          ai_description?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          exhibition_id?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_size?: number | null
          storage_path?: string
          web_storage_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_images_exhibition_id_fkey"
            columns: ["exhibition_id"]
            isOneToOne: false
            referencedRelation: "exhibitions"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitions: {
        Row: {
          artists: string | null
          city: string | null
          closing_date: string | null
          country: string | null
          created_at: string
          curator: string | null
          description: string | null
          exhibition_text: string | null
          exhibition_type: string
          hide_from_cv: boolean
          id: string
          opening_date: string | null
          title: string
          updated_at: string
          user_id: string
          venue: string | null
        }
        Insert: {
          artists?: string | null
          city?: string | null
          closing_date?: string | null
          country?: string | null
          created_at?: string
          curator?: string | null
          description?: string | null
          exhibition_text?: string | null
          exhibition_type?: string
          hide_from_cv?: boolean
          id?: string
          opening_date?: string | null
          title: string
          updated_at?: string
          user_id: string
          venue?: string | null
        }
        Update: {
          artists?: string | null
          city?: string | null
          closing_date?: string | null
          country?: string | null
          created_at?: string
          curator?: string | null
          description?: string | null
          exhibition_text?: string | null
          exhibition_type?: string
          hide_from_cv?: boolean
          id?: string
          opening_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          venue?: string | null
        }
        Relationships: []
      }
      foundation_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          id: string
          share_token: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string | null
          id?: string
          share_token?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          id?: string
          share_token?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      founding_artists: {
        Row: {
          id: string
          invite_code_id: string | null
          joined_at: string
          tier: Database["public"]["Enums"]["founding_artist_tier"]
          user_id: string
        }
        Insert: {
          id?: string
          invite_code_id?: string | null
          joined_at?: string
          tier: Database["public"]["Enums"]["founding_artist_tier"]
          user_id: string
        }
        Update: {
          id?: string
          invite_code_id?: string | null
          joined_at?: string
          tier?: Database["public"]["Enums"]["founding_artist_tier"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founding_artists_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_supporter_applications: {
        Row: {
          anonymous_public: boolean
          applicant_type: Database["public"]["Enums"]["founding_supporter_applicant_type"]
          contact_name: string
          country: string | null
          created_at: string
          email: string
          followup_at: string | null
          foundation_notes: string | null
          id: string
          message: string | null
          organization_name: string | null
          phone: string | null
          pledge_amount_eur: number | null
          source: string | null
          status: Database["public"]["Enums"]["founding_supporter_status"]
          tier: Database["public"]["Enums"]["founding_supporter_tier"]
          updated_at: string
        }
        Insert: {
          anonymous_public?: boolean
          applicant_type?: Database["public"]["Enums"]["founding_supporter_applicant_type"]
          contact_name: string
          country?: string | null
          created_at?: string
          email: string
          followup_at?: string | null
          foundation_notes?: string | null
          id?: string
          message?: string | null
          organization_name?: string | null
          phone?: string | null
          pledge_amount_eur?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["founding_supporter_status"]
          tier?: Database["public"]["Enums"]["founding_supporter_tier"]
          updated_at?: string
        }
        Update: {
          anonymous_public?: boolean
          applicant_type?: Database["public"]["Enums"]["founding_supporter_applicant_type"]
          contact_name?: string
          country?: string | null
          created_at?: string
          email?: string
          followup_at?: string | null
          foundation_notes?: string | null
          id?: string
          message?: string | null
          organization_name?: string | null
          phone?: string | null
          pledge_amount_eur?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["founding_supporter_status"]
          tier?: Database["public"]["Enums"]["founding_supporter_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      galleries: {
        Row: {
          city: string | null
          contact_name: string | null
          contact_title: string | null
          country: string | null
          created_at: string
          email: string | null
          enrichment_attempted_at: string | null
          enrichment_notes: string | null
          enrichment_status: string
          established_year: number | null
          id: string
          name: string
          phone: string | null
          rank: number | null
          website: string | null
        }
        Insert: {
          city?: string | null
          contact_name?: string | null
          contact_title?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          enrichment_attempted_at?: string | null
          enrichment_notes?: string | null
          enrichment_status?: string
          established_year?: number | null
          id?: string
          name: string
          phone?: string | null
          rank?: number | null
          website?: string | null
        }
        Update: {
          city?: string | null
          contact_name?: string | null
          contact_title?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          enrichment_attempted_at?: string | null
          enrichment_notes?: string | null
          enrichment_status?: string
          established_year?: number | null
          id?: string
          name?: string
          phone?: string | null
          rank?: number | null
          website?: string | null
        }
        Relationships: []
      }
      gallery_outreach: {
        Row: {
          assigned_to: string | null
          campaign_tag: string | null
          contact_name: string | null
          contact_title: string | null
          created_at: string
          email_body: string | null
          email_generated_at: string | null
          email_subject: string | null
          first_contacted_at: string | null
          gallery_id: string
          id: string
          last_contacted_at: string | null
          replied_at: string | null
          reply_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          campaign_tag?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          email_body?: string | null
          email_generated_at?: string | null
          email_subject?: string | null
          first_contacted_at?: string | null
          gallery_id: string
          id?: string
          last_contacted_at?: string | null
          replied_at?: string | null
          reply_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          campaign_tag?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          email_body?: string | null
          email_generated_at?: string | null
          email_subject?: string | null
          first_contacted_at?: string | null
          gallery_id?: string
          id?: string
          last_contacted_at?: string | null
          replied_at?: string | null
          reply_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_outreach_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      global_alliance_members: {
        Row: {
          category: string
          consent_contact: boolean
          country: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          institution: string | null
          internal_notes: string | null
          linkedin: string | null
          message: string | null
          referral_source: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_title: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          category: string
          consent_contact?: boolean
          country?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          institution?: string | null
          internal_notes?: string | null
          linkedin?: string | null
          message?: string | null
          referral_source?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string
          consent_contact?: boolean
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          institution?: string | null
          internal_notes?: string | null
          linkedin?: string | null
          message?: string | null
          referral_source?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          tier: Database["public"]["Enums"]["founding_artist_tier"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          tier: Database["public"]["Enums"]["founding_artist_tier"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          tier?: Database["public"]["Enums"]["founding_artist_tier"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      major_gift_inquiries: {
        Row: {
          country: string | null
          created_at: string
          email: string
          estimated_amount_eur: number | null
          full_name: string
          id: string
          intended_frequency: string | null
          internal_notes: string | null
          message: string | null
          organisation: string | null
          phone: string | null
          preferred_contact: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          estimated_amount_eur?: number | null
          full_name: string
          id?: string
          intended_frequency?: string | null
          internal_notes?: string | null
          message?: string | null
          organisation?: string | null
          phone?: string | null
          preferred_contact?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          estimated_amount_eur?: number | null
          full_name?: string
          id?: string
          intended_frequency?: string | null
          internal_notes?: string | null
          message?: string | null
          organisation?: string | null
          phone?: string | null
          preferred_contact?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      peer_invites: {
        Row: {
          created_at: string
          id: string
          invite_code_id: string | null
          invitee_email: string | null
          invitee_name: string
          inviter_id: string
          personal_message: string | null
          redeemed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code_id?: string | null
          invitee_email?: string | null
          invitee_name: string
          inviter_id: string
          personal_message?: string | null
          redeemed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code_id?: string | null
          invitee_email?: string | null
          invitee_name?: string
          inviter_id?: string
          personal_message?: string | null
          redeemed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_invites_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_artworks: {
        Row: {
          artwork_id: string
          created_at: string
          display_order: number
          id: string
          portfolio_id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          display_order?: number
          id?: string
          portfolio_id: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          display_order?: number
          id?: string
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_artworks_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_artworks_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          id: string
          name: string
          role_context: string
          share_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          role_context?: string
          share_token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role_context?: string
          share_token?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          biography: string | null
          birth_country: string | null
          birth_year: number | null
          bonus_invites: number
          chronology: string | null
          city: string | null
          committee_connected: boolean
          committee_quorum: number
          contact_visibility: Json
          contacts: string | null
          country: string | null
          cr_compilers: string | null
          cr_contact_email: string | null
          cr_first_volume_year: number | null
          cr_isbn: string | null
          cr_listed: boolean
          cr_publisher: string | null
          cr_scope: string | null
          cr_sponsor: string | null
          cr_status: string | null
          cr_website_url: string | null
          created_at: string
          cv: string | null
          death_country: string | null
          death_year: number | null
          email: string | null
          full_name: string | null
          galleries: Json | null
          global_artist_id: number
          id: string
          id_verified: boolean
          is_deceased: boolean
          lending_notes: string | null
          nationality: string | null
          period_activity_end: number | null
          period_activity_start: number | null
          phone: string | null
          phone_prefix: string | null
          social_media_links: Json | null
          studio_address: string | null
          unit_preference: string
          updated_at: string
          updated_by: string | null
          user_id: string
          verification_status: string
          verified_at: string | null
          website: string | null
          willing_to_lend: boolean
        }
        Insert: {
          avatar_url?: string | null
          biography?: string | null
          birth_country?: string | null
          birth_year?: number | null
          bonus_invites?: number
          chronology?: string | null
          city?: string | null
          committee_connected?: boolean
          committee_quorum?: number
          contact_visibility?: Json
          contacts?: string | null
          country?: string | null
          cr_compilers?: string | null
          cr_contact_email?: string | null
          cr_first_volume_year?: number | null
          cr_isbn?: string | null
          cr_listed?: boolean
          cr_publisher?: string | null
          cr_scope?: string | null
          cr_sponsor?: string | null
          cr_status?: string | null
          cr_website_url?: string | null
          created_at?: string
          cv?: string | null
          death_country?: string | null
          death_year?: number | null
          email?: string | null
          full_name?: string | null
          galleries?: Json | null
          global_artist_id?: number
          id?: string
          id_verified?: boolean
          is_deceased?: boolean
          lending_notes?: string | null
          nationality?: string | null
          period_activity_end?: number | null
          period_activity_start?: number | null
          phone?: string | null
          phone_prefix?: string | null
          social_media_links?: Json | null
          studio_address?: string | null
          unit_preference?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          verification_status?: string
          verified_at?: string | null
          website?: string | null
          willing_to_lend?: boolean
        }
        Update: {
          avatar_url?: string | null
          biography?: string | null
          birth_country?: string | null
          birth_year?: number | null
          bonus_invites?: number
          chronology?: string | null
          city?: string | null
          committee_connected?: boolean
          committee_quorum?: number
          contact_visibility?: Json
          contacts?: string | null
          country?: string | null
          cr_compilers?: string | null
          cr_contact_email?: string | null
          cr_first_volume_year?: number | null
          cr_isbn?: string | null
          cr_listed?: boolean
          cr_publisher?: string | null
          cr_scope?: string | null
          cr_sponsor?: string | null
          cr_status?: string | null
          cr_website_url?: string | null
          created_at?: string
          cv?: string | null
          death_country?: string | null
          death_year?: number | null
          email?: string | null
          full_name?: string | null
          galleries?: Json | null
          global_artist_id?: number
          id?: string
          id_verified?: boolean
          is_deceased?: boolean
          lending_notes?: string | null
          nationality?: string | null
          period_activity_end?: number | null
          period_activity_start?: number | null
          phone?: string | null
          phone_prefix?: string | null
          social_media_links?: Json | null
          studio_address?: string | null
          unit_preference?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          website?: string | null
          willing_to_lend?: boolean
        }
        Relationships: []
      }
      registrar_access: {
        Row: {
          granted_at: string
          id: string
          message: string | null
          owner_id: string
          registrar_id: string
          requested_by: string
          status: string
        }
        Insert: {
          granted_at?: string
          id?: string
          message?: string | null
          owner_id: string
          registrar_id: string
          requested_by?: string
          status?: string
        }
        Update: {
          granted_at?: string
          id?: string
          message?: string | null
          owner_id?: string
          registrar_id?: string
          requested_by?: string
          status?: string
        }
        Relationships: []
      }
      series_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      storage_tiers: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          monthly_price_eur: number
          name: string
          quota_bytes: number
          slug: string
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          monthly_price_eur?: number
          name: string
          quota_bytes: number
          slug: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          monthly_price_eur?: number
          name?: string
          quota_bytes?: number
          slug?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tier_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "storage_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_storage_tiers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          tier_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          tier_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_storage_tiers_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "storage_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_uploads: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          note: string | null
          original_size: number | null
          role_context: string
          series: string | null
          storage_path: string
          user_id: string
          web_storage_path: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          note?: string | null
          original_size?: number | null
          role_context?: string
          series?: string | null
          storage_path: string
          user_id: string
          web_storage_path?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          note?: string | null
          original_size?: number | null
          role_context?: string
          series?: string | null
          storage_path?: string
          user_id?: string
          web_storage_path?: string | null
          width?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_upsert_galleries: {
        Args: { _payload: Json }
        Returns: {
          inserted_count: number
          updated_count: number
        }[]
      }
      create_cr_submission: {
        Args: {
          _artist_owner_id: string
          _condition_notes?: string
          _depth?: number
          _height?: number
          _medium?: string
          _owner_contact?: string
          _provenance?: string
          _submitter_email?: string
          _submitter_name?: string
          _title: string
          _width?: number
          _year_estimated?: string
        }
        Returns: string
      }
      create_peer_invite: {
        Args: {
          _invitee_email?: string
          _invitee_name: string
          _personal_message?: string
        }
        Returns: {
          code: string
          invite_id: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_registrar_by_email: { Args: { _email: string }; Returns: string }
      get_cr_submission_status: {
        Args: { _token: string }
        Returns: {
          artist_id: string
          artist_name: string
          cr_number: number
          created_at: string
          decision_at: string
          id: string
          rejection_reason: string
          status: string
          title: string
        }[]
      }
      get_cr_submission_timeline: {
        Args: { _token: string }
        Returns: {
          action: string
          created_at: string
          payload: Json
        }[]
      }
      get_registrar_access_details: {
        Args: { _owner_id: string }
        Returns: {
          access_id: string
          granted_at: string
          registrar_email: string
          registrar_id: string
          registrar_name: string
          status: string
        }[]
      }
      get_registrar_profiles: {
        Args: { _owner_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_shared_portfolio: {
        Args: { _token: string }
        Returns: {
          artwork_id: string
          depth: number
          display_order: number
          height: number
          image_path: string
          medium: string
          portfolio_id: string
          portfolio_name: string
          title: string
          width: number
          year: number
        }[]
      }
      get_user_storage_status: {
        Args: { _user_id: string }
        Returns: {
          file_count: number
          quota_bytes: number
          tier_name: string
          tier_slug: string
          used_bytes: number
        }[]
      }
      get_user_storage_usage: {
        Args: { _user_id: string }
        Returns: {
          bytes: number
          file_count: number
          source: string
        }[]
      }
      has_collector_access: {
        Args: { _env?: string; _user_id: string }
        Returns: boolean
      }
      has_registrar_access: {
        Args: { _owner_id: string; _registrar_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_cr_artist: {
        Args: { _query: string }
        Returns: {
          full_name: string
          global_artist_id: number
          user_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      revoke_peer_invite: { Args: { _invite_id: string }; Returns: undefined }
      validate_invite_code: {
        Args: { _code: string }
        Returns: {
          already_used: boolean
          id: string
          inactive: boolean
          is_valid: boolean
          tier: Database["public"]["Enums"]["founding_artist_tier"]
        }[]
      }
    }
    Enums: {
      app_role: "artist" | "collector" | "registrar" | "foundation"
      donor_tier: "platinum" | "gold" | "silver" | "bronze"
      founding_artist_tier:
        | "internationally_established"
        | "mid_career"
        | "emerging"
        | "peer"
      founding_supporter_applicant_type:
        | "individual"
        | "foundation"
        | "corporation"
      founding_supporter_status:
        | "new"
        | "contacted"
        | "pledged"
        | "gifted"
        | "declined"
      founding_supporter_tier: "bronze" | "silver" | "gold" | "platinum"
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
      app_role: ["artist", "collector", "registrar", "foundation"],
      donor_tier: ["platinum", "gold", "silver", "bronze"],
      founding_artist_tier: [
        "internationally_established",
        "mid_career",
        "emerging",
        "peer",
      ],
      founding_supporter_applicant_type: [
        "individual",
        "foundation",
        "corporation",
      ],
      founding_supporter_status: [
        "new",
        "contacted",
        "pledged",
        "gifted",
        "declined",
      ],
      founding_supporter_tier: ["bronze", "silver", "gold", "platinum"],
    },
  },
} as const
