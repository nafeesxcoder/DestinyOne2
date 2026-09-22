
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { shared } from '../../components';
import { MiniPremiumIcon, PremiumIcon, type PremiumIconTone } from '../../components/premium/PremiumIcon';
import { ChecklistRow } from '../executive/ExecutiveCircleScreen';
import { matches } from '../../data';
import type { LocalReport } from '../../storage';
import { colors } from '../../theme';
import { adminOpsStyles, cityDensityStyles, coachStyles, launchStyles, styles, ventureStyles } from '../../theme/appStyles';
import { getLaunchReadinessSnapshot, productionDataModules } from '../../domain/appModel';
import { buildModerationQueue, summarizeModerationQueue, type ModerationQueueItem, type ModerationStatus } from '../../domain/moderation';
import { buildCityDensitySnapshot, type CityDensitySnapshot } from '../../domain/cityDensity';
import { buildNetworkEffectPlan } from '../../domain/networkEffects';
import { buildGrowthEngineSnapshot, growthFunnelEvents, type GrowthEngineSnapshot } from '../../domain/growthEngine';
import { buildPaymentEntitlementSnapshot, executivePlan, membershipPlans, sparkPacks, type PaymentEntitlementGate, type PaymentEntitlementSnapshot } from '../../domain/monetization';
import { buildMonetizationOperationsSnapshot, type MonetizationOperationsSnapshot } from '../../domain/monetizationOps';
import { buildPilotReadinessSnapshot, type PilotReadinessSnapshot } from '../../domain/pilotReadiness';
import { buildProductQualitySnapshot, type ProductQualityItem } from '../../domain/productQuality';
import { buildInteractionAuditSnapshot, type InteractionAuditSnapshot } from '../../domain/interactionQuality';
import { buildReleaseReadinessSnapshot, type ReleaseGate, type ReleaseReadinessSnapshot } from '../../domain/releaseReadiness';
import { buildStoreReviewSnapshot, type StoreReviewSnapshot } from '../../domain/storeReview';
import { buildPolicyComplianceSnapshot, type PolicyComplianceSnapshot } from '../../domain/policyCompliance';
import type { DateMarketplaceSnapshot } from '../../domain/dateMarketplace';
import { buildP1OperationsSnapshot, type P1OperationItem, type P1OperationsSnapshot } from '../../domain/p1Operations';
import { buildTrustOpsSnapshot, type TrustOpsGate, type TrustOpsSnapshot } from '../../domain/trustOps';
import { buildLegalStoreOpsSnapshot, type LegalStoreOpsGate, type LegalStoreOpsSnapshot } from '../../domain/legalStoreOps';
import { buildBackendLaunchSnapshot, type BackendLaunchGate, type BackendLaunchSnapshot } from '../../domain/backendReadiness';
import { buildNotificationReadinessSnapshot, type NotificationGate, type NotificationReadinessSnapshot } from '../../domain/notificationReadiness';
import { buildGiftFulfillmentReadinessSnapshot, type GiftFulfillmentGate, type GiftFulfillmentReadinessSnapshot } from '../../domain/giftFulfillmentReadiness';
import { buildPlacesReservationReadinessSnapshot, type PlacesReservationGate, type PlacesReservationReadinessSnapshot } from '../../domain/placesReservationReadiness';
import { buildObservabilityReadinessSnapshot, type ObservabilityGate, type ObservabilityReadinessSnapshot } from '../../domain/observabilityReadiness';
import { buildAbuseFraudReadinessSnapshot, type AbuseFraudGate, type AbuseFraudReadinessSnapshot } from '../../domain/abuseFraudReadiness';
import { buildGiftOperationsSnapshot } from '../../domain/giftCommerce';

export type AdminRuntimeSummary={
  backendMode:string;appEnvironment:'development'|'staging'|'production';requiresRealBackend:boolean;apiConfigured:boolean;
  paymentsConfigured:boolean;giftOrderingConfigured:boolean;physicalGiftCount:number;venueCount:number;cityCount:number;
  categoryCount:number;packageCount:number;partnerLeadCount:number;signedPartnerCount:number;eventCount:number;
  marketplaceSnapshot:DateMarketplaceSnapshot;allowsPreviewOtpFallback:boolean;
};
export function AdminModerationPanelScreen({reports,blockedCount,runtime,onBack}:{reports:LocalReport[];blockedCount:number;runtime:AdminRuntimeSummary;onBack:()=>void}){
  const {backendMode,appEnvironment,requiresRealBackend,paymentsConfigured,giftOrderingConfigured}=runtime;
  const [tab,setTab]=useState<'queue'|'reports'|'playbooks'|'audit'>('queue');
  const [caseStatus,setCaseStatus]=useState<Record<string,ModerationStatus>>({});
  const [opsNote,setOpsNote]=useState('Preview actions update local case status only. Hosted reviewer access and drills are not yet verified.');
  const queue=buildModerationQueue(reports,blockedCount).map(item=>({...item,status:caseStatus[item.id]??item.status}));
  const summary=summarizeModerationQueue(queue);
  const dataSnapshot=getLaunchReadinessSnapshot(productionDataModules);
  const trustOpsSnapshot=buildTrustOpsSnapshot({
    queue,
    reportCount:reports.length,
    blockedCount,
    reviewerCount:3,
    supportCoverageHours:16,
    targetSlaHours:summary.highOrCritical?Math.min(6,summary.fastestSlaHours||6):12,
    escalationOwnerReady:true,
    emergencyPlaybookReady:true,
    evidenceRetentionReady:true,
    blockAuditReady:true,
    reportBlockFlowReady:true,
    appealPathReady:true,
    supportContactReady:true,
    reviewerRbacReady:false,
    dualReviewReady:false,
    incidentDrillPassed:false,
  });
  const backendLaunchSnapshot=buildBackendLaunchSnapshot({
    backendMode,
    appEnvironment,
    requiresRealBackend,
    apiConfigured:runtime.apiConfigured,
    migrationCount:31,
    edgeFunctionCount:5,
    dataModuleCount:dataSnapshot.totalModules,
    backendReadyModuleCount:dataSnapshot.backendReadyModules,
    realtimeModuleCount:dataSnapshot.realtimeModules,
    providerModuleCount:dataSnapshot.providerModules,
    authAdapterReady:true,
    emailOtpReady:backendMode==='aws',
    phoneOtpProviderReady:false,
    databaseTypesReady:true,
    hostedSchemaVerified:false,
    migrationHistoryAligned:false,
    databaseTestsPassed:false,
    rlsPoliciesReady:true,
    storageBucketsReady:true,
    realtimePersistenceReady:true,
    edgeFunctionsReady:true,
    serverSecretsReady:false,
    productionEnvLocked:appEnvironment==='production'&&requiresRealBackend,
    backupMonitoringReady:false,
  });
  const paymentEntitlementSnapshot=buildPaymentEntitlementSnapshot({
    billingMode:'preview',
    appEnvironment,
    paymentsConfigured,
    membershipPlanCount:membershipPlans.length,
    sparkPackCount:sparkPacks.length,
    hasExecutivePlan:!!executivePlan,
    checkoutPreviewReady:true,
    storeProductIdsReady:false,
    receiptVerificationReady:false,
    restorePurchaseReady:true,
    entitlementLedgerReady:true,
    featureLimitsReady:false,
    subscriptionCopyReady:true,
    appleGoogleDisclosureReady:true,
    reservationPaymentsReady:paymentsConfigured,
    webhookReconciliationReady:false,
    refundSupportReady:true,
    abuseControlsReady:true,
    productionBillingLocked:false,
  });
  const monetizationOperationsSnapshot=buildMonetizationOperationsSnapshot({
    environment:appEnvironment,
    liveReceiptCount:0,
    verifiedReceiptCount:0,
    activeEntitlementCount:0,
    unresolvedRefundCount:0,
    unresolvedChargebackCount:0,
    appleProviderConnected:false,
    googleProviderConnected:false,
    realWorldProcessorConnected:false,
    webhookSignatureVerificationReady:true,
    immutableLedgerReady:true,
    restoreReady:true,
    gracePeriodReady:true,
    refundWorkflowReady:true,
    taxConfigurationReady:false,
    fraudReviewReady:true,
    financeReconciliationReady:false,
    catalogVerificationReady:true,
    renewalOwnershipReady:true,
    restoreSessionReady:true,
    boundedReversalReady:true,
    refundAuditReady:true,
    financeProvenanceReady:true,
    protectedFreeCapabilitiesReady:true,
    unitEconomics:{grossRevenueCents:0,storeAndProcessorFeesCents:0,taxesCents:0,refundsCents:0,chargebacksCents:0,marketplaceCostCents:0,supportCostCents:0,acquisitionCostCents:0},
  });
  const pilotReadinessSnapshot=buildPilotReadinessSnapshot({
    pilotCity:'Toronto',
    hostedBackendVerified:false,
    authDeliveryVerified:false,
    securityTestsExecuted:false,
    iosDeviceJourneyPassed:false,
    androidDeviceJourneyPassed:false,
    trustOpsStaffed:false,
    incidentDrillPassed:false,
    liquidityWeeksVerified:0,
    requiredLiquidityWeeks:8,
    providerSandboxVerified:false,
    observabilityAlertDrillPassed:false,
    publicLegalUrlsVerified:false,
    rollbackDrillPassed:false,
  });
  const notificationSnapshot=buildNotificationReadinessSnapshot({
    appEnvironment,
    backendConnected:backendMode==='aws',
    notificationTableReady:true,
    pushTokenStorageReady:true,
    realtimeNotificationsReady:true,
    profileViewThresholdReady:true,
    matchTriggersReady:true,
    sparkAlertsReady:true,
    giftTrackingReady:true,
    dateReminderReady:true,
    safetyAlertsReady:true,
    supportAlertsReady:true,
    memberPreferencesReady:true,
    quietHoursReady:true,
    deepLinkRoutesReady:false,
    pushProviderConfigured:false,
    serverPushSecretsReady:false,
    rateLimitsReady:true,
    physicalDeviceTested:false,
  });
  const giftFulfillmentSnapshot=buildGiftFulfillmentReadinessSnapshot({
    appEnvironment,
    giftOrderingConfigured,
    catalogItemCount:runtime.physicalGiftCount,
    cityCoverageCount:5,
    signedPartnerCount:0,
    hasServerOwnedPricing:true,
    hasRecipientConsentFlow:true,
    hasPrivateAddressHandling:true,
    hasProviderApi:giftOrderingConfigured,
    hasCourierTracking:giftOrderingConfigured,
    hasWebhookReconciliation:false,
    hasPaymentAuthorization:paymentsConfigured,
    hasRefundPolicy:true,
    hasSupportSla:trustOpsSnapshot.status==='Ready for staffed pilot',
    hasAbuseLimits:true,
    hasGiftNotificationFlow:true,
    hasPhysicalDeviceQa:false,
    productionLocked:appEnvironment==='production'&&giftOrderingConfigured&&paymentsConfigured,
  });
  const placesReservationSnapshot=buildPlacesReservationReadinessSnapshot({
    appEnvironment,
    venueCount:runtime.venueCount,
    cityCount:runtime.cityCount,
    categoryCount:runtime.categoryCount,
    packageCount:runtime.packageCount,
    partnerLeadCount:runtime.partnerLeadCount,
    signedPartnerCount:runtime.signedPartnerCount,
    hasSearch:true,
    hasSafeFirstDateFilter:true,
    hasLocationConsent:true,
    hasSafetyCheckIns:true,
    livePlacesProviderConnected:false,
    hasHoursRatingsMaps:false,
    reservationProviderConnected:false,
    reservationHoldFlowReady:true,
    availabilitySyncReady:false,
    paymentWebhookConnected:paymentsConfigured,
    refundPolicyReady:false,
    supportSlaHours:48,
    safetyStaffingReady:false,
    deepLinkRoutesReady:false,
    physicalDeviceQaReady:false,
    productionLocked:appEnvironment==='production'&&paymentsConfigured,
  });
  const observabilitySnapshot=buildObservabilityReadinessSnapshot({
    appEnvironment,
    telemetryAdapterReady:true,
    privacySafeEventBuilderReady:true,
    sensitiveMetadataRedactionReady:true,
    allowedEventCount:8,
    criticalEventCount:8,
    consentControlsReady:true,
    analyticsOptOutReady:true,
    dataRetentionPolicyReady:true,
    dataSafetyDisclosureReady:true,
    crashBoundaryReady:true,
    crashProviderConfigured:false,
    performanceMonitoringReady:false,
    dashboardReady:false,
    providerSecretsServerSide:false,
    alertOwnerReady:false,
    alertSlaMinutes:60,
    physicalDeviceQaReady:false,
    productionLocked:appEnvironment==='production'&&requiresRealBackend,
  });
  const abuseFraudSnapshot=buildAbuseFraudReadinessSnapshot({
    appEnvironment,
    romanceScamRulesReady:true,
    moneyOffAppLocationRulesReady:true,
    messageSafetyScannerReady:true,
    reportBlockFlowReady:true,
    blockGraphReady:true,
    giftPaymentVelocityLimitsReady:true,
    roseSparkDailyLimitsReady:true,
    refundDisputeReviewReady:true,
    profileReverificationReady:true,
    trustedVouchReady:true,
    duplicateAccountRulesReady:true,
    deviceRiskProviderConnected:false,
    captchaRiskProviderConnected:false,
    adminFreezeActionsReady:true,
    evidenceAuditReady:true,
    appealSupportReady:true,
    safetyEducationReady:true,
    physicalDeviceQaReady:false,
    productionLocked:appEnvironment==='production'&&requiresRealBackend,
  });
  const visibleQueue=tab==='queue'?queue:queue.filter(item=>item.humanReviewRequired);
  const qualitySnapshot=buildProductQualitySnapshot({
    hasBottomNavScreens:['home','discovery','coach','executive','likes','chat','profile'],
    hasSafetyActions:true,
    hasSupportFlow:true,
    hasPricingFlow:true,
    hasResponsiveShell:true,
    hasBackendConnected:backendMode==='aws',
  });
  const interactionSnapshot=buildInteractionAuditSnapshot();
  const policyComplianceSnapshot=buildPolicyComplianceSnapshot({
    hasReportFlow:true,
    hasBlockFlow:true,
    hasModerationQueue:true,
    hasCommunityGuidelines:true,
    hasAgeGate:true,
    hasAccountDeletion:true,
    hasPrivacyPolicy:true,
    hasDataSafetyDisclosure:true,
    hasSubscriptionDisclosure:true,
    hasLocationConsent:true,
    hasGiftRecipientConsent:true,
    hasSafetyCheckIns:true,
  });
  const storeReviewSnapshot=buildStoreReviewSnapshot({
    appEnvironment,
    backendMode,
    demoOtpFallbackAllowed:runtime.allowsPreviewOtpFallback,
    reviewerAccessConfigured:false,
    supportContactConfigured:false,
    legalUrlsPublished:false,
  });
  const storeReviewReady=(id:string)=>storeReviewSnapshot.items.find(item=>item.id===id)?.ready??false;
  const legalOpsSnapshot=buildLegalStoreOpsSnapshot({
    privacyPolicyDrafted:true,
    termsDrafted:true,
    communityGuidelinesDrafted:true,
    companyDetailsFinal:false,
    legalReviewComplete:false,
    privacyUrlPublished:false,
    termsUrlPublished:false,
    supportUrlPublished:false,
    dataSafetyDrafted:true,
    appStorePrivacyLabelsReady:false,
    playDataSafetyReady:true,
    ageRatingReady:false,
    subscriptionDisclosureReady:true,
    accountDeletionReady:true,
    reviewerAccessReady:storeReviewReady('reviewer_credentials')&&storeReviewReady('review_notes'),
    productionDemoGuardReady:storeReviewReady('production_demo_guard'),
    supportContactReady:true,
  });
  const releaseSnapshot=buildReleaseReadinessSnapshot({
    backendConnected:backendMode==='aws',
    paymentsConnected:paymentsConfigured,
    giftProviderConnected:giftOrderingConfigured,
    placesProviderConnected:false,
    pushNotificationsConnected:false,
    observabilityConnected:observabilitySnapshot.status==='Ready for monitored launch',
    hasStoreAssets:true,
    hasStoreListing:true,
    hasStoreReviewAccess:storeReviewReady('reviewer_credentials')&&storeReviewReady('review_notes'),
    hasProductionDemoGuard:storeReviewReady('production_demo_guard'),
    hasPrivacyPolicy:true,
    hasTerms:true,
    hasCommunityGuidelines:true,
    hasPolicyCompliance:policyComplianceSnapshot.blockers.length===0,
    hasDataSafety:true,
    hasAgeGate:true,
    hasDataDeletion:true,
    hasSafetyOperations:true,
    hasAbuseFraudProtection:abuseFraudSnapshot.status!=='Abuse setup needed',
    hasProductQA:qualitySnapshot.blockers.length===0,
    hasInteractionQA:interactionSnapshot.criticalMissing.length===0,
  });
  const marketplaceSnapshot=runtime.marketplaceSnapshot;
  const networkSnapshot=buildNetworkEffectPlan({matches,selectedCities:[],verified:true,vouchesCount:3});
  const cityDensitySnapshot=buildCityDensitySnapshot({
    liveMetricsConnected:false,
    measurements:[],
    metricIngestionReady:true,
    privacySuppressionReady:true,
    discoveryEnforcementReady:true,
    dualApprovalReady:true,
    rollbackReady:true,
  });
  const growthEngineSnapshot=buildGrowthEngineSnapshot({
    liveInstrumentationConnected:false,
    mappedEvents:growthFunnelEvents.length,
    liveEventCount:0,
    attributionConnected:false,
    experimentRegistryConnected:false,
    cohortDashboardConnected:false,
    referralVerificationConnected:false,
    activeExperiments:0,
    verifiedConversions:0,
    serverVerifiedOutcomesReady:true,
    campaignGovernanceReady:true,
    experimentSafetyControlsReady:true,
    referralRiskLedgerReady:true,
    consentWithdrawalReady:true,
    cohortProvenanceReady:true,
  });
  const p1Snapshot=buildP1OperationsSnapshot({
    hasDateMarketplacePreview:marketplaceSnapshot.ready,
    hasLiveVenueProvider:false,
    hasReservationProvider:false,
    launchCityCount:networkSnapshot.launchCities.length,
    hasWaitlistModel:true,
    hasReferralRewards:true,
    hasAmbassadorModel:true,
    hasIndianEvents:runtime.eventCount>=3,
    hasAlumniGroups:true,
    hasSuccessStoriesModel:true,
    hasTrustOpsQueue:true,
    hasSupportSla:trustOpsSnapshot.status==='Ready for staffed pilot',
    hasLegalDrafts:legalOpsSnapshot.gates.some(gate=>gate.id==='legal_documents'&&gate.started),
    legalUrlsPublished:legalOpsSnapshot.gates.some(gate=>gate.id==='public_urls'&&gate.ready),
  });
  const updateCase=(item:ModerationQueueItem,status:ModerationStatus,note:string)=>{
    setCaseStatus(current=>({...current,[item.id]:status}));
    setOpsNote(`${item.member}: ${note}`);
  };
  const automationGuards=[
    ['Money scam lock','Gift, payment and chat-send limits trigger when money/crypto/gift-card risk is high.'],
    ['Profile integrity','Photo edits and verification mismatches create a trust-review case before more discovery exposure.'],
    ['Block graph','Blocked and reported members are removed across discovery, likes and chat.'],
    ['Human override','Critical actions require an audit trail and reviewer note before permanent ban.'],
    ['Appeal route','Members can contact support if a decision affects access or billing.'],
  ] as const;
  const giftCommerceOps=buildGiftOperationsSnapshot({staleInventoryCities:0,lowStockItems:3,failedProviderJobs:0,failedNotifications:0,openDisputes:reports.filter(report=>/gift|delivery|damaged/i.test(`${report.reason} ${report.details??''}`)).length});
  return <LinearGradient colors={['#FFFDFC',colors.black,colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={coachStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Trust Ops Preview</Text></View><ScrollView contentContainerStyle={coachStyles.content} showsVerticalScrollIndicator={false}>
    <View style={ventureStyles.hero}><PremiumIcon name="analytics" tone="plum" size={70} iconSize={32}/><Text style={launchStyles.scriptHero}>Safety scales with operations</Text><Text style={[shared.h1,{textAlign:'center'}]}>Moderation dashboard.</Text><Text style={[shared.body,{textAlign:'center'}]}>Reports, blocks, scam signals, trust checks and support escalations now flow into one human-review queue.</Text></View>
    <View style={adminOpsStyles.statGrid}><AdminOpsStat value={`${summary.total}`} label="open cases"/><AdminOpsStat value={`${summary.highOrCritical}`} label="high risk"/><AdminOpsStat value={`${summary.humanReview}`} label="human review"/><AdminOpsStat value={`${summary.fastestSlaHours}h`} label="fastest SLA"/></View>
    <GiftCommerceOpsCard snapshot={giftCommerceOps}/>
    <TrustOpsSlaCard snapshot={trustOpsSnapshot}/>
    <View style={adminOpsStyles.statusCard}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.statusText}>{opsNote}</Text></View>
    <View style={adminOpsStyles.tabRow}>{(['queue','reports','playbooks','audit'] as const).map(item=><Pressable key={item} onPress={()=>setTab(item)} style={[adminOpsStyles.tab,tab===item&&adminOpsStyles.tabOn]}><Text style={[adminOpsStyles.tabText,tab===item&&{color:colors.ivory}]}>{item==='queue'?'Queue':item==='reports'?'Reports':item==='playbooks'?'Playbooks':'Audit'}</Text></Pressable>)}</View>
    {tab==='queue'&&<View style={ventureStyles.section}><Text style={styles.sectionLabel}>LIVE REVIEW QUEUE</Text>{visibleQueue.map(item=><ModerationCaseCard key={item.id} item={item} onFreeze={()=>updateCase(item,'frozen','chat/payment abilities frozen pending review')} onEscalate={()=>updateCase(item,'escalated','escalated to senior Trust Ops')} onResolve={()=>updateCase(item,'resolved','case resolved with reviewer note')} onEvidence={()=>setOpsNote(`${item.member}: evidence packet includes ${item.evidence.join(', ')}`)}/>)}</View>}
    {tab==='reports'&&<View style={ventureStyles.section}><Text style={styles.sectionLabel}>SESSION REPORTS</Text>{reports.length?reports.slice().reverse().map(report=><View key={report.id} style={adminOpsStyles.reportCard}><View style={shared.row}><MiniPremiumIcon name="flag-outline" tone="ruby" size={30} iconSize={14}/><Text style={[styles.cardTitle,{flex:1}]}>Report on {report.matchId}</Text><Text style={adminOpsStyles.timeText}>{new Date(report.createdAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</Text></View><Text style={styles.helper}>{report.reason}</Text>{!!report.details&&<Text style={adminOpsStyles.reportDetails}>{report.details}</Text>}<View style={adminOpsStyles.reportFooter}><Text style={adminOpsStyles.footerText}>Preview session copy · production reports create a private Trust Ops case automatically</Text></View></View>):<View style={adminOpsStyles.emptyCard}><PremiumIcon name="shield-checkmark" tone="gold" size={46} iconSize={21}/><Text style={styles.cardTitle}>No local reports yet</Text><Text style={styles.helper}>Use any profile/chat safety menu → Report to create a live moderation item.</Text></View>}</View>}
    {tab==='playbooks'&&<View style={ventureStyles.section}><Text style={styles.sectionLabel}>AUTOMATION GUARDS</Text>{automationGuards.map(([title,body],index)=><ChecklistRow key={title} title={title} body={body} done={index<3}/>)}
      <View style={coachStyles.boundaryCard}><PremiumIcon name="warning" tone="gold" size={44} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Human-first safety</Text><Text style={styles.helper}>AI can prioritize and freeze risky surfaces, but permanent bans, sensitive identity decisions and billing-impact actions need human review.</Text></View></View>
    </View>}
    {tab==='audit'&&<View style={ventureStyles.section}><PilotReadinessCard snapshot={pilotReadinessSnapshot}/><BackendLaunchGateCard snapshot={backendLaunchSnapshot}/><CityDensityReadinessCard snapshot={cityDensitySnapshot}/><GrowthEngineReadinessCard snapshot={growthEngineSnapshot}/><MonetizationOperationsCard snapshot={monetizationOperationsSnapshot}/><PaymentEntitlementGateCard snapshot={paymentEntitlementSnapshot}/><NotificationReadinessCard snapshot={notificationSnapshot}/><GiftFulfillmentReadinessCard snapshot={giftFulfillmentSnapshot}/><PlacesReservationReadinessCard snapshot={placesReservationSnapshot}/><ObservabilityReadinessCard snapshot={observabilitySnapshot}/><AbuseFraudReadinessCard snapshot={abuseFraudSnapshot}/><TrustOpsSlaCard snapshot={trustOpsSnapshot}/><LegalStoreOpsCard snapshot={legalOpsSnapshot}/><P1OperationsCard snapshot={p1Snapshot}/><ProductQualityCard snapshot={qualitySnapshot}/><InteractionQualityCard snapshot={interactionSnapshot}/><PolicyComplianceCard snapshot={policyComplianceSnapshot}/><StoreReviewCard snapshot={storeReviewSnapshot}/><ReleaseReadinessCard snapshot={releaseSnapshot}/><Text style={styles.sectionLabel}>AUDIT READINESS</Text>{([
      ['Reviewer notes','Every freeze, escalation and resolution needs reviewer ID + note.'],
      ['Evidence packet','Reports, chat IDs, gift/payment events, profile edits and block graph stay linked.'],
      ['Member notification','Warnings and support outcomes are sent without exposing reporter identity.'],
      ['Appeals','Support ticket can reopen a resolved moderation case.'],
      ['Data deletion','Deletion workflow respects safety-retention holds when legally required.'],
    ] as const).map(([title,body],index)=><ChecklistRow key={title} title={title} body={body} done={index<4}/>)}</View>}
  </ScrollView></SafeAreaView></LinearGradient>
}

function AdminOpsStat({value,label}:{value:string;label:string}){
  return <View style={adminOpsStyles.stat}><Text style={adminOpsStyles.statValue}>{value}</Text><Text style={adminOpsStyles.statLabel}>{label}</Text></View>
}

function GiftCommerceOpsCard({snapshot}:{snapshot:ReturnType<typeof buildGiftOperationsSnapshot>}){
  return <View style={adminOpsStyles.backendLaunchCard}><View style={shared.row}><PremiumIcon name="gift" tone={snapshot.health==='healthy'?'gold':'ruby'} size={52} iconSize={24}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>GIFT COMMERCE CONTROL CENTER</Text><Text style={adminOpsStyles.qualityTitle}>{snapshot.health==='healthy'?'Providers healthy':'Operations need attention'}</Text><Text style={styles.helper}>Merchant inventory, courier jobs, confirmations, disputes and retry alerts share one private operations queue.</Text></View></View><View style={adminOpsStyles.areaGrid}>{snapshot.metrics.map(metric=><View key={metric.label} style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>{metric.label}</Text><Text style={adminOpsStyles.areaScore}>{metric.value}</Text></View>)}</View><View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="notifications-outline" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>Provider failures retry with exponential backoff; dead-letter jobs create an incident alert for on-call review.</Text></View></View>
}

function PilotReadinessCard({snapshot}:{snapshot:PilotReadinessSnapshot}){
  const ready=snapshot.status==='Ready for controlled city pilot';
  return <View style={adminOpsStyles.backendLaunchCard}>
    <View style={shared.row}><PremiumIcon name={ready?'rocket':'flag-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>{snapshot.pilotCity.toUpperCase()} CONTROLLED PILOT GATE</Text><Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.evidencePercent}%</Text><Text style={styles.helper}>Only hosted, staffed, device-tested and live operational evidence advances this gate.</Text></View></View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.evidencePercent}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Evidence</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}/{snapshot.total}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Devices</Text><Text style={adminOpsStyles.areaScore}>{snapshot.deviceJourneysPassed}/2</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Liquidity</Text><Text style={adminOpsStyles.areaScore}>{snapshot.liquidityWeeksVerified}/{snapshot.requiredLiquidityWeeks}w</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockers.length}</Text></View></View>
    <View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text></View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><View key={gate.id} style={adminOpsStyles.qualityRow}><MiniPremiumIcon name={gate.ready?'checkmark-circle':'ellipse-outline'} tone={gate.ready?'gold':'ruby'} size={28} iconSize={13}/><View style={{flex:1}}><View style={shared.row}><Text style={[adminOpsStyles.qualityRowTitle,{flex:1}]}>{gate.title}</Text><Text style={adminOpsStyles.nextTiny}>{gate.owner}</Text></View><Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>{!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}</View></View>)}</View>
  </View>
}

function CityDensityReadinessCard({snapshot}:{snapshot:CityDensitySnapshot}){
  return <View style={cityDensityStyles.auditCard}>
    <View style={shared.row}><PremiumIcon name="map" tone="gold" size={48} iconSize={22}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>CITY DENSITY GATE</Text><Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text><Text style={styles.helper}>Liquidity is measured by reciprocal candidates and healthy outcomes, never waitlist size alone.</Text></View></View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Source</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlScore}%</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Controls</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlReady}/{snapshot.sourceControlTotal}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Expansion</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyMarkets}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Live data</Text><Text style={adminOpsStyles.areaScore}>{snapshot.liveMetricsConnected?'Yes':'No'}</Text></View></View>
    <View style={cityDensityStyles.marketGrid}>{snapshot.markets.map(market=><View key={market.city} style={cityDensityStyles.marketCard}><View style={shared.row}><Text style={cityDensityStyles.marketName}>{market.city}</Text><Text style={cityDensityStyles.marketScore}>{market.score}%</Text></View><Text style={cityDensityStyles.marketStatus}>{market.status}</Text><Text style={cityDensityStyles.marketBody}>{market.nextAction}</Text></View>)}</View>
    <View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="arrow-forward-circle" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text></View>
  </View>
}

function GrowthEngineReadinessCard({snapshot}:{snapshot:GrowthEngineSnapshot}){
  return <View style={cityDensityStyles.auditCard}>
    <View style={shared.row}><PremiumIcon name="trending-up" tone="rose" size={48} iconSize={22}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>GROWTH ENGINE GATE</Text><Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text><Text style={styles.helper}>Growth is measured from verified profile to retained member and accepted date, with consent and safety guardrails.</Text></View></View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Source</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlScore}%</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Controls</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlReady}/{snapshot.sourceControlTotal}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Live events</Text><Text style={adminOpsStyles.areaScore}>{snapshot.liveEventCount}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Conversions</Text><Text style={adminOpsStyles.areaScore}>{snapshot.verifiedConversions}</Text></View></View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.blockers.map((blocker,index)=><View key={blocker} style={adminOpsStyles.qualityRow}><MiniPremiumIcon name={index===0?'analytics-outline':'lock-closed-outline'} tone="rose" size={28} iconSize={13}/><Text style={[adminOpsStyles.qualityRowBody,{flex:1}]}>{blocker}</Text></View>)}</View>
    <View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="arrow-forward-circle" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text></View>
  </View>
}

function backendLaunchGateIcon(id: BackendLaunchGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<BackendLaunchGate['id'], keyof typeof Ionicons.glyphMap> = {
    client_config: 'server-outline',
    auth_providers: 'key-outline',
    schema_migrations: 'git-branch-outline',
    rls_security: 'lock-closed-outline',
    realtime_persistence: 'sync-circle-outline',
    storage_media: 'images-outline',
    edge_functions: 'flash-outline',
    secrets_environment: 'document-lock-outline',
    backup_monitoring: 'pulse-outline',
  };
  return icons[id];
}

function BackendLaunchGateCard({snapshot}:{snapshot:BackendLaunchSnapshot}){
  const ready=snapshot.status==='Ready for production backend';
  return <View style={adminOpsStyles.backendLaunchCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'cloud-done':'cloud-upload-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>AWS BACKEND INTEGRATION GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} backend gates ready. Schema can be ready while OTP/SMS, server secrets and monitoring remain final launch work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Schema</Text><Text style={adminOpsStyles.areaScore}>{snapshot.schemaCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Realtime</Text><Text style={adminOpsStyles.areaScore}>{snapshot.realtimeModules}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Providers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.providerModules}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockers.length}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><BackendLaunchGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function BackendLaunchGateRow({gate}:{gate:BackendLaunchGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':backendLaunchGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function paymentEntitlementGateIcon(id: PaymentEntitlementGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<PaymentEntitlementGate['id'], keyof typeof Ionicons.glyphMap> = {
    product_catalog: 'pricetags-outline',
    checkout_surface: 'card-outline',
    store_products: 'storefront-outline',
    receipt_verification: 'receipt-outline',
    entitlement_limits: 'key-outline',
    restore_disclosure: 'refresh-circle-outline',
    real_world_payments: 'wallet-outline',
    refund_safety_ops: 'shield-checkmark-outline',
    production_lock: 'lock-closed-outline',
  };
  return icons[id];
}

function MonetizationOperationsCard({snapshot}:{snapshot:MonetizationOperationsSnapshot}){
  const ready=snapshot.status==='Ready for controlled billing pilot';
  return <View style={adminOpsStyles.paymentEntitlementCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'cash':'analytics-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>MONETIZATION OPERATIONS GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.evidencePercent}%</Text>
        <Text style={styles.helper}>Live receipts, provider reconciliation and finance evidence stay at zero until real sandbox/store transactions are verified.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.evidencePercent}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Receipts</Text><Text style={adminOpsStyles.areaScore}>{snapshot.liveReceiptCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Verified</Text><Text style={adminOpsStyles.areaScore}>{snapshot.verifiedReceiptRate}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Source</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlScore}/10</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Controls</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlReady}/{snapshot.sourceControlTotal}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text></View>
    <View style={adminOpsStyles.qualityRows}>
      {['Verified store catalog + renewal ownership','Signed retryable webhooks + bounded reversal','Restore sessions + immutable entitlement ledger','Qualified refund audit + finance provenance','Safety, report, block and privacy remain free'].map(item=><View key={item} style={adminOpsStyles.qualityRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><View style={{flex:1}}><Text style={adminOpsStyles.qualityRowTitle}>{item}</Text><Text style={adminOpsStyles.qualityRowBody}>Source control implemented; live provider and finance evidence is still required.</Text></View></View>)}
    </View>
  </View>
}

function PaymentEntitlementGateCard({snapshot}:{snapshot:PaymentEntitlementSnapshot}){
  const ready=snapshot.status==='Ready for paid launch';
  return <View style={adminOpsStyles.paymentEntitlementCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'card':'card-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>PAYMENTS / ENTITLEMENTS GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} billing gates ready. Paid UI can be preview-ready while App Store products, receipts and webhooks remain final launch work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Products</Text><Text style={adminOpsStyles.areaScore}>{snapshot.paidProductCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}/{snapshot.total}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><PaymentEntitlementGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function PaymentEntitlementGateRow({gate}:{gate:PaymentEntitlementGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':paymentEntitlementGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function notificationGateIcon(id: NotificationGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<NotificationGate['id'], keyof typeof Ionicons.glyphMap> = {
    schema_tokens: 'server-outline',
    permission_preferences: 'options-outline',
    event_triggers: 'flash-outline',
    push_provider: 'notifications-outline',
    deep_links: 'link-outline',
    rate_limits: 'timer-outline',
    safety_support_alerts: 'shield-checkmark-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function NotificationReadinessCard({snapshot}:{snapshot:NotificationReadinessSnapshot}){
  const ready=snapshot.status==='Ready for notification launch';
  return <View style={adminOpsStyles.notificationCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'notifications':'notifications-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>NOTIFICATIONS / ALERTS GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} notification gates ready. Push provider and physical-device QA stay final launch work until real credentials are connected.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Events</Text><Text style={adminOpsStyles.areaScore}>{snapshot.eventCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}/{snapshot.total}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><NotificationGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function NotificationGateRow({gate}:{gate:NotificationGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':notificationGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function giftFulfillmentGateIcon(id: GiftFulfillmentGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<GiftFulfillmentGate['id'], keyof typeof Ionicons.glyphMap> = {
    catalog_pricing: 'pricetags-outline',
    recipient_consent: 'hand-left-outline',
    provider_coverage: 'storefront-outline',
    payment_capture: 'card-outline',
    order_tracking: 'bicycle-outline',
    privacy_safety: 'lock-closed-outline',
    support_refunds: 'headset-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function GiftFulfillmentReadinessCard({snapshot}:{snapshot:GiftFulfillmentReadinessSnapshot}){
  const ready=snapshot.status==='Ready for live gift orders';
  return <View style={adminOpsStyles.giftFulfillmentCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'gift':'gift-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>GIFT FULFILLMENT GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} gift operations ready. Catalog and private-recipient preview can be ready while delivery partners, webhooks and live QA remain final launch work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Catalog</Text><Text style={adminOpsStyles.areaScore}>{snapshot.catalogItemCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Coverage</Text><Text style={adminOpsStyles.areaScore}>{snapshot.providerCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><GiftFulfillmentGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function GiftFulfillmentGateRow({gate}:{gate:GiftFulfillmentGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':giftFulfillmentGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function placesReservationGateIcon(id: PlacesReservationGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<PlacesReservationGate['id'], keyof typeof Ionicons.glyphMap> = {
    curated_inventory: 'map-outline',
    places_provider: 'business-outline',
    reservation_provider: 'calendar-outline',
    packages_partners: 'restaurant-outline',
    safety_location: 'shield-checkmark-outline',
    payments_refunds: 'card-outline',
    support_operations: 'headset-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function PlacesReservationReadinessCard({snapshot}:{snapshot:PlacesReservationReadinessSnapshot}){
  const ready=snapshot.status==='Ready for live reservations';
  return <View style={adminOpsStyles.placesReservationCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'calendar':'calendar-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>PLACES / RESERVATION GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} venue gates ready. Curated places can be preview-ready while live hours, reservations, refunds and provider QA remain final launch work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Venues</Text><Text style={adminOpsStyles.areaScore}>{snapshot.venueCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Cities</Text><Text style={adminOpsStyles.areaScore}>{snapshot.cityCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Partners</Text><Text style={adminOpsStyles.areaScore}>{snapshot.partnerCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><PlacesReservationGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function PlacesReservationGateRow({gate}:{gate:PlacesReservationGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':placesReservationGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function observabilityGateIcon(id: ObservabilityGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<ObservabilityGate['id'], keyof typeof Ionicons.glyphMap> = {
    privacy_boundary: 'shield-checkmark-outline',
    event_taxonomy: 'list-outline',
    consent_retention: 'options-outline',
    crash_capture: 'bug-outline',
    performance_monitoring: 'speedometer-outline',
    provider_security: 'key-outline',
    alerting_ownership: 'alarm-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function ObservabilityReadinessCard({snapshot}:{snapshot:ObservabilityReadinessSnapshot}){
  const ready=snapshot.status==='Ready for monitored launch';
  return <View style={adminOpsStyles.observabilityCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'pulse':'pulse-outline'} tone={ready?'gold':'plum'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>OBSERVABILITY / PRIVACY GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} monitoring gates ready. Analytics and crash providers stay final launch work, but event payloads must remain privacy-safe now.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Events</Text><Text style={adminOpsStyles.areaScore}>{snapshot.eventCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}/{snapshot.total}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><ObservabilityGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function ObservabilityGateRow({gate}:{gate:ObservabilityGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':observabilityGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function abuseFraudGateIcon(id: AbuseFraudGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<AbuseFraudGate['id'], keyof typeof Ionicons.glyphMap> = {
    romance_scam_rules: 'warning-outline',
    message_safety_scanner: 'chatbubble-ellipses-outline',
    report_block_graph: 'ban-outline',
    paid_action_abuse: 'card-outline',
    account_integrity: 'person-circle-outline',
    fraud_providers: 'finger-print-outline',
    freeze_evidence_actions: 'snow-outline',
    member_education: 'school-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function AbuseFraudReadinessCard({snapshot}:{snapshot:AbuseFraudReadinessSnapshot}){
  const ready=snapshot.status==='Ready for safe scale';
  return <View style={adminOpsStyles.abuseFraudCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'shield-checkmark':'shield-half-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>ABUSE / FRAUD PROTECTION GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} protection gates ready. Core anti-scam rules are app-ready; device risk, CAPTCHA and real-device drills remain final scale work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Core</Text><Text style={adminOpsStyles.areaScore}>{snapshot.coreProtectionScore}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Provider</Text><Text style={adminOpsStyles.areaScore}>{snapshot.providerProtectionScore}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><AbuseFraudGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function AbuseFraudGateRow({gate}:{gate:AbuseFraudGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':abuseFraudGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function trustOpsGateIcon(id: TrustOpsGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<TrustOpsGate['id'], keyof typeof Ionicons.glyphMap> = {
    reviewer_staffing: 'people-outline',
    sla_coverage: 'time-outline',
    critical_escalation: 'warning-outline',
    evidence_audit: 'folder-open-outline',
    member_safety_actions: 'shield-checkmark-outline',
    appeals_support: 'headset-outline',
    reviewer_access: 'key-outline',
    incident_drill: 'stopwatch-outline',
  };
  return icons[id];
}

function TrustOpsSlaCard({snapshot}:{snapshot:TrustOpsSnapshot}){
  const ready=snapshot.status==='Ready for staffed pilot';
  return <View style={adminOpsStyles.trustOpsCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'shield-checkmark':'shield-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>TRUST OPS SLA</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} safety operations gates ready. Source controls exist; staffing, access and drill evidence still decide launch readiness.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Reviewers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.requiredReviewers}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Fastest SLA</Text><Text style={adminOpsStyles.areaScore}>{snapshot.fastestSlaHours}h</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>High risk</Text><Text style={adminOpsStyles.areaScore}>{snapshot.highRiskCases}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Human review</Text><Text style={adminOpsStyles.areaScore}>{snapshot.humanReviewCases}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><TrustOpsGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function TrustOpsGateRow({gate}:{gate:TrustOpsGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':trustOpsGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function legalStoreOpsGateIcon(id: LegalStoreOpsGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<LegalStoreOpsGate['id'], keyof typeof Ionicons.glyphMap> = {
    legal_documents: 'document-text-outline',
    public_urls: 'globe-outline',
    data_safety_labels: 'shield-checkmark-outline',
    store_review_pack: 'storefront-outline',
    subscription_disclosure: 'card-outline',
    age_delete_controls: 'person-remove-outline',
  };
  return icons[id];
}

function LegalStoreOpsCard({snapshot}:{snapshot:LegalStoreOpsSnapshot}){
  const ready=snapshot.status==='Ready for store submission';
  return <View style={adminOpsStyles.legalOpsCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'ribbon':'document-lock-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>LEGAL / STORE OPS</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} store/legal gates ready. This keeps Play Store/App Store submission honest before production provider keys go live.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockers.length}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Public URLs</Text><Text style={adminOpsStyles.areaScore}>{snapshot.gates.find(gate=>gate.id==='public_urls')?.ready?'Ready':'No'}</Text></View>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><LegalStoreOpsGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function LegalStoreOpsGateRow({gate}:{gate:LegalStoreOpsGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':legalStoreOpsGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function P1OperationsCard({snapshot}:{snapshot:P1OperationsSnapshot}){
  return <View style={adminOpsStyles.releaseCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.status==='P1 ready'?'rocket':'layers-outline'} tone={snapshot.status==='P1 ready'?'gold':'rose'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>P1 OPERATIONS</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount} ready · {snapshot.startedCount} started · {snapshot.blockedCount} blocked. This is the bridge from polished MVP to real city operations.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Started</Text><Text style={adminOpsStyles.areaScore}>{snapshot.startedCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blocked</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockedCount}</Text></View>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.items.map(item=><P1OperationRow key={item.id} item={item}/>)}</View>
  </View>
}

function P1OperationRow({item}:{item:P1OperationItem}){
  const tone:PremiumIconTone=item.status==='ready'?'gold':item.status==='started'?'rose':'ruby';
  const icon=item.status==='ready'?'checkmark-circle':item.status==='started'?'construct-outline':'alert-circle-outline';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={icon} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <View style={shared.row}>
        <Text style={[adminOpsStyles.qualityRowTitle,{flex:1}]}>{item.title}</Text>
        {item.storeCritical&&<View style={adminOpsStyles.storeCriticalPill}><Text style={adminOpsStyles.storeCriticalText}>Store</Text></View>}
      </View>
      <Text style={adminOpsStyles.qualityRowBody}>{item.body}</Text>
      {item.status!=='ready'&&<Text style={adminOpsStyles.nextTiny}>Next: {item.nextStep}</Text>}
    </View>
  </View>
}

function ProductQualityCard({snapshot}:{snapshot:ReturnType<typeof buildProductQualitySnapshot>}){
  const status=snapshot.blockers.length?'Needs fixes':snapshot.important.length?'Almost ready':'Ready';
  return <View style={adminOpsStyles.qualityCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.blockers.length?'warning':'checkmark-circle'} tone={snapshot.blockers.length?'ruby':'gold'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>PRODUCT QA</Text>
        <Text style={adminOpsStyles.qualityTitle}>{status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyItems}/{snapshot.totalItems} readiness checks complete. Backend remains last by design.</Text>
      </View>
      <Text style={adminOpsStyles.qualityScore}>{snapshot.score}</Text>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.items.map(item=><ProductQualityRow key={item.id} item={item}/>)}</View>
  </View>
}

function ProductQualityRow({item}:{item:ProductQualityItem}){
  const tone:PremiumIconTone=item.ready?'gold':item.severity==='blocker'?'ruby':'rose';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={item.ready?'checkmark-circle':item.severity==='blocker'?'alert-circle-outline':'time-outline'} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{item.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{item.body}</Text>
    </View>
  </View>
}

function InteractionQualityCard({snapshot}:{snapshot:InteractionAuditSnapshot}){
  const criticalOk=snapshot.criticalMissing.length===0;
  const topAreas=snapshot.areaSummary.filter(area=>area.total>=3).slice(0,6);
  return <View style={adminOpsStyles.interactionCard}>
    <View style={shared.row}>
      <PremiumIcon name={criticalOk?'flash':'warning'} tone={criticalOk?'gold':'ruby'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>INTERACTION QA</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.score}% button-flow coverage</Text>
        <Text style={styles.helper}>{snapshot.implemented}/{snapshot.total} important interactions mapped · {snapshot.criticalTotal} critical actions protected.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.areaGrid}>{topAreas.map(area=><View key={area.area} style={adminOpsStyles.areaPill}>
      <Text style={adminOpsStyles.areaLabel}>{area.area.replace('_',' ')}</Text>
      <Text style={adminOpsStyles.areaScore}>{area.implemented}/{area.total}</Text>
    </View>)}</View>
    <View style={adminOpsStyles.interactionNotice}>
      <MiniPremiumIcon name={criticalOk?'checkmark-circle':'alert-circle-outline'} tone={criticalOk?'gold':'ruby'} size={30} iconSize={14}/>
      <Text style={adminOpsStyles.interactionNoticeText}>{criticalOk?'No critical interaction gaps detected. Chat tools, gifts, pricing, safety, support and dates have mapped outcomes.':`${snapshot.criticalMissing.length} critical interaction(s) need attention before release.`}</Text>
    </View>
  </View>
}

function PolicyComplianceCard({snapshot}:{snapshot:PolicyComplianceSnapshot}){
  return <View style={adminOpsStyles.releaseCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.ready?'shield-checkmark':'shield-outline'} tone={snapshot.ready?'gold':'rose'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>DATING POLICY COMPLIANCE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.ready?'Policy-ready':'Policy blockers'} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} store-policy controls ready for dating, chat, subscriptions, safety and real-world meetups.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>{snapshot.items.map(item=><View key={item.id} style={adminOpsStyles.areaPill}>
      <Text style={adminOpsStyles.areaLabel}>{item.area.replace('_',' ')}</Text>
      <Text style={adminOpsStyles.areaScore}>{item.ready?'Ready':'Check'}</Text>
    </View>)}</View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.items.map(item=><View key={item.id} style={adminOpsStyles.qualityRow}>
      <MiniPremiumIcon name={item.ready?'checkmark-circle':'alert-circle-outline'} tone={item.ready?'gold':'ruby'} size={28} iconSize={13}/>
      <View style={{flex:1}}>
        <Text style={adminOpsStyles.qualityRowTitle}>{item.title}</Text>
        <Text style={adminOpsStyles.qualityRowBody}>{item.body}</Text>
      </View>
    </View>)}</View>
  </View>
}

function StoreReviewCard({snapshot}:{snapshot:StoreReviewSnapshot}){
  return <View style={adminOpsStyles.releaseCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.ready?'storefront':'clipboard'} tone={snapshot.ready?'gold':'rose'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>STORE REVIEW PACK</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.ready?'Reviewer-ready':'Reviewer blockers'} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} review checks complete. This is the handoff reviewers need to enter and test the app.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.releaseList}>
      <Text style={adminOpsStyles.releaseListTitle}>Reviewer instructions</Text>
      {snapshot.reviewerInstructions.map((instruction,index)=><View key={instruction} style={adminOpsStyles.releaseGateRow}>
        <MiniPremiumIcon name={index<2?'key-outline':'navigate-circle-outline'} tone={index<2?'gold':'rose'} size={28} iconSize={13}/>
        <Text style={[adminOpsStyles.qualityRowBody,{flex:1}]}>{instruction}</Text>
      </View>)}
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.items.map(item=><View key={item.id} style={adminOpsStyles.qualityRow}>
      <MiniPremiumIcon name={item.ready?'checkmark-circle':'alert-circle-outline'} tone={item.ready?'gold':'ruby'} size={28} iconSize={13}/>
      <View style={{flex:1}}>
        <Text style={adminOpsStyles.qualityRowTitle}>{item.title}</Text>
        <Text style={adminOpsStyles.qualityRowBody}>{item.body}</Text>
      </View>
    </View>)}</View>
  </View>
}

function ReleaseReadinessCard({snapshot}:{snapshot:ReleaseReadinessSnapshot}){
  const finalItems=snapshot.finalConnection.slice(0,5);
  return <View style={adminOpsStyles.releaseCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.storeReady?'rocket':'cloud-upload-outline'} tone={snapshot.storeReady?'gold':'rose'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>STORE RELEASE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.storeReady?'Store ready':'Final connections pending'}</Text>
        <Text style={styles.helper}>Preview {snapshot.previewScore}% · Store-critical {snapshot.storeScore}% · {snapshot.storeBlockers.length} store blocker(s).</Text>
      </View>
    </View>
    <View style={adminOpsStyles.releaseMeterRow}>
      <ReleaseMeter label="Preview" value={snapshot.previewScore}/>
      <ReleaseMeter label="Store" value={snapshot.storeScore}/>
    </View>
    {finalItems.length>0&&<View style={adminOpsStyles.releaseList}>
      <Text style={adminOpsStyles.releaseListTitle}>Final connection items</Text>
      {finalItems.map(item=><ReleaseGateRow key={item.id} gate={item}/>)}
    </View>}
    {snapshot.blockers.length>0&&<View style={adminOpsStyles.releaseList}>
      <Text style={adminOpsStyles.releaseListTitle}>Must fix before preview</Text>
      {snapshot.blockers.map(item=><ReleaseGateRow key={item.id} gate={item}/>)}
    </View>}
  </View>
}

function ReleaseMeter({label,value}:{label:string;value:number}){
  return <View style={adminOpsStyles.releaseMeter}>
    <View style={shared.row}><Text style={adminOpsStyles.releaseMeterLabel}>{label}</Text><View style={shared.spacer}/><Text style={adminOpsStyles.releaseMeterValue}>{value}%</Text></View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${value}%`}]}/></View>
  </View>
}

function ReleaseGateRow({gate}:{gate:ReleaseGate}){
  const tone:PremiumIconTone=gate.status==='ready'?'gold':gate.status==='blocked'?'ruby':'rose';
  const icon=gate.status==='ready'?'checkmark-circle':gate.status==='blocked'?'alert-circle-outline':'construct-outline';
  return <View style={adminOpsStyles.releaseGateRow}>
    <MiniPremiumIcon name={icon} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
    </View>
  </View>
}

function ModerationCaseCard({item,onFreeze,onEscalate,onResolve,onEvidence}:{item:ModerationQueueItem;onFreeze:()=>void;onEscalate:()=>void;onResolve:()=>void;onEvidence:()=>void}){
  const riskStyle=item.risk==='Critical'?adminOpsStyles.riskCritical:item.risk==='High'?adminOpsStyles.riskHigh:item.risk==='Medium'?adminOpsStyles.riskMedium:adminOpsStyles.riskLow;
  return <View style={adminOpsStyles.caseCard}>
    <View style={shared.row}>
      <View style={[adminOpsStyles.riskDot,riskStyle]}/>
      <View style={{flex:1}}>
        <Text style={styles.cardTitle}>{item.member}</Text>
        <Text style={adminOpsStyles.caseMeta}>{item.category.replace('_',' ')} · SLA {item.slaHours}h · score {item.riskScore}</Text>
      </View>
      <View style={[adminOpsStyles.riskPill,riskStyle]}><Text style={adminOpsStyles.riskText}>{item.risk}</Text></View>
    </View>
    <Text style={styles.helper}>{item.reason}</Text>
    <View style={adminOpsStyles.evidenceWrap}>{item.evidence.map(evidence=><View key={evidence} style={adminOpsStyles.evidencePill}><Text style={adminOpsStyles.evidenceText}>{evidence}</Text></View>)}</View>
    <View style={ventureStyles.nextStep}><MiniPremiumIcon name="construct" tone="rose" size={30} iconSize={14}/><Text style={ventureStyles.nextText}>{item.action}</Text></View>
    <View style={adminOpsStyles.caseFooter}>
      <ModerationStatusPill status={item.status}/>
      {item.humanReviewRequired&&<View style={adminOpsStyles.reviewPill}><Text style={adminOpsStyles.reviewText}>Human review</Text></View>}
      {item.canAutoHide&&<View style={adminOpsStyles.autoPill}><Text style={adminOpsStyles.autoText}>Auto-hide eligible</Text></View>}
    </View>
    <View style={adminOpsStyles.actionRow}>
      <Pressable onPress={onEvidence} style={adminOpsStyles.ghostAction}><Text style={adminOpsStyles.ghostActionText}>Evidence</Text></Pressable>
      <Pressable onPress={onFreeze} style={adminOpsStyles.ghostAction}><Text style={adminOpsStyles.ghostActionText}>Freeze</Text></Pressable>
      <Pressable onPress={onEscalate} style={adminOpsStyles.primaryAction}><Text style={adminOpsStyles.primaryActionText}>Escalate</Text></Pressable>
      <Pressable onPress={onResolve} style={adminOpsStyles.ghostAction}><Text style={adminOpsStyles.ghostActionText}>Resolve</Text></Pressable>
    </View>
  </View>
}

function ModerationStatusPill({status}:{status:ModerationStatus}){
  const label=status==='new'?'New':status==='triage'?'Triage':status==='frozen'?'Frozen':status==='escalated'?'Escalated':'Resolved';
  return <View style={adminOpsStyles.statusPill}><Text style={adminOpsStyles.statusPillText}>{label}</Text></View>
}
