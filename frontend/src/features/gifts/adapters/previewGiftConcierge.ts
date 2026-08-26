import type {GiftCommerceProduct,GiftCurrency} from '../../../domain/giftCommerce';
import {buildGiftConciergeV2Plan,type GiftConciergeV2Plan} from '../../../domain/giftExperience';

type ConciergeInput={
  prompt:string;
  products:GiftCommerceProduct[];
  currency:GiftCurrency;
  fallbackBudgetMinor:number;
  previousProductIds?:string[];
  relationshipStage?:'new_match'|'dating'|'committed';
};

export async function requestGiftConciergeV2(input:ConciergeInput):Promise<GiftConciergeV2Plan>{
  return buildGiftConciergeV2Plan(input);
}
