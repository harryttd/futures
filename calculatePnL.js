function calculatePnL(orders, endPrice = null) {
  let totalSize = 0
  let totalCost = 0
  let averagePrice = 0
  let results = []
  let maxDrawdown = 0 // Track the maximum drawdown so far
  let peakValue = 0 // Track the highest value of the portfolio

  // Ensure endPrice is set to the last price if not provided
  endPrice = endPrice ?? orders[orders.length - 1].price

  for (const order of orders) {
    const orderValue = order.price * Math.abs(order.size) // Absolute size to handle sells

    if (order.size < 0) {
      // Handling a sell order
      const sellSize = Math.abs(order.size)
      const realizedValue = sellSize * order.price

      totalSize -= sellSize
      totalCost -= realizedValue

      // Ensure totalSize doesn't go below zero
      totalSize = Math.max(totalSize, 0)

      // Allow totalCost to reflect profits or negative costs in specific contexts
    } else {
      // Handling a buy order
      totalSize += order.size
      totalCost += orderValue
    }

    // Update average price only if there's an open position
    averagePrice = totalSize > 0 ? totalCost / totalSize : 0

    // Calculate unrealized PnL for drawdown calculations
    const unrealizedPnL =
      totalSize > 0 ? totalSize * (order.price - averagePrice) : 0

    // Calculate portfolio value and update peak and drawdown
    const portfolioValue = totalSize * order.price
    peakValue = Math.max(peakValue, portfolioValue)
    const drawdown = peakValue > 0 ? peakValue - portfolioValue : 0
    maxDrawdown = Math.max(maxDrawdown, drawdown)

    results.push({
      price: order.price,
      size: order.size,
      totalSize,
      totalCost,
      dollarValue: orderValue,
      averagePrice,
      realizedPnL:
        order.size < 0
          ? Math.abs(order.size) * (order.price - averagePrice)
          : 0,
      unrealizedPnL,
      drawdown,
    })
  }

  // Final calculations for unrealized PnL
  const unrealizedPnL =
    totalSize > 0 ? totalSize * (endPrice - averagePrice) : 0
  const totalPnL =
    results.reduce((sum, entry) => sum + (entry.realizedPnL || 0), 0) +
    unrealizedPnL

  return {
    results,
    totalSize,
    totalCost,
    averagePrice,
    unrealizedPnL,
    totalPnL,
    maxDrawdown,
  }
}

const ladderOrders = [
  { price: 25.817, size: 250 }, // 5
  { price: 23.339, size: 150 }, // 3
  { price: 21.173, size: 250 }, // 5
  { price: 21.989, size: -250 }, // -5
  // { price: 24.888, size: -150 }, // -3
  { price: 23.399, size: -400 }, // -8
]
const result = calculatePnL(ladderOrders, )
console.log(result)

// - Alert functionality: browser, app, email, etc.
// - Set take profit and stop loss at same time when entering position.
// - Trailing take profit and stop loss.
// - Risk calculator
// - Better visibility into potential PnL for a position. Shouldn't need to first enter a position and then play with bracket settings to see PnL.
// - Avg. entry price for a position should always include all entries of the original position, regardless if part of the position was closed. If I long 5 ETH contracts and sell 1, avg. price should still be based on the 5. Not only the remaining 4.
// - Ability to hedge.
// - Clicking "+" at price level on chart when stop input of bracket form is selected, should not fill the take profit input, rather the stop input.
