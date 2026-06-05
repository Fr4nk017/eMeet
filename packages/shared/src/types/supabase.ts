export type UserRole = 'user' | 'locatario' | 'admin'

export type EventCategory =
  | 'gastronomia'
  | 'musica'
  | 'cultura'
  | 'networking'
  | 'deporte'
  | 'fiesta'
  | 'teatro'
  | 'arte'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          bio: string
          avatar_url: string | null
          location: string
          interests: EventCategory[]
          role: UserRole
          business_name: string | null
          business_location: string | null
          is_banned: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          bio?: string
          avatar_url?: string | null
          location?: string
          interests?: EventCategory[]
          role?: UserRole
          business_name?: string | null
          business_location?: string | null
          is_banned?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          bio?: string
          avatar_url?: string | null
          location?: string
          interests?: EventCategory[]
          role?: UserRole
          business_name?: string | null
          business_location?: string | null
          is_banned?: boolean
        }
        Relationships: []
      }
      profile_followers: {
        Row: {
          id: string
          follower_id: string
          followed_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          followed_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          followed_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profile_followers_follower_id_fkey'
            columns: ['follower_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profile_followers_followed_id_fkey'
            columns: ['followed_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_events: {
        Row: {
          id: string
          user_id: string
          event_id: string
          event_title: string | null
          event_image_url: string | null
          event_address: string | null
          action: 'like' | 'save'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          event_id: string
          event_title?: string | null
          event_image_url?: string | null
          event_address?: string | null
          action: 'like' | 'save'
          created_at?: string
        }
        Update: {
          event_title?: string | null
          event_image_url?: string | null
          event_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_rooms: {
        Row: {
          id: string
          event_title: string
          event_image_url: string | null
          event_address: string | null
          status: 'active' | 'expired' | 'deleted'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          event_title: string
          event_image_url?: string | null
          event_address?: string | null
          status?: 'active' | 'expired' | 'deleted'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          event_title?: string
          event_image_url?: string | null
          event_address?: string | null
          status?: 'active' | 'expired' | 'deleted'
          expires_at?: string | null
        }
        Relationships: []
      }
      room_members: {
        Row: {
          room_id: string
          user_id: string
          joined_at: string
          last_read_at: string
        }
        Insert: {
          room_id: string
          user_id?: string
          joined_at?: string
          last_read_at?: string
        }
        Update: {
          last_read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'room_members_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'chat_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'room_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id?: string
          text: string
          created_at?: string
        }
        Update: {
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'chat_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      locatario_events: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string
          category: EventCategory
          event_date: string
          address: string
          price: number | null
          image_url: string | null
          video_url: string | null
          organizer_name: string
          organizer_avatar: string | null
          lat: number | null
          lng: number | null
          created_at: string
        }
        Insert: {
          id?: string
          creator_id?: string
          title: string
          description?: string
          category: EventCategory
          event_date: string
          address?: string
          price?: number | null
          image_url?: string | null
          video_url?: string | null
          organizer_name?: string
          organizer_avatar?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string
          category?: EventCategory
          event_date?: string
          address?: string
          price?: number | null
          image_url?: string | null
          video_url?: string | null
          organizer_name?: string
          organizer_avatar?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'locatario_events_creator_id_fkey'
            columns: ['creator_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
