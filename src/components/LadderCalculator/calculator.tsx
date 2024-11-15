export interface LadderOrderParams {
  startPrice: number
  endPrice?: number
  percentageChange?: number
  orderCount: number
  scalingType: "equal" | "linear"
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
    orderCount,
    scalingType,
    targetNotionalValue,
    contractMultiplier,
    leverage,
    feePerContract,
  } = params

  const endPrice = percentageChange
    ? calculateEndPrice(startPrice, percentageChange)
    : initialEndPrice as number
  const isBuying = endPrice < startPrice
  const priceStep = Math.abs(endPrice - startPrice) / (orderCount - 1 || 1)

  // Find the best contract size for each order to approximate target notional value
  const bestContracts = findBestContracts({
    startPrice,
    priceStep,
    orderCount,
    isBuying,
    scalingType,
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

  for (let i = 0; i < orderCount; i++) {
    const order = calculateOrderDetails({
      index: i,
      startPrice,
      priceStep,
      bestContracts,
      isBuying,
      scalingType,
      contractMultiplier,
      leverage,
      feePerContract,
      orderCount,
    })

    orders.push(order)
    totalNotionalValue += parseFloat(order.notionalValue)
    totalMarginRequired += parseFloat(order.marginRequired)
    totalContractsPurchased += order.contracts
    totalFees += parseFloat(order.fees)

    if (i > 0) {
      percentDiffSum += calculatePercentDifference(
        parseFloat(orders[i - 1].price),
        parseFloat(order.price)
      )
    }
  }

  const avgPercentDiff = calculateAveragePercentDifference(
    percentDiffSum,
    orderCount
  )

  const breakEvenPrice = calculateBreakEvenPrice(orders, totalContractsPurchased);

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
    orderCount: number
    isBuying: boolean
    scalingType: "equal" | "linear"
    contractMultiplier: number
  }
): number => {
  const {
    startPrice,
    priceStep,
    orderCount,
    isBuying,
    scalingType,
    contractMultiplier,
  } = params
  let totalNotional = 0

  for (let i = 0; i < orderCount; i++) {
    const step = i * priceStep
    const price = isBuying ? startPrice - step : startPrice + step
    const contracts =
      scalingType === "equal"
        ? baseContracts
        : Math.floor((baseContracts * (i + 1)) / orderCount)

    totalNotional += price * contracts * contractMultiplier
  }
  return totalNotional
}

// Use binary search to find the best contracts to approximate targetNotionalValue
const findBestContracts = (params: {
  startPrice: number
  priceStep: number
  orderCount: number
  isBuying: boolean
  scalingType: "equal" | "linear"
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
  index,
  startPrice,
  priceStep,
  bestContracts,
  isBuying,
  scalingType,
  contractMultiplier,
  leverage,
  feePerContract,
  orderCount,
}: {
  index: number
  startPrice: number
  priceStep: number
  bestContracts: number
  isBuying: boolean
  scalingType: "equal" | "linear"
  contractMultiplier: number
  leverage: number
  feePerContract: number
  orderCount: number
}): OrderDetail => {
  const step = index * priceStep
  const price = isBuying ? startPrice - step : startPrice + step

  const contracts =
    scalingType === "equal"
      ? bestContracts
      : Math.floor((bestContracts * (index + 1)) / orderCount)

  const notionalValue = price * contracts * contractMultiplier
  const marginRequired = notionalValue / leverage
  const fees = contracts * feePerContract

  return {
    order: index + 1,
    price: price.toFixed(2),
    contracts,
    notionalValue: notionalValue.toFixed(2),
    marginRequired: marginRequired.toFixed(2),
    fees: fees.toFixed(2),
  }
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
  return orders.reduce((acc, order) => {
    return acc + (parseFloat(order.price) * order.contracts);
  }, 0) / totalContractsPurchased;
}

const calculateAveragePercentDifference = (
  percentDiffSum: number,
  orderCount: number
): number => {
  return percentDiffSum / (orderCount - 1 || 1)
}

// const result = calculateLadderOrders({
//   startPrice: 3000,
//   percentageChange: 16.66666,
//   orderCount: 8,
//   // direction: "buy",
//   scalingType: "equal",
//   targetNotionalValue: 50000,
//   contractMultiplier: 0.1,
//   leverage: 5,
//   feePerContract: 0.2,
// })

// console.log(result)
