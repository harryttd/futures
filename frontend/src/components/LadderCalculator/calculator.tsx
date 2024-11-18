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
}

interface OrderDetail {
  order: number
  price: string
  contracts: number
  notionalValue: string
  marginRequired: string
  fees: string
  percentDiff?: string
}

const calculateContractsForOrder = ({
  orderNumber,
  bestContracts,
  totalOrders,
  priceScale,
}: {
  orderNumber: number
  bestContracts: number
  totalOrders: number
  priceScale: PriceScale
}): number => {
  switch (priceScale) {
    case "equal":
      return bestContracts
    case "linear":
      return Math.max(
        1,
        Math.round((bestContracts * (orderNumber + 1)) / totalOrders)
      )
    case "reverse-linear":
      return Math.max(
        1,
        Math.round((bestContracts * (totalOrders - orderNumber)) / totalOrders)
      )
    default:
      return bestContracts
  }
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
  } = params

  const endPrice = percentageChange
    ? calculateEndPrice(startPrice, percentageChange)
    : (initialEndPrice as number)
  const isBuying = endPrice < startPrice
  const priceStep = Math.abs(endPrice - startPrice) / (totalOrders - 1 || 1)

  // Find the best contract size for each order to approximate target notional value
  const bestContracts = findBestContracts({
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
      bestContracts,
      isBuying,
      priceScale,
      contractMultiplier,
      leverage,
      feePerContract,
      totalOrders,
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
const calculateEndPrice = (
  startPrice: number,
  percentageChange: number
): number => {
  return startPrice * (1 + percentageChange / 100)
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
      bestContracts: baseContracts,
      totalOrders,
      priceScale,
    })

    totalNotional += price * contracts * contractMultiplier
  }
  return totalNotional
}

// Use binary search to find the best contracts to approximate targetNotionalValue
const findBestContracts = (params: {
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
  let bestContracts = minContracts
  let closestNotionalDiff = Infinity

  while (minContracts <= maxContracts) {
    const midContracts = Math.floor((minContracts + maxContracts) / 2)
    const totalNotional = calculateTotalNotional(midContracts, params)
    const notionalDiff = Math.abs(targetNotionalValue - totalNotional)

    if (notionalDiff < closestNotionalDiff) {
      closestNotionalDiff = notionalDiff
      bestContracts = midContracts
    }

    if (totalNotional < targetNotionalValue) {
      minContracts = midContracts + 1
    } else {
      maxContracts = midContracts - 1
    }
  }

  return bestContracts
}

// Calculate details for each order in the ladder
const calculateOrderDetails = ({
  orderNumber,
  startPrice,
  priceStep,
  bestContracts,
  isBuying,
  priceScale,
  contractMultiplier,
  leverage,
  feePerContract,
  totalOrders,
}: {
  orderNumber: number
  startPrice: number
  priceStep: number
  bestContracts: number
  isBuying: boolean
  priceScale: PriceScale
  contractMultiplier: number
  leverage: number
  feePerContract: number
  totalOrders: number
}): OrderDetail => {
  const step = orderNumber * priceStep
  const price = isBuying ? startPrice - step : startPrice + step

  const contracts = calculateContractsForOrder({
    orderNumber,
    bestContracts,
    totalOrders,
    priceScale,
  })

  const notionalValue = price * contracts * contractMultiplier
  const marginRequired = notionalValue / leverage
  const fees = contracts * feePerContract

  const orderDetail: OrderDetail = {
    order: orderNumber + 1,
    price: price.toFixed(2),
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

// Calculate percent difference between consecutive orders
const calculatePercentDifference = (
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
