/**
 * Calculate drawdown metrics for a ladder order, including dollar values.
 *
 * @param {Array} ladderOrders - An array of objects representing each ladder order.
 * Each object contains:
 *  - price: The price at which the order is filled.
 *  - size: The size (quantity) of the order.
 * @param {number} endPrice - The hypothetical future price beyond the ladder orders.
 * @returns {Object} Result with individual drawdowns, dollar values, and totals.
 */
function calculateLadderDrawdown(ladderOrders, endPrice = null) {
  let totalSize = 0
  let totalCost = 0
  const results = []
  let currentPrice = ladderOrders[0].price // Start with the first order price

  ladderOrders.forEach((order, index) => {
    const orderValue = order.price * order.size // Dollar value of this order
    totalSize += order.size
    totalCost += orderValue

    // Update currentPrice to this order's price
    currentPrice = order.price

    // Volume weighted average price (VWAP) so far
    const averageEntryPrice = totalCost / totalSize

    // Current drawdown for this order
    const drawdownPercent =
      ((currentPrice - averageEntryPrice) / averageEntryPrice) * 100
    const drawdownDollar = (currentPrice - averageEntryPrice) * totalSize // Total drawdown in dollars

    results.push({
      order: index + 1,
      price: order.price,
      size: order.size,
      orderValue: orderValue.toFixed(2), // Dollar value of the order
      averageEntryPrice: averageEntryPrice.toFixed(2),
      drawdownPercent: drawdownPercent.toFixed(2),
      drawdownDollar: drawdownDollar.toFixed(2),
      totalCoinSoFar: totalSize.toFixed(8), // Total coin bought so far
      totalDollarValueSoFar: totalCost.toFixed(2), // Total dollar value so far
    })
  })

  endPrice = endPrice ?? results[results.length - 1].price
  const endDrawdownDollar = (endPrice - totalCost / totalSize) * totalSize
  console.log({endPrice, totalSize, totalCost})

  return {
    individualDrawdowns: results,
    totalDrawdownDollar: endDrawdownDollar.toFixed(2),
    finalAverageEntryPrice: (totalCost / totalSize).toFixed(2),
    finalTotalCoin: totalSize.toFixed(8),
    finalTotalDollarValue: totalCost.toFixed(2),
  }
}

// Example usage
// const currentPrice = 100
// const ladderOrders = [
//   { price: 100, size: 1 },
//   { price: 95, size: 2 },
//   { price: 90, size: 3 },
//   { price: 85, size: 4 },
//   { price: 80, size: 5 },
// ]
// const ladderOrders = [
//   { price: 100734.38, size: 0.00114002 },
//   { price: 99857.35, size: 0.00228022 },
//   { price: 98980.32, size: 0.00342043 },
//   { price: 98103.29, size: 0.00456063 },
//   { price: 97226.27, size: 0.00570085 },
// ]
// const ladderOrders = [
//   { price: 100734.38, size: 0.03970838 },
//   { price: 99857.35, size: 0.04005704 },
//   { price: 98980.32, size: 0.04041207 },
//   { price: 98103.29, size: 0.04077325 },
//   { price: 97226.27, size: 0.04114114 },
// ]
// const currentPrice = 100734.38
// const endPrice = 95000

// const ladderOrders = [
//   { price: 127.7, size: 3 }, // First order
//   { price: 126.35, size: 11 }, // Second order
//   { price: 125, size: 16 }, // Third order
//   { price: 123.65, size: 21 }, // Fourth order
//   { price: 122.3, size: 27 }, // Fifth order
// ]
// const currentPrice = 127.7
// const endPrice = 122.3

// const ladderOrders = [
//   { price: 128.34, size: 15 }, // 3 contracts
//   { price: 125.76, size: 15 }, // 3 contracts
//   { price: 123.04, size: 5 }, // 1 contract
//   { price: 121.54, size: 15 }, // 3 contracts (5 LTC each)
//   { price: 118.02, size: 5 }, // 1 contract
//   { price: 116.43, size: 10 }, // 2 contract
//   { price: 108.19, size: 15 }, // 3 contract
//   { price: 126.99, size: -15 }, // 3 contract
//   { price: 127.0, size: -10 }, // 3 contract
//   { price: 126, size: -15 }, // 3 contract
//   // { price: 103.04, size: 30 }, // 6 contract
// ]
// const currentPrice = 128.34
// const endPrice = 111.27

const ladderOrders = [
  { price: 25.817, size: 250 }, // 5
  { price: 23.339, size: 150 }, // 3
  { price: 21.173, size: 250 }, // 5
  { price: 21.989, size: -250 }, // -5
  // { price: 24.888, size: -150 }, // -3
  { price: 23.399, size: -400 }, // -8
]
const currentPrice = 25.817
const endPrice = 23.399

const result = calculateLadderDrawdown(ladderOrders, currentPrice, endPrice)
console.log(result)
