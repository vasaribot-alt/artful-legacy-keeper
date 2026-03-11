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
      artwork_images: {
        Row: {
          artwork_id: string
          created_at: string
          display_order: number
          id: string
          storage_path: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          display_order?: number
          id?: string
          storage_path: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          display_order?: number
          id?: string
          storage_path?: string
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
      artworks: {
        Row: {
          artist_proofs: number | null
          artwork_location: string | null
          artwork_type: string | null
          catalogue_number: string | null
          created_at: string
          currency: string | null
          depth: number | null
          description: string | null
          dimensions: string | null
          edition_count: number | null
          exhibition_history: string | null
          height: number | null
          id: string
          image_url: string | null
          is_unique: boolean
          medium: string | null
          owner_id: string
          price: number | null
          provenance: string | null
          series: string | null
          signed: string | null
          sub_category: string | null
          support: string | null
          title: string
          updated_at: string
          weight: number | null
          width: number | null
          year: number | null
        }
        Insert: {
          artist_proofs?: number | null
          artwork_location?: string | null
          artwork_type?: string | null
          catalogue_number?: string | null
          created_at?: string
          currency?: string | null
          depth?: number | null
          description?: string | null
          dimensions?: string | null
          edition_count?: number | null
          exhibition_history?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_unique?: boolean
          medium?: string | null
          owner_id: string
          price?: number | null
          provenance?: string | null
          series?: string | null
          signed?: string | null
          sub_category?: string | null
          support?: string | null
          title: string
          updated_at?: string
          weight?: number | null
          width?: number | null
          year?: number | null
        }
        Update: {
          artist_proofs?: number | null
          artwork_location?: string | null
          artwork_type?: string | null
          catalogue_number?: string | null
          created_at?: string
          currency?: string | null
          depth?: number | null
          description?: string | null
          dimensions?: string | null
          edition_count?: number | null
          exhibition_history?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_unique?: boolean
          medium?: string | null
          owner_id?: string
          price?: number | null
          provenance?: string | null
          series?: string | null
          signed?: string | null
          sub_category?: string | null
          support?: string | null
          title?: string
          updated_at?: string
          weight?: number | null
          width?: number | null
          year?: number | null
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
          id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          cv_entry_id: string
          display_order?: number
          id?: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          cv_entry_id?: string
          display_order?: number
          id?: string
          storage_path?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          biography: string | null
          birth_year: number | null
          chronology: string | null
          city: string | null
          contacts: string | null
          country: string | null
          created_at: string
          cv: string | null
          full_name: string | null
          galleries: Json | null
          global_artist_id: number
          id: string
          id_verified: boolean
          social_media_links: Json | null
          studio_address: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          biography?: string | null
          birth_year?: number | null
          chronology?: string | null
          city?: string | null
          contacts?: string | null
          country?: string | null
          created_at?: string
          cv?: string | null
          full_name?: string | null
          galleries?: Json | null
          global_artist_id?: number
          id?: string
          id_verified?: boolean
          social_media_links?: Json | null
          studio_address?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          biography?: string | null
          birth_year?: number | null
          chronology?: string | null
          city?: string | null
          contacts?: string | null
          country?: string | null
          created_at?: string
          cv?: string | null
          full_name?: string | null
          galleries?: Json | null
          global_artist_id?: number
          id?: string
          id_verified?: boolean
          social_media_links?: Json | null
          studio_address?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      registrar_access: {
        Row: {
          granted_at: string
          id: string
          owner_id: string
          registrar_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          owner_id: string
          registrar_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          owner_id?: string
          registrar_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "artist" | "collector" | "registrar"
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
      app_role: ["artist", "collector", "registrar"],
    },
  },
} as const
