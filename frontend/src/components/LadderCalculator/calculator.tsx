export type PriceScale = "equal" | "linear" | "reverse-linear"

export interface LadderOrderParams {
  startPrice: number
  endPrice?: number
  percentageChange?: number
  totalOrders: number
  priceScale: PriceScale
  targetNotionalValue: number
  contractMultiplier: number
  leverage: number
  feePerContract: number
  priceIncrement: number
}

interface OrderDetail {
  order: number
  price: string
  contracts: number
  notionalValue: string
  marginRequired: string
  fees: string
  percentDiff?: string
  previewLeverage?: string
  previewMarginTotal?: string
  previewFees?: string
}

export interface LadderOrderResult {
  orders: OrderDetail[]
  totalNotionalValue: string
  totalMarginRequired: string
  avgPercentDiff: string
  totalContractsPurchased: number
  totalFees: string
  breakEvenPrice: string
}

// Main function to calculate ladder orders
export const calculateLadderOrders = (
  params: LadderOrderParams
): LadderOrderResult => {
  const {
    startPrice,
    endPrice: initialEndPrice,
    percentageChange,
    totalOrders,
    priceScale,
    targetNotionalValue,
    contractMultiplier,
    leverage,
    feePerContract,
    priceIncrement,
  } = params

  const endPrice = percentageChange
    ? calculateEndPrice(startPrice, percentageChange, priceIncrement)
    : (initialEndPrice as number)
  const isBuying = endPrice < startPrice
  const priceStep = Math.abs(endPrice - startPrice) / (totalOrders - 1 || 1)

  // Find the total contract amount to approximate target notional value
  const totalContracts = getTotalContracts({
    startPrice,
    priceStep,
    totalOrders,
    isBuying,
    priceScale,
    targetNotionalValue,
    contractMultiplier,
  })

  // Calculate order details with the determined best contract size
  const orders: OrderDetail[] = []
  let totalNotionalValue = 0
  let totalMarginRequired = 0
  let totalContractsPurchased = 0
  let totalFees = 0
  let percentDiffSum = 0

  for (let orderNumber = 0; orderNumber < totalOrders; orderNumber++) {
    const order = calculateOrderDetails({
      orderNumber,
      startPrice,
      priceStep,
      totalContracts,
      isBuying,
      priceScale,
      contractMultiplier,
      leverage,
      feePerContract,
      totalOrders,
      priceIncrement,
    })

    orders.push(order)
    totalNotionalValue += parseFloat(order.notionalValue)
    totalMarginRequired += parseFloat(order.marginRequired)
    totalContractsPurchased += order.contracts
    totalFees += parseFloat(order.fees)

    if (orderNumber > 0) {
      percentDiffSum += calculatePercentDifference(
        parseFloat(orders[orderNumber - 1].price),
        parseFloat(order.price)
      )
    }
  }

  const avgPercentDiff = calculateAveragePercentDifference(
    percentDiffSum,
    totalOrders
  )

  const breakEvenPrice = calculateBreakEvenPrice(
    orders,
    totalContractsPurchased
  )

  return {
    orders,
    totalNotionalValue: totalNotionalValue.toFixed(2),
    totalMarginRequired: totalMarginRequired.toFixed(2),
    avgPercentDiff: avgPercentDiff.toFixed(2),
    totalContractsPurchased,
    totalFees: totalFees.toFixed(2),
    breakEvenPrice: breakEvenPrice.toFixed(2),
  }
}

// Calculate end price if percentage change is provided
export const calculateEndPrice = (
  startPrice: number,
  percentageChange: number,
  priceIncrement: number
): number => {
  const rawEndPrice = startPrice * (1 + percentageChange / 100)
  // Round to nearest valid price increment
  return Math.round(rawEndPrice / priceIncrement) * priceIncrement
}

// Use binary search to find the total contracts to approximate targetNotionalValue
const getTotalContracts = (params: {
  startPrice: number
  priceStep: number
  totalOrders: number
  isBuying: boolean
  priceScale: PriceScale
  targetNotionalValue: number
  contractMultiplier: number
}): number => {
  const { startPrice, contractMultiplier, targetNotionalValue } = params
  let minContracts = 1
  let maxContracts = Math.ceil(
    targetNotionalValue / (startPrice * contractMultiplier)
  )
  let totalContracts = minContracts
  let closestNotionalDiff = Infinity

  while (minContracts <= maxContracts) {
    const midContracts = Math.floor((minContracts + maxContracts) / 2)
    const totalNotional = calculateTotalNotional(midContracts, params)
    const notionalDiff = Math.abs(targetNotionalValue - totalNotional)

    if (notionalDiff < closestNotionalDiff) {
      closestNotionalDiff = notionalDiff
      totalContracts = midContracts
    }

    if (totalNotional < targetNotionalValue) {
      minContracts = midContracts + 1
    } else {
      maxContracts = midContracts - 1
    }
  }

  return totalContracts
}

// Helper to calculate total notional for a given base contract size
const calculateTotalNotional = (
  baseContracts: number,
  params: {
    startPrice: number
    priceStep: number
    totalOrders: number
    isBuying: boolean
    priceScale: PriceScale
    contractMultiplier: number
  }
): number => {
  const {
    startPrice,
    priceStep,
    totalOrders,
    isBuying,
    priceScale,
    contractMultiplier,
  } = params
  let totalNotional = 0

  for (let orderNumber = 0; orderNumber < totalOrders; orderNumber++) {
    const step = orderNumber * priceStep
    const price = isBuying ? startPrice - step : startPrice + step
    const contracts = calculateContractsForOrder({
      orderNumber,
      totalContracts: baseContracts,
      totalOrders,
      priceScale,
    })

    totalNotional += price * contracts * contractMultiplier
  }
  return totalNotional
}

const calculateContractsForOrder = ({
  orderNumber,
  totalContracts,
  totalOrders,
  priceScale,
}: {
  orderNumber: number
  totalContracts: number
  totalOrders: number
  priceScale: PriceScale
}): number => {
  switch (priceScale) {
    case "equal":
      return totalContracts
    case "linear":
      return Math.max(
        1,
        Math.round((totalContracts * (orderNumber + 1)) / totalOrders)
      )
    case "reverse-linear":
      return Math.max(
        1,
        Math.round((totalContracts * (totalOrders - orderNumber)) / totalOrders)
      )
    default:
      return totalContracts
  }
}

// Calculate details for each order in the ladder
const calculateOrderDetails = ({
  orderNumber,
  startPrice,
  priceStep,
  totalContracts,
  isBuying,
  priceScale,
  contractMultiplier,
  leverage,
  feePerContract,
  totalOrders,
  priceIncrement,
}: {
  orderNumber: number
  startPrice: number
  priceStep: number
  totalContracts: number
  isBuying: boolean
  priceScale: PriceScale
  contractMultiplier: number
  leverage: number
  feePerContract: number
  totalOrders: number
  priceIncrement: number
}): OrderDetail => {
  const { price, precision } = calculatePrice({
    orderNumber,
    startPrice,
    priceStep,
    isBuying,
    priceIncrement,
  })

  const contracts = calculateContractsForOrder({
    orderNumber,
    totalContracts,
    totalOrders,
    priceScale,
  })

  const notionalValue = price * contracts * contractMultiplier
  const marginRequired = notionalValue / leverage
  const fees = contracts * feePerContract

  const orderDetail: OrderDetail = {
    order: orderNumber + 1,
    price: price.toFixed(precision),
    contracts,
    notionalValue: notionalValue.toFixed(2),
    marginRequired: marginRequired.toFixed(2),
    fees: fees.toFixed(2),
  }

  if (orderNumber > 0) {
    const prevPrice = isBuying ? price + priceStep : price - priceStep
    const percentDiff = calculatePercentDifference(prevPrice, price)
    orderDetail.percentDiff = percentDiff.toFixed(2)
  }

  return orderDetail
}

// Calculate price for an order using price increment
const calculatePrice = ({
  orderNumber,
  startPrice,
  priceStep,
  isBuying,
  priceIncrement,
}: {
  orderNumber: number
  startPrice: number
  priceStep: number
  isBuying: boolean
  priceIncrement: number
}): { price: number; precision: number } => {
  const step = orderNumber * priceStep
  const rawPrice = isBuying ? startPrice - step : startPrice + step
  // Handle price calculation to conform to price increment
  const precision =
    priceIncrement < 1 ? -Math.floor(Math.log10(priceIncrement)) : 0
  // Round price to nearest increment
  const roundedPrice = Math.round(rawPrice / priceIncrement) * priceIncrement
  // Format with appropriate decimal places
  const price = Number(roundedPrice.toFixed(precision))
  return { price, precision }
}

// Calculate percent difference between consecutive orders
export const calculatePercentDifference = (
  previousPrice: number,
  currentPrice: number
): number => {
  return (Math.abs(currentPrice - previousPrice) / previousPrice) * 100
}

// Calculate the weighted average break-even price across all orders
const calculateBreakEvenPrice = (
  orders: OrderDetail[],
  totalContractsPurchased: number
): number => {
  return (
    orders.reduce((acc, order) => {
      return acc + parseFloat(order.price) * order.contracts
    }, 0) / totalContractsPurchased
  )
}

const calculateAveragePercentDifference = (
  percentDiffSum: number,
  totalOrders: number
): number => {
  return percentDiffSum / (totalOrders - 1 || 1)
}

// const result = calculateLadderOrders({
//   startPrice: 3000,
//   percentageChange: 16.66666,
//   totalOrders: 8,
//   // direction: "buy",
//   priceScale: "equal",
//   targetNotionalValue: 50000,
//   contractMultiplier: 0.1,
//   leverage: 5,
//   feePerContract: 0.2,
// })

// console.log(result)
