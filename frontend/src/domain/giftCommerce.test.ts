import {describe,expect,it} from 'vitest';
import {assessGiftOrderRisk,buildGiftMarketplaceProducts,buildGiftOperationsSnapshot,convertGiftMinor,filterGiftMarketplace,formatGiftMarketMoney,recommendGiftSubstitutions,scoreGiftRecommendationLearning} from './giftCommerce';

describe('gift commerce super-app logic',()=>{
  it('converts regional fees without applying the INR product-price floor',()=>{
    expect(convertGiftMinor(199,'INR')).toBe(3483);
  });
  it('localizes catalog pricing and city inventory for USD CAD and INR',()=>{
    const us=buildGiftMarketplaceProducts({country:'US',city:'Fresno, CA'});
    const india=buildGiftMarketplaceProducts({country:'IN',city:'Mumbai, Maharashtra'});
    expect(us[0]?.currency).toBe('USD');expect(india[0]?.currency).toBe('INR');
    expect(india[0]!.localizedPriceMinor).toBeGreaterThan(us[0]!.localizedPriceMinor);
    expect(formatGiftMarketMoney(69900,'INR')).toContain('699');
  });
  it('searches sorts and filters delivery-ready catalog items',()=>{
    const products=buildGiftMarketplaceProducts({country:'US',city:'Fresno, CA'});
    const flowers=filterGiftMarketplace(products,{query:'rose',category:'All',delivery:'today',sort:'price_low',inStockOnly:true});
    expect(flowers.length).toBeGreaterThan(0);expect(flowers.every(product=>product.searchText.includes('rose'))).toBe(true);
  });
  it('offers only close in-stock substitutions within the price ceiling',()=>{
    const products=buildGiftMarketplaceProducts({country:'US',city:'Fresno, CA'});
    const choices=recommendGiftSubstitutions(products,'gelato-night',1200);
    expect(choices.every(product=>product.category==='Sweet'&&product.localizedPriceMinor<=3800)).toBe(true);
  });
  it('blocks unsafe velocity and preserves privacy-safe learning signals',()=>{
    expect(assessGiftOrderRisk({ordersLastHour:4,ordersLastDay:9,totalMinor:20000,currency:'USD',newDevice:true,recipientCountLastDay:6}).decision).toBe('block');
    expect(scoreGiftRecommendationLearning(['viewed','added','purchased','delivered_positive'])).toBe(8.1);
  });
  it('surfaces failed provider and notification jobs as critical operations health',()=>{
    expect(buildGiftOperationsSnapshot({staleInventoryCities:0,lowStockItems:2,failedProviderJobs:1,failedNotifications:1,openDisputes:3})).toMatchObject({health:'attention',critical:2});
  });
});
