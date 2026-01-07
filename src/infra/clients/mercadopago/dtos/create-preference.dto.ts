export interface MpItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

export interface MpPayer {
  identification: {
    type: string;
    number: string;
  };
}
export interface BackUrls {
  success: string;
  failure: string;
  pending: string;
}

export interface CreatePreferencePayload {
  items: MpItem[];
  external_reference: string;
  payer: MpPayer;
  notification_url: string;
  auto_return: 'approved' | 'all';
  back_urls?: BackUrls;
}

export interface CreatePreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}
