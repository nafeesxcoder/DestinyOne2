import type { ChatGifCatalogItem } from '../../../domain/chatMediaCatalog';
import type { GiftAddressSuggestion, GiftDeliveryAddress, GiftFulfillmentPlanItem, GiftFulfillmentStatus, GiftOrderIssueResponse, GiftOrderIssueType, GiftOrderQuote, GiftOrderRequest, GiftOrderResponse, GiftOrderSummary, GiftRecipientResponse } from '../../gifts/contracts/GiftModels';

export type RealtimeCallSignal =
  | { type: 'offer' | 'answer'; sdp: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

export type RealtimeCallEvent = {
  event: 'invite' | 'accept' | 'reject' | 'end' | 'missed' | 'failed' | 'signal';
  clientCallId: string;
  mode?: 'audio' | 'video';
  signal?: RealtimeCallSignal;
  userId?: string;
  at?: string;
};

export type MatchRealtimeHandlers = {
  onTyping?: (typing: boolean) => void;
  onPresence?: (online: boolean) => void;
  onReceipt?: (status: 'delivered' | 'read', at: string) => void;
  onCall?: (event: RealtimeCallEvent) => void;
  onConnection?: (connected: boolean) => void;
};

export type MatchRealtimeSession = {
  sendTyping: (typing: boolean) => Promise<void>;
  markDelivered: () => Promise<void>;
  markRead: () => Promise<void>;
  sendCall: (event: RealtimeCallEvent) => Promise<void>;
  close: () => Promise<void>;
};

export type GifSearchPage = {
  items: ChatGifCatalogItem[];
  totalCount: number;
  nextOffset: number | null;
  provider: string;
};

export type ChatRuntimePorts = {
  realtime: {
    connect: (matchId: string, handlers: MatchRealtimeHandlers) => Promise<MatchRealtimeSession | null>;
  };
  gifSearch: {
    configured: boolean;
    providerName: string;
    search: (input: { query: string; offset?: number; limit?: number }) => Promise<GifSearchPage>;
  };
  gifts: {
    physicalMode: 'demo' | 'live' | 'blocked';
    digitalWalletMode: 'demo' | 'live' | 'blocked';
    createIdempotencyKey: () => string;
    formatMoney: (cents: number) => string;
    estimateQuote: (input: GiftOrderRequest) => GiftOrderQuote;
    buildFulfillmentPlan: (quote: GiftOrderQuote) => GiftFulfillmentPlanItem[];
    orderSummary: (status: GiftFulfillmentStatus, quote: GiftOrderQuote) => GiftOrderSummary;
    createOrder: (input: GiftOrderRequest) => Promise<GiftOrderResponse>;
    respondToOrder: (input: { orderId: string; accept: boolean; dropoff?: GiftDeliveryAddress }) => Promise<GiftRecipientResponse>;
    searchAddresses: (query: string, country: GiftDeliveryAddress['country']) => Promise<GiftAddressSuggestion[]>;
    validateAddress: (address: Partial<GiftDeliveryAddress>) => string;
    openIssue: (input: { orderId: string; issueType: GiftOrderIssueType; description: string; requestedResolution: 'redelivery'|'refund'|'replacement'|'review' }) => Promise<GiftOrderIssueResponse>;
  };
};
