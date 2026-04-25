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
          created_at: string
        }
        Insert: {
          id: string
          name: string
          bio?: string
          avatar_url?: string | null
          location?: string
          interests?: EventCategory[]
          created_at?: string
        }
        Update: {
          name?: string
          bio?: string
          avatar_url?: string | null
          location?: string
          interests?: EventCategory[]
        }
        Relationships: []
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
          created_at: string
        }
        Insert: {
          id: string
          event_title: string
          event_image_url?: string | null
          event_address?: string | null
          created_at?: string
        }
        Update: {
          event_title?: string
          event_image_url?: string | null
          event_address?: string | null
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
          organizer_name: string
          organizer_avatar: string | null
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
          organizer_name?: string
          organizer_avatar?: string | null
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
          organizer_name?: string
          organizer_avatar?: string | null
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
