export interface MpItem {
  title: string;
  quantity: number;
  unit_price: number;
}

export interface MpPayer {
  identification: {
    type: string;
    number: string;
  };
}

export interface MpBackUrls {
  success: string;
  failure: string;
  pending: string;
}

export interface CreatePreferencePayload {
  items: MpItem[];
  external_reference: string;
  payer: MpPayer;
  notification_url: string;
  back_urls: MpBackUrls;
  auto_return: 'approved' | 'all';
}

export interface CreatePreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}
