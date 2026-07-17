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
          venue_location: string | null;
          note: string | null;
          receipt_image_url: string | null;
          gcash_number: string | null;
          gcash_qr_url: string | null;
          currency: string;
          split_mode: "items" | "even";
          charge_allocation_mode: "proportional" | "equal";
          rounding_preference_cents: number;
          subtotal_cents: number;
          tax_cents: number;
          service_charge_cents: number;
          tip_cents: number;
          delivery_fee_cents: number;
          discount_cents: number;
          grand_total_cents: number;
          created_at: string;
          locked_at: string | null;
          trip_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sessions"]["Row"]> & {
          code: string;
          payer_device_token: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Row"]>;
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          code: string;
          name: string;
          organizer_device_token: string;
          currency: string;
          status: "open" | "settled";
          created_at: string;
          settled_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["trips"]["Row"]> & {
          code: string;
          name: string;
          organizer_device_token: string;
        };
        Update: Partial<Database["public"]["Tables"]["trips"]["Row"]>;
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
          payment_status: "unpaid" | "submitted" | "confirmed";
          payment_proof_url: string | null;
          payment_method: "gcash" | "cash" | "other";
          payment_reference: string | null;
          payment_note: string | null;
          amount_paid_cents: number;
          payment_submitted_at: string | null;
          payment_confirmed_at: string | null;
          excluded_from_charges: boolean;
          position: number;
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
