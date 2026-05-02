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
      artist_invites: {
        Row: {
          added_by: string
          artist_name: string
          birth_year: number | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          invite_code_id: string | null
          notes: string | null
          status: string
          tier: Database["public"]["Enums"]["founding_artist_tier"]
        }
        Insert: {
          added_by: string
          artist_name: string
          birth_year?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invite_code_id?: string | null
          notes?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["founding_artist_tier"]
        }
        Update: {
          added_by?: string
          artist_name?: string
          birth_year?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invite_code_id?: string | null
          notes?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["founding_artist_tier"]
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
          moved_date: string | null
          notes: string | null
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          location: string
          moved_date?: string | null
          notes?: string | null
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          location?: string
          moved_date?: string | null
          notes?: string | null
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
          artist_name: string | null
          artist_proofs: number | null
          artwork_location: string | null
          artwork_type: string | null
          buyer_name: string | null
          catalogue_number: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          depth: number | null
          description: string | null
          dimensions: string | null
          edition_count: number | null
          edition_number: string | null
          exhibition_history: string | null
          global_artwork_id: number
          height: number | null
          id: string
          image_url: string | null
          is_unique: boolean
          medium: string | null
          owner_id: string
          price: number | null
          provenance: string | null
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
          artist_name?: string | null
          artist_proofs?: number | null
          artwork_location?: string | null
          artwork_type?: string | null
          buyer_name?: string | null
          catalogue_number?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          depth?: number | null
          description?: string | null
          dimensions?: string | null
          edition_count?: number | null
          edition_number?: string | null
          exhibition_history?: string | null
          global_artwork_id?: number
          height?: number | null
          id?: string
          image_url?: string | null
          is_unique?: boolean
          medium?: string | null
          owner_id: string
          price?: number | null
          provenance?: string | null
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
          artist_name?: string | null
          artist_proofs?: number | null
          artwork_location?: string | null
          artwork_type?: string | null
          buyer_name?: string | null
          catalogue_number?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          depth?: number | null
          description?: string | null
          dimensions?: string | null
          edition_count?: number | null
          edition_number?: string | null
          exhibition_history?: string | null
          global_artwork_id?: number
          height?: number | null
          id?: string
          image_url?: string | null
          is_unique?: boolean
          medium?: string | null
          owner_id?: string
          price?: number | null
          provenance?: string | null
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
      galleries: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          established_year: number | null
          id: string
          name: string
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          established_year?: number | null
          id?: string
          name: string
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          established_year?: number | null
          id?: string
          name?: string
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
          birth_year: number | null
          chronology: string | null
          city: string | null
          contact_visibility: Json
          contacts: string | null
          country: string | null
          created_at: string
          cv: string | null
          email: string | null
          full_name: string | null
          galleries: Json | null
          global_artist_id: number
          id: string
          id_verified: boolean
          phone: string | null
          phone_prefix: string | null
          social_media_links: Json | null
          studio_address: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          verification_status: string
          verified_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          biography?: string | null
          birth_year?: number | null
          chronology?: string | null
          city?: string | null
          contact_visibility?: Json
          contacts?: string | null
          country?: string | null
          created_at?: string
          cv?: string | null
          email?: string | null
          full_name?: string | null
          galleries?: Json | null
          global_artist_id?: number
          id?: string
          id_verified?: boolean
          phone?: string | null
          phone_prefix?: string | null
          social_media_links?: Json | null
          studio_address?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          verification_status?: string
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          biography?: string | null
          birth_year?: number | null
          chronology?: string | null
          city?: string | null
          contact_visibility?: Json
          contacts?: string | null
          country?: string | null
          created_at?: string
          cv?: string | null
          email?: string | null
          full_name?: string | null
          galleries?: Json | null
          global_artist_id?: number
          id?: string
          id_verified?: boolean
          phone?: string | null
          phone_prefix?: string | null
          social_media_links?: Json | null
          studio_address?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          website?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_registrar_by_email: { Args: { _email: string }; Returns: string }
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
    }
    Enums: {
      app_role: "artist" | "collector" | "registrar" | "foundation"
      donor_tier: "platinum" | "gold" | "silver" | "bronze"
      founding_artist_tier:
        | "internationally_established"
        | "mid_career"
        | "emerging"
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
      ],
    },
  },
} as const
