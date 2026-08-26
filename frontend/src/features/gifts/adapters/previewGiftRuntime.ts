import giftCatalogJson from '../../../../shared/gift-catalog.json';
import type {GiftCommerceProduct,GiftCountry,GiftCurrency,GiftSort} from '../../../domain/giftCommerce';
import {buildGiftMarketplaceProducts,convertGiftMinor,filterGiftMarketplace,localizeGiftPrice,resolveGiftMarket} from '../../../domain/giftCommerce';

export type GiftDeliveryProvider = 'demo_local' | 'doordash_drive' | 'uber_direct';
export type GiftServiceLevel = 'on_demand' | 'same_day' | 'scheduled';
export type GiftEtaConfidence = 'fast' | 'same_day' | 'scheduled';
export type GiftDeliveryWindow = 'asap' | 'today' | 'scheduled';
export type GiftDeliverySlot = 'recipient_choice' | 'morning' | 'afternoon' | 'evening';
export type GiftRecipientAvailability = 'confirm_before_dispatch' | 'available' | 'not_sure';
export type GiftConfirmationStatus = 'sent' | 'queued' | 'preview_only' | 'failed';
export type GiftFulfillmentStatus =
  | 'recipient_pending'
  | 'recipient_accepted'
  | 'payment_authorized'
  | 'merchant_preparing'
  | 'courier_assigned'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'failed';
export type GiftStepStatus = 'done' | 'active' | 'pending';

export type GiftFulfillmentStep = {
  key: 'request' | 'recipient' | 'payment' | 'partner' | 'delivery';
  label: string;
  body: string;
  status: GiftStepStatus;
  eta?: string;
};

export type GiftOrderQuote = {
  quoteId: string;
  provider: GiftDeliveryProvider;
  providerLabel: string;
  productId: string;
  productName: string;
  serviceLevel: GiftServiceLevel;
  serviceLevelLabel: string;
  itemSubtotalCents: number;
  addOnSubtotalCents: number;
  deliveryFeeCents: number;
  distanceFeeCents: number;
  rushFeeCents: number;
  smallOrderFeeCents: number;
  serviceFeeCents: number;
  estimatedTaxCents: number;
  discountCents: number;
  tipCents: number;
  refundableAuthorizationCents: number;
  finalPayableCents: number;
  totalCents: number;
  currency: GiftCurrency;
  pricingVersion: string;
  quotedAt: string;
  deliveryCity: string;
  deliveryWindow: GiftDeliveryWindow;
  deliveryWindowLabel: string;
  estimatedDistanceMiles: number;
  exactRoutePending: boolean;
  etaMinutesMin: number;
  etaMinutesMax: number;
  etaLabel: string;
  etaConfidence: GiftEtaConfidence;
  pickupPartnerName: string;
  providerRecommendation: string;
  providerCapability: string;
  paymentPolicy: string;
  cancellationPolicy: string;
  supportPolicy: string;
  acceptanceWindowMinutes: number;
  quoteValidMinutes: number;
  recipientPrivacy: string;
  acceptanceExpiresAt: string;
  expiresAt: string;
};

export type GiftConfirmationChannel = {
  channel: 'in_app' | 'email' | 'push' | 'sms';
  audience: 'sender' | 'recipient';
  label: string;
  status: GiftConfirmationStatus;
  detail: string;
};

export type GiftConfirmationPlan = {
  channels: GiftConfirmationChannel[];
  emailAdapter: 'developer_required' | 'configured';
  senderReceiptLabel: string;
  recipientRequestLabel: string;
};

export type GiftFulfillmentPlanItem = {
  title: string;
  body: string;
  owner: 'app' | 'recipient' | 'payment' | 'provider' | 'support';
  ready: boolean;
};

export type GiftOrderSummary = {
  headline: string;
  body: string;
  cta: string;
  tone: 'waiting' | 'active' | 'success' | 'support';
};

export type GiftOrderRequest = {
  contractVersion?: 'gift-checkout-v2';
  idempotencyKey?: string;
  productId: string;
  recipientId: string;
  lineItems?:Array<{productId:string;quantity:number}>;
  productName?: string;
  recipientName?: string;
  senderDisplayName?: string;
  senderDisplayMode?: 'first_name';
  recipientAddressMode?: 'recipient_supplied_private' | 'sender_supplied_known_address';
  deliveryAddress?:{
    recipientName:string;
    line1:string;
    line2?:string;
    city:string;
    region:string;
    postalCode:string;
    country:'US'|'CA'|'IN';
    phone?:string;
    instructions?:string;
  };
  paymentMethod?:'apple_pay'|'google_pay'|'card';
  paymentTokenMode?:'provider_token_required';
  confirmationEmail?:string;
  confirmationPhone?:string;
  marketCountry?:GiftCountry;
  currency?:GiftCurrency;
  allowSubstitution?:boolean;
  maxSubstitutionPriceIncreaseMinor?:number;
  occasion?: string;
  deliveryWindow?: GiftDeliveryWindow;
  deliverySlot?:GiftDeliverySlot;
  recipientAvailability?:GiftRecipientAvailability;
  surpriseHideExactGift?:boolean;
  requestedDeliveryAt?: string;
  deliveryCity?: string;
  deliveryDistanceMilesEstimate?: number;
  priceCents?: number;
  etaHint?: string;
  note?: string;
  addOnSubtotalCents?:number;
  tipCents?:number;
  moments?:Array<{kind:string;value?:string}>;
  paymentToken?: string;
};

export type GiftDeliveryAddress = NonNullable<GiftOrderRequest['deliveryAddress']>;
export type GiftAddressSuggestion = GiftDeliveryAddress & { id:string; label:string; source:'preview'|'google_places' };

export type GiftRecipientResponse = {
  orderId: string;
  status: GiftFulfillmentStatus;
  deliveryStatus: GiftFulfillmentStatus;
  accepted: boolean;
  addressStoredPrivately: boolean;
  inventoryReservationStatus?: 'preview_reserved'|'reserved'|'unavailable';
  inventoryReservedUntil?: string;
};

export type GiftOrderResponse = {
  contractVersion?: 'gift-checkout-v2';
  orderId: string;
  demo: boolean;
  status: GiftFulfillmentStatus;
  deliveryStatus: GiftFulfillmentStatus;
  provider: GiftDeliveryProvider;
  trackingUrl?: string;
  quote: GiftOrderQuote;
  steps: GiftFulfillmentStep[];
  confirmations: GiftConfirmationPlan;
  lineItems?: Array<{productId:string;productName:string;quantity:number;unitPriceCents:number}>;
  recipientAddressMode?: 'recipient_supplied_private' | 'sender_supplied_known_address';
  inventoryReservationStatus?: string;
  inventoryReservedUntil?: string;
  courierStatus?: string;
  courierDisplayName?: string;
  courierVehicleSummary?: string;
  proofStatus?: string;
  proofMethod?: string;
};

export type GiftTrackingSnapshot={orderId:string;status:GiftFulfillmentStatus;courierStatus:string;trackingUrl?:string;courierDisplayName?:string;courierVehicleSummary?:string;proofStatus:string;proofMethod?:string;lastProviderEventAt?:string;events:Array<{status:GiftFulfillmentStatus;title:string;body?:string;createdAt:string}>};
export type GiftOrderIssueType='failed_delivery'|'damaged_item'|'wrong_item'|'missing_item'|'late_delivery'|'payment'|'other';
export type GiftOrderIssueResponse={issueId:string;orderId:string;status:'open'|'investigating'|'awaiting_evidence'|'resolved'|'declined';priority:'normal'|'high'|'urgent';responseTarget:string};

export function validateGiftDeliveryAddress(address:Partial<GiftDeliveryAddress>){
  const required:[keyof GiftDeliveryAddress,string][]=[['recipientName','Full name'],['line1','Street address'],['city','City'],['region','State or province'],['postalCode','Postal code']];
  for(const [key,label] of required)if(!String(address[key]??'').trim())return `${label} is required.`;
  if(!['US','CA','IN'].includes(String(address.country)))return 'Choose United States, Canada, or India.';
  const postal=String(address.postalCode).trim();
  if(address.country==='US'&&!/^\d{5}(?:-\d{4})?$/.test(postal))return 'Enter a valid US ZIP code.';
  if(address.country==='CA'&&!/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(postal))return 'Enter a valid Canadian postal code.';
  if(address.country==='IN'&&!/^\d{6}$/.test(postal))return 'Enter a valid 6-digit Indian PIN code.';
  if(address.phone&&String(address.phone).replace(/\D/g,'').length<10)return 'Enter a valid phone number or leave it blank.';
  return '';
}

const previewAddressSuggestions:GiftAddressSuggestion[]=[
  {id:'preview-fresno-west',label:'3661 W Shaw Ave, Fresno, CA 93711, USA',recipientName:'',line1:'3661 W Shaw Ave',city:'Fresno',region:'CA',postalCode:'93711',country:'US',source:'preview'},
  {id:'preview-toronto-king',label:'100 King St W, Toronto, ON M5X 1A9, Canada',recipientName:'',line1:'100 King St W',city:'Toronto',region:'ON',postalCode:'M5X 1A9',country:'CA',source:'preview'},
  {id:'preview-delhi-connaught',label:'12 Connaught Place, New Delhi, Delhi 110001, India',recipientName:'',line1:'12 Connaught Place',city:'New Delhi',region:'Delhi',postalCode:'110001',country:'IN',source:'preview'},
  {id:'preview-mumbai-bandra',label:'24 Linking Road, Bandra West, Mumbai, Maharashtra 400050, India',recipientName:'',line1:'24 Linking Road, Bandra West',city:'Mumbai',region:'Maharashtra',postalCode:'400050',country:'IN',source:'preview'},
];

export async function searchGiftDeliveryAddresses(query:string,country:'US'|'CA'|'IN'):Promise<GiftAddressSuggestion[]>{
  const normalized=query.trim();
  if(normalized.length<3)return [];
  const local=previewAddressSuggestions.filter(item=>item.country===country&&item.label.toLowerCase().includes(normalized.toLowerCase())).slice(0,5);
  return local.length?local:previewAddressSuggestions.filter(item=>item.country===country).slice(0,3);
}

type ProductRule = {
  name: string;
  priceCents: number;
  serviceLevel: GiftServiceLevel;
  prepMinutes: number;
  travelMinutes: number;
  windowBufferMinutes: number;
  deliveryFeeCents: number;
  cutoffHour: number;
  pickupPartnerName: string;
};

export const giftOrderingConfigured=false;
export const physicalGiftOrderingMode:'demo'|'live'|'blocked'='demo';
export const digitalGiftWalletMode:'demo'|'live'|'blocked'='demo';
export const vouchRewardsMode:'demo'|'live'|'blocked'='demo';

const providerLabels:Record<GiftDeliveryProvider,string>={
  demo_local:'Demo local partner',
  doordash_drive:'DoorDash Drive',
  uber_direct:'Uber Direct',
};

const serviceLevelLabels:Record<GiftServiceLevel,string>={
  on_demand:'On-demand courier',
  same_day:'Same-day delivery',
  scheduled:'Scheduled delivery',
};

const productRules=Object.fromEntries((giftCatalogJson as Array<ProductRule&{id:string;active:boolean}>).filter(product=>product.active).map(({id,name,priceCents,serviceLevel,prepMinutes,travelMinutes,windowBufferMinutes,deliveryFeeCents,cutoffHour,pickupPartnerName})=>[id,{name,priceCents,serviceLevel,prepMinutes,travelMinutes,windowBufferMinutes,deliveryFeeCents,cutoffHour,pickupPartnerName}])) as Record<string,ProductRule>;

const fallbackRule:ProductRule={name:'Curated Gift',priceCents:0,serviceLevel:'same_day',prepMinutes:30,travelMinutes:45,windowBufferMinutes:45,deliveryFeeCents:799,cutoffHour:20,pickupPartnerName:'Local gift partner'};

export function createGiftIdempotencyKey(){
  const random=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `gift:${random}`;
}

export function formatGiftMoney(cents:number){
  return `$${(cents/100).toFixed(cents%100===0?0:2)}`;
}

export function estimateGiftOrderQuote(input:GiftOrderRequest, now=new Date(), provider:GiftDeliveryProvider='demo_local'):GiftOrderQuote{
  const cartRules=(input.lineItems?.length?input.lineItems:[{productId:input.productId,quantity:1}]).map(item=>({item,rule:productRules[item.productId]??fallbackRule}));
  const strongestRule=cartRules.reduce((chosen,current)=>serviceLevelRank(current.rule.serviceLevel)>serviceLevelRank(chosen.serviceLevel)?current.rule:chosen,cartRules[0]?.rule??fallbackRule);
  const rule:ProductRule={
    ...strongestRule,
    name:cartRules.length===1?strongestRule.name:'Curated gift cart',
    prepMinutes:Math.max(...cartRules.map(({rule:itemRule})=>itemRule.prepMinutes)),
    travelMinutes:Math.max(...cartRules.map(({rule:itemRule})=>itemRule.travelMinutes)),
    windowBufferMinutes:Math.max(...cartRules.map(({rule:itemRule})=>itemRule.windowBufferMinutes)),
    deliveryFeeCents:Math.max(...cartRules.map(({rule:itemRule})=>itemRule.deliveryFeeCents)),
    cutoffHour:Math.min(...cartRules.map(({rule:itemRule})=>itemRule.cutoffHour)),
    pickupPartnerName:cartRules.length===1?strongestRule.pickupPartnerName:'Curated local partner network',
  };
  const basePriceCents=input.lineItems?.length
    ? cartRules.reduce((total,{item,rule:itemRule})=>total+Math.max(1,item.quantity)*itemRule.priceCents,0)
    : productRules[input.productId]?.priceCents??input.priceCents??0;
  const currency=input.currency??'USD';
  const priceCents=input.lineItems?.length
    ? cartRules.reduce((total,{item,rule:itemRule})=>total+Math.max(1,item.quantity)*localizeGiftPrice(itemRule.priceCents,currency),0)
    : localizeGiftPrice(basePriceCents,currency);
  const deliveryWindow=input.deliveryWindow??'asap';
  const estimatedDistanceMiles=clamp(input.deliveryDistanceMilesEstimate??5,1,25);
  const includedMiles=5;
  const distanceFeeCents=convertGiftMinor(Math.max(0,Math.ceil(estimatedDistanceMiles-includedMiles)*85),currency);
  const rushFeeCents=convertGiftMinor(deliveryWindow==='asap'&&rule.serviceLevel!=='scheduled'?299:0,currency);
  const smallOrderFeeCents=basePriceCents>0&&basePriceCents<2500?convertGiftMinor(199,currency):0;
  const discountCents=basePriceCents>=6000?convertGiftMinor(Math.min(499,rule.deliveryFeeCents),currency):0;
  const isAfterCutoff=now.getHours()>=rule.cutoffHour;
  const baseMin=rule.prepMinutes+rule.travelMinutes;
  const requestedDelay=deliveryWindow==='scheduled'?24*60:deliveryWindow==='today'?90:0;
  const serviceDelay=Math.max(requestedDelay,isAfterCutoff?minutesUntilNextWindow(now,rule.serviceLevel):0);
  const etaMinutesMin=serviceDelay+baseMin;
  const etaMinutesMax=etaMinutesMin+rule.windowBufferMinutes;
  const deliveryFeeCents=convertGiftMinor(rule.deliveryFeeCents,currency)+distanceFeeCents;
  const serviceFeeCents=Math.max(convertGiftMinor(199,currency),Math.round(priceCents*.065));
  const addOnSubtotalCents=Math.max(0,Math.round(input.addOnSubtotalCents??0));
  const tipCents=Math.max(0,Math.round(input.tipCents??0));
  const taxableCents=priceCents+addOnSubtotalCents+deliveryFeeCents+rushFeeCents+smallOrderFeeCents+serviceFeeCents-discountCents;
  const estimatedTaxCents=Math.max(0,Math.round(taxableCents*resolveGiftMarket(input.marketCountry??(currency==='CAD'?'CA':currency==='INR'?'IN':'US')).taxRate));
  const totalCents=taxableCents+estimatedTaxCents+tipCents;
  return {
    quoteId:`quote-${input.productId}-${now.getTime()}`,
    provider,
    providerLabel:providerLabels[provider],
    productId:input.productId,
    productName:input.lineItems&&input.lineItems.length>1?`${input.lineItems.reduce((sum,item)=>sum+item.quantity,0)} romantic gifts`:productRules[input.productId]?.name??input.productName??input.productId,
    serviceLevel:rule.serviceLevel,
    serviceLevelLabel:serviceLevelLabels[rule.serviceLevel],
    itemSubtotalCents:priceCents,
    addOnSubtotalCents,
    deliveryFeeCents,
    distanceFeeCents,
    rushFeeCents,
    smallOrderFeeCents,
    serviceFeeCents,
    estimatedTaxCents,
    discountCents,
    tipCents,
    refundableAuthorizationCents:totalCents,
    finalPayableCents:totalCents,
    totalCents,
    currency,
    pricingVersion:'gift-checkout-v2-2026-08',
    quotedAt:now.toISOString(),
    deliveryCity:input.deliveryCity?.trim()||'Recipient city',
    deliveryWindow,
    deliveryWindowLabel:giftDeliveryWindowLabel(deliveryWindow),
    estimatedDistanceMiles,
    exactRoutePending:true,
    etaMinutesMin,
    etaMinutesMax,
    etaLabel:formatEtaLabel(etaMinutesMin,etaMinutesMax,now),
    etaConfidence:giftEtaConfidence(rule.serviceLevel,etaMinutesMax),
    pickupPartnerName:rule.pickupPartnerName,
    providerRecommendation:giftProviderRecommendation(rule.serviceLevel),
    providerCapability:giftProviderCapability(rule.serviceLevel,provider),
    paymentPolicy:'Sender is not charged until the recipient accepts privately and the provider confirms availability.',
    cancellationPolicy:'Free cancellation before recipient acceptance. After provider confirmation, refunds follow merchant/courier policy.',
    supportPolicy:'If a courier fails or the recipient declines, DestinyOne support can cancel, retry, or refund from the order record.',
    acceptanceWindowMinutes:30,
    quoteValidMinutes:10,
    recipientPrivacy:'Recipient accepts privately. Address is never shown to the sender.',
    acceptanceExpiresAt:new Date(now.getTime()+30*60*1000).toISOString(),
    expiresAt:new Date(now.getTime()+10*60*1000).toISOString(),
  };
}

export function buildGiftSteps(status:GiftFulfillmentStatus, quote:GiftOrderQuote):GiftFulfillmentStep[]{
  const rank:Record<GiftFulfillmentStatus,number>={
    recipient_pending:1,
    recipient_accepted:2,
    payment_authorized:3,
    merchant_preparing:4,
    courier_assigned:4,
    picked_up:5,
    delivered:6,
    cancelled:0,
    failed:0,
  };
  const current=rank[status]??1;
  const step=(position:number):GiftStepStatus=>status==='cancelled'||status==='failed'?'pending':current>position?'done':current===position?'active':'pending';
  return [
    {key:'request',label:'Gift request',body:'Sender chose the gift and note.',status:step(1)},
    {key:'recipient',label:'Private acceptance',body:'Recipient confirms delivery address privately.',status:step(2)},
    {key:'payment',label:'Secure payment',body:'Apple Pay / card is authorized after acceptance.',status:step(3)},
    {key:'partner',label:'Partner prepares',body:`${quote.pickupPartnerName} prepares the order.`,status:step(4),eta:quote.serviceLevel==='on_demand'?'15–30 min':'Same-day window'},
    {key:'delivery',label:'Courier delivery',body:`Estimated arrival ${quote.etaLabel}.`,status:step(5),eta:quote.etaLabel},
  ];
}

export function buildGiftFulfillmentPlan(quote:GiftOrderQuote):GiftFulfillmentPlanItem[]{
  return [
    {
      title:'Recipient approval',
      body:`They have ${quote.acceptanceWindowMinutes} minutes to accept privately. Their address stays hidden.`,
      owner:'recipient',
      ready:true,
    },
    {
      title:'Payment after approval',
      body:'Payment starts only after acceptance and availability are confirmed.',
      owner:'payment',
      ready:true,
    },
    {
      title:'Delivery partner',
      body:quote.providerCapability,
      owner:'provider',
      ready:quote.provider!=='demo_local',
    },
    {
      title:'Delivery updates',
      body:'Chat updates show when the gift is accepted, prepared, picked up and delivered.',
      owner:'app',
      ready:quote.provider!=='demo_local',
    },
  ];
}

export function buildGiftConfirmationPlan(demo:boolean):GiftConfirmationPlan{
  const backendStatus:GiftConfirmationStatus=demo?'preview_only':'queued';
  const backendDetail=demo
    ?'Preview is ready. Your developer connects the transactional email adapter before launch.'
    :'Queued by DestinyOne for secure delivery.';
  return {
    emailAdapter:demo?'developer_required':'configured',
    senderReceiptLabel:'Gift request and price receipt',
    recipientRequestLabel:'Private gift acceptance request',
    channels:[
      {channel:'in_app',audience:'sender',label:'Your in-app receipt',status:'sent',detail:'The order record is available in Chat.'},
      {channel:'in_app',audience:'recipient',label:'Recipient in-app request',status:backendStatus,detail:demo?'Preview contract is ready for the recipient notification service.':backendDetail},
      {channel:'email',audience:'sender',label:'Sender email confirmation',status:backendStatus,detail:backendDetail},
      {channel:'email',audience:'recipient',label:'Recipient email request',status:backendStatus,detail:backendDetail},
      {channel:'push',audience:'sender',label:'Sender delivery updates',status:backendStatus,detail:backendDetail},
      {channel:'push',audience:'recipient',label:'Recipient acceptance alert',status:backendStatus,detail:backendDetail},
      {channel:'sms',audience:'recipient',label:'Recipient SMS fallback',status:backendStatus,detail:demo?'Activates only when a verified phone and SMS provider are configured.':backendDetail},
    ],
  };
}

export function giftOrderSummary(status:GiftFulfillmentStatus, quote:GiftOrderQuote):GiftOrderSummary{
  if(status==='delivered')return {headline:'Delivered beautifully',body:`${quote.productName} arrived. Ask support if anything looks wrong.`,cta:'View receipt',tone:'success'};
  if(status==='failed')return {headline:'Needs support',body:'The delivery partner could not complete this order. Support should review refund/retry options.',cta:'Contact support',tone:'support'};
  if(status==='cancelled')return {headline:'Order cancelled',body:'No delivery is active. Any eligible hold should be released by the provider.',cta:'View policy',tone:'support'};
  if(status==='recipient_pending')return {headline:'Waiting for private acceptance',body:`${quote.productName} is held for ${quote.quoteValidMinutes} min. ${quote.recipientPrivacy}`,cta:'Share request',tone:'waiting'};
  if(status==='recipient_accepted')return {headline:'Recipient accepted',body:'Address is securely tokenized. Payment authorization can begin.',cta:'Authorize payment',tone:'active'};
  if(status==='payment_authorized')return {headline:'Payment authorized',body:`${quote.pickupPartnerName} can now confirm item availability.`,cta:'Submit to partner',tone:'active'};
  if(status==='merchant_preparing'||status==='courier_assigned')return {headline:'Partner is preparing',body:`ETA ${quote.etaLabel}. Tracking updates appear in chat.`,cta:'Track order',tone:'active'};
  return {headline:'Out for delivery',body:`Estimated arrival ${quote.etaLabel}. Recipient address remains private.`,cta:'Track order',tone:'active'};
}

/**
 * The client talks only to DestinyOne's gift BFF. In production the server owns
 * pricing, recipient consent, private address collection, payment authorization,
 * fulfillment-provider submission, webhooks and refunds. The recipient sees the
 * sender's approved display name; private delivery data is never returned to the
 * sender or exposed in the client request.
 */
export async function createPhysicalGiftOrder(input:GiftOrderRequest):Promise<GiftOrderResponse>{
  const localQuote=estimateGiftOrderQuote(input);
  await new Promise(resolve=>setTimeout(resolve,150));
  const orderId=`demo-gift-${Date.now()}`;
  return {
    orderId, demo:true, status:'recipient_pending', deliveryStatus:'recipient_pending', provider:'demo_local',
    trackingUrl:`https://destinyone.local/gifts/${orderId}`, quote:localQuote,
    steps:buildGiftSteps('recipient_pending',localQuote), confirmations:buildGiftConfirmationPlan(true),
    recipientAddressMode:input.recipientAddressMode??'recipient_supplied_private',
  };
}

export async function respondToPhysicalGiftOrder(input:{orderId:string;accept:boolean;dropoff?:GiftDeliveryAddress}):Promise<GiftRecipientResponse>{
  if(!input.orderId)throw new Error('Gift order is unavailable.');
  if(input.accept&&input.dropoff){const error=validateGiftDeliveryAddress(input.dropoff);if(error)throw new Error(error)}
  await new Promise(resolve=>setTimeout(resolve,150));
  const status:GiftFulfillmentStatus=input.accept?'recipient_accepted':'cancelled';
  return {orderId:input.orderId,status,deliveryStatus:status,accepted:input.accept,addressStoredPrivately:Boolean(input.accept),inventoryReservationStatus:input.accept?'preview_reserved':undefined};
}

export async function getPhysicalGiftOrderTracking(orderId:string):Promise<GiftTrackingSnapshot>{
  if(!orderId)throw new Error('Gift order is unavailable.');
  return{orderId,status:'recipient_pending',courierStatus:'not_requested',proofStatus:'not_available',events:[{status:'recipient_pending',title:'Gift request created',body:'Waiting for private recipient acceptance.',createdAt:new Date().toISOString()}]};
}

export async function fetchGiftMarketplace(input:{country:GiftCountry;city:string;currency:GiftCurrency;query?:string;sort?:GiftSort;delivery?:'all'|'asap'|'today'|'scheduled';category?:string;inStockOnly?:boolean}):Promise<GiftCommerceProduct[]>{
  const local=filterGiftMarketplace(buildGiftMarketplaceProducts({country:input.country,city:input.city}),{query:input.query??'',category:input.category??'All',delivery:input.delivery??'all',sort:input.sort??'recommended',inStockOnly:input.inStockOnly});
  return local;
}

export async function recordGiftRecommendationFeedback(input:{productId:string;contextKey:string;signal:'viewed'|'added'|'removed'|'purchased'|'substituted'|'liked'|'disliked'|'delivered_positive'|'delivered_negative';features?:Record<string,string|number|boolean>}){
  void input;
  return true;
}

export async function openGiftOrderIssue(input:{orderId:string;issueType:GiftOrderIssueType;description:string;requestedResolution:'redelivery'|'refund'|'replacement'|'review'}):Promise<GiftOrderIssueResponse>{
  if(input.description.trim().length<10)throw new Error('Please add at least 10 characters so Gift Support can help.');
  return{issueId:`GFT-${Date.now().toString(36).toUpperCase()}`,orderId:input.orderId,status:'open',priority:['failed_delivery','damaged_item'].includes(input.issueType)?'high':'normal',responseTarget:'Within 2 hours'};
}

export async function respondToGiftSubstitutionOffer(input:{offerId:string;accept:boolean}){
  return{offerId:input.offerId,accepted:input.accept,preview:true};
}

function serviceLevelRank(level:GiftServiceLevel){
  return level==='scheduled'?3:level==='same_day'?2:1;
}

function giftDeliveryWindowLabel(deliveryWindow:GiftDeliveryWindow){
  if(deliveryWindow==='today')return 'Later today';
  if(deliveryWindow==='scheduled')return 'Scheduled delivery';
  return 'As soon as possible';
}

function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value));
}

function minutesUntilNextWindow(now:Date, serviceLevel:GiftServiceLevel){
  const next=new Date(now);
  next.setDate(now.getDate()+1);
  next.setHours(serviceLevel==='on_demand'?10:11,0,0,0);
  return Math.max(0,Math.ceil((next.getTime()-now.getTime())/60000));
}

function giftProviderRecommendation(serviceLevel:GiftServiceLevel){
  if(serviceLevel==='on_demand')return 'Use an on-demand courier partner for desserts, coffee and quick local surprises.';
  if(serviceLevel==='same_day')return 'Use a local merchant network with same-day courier pickup after recipient acceptance.';
  return 'Use scheduled fulfillment so fragile or customized gifts arrive in a clean delivery window.';
}

function giftProviderCapability(serviceLevel:GiftServiceLevel, provider:GiftDeliveryProvider){
  if(provider==='demo_local')return 'Preview mode uses a demo partner. Production can route to DoorDash Drive, Uber Direct, or a florist API by city.';
  if(provider==='doordash_drive')return serviceLevel==='on_demand'?'DoorDash Drive is best for quick dessert/café courier orders.':'DoorDash Drive can handle same-day merchant pickup where coverage exists.';
  return serviceLevel==='scheduled'?'Uber Direct can support scheduled local delivery windows after merchant confirmation.':'Uber Direct is useful for fast local delivery when courier supply is available.';
}

function giftEtaConfidence(serviceLevel:GiftServiceLevel, etaMinutesMax:number):GiftEtaConfidence{
  if(serviceLevel==='scheduled'||etaMinutesMax>=240)return 'scheduled';
  if(serviceLevel==='same_day')return 'same_day';
  return 'fast';
}

function formatEtaLabel(min:number,max:number,now:Date){
  if(max<180)return `${min}–${max} min`;
  const start=new Date(now.getTime()+min*60000);
  const end=new Date(now.getTime()+max*60000);
  const day=start.toDateString()===now.toDateString()?'Today':isTomorrow(start,now)?'Tomorrow':start.toLocaleDateString(undefined,{weekday:'short'});
  return `${day} ${formatTime(start)}–${formatTime(end)}`;
}

function formatTime(date:Date){
  return date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
}

function isTomorrow(date:Date,now:Date){
  const tomorrow=new Date(now);
  tomorrow.setDate(now.getDate()+1);
  return date.toDateString()===tomorrow.toDateString();
}
