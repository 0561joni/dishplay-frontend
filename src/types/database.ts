export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          birthday: string | null;
          gender: string | null;
          credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          birthday?: string | null;
          gender?: string | null;
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          birthday?: string | null;
          gender?: string | null;
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      menus: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          processed_at: string;
          status: 'processing' | 'completed' | 'failed';
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          processed_at?: string;
          status?: 'processing' | 'completed' | 'failed';
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          processed_at?: string;
          status?: 'processing' | 'completed' | 'failed';
        };
      };
      menu_items: {
        Row: {
          id: string;
          menu_id: string;
          item_name: string;
          description: string | null;
          price: number | null;
          currency: string | null;
          order_index: number | null;
        };
        Insert: {
          id?: string;
          menu_id: string;
          item_name: string;
          description?: string | null;
          price?: number | null;
          currency?: string | null;
          order_index?: number | null;
        };
        Update: {
          id?: string;
          menu_id?: string;
          item_name?: string;
          description?: string | null;
          price?: number | null;
          currency?: string | null;
          order_index?: number | null;
        };
      };
      item_images: {
        Row: {
          id: string;
          menu_item_id: string;
          image_url: string;
          source: string | null;
          is_primary: boolean | null;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          image_url: string;
          source?: string | null;
          is_primary?: boolean | null;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          image_url?: string;
          source?: string | null;
          is_primary?: boolean | null;
        };
      };
    };
  };
}