export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          code: string;
          status: "draft" | "open" | "locked";
          payer_device_token: string;
          name: string | null;
          venue_name: string | null;
          receipt_image_url: string | null;
          gcash_number: string | null;
          currency: string;
          split_mode: "items" | "even";
          subtotal_cents: number;
          tax_cents: number;
          service_charge_cents: number;
          tip_cents: number;
          discount_cents: number;
          grand_total_cents: number;
          created_at: string;
          locked_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sessions"]["Row"]> & {
          code: string;
          payer_device_token: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Row"]>;
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          session_id: string;
          name: string;
          quantity: number;
          unit_price_cents: number;
          total_price_cents: number;
          is_shared: boolean;
          ocr_confidence: number | null;
          source: "ocr" | "manual";
          position: number;
        };
        Insert: Partial<Database["public"]["Tables"]["items"]["Row"]> & {
          session_id: string;
          name: string;
          unit_price_cents: number;
          total_price_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["items"]["Row"]>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          session_id: string;
          name: string;
          device_token: string;
          is_payer: boolean;
          joined_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["participants"]["Row"]> & {
          session_id: string;
          name: string;
          device_token: string;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Row"]>;
        Relationships: [];
      };
      item_claims: {
        Row: {
          id: string;
          item_id: string;
          participant_id: string;
          claimed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["item_claims"]["Row"]> & {
          item_id: string;
          participant_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["item_claims"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
