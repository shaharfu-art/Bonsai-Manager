/**
 * Google Play Billing via Digital Goods API + Payment Request API
 * Used when app runs inside TWA (Trusted Web Activity) from Google Play Store
 */

export interface PlayProduct {
  itemId: string
  title: string
  description: string
  price: { value: string; currency: string }
  formattedPrice: string
  itemType: 'product' | 'subscription'
}

export interface PlayPurchase {
  itemId: string
  purchaseToken: string
}

/**
 * Check if running inside TWA with Google Play Billing available
 */
export function isPlayBillingAvailable(): boolean {
  return 'getDigitalGoodsService' in window
}

/**
 * Connect to Google Play Billing service
 */
async function getPlayService(): Promise<any> {
  if (!isPlayBillingAvailable()) {
    throw new Error('Digital Goods API not available')
  }
  try {
    const service = await (window as any).getDigitalGoodsService('https://play.google.com/billing')
    return service
  } catch {
    throw new Error('Google Play Billing service not available')
  }
}

/**
 * Get subscription product details from Google Play
 */
export async function getPlayProducts(productIds: string[]): Promise<PlayProduct[]> {
  const service = await getPlayService()
  const details = await service.getDetails(productIds)

  return details.map((item: any) => ({
    itemId: item.itemId,
    title: item.title,
    description: item.description,
    price: { value: item.price.value, currency: item.price.currency },
    formattedPrice: new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: item.price.currency,
    }).format(parseFloat(item.price.value)),
    itemType: item.itemType ?? 'subscription',
  }))
}

/**
 * Purchase a subscription through Google Play
 * Returns purchase token on success, null on cancellation
 */
export async function purchaseSubscription(productId: string): Promise<string | null> {
  const paymentMethodData = [{
    supportedMethods: 'https://play.google.com/billing',
    data: { sku: productId },
  }]

  const request = new PaymentRequest(paymentMethodData, {
    total: { label: 'Subscription', amount: { currency: 'USD', value: '0' } },
  })

  try {
    const response = await request.show()
    const { purchaseToken } = response.details
    await response.complete('success')
    return purchaseToken
  } catch {
    // User cancelled or error
    return null
  }
}

/**
 * Get existing purchases (active subscriptions)
 */
export async function getExistingPurchases(): Promise<PlayPurchase[]> {
  const service = await getPlayService()
  const purchases = await service.listPurchases()

  return purchases.map((p: any) => ({
    itemId: p.itemId,
    purchaseToken: p.purchaseToken,
  }))
}

/**
 * Consume a purchase (for consumable items, not subscriptions)
 */
export async function consumePurchase(purchaseToken: string): Promise<void> {
  const service = await getPlayService()
  await service.consume(purchaseToken)
}

// Product IDs (must match what's configured in Google Play Console)
export const PLAY_PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PRO_MONTHLY: 'pro_monthly',
}
