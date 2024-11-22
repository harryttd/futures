import { useEffect, useState, useCallback } from "react"
import {
  Product,
  ProductType,
  ContractExpiryType,
  ExpiringContractStatus,
  OrderSide,
  StopDirection,
} from "@coinbase/sdk"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModeToggle } from "@/components/ui/mode-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

import { useCoinbase } from "@/lib/coinbase-context"
import {
  calculateEndPrice,
  calculateLadderOrders,
  calculatePercentDifference,
} from "./calculator"
import type {
  LadderOrderParams,
  LadderOrderResult,
  PriceScale,
} from "./calculator"

const useWebSocket = () => {
  const coinbaseClient = useCoinbase()

  useEffect(() => {
    ;(async () => {
      await coinbaseClient
        .getFuturesBalanceSummary()
        .then((result) => {
          console.dir(result)
        })
        .catch((error) => {
          console.error(error)
        })
    })()

    // const connectWebSocket = async () => {
    //   try {
    //     // Get JWT token from backend
    //     const response = await fetch('http://localhost:5174/proxy/auth')
    //     const { token } = await response.json()
    //     const client = new RESTClient(undefined, undefined, true)
    //      await client
    //  .getOrder({ orderId: "f527e07c-c9e1-4099-a49f-7a8d485e1938" })
    //  .then((result) => {
    //    console.dir(result)
    //  })
    //  .catch((error) => {
    //    console.error(error)
    //  })

    //     // Connect to Coinbase WebSocket with token
    //     const ws = new window.WebSocket('wss://advanced-trade-ws.coinbase.com')

    //     ws.onopen = () => {
    //       // Subscribe to futures products
    //       // ws.send(
    //       //   JSON.stringify({
    //       //     type: "subscribe",
    //       //     product_ids: ["ETH-USD", "ETH-EUR"],
    //       //     channel: "level2",
    //       //   })
    //       // )
    //       ws.send(
    //         JSON.stringify({
    //           type: "subscribe",
    //           channel: "futures_balance_summary",
    //           jwt: token,
    //         })
    //       )
    //       // ws.send(
    //       //   JSON.stringify({
    //       //     type: "subscribe",
    //       //     channel: "heartbeats",
    //       //     jwt: token,
    //       //   })
    //       // )
    //       // ws.send(JSON.stringify({
    //       //   type: 'subscribe',
    //       //   product_ids: ['*'],
    //       //   channel: 'products',
    //       //   jwt: token
    //       // }))
    //     }

    //     ws.onmessage = (event: any) => {
    //       const data = JSON.parse(event.data)
    //       // Handle product updates
    //       console.log(data)
    //       if (data.channel === 'products') {
    //         // Update product list state
    //       }
    //     }

    //     ws.onerror = (error: any) => {
    //       console.error('WebSocket error:', error)
    //     }

    //     ws.onclose = () => {
    //       console.log('WebSocket connection closed')
    //     }

    //     return () => {
    //       ws.close()
    //     }
    //   } catch (err) {
    //     console.error('Error connecting to WebSocket:', err)
    //   }
    // }

    // connectWebSocket()
  }, [])
}

export function LadderCalculator() {
  const coinbaseClient = useCoinbase()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<LadderOrderResult | null>(null)
  const [params, setParams] = useState<LadderOrderParams>({
    startPrice: parseFloat(selectedProduct?.price || "0"),
    endPrice: 0,
    percentageChange: -10,
    totalOrders: 5,
    priceScale: "reverse-linear",
    targetNotionalValue: 20000,
    contractMultiplier: parseFloat(
      selectedProduct?.future_product_details?.contract_size || "0"
    ),
    leverage: 5,
    feePerContract: 0.2,
    priceIncrement: parseFloat(selectedProduct?.price_increment || "0"),
  })

  const fetchProducts = useCallback(async () => {
    try {
      const response = await coinbaseClient.listProducts({
        productType: ProductType.FUTURE,
        contractExpiryType: ContractExpiryType.EXPIRING,
        expiringContractStatus: ExpiringContractStatus.UNEXPIRED,
      })

      if (response?.products) {
        const filteredProducts = response.products.filter((p) => !p.view_only)
        const sortedProducts = filteredProducts.sort((a, b) => {
          // Sort by watched status (watched items first)
          if (a.watched && !b.watched) return -1
          if (!a.watched && b.watched) return 1
          return 0
        })
        setProducts(sortedProducts)
        if (sortedProducts.length > 0) {
          const firstProduct = sortedProducts[0]
          setSelectedProduct(firstProduct)
          // Initialize params with the first product's values
          const currentPrice = parseFloat(firstProduct.price)
          setParams((prev) => ({
            ...prev,
            // Offset start price by -3%
            startPrice: currentPrice * 0.97,
            endPrice: currentPrice * 0.9,
            contractMultiplier: parseFloat(
              firstProduct.future_product_details?.contract_size
            ),
            priceIncrement: parseFloat(firstProduct?.price_increment || "0"),
          }))
        }
      }
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setIsLoading(false)
    }
  }, [coinbaseClient])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleInputChange = (
    key: keyof LadderOrderParams,
    value: string | number
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const handleEndPriceChange = (value: number) => {
    setParams((prev) => {
      const percentDiff = Number(
        calculatePercentDifference(prev.startPrice, value).toFixed(4)
      )
      return {
        ...prev,
        endPrice: value,
        percentageChange: value < prev.startPrice ? -percentDiff : percentDiff,
      }
    })
  }

  const handlePercentageChange = (value: number) => {
    const roundedEndPrice = calculateEndPrice(
      params.startPrice,
      value,
      params.priceIncrement
    )
    setParams((prev) => ({
      ...prev,
      percentageChange: Number(value.toFixed(4)),
      endPrice: roundedEndPrice,
    }))
  }

  const handleCalculate = async () => {
    setError(null)
    setIsCalculating(true)
    try {
      const calculatedResult = calculateLadderOrders(params)
      if (selectedProduct) {
        const isShort = params.endPrice! < params.startPrice
        const previewPromises = calculatedResult.orders.map((order) =>
          coinbaseClient
            .previewOrder({
              productId: selectedProduct.product_id,
              side: isShort ? OrderSide.SELL : OrderSide.BUY,
              orderConfiguration: {
                stop_limit_stop_limit_gtc: {
                  baseSize: order.contracts.toString(),
                  limitPrice: String(order.price),
                  stopPrice: String(order.price),
                  stopDirection: isShort
                    ? StopDirection.DOWN
                    : StopDirection.UP,
                },
              },
            })
            .then((preview) => {
              order.previewLeverage = Number(preview?.leverage).toFixed(2)
              order.previewMarginTotal = preview.order_margin_total
              order.previewFees = preview.commission_total
              if (preview.errs.length) {
                order.previewErrors = preview.errs
              }
              if (preview.warning.length) {
                order.previewWarnings = preview.warning
              }
            })
            .catch((previewErr) => {
              console.error(
                `Preview failed for order ${order.order}:`,
                previewErr
              )
              order.previewErrors = [previewErr]
            })
        )
        await Promise.all(previewPromises)
      }
      setResult(calculatedResult)
    } catch (err) {
      setError(
        "An error occurred during calculation. Please check your inputs and try again."
      )
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="container mx-auto pl-0 pr-4 py-4 space-y-6">
      <div className="flex flex-col items-center mb-6 relative">
        <h1 className="text-3xl font-bold text-center mb-4">
          Trading Ladder Order Calculator
        </h1>
        <div className="absolute right-0 top-0">
          <ModeToggle />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
        <Card className="col-start-1 col-end-4">
          <CardHeader>
            <CardTitle>Input Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="mb-4">
              <Label className="mb-1.5">Select Product</Label>
              <Select
                disabled={isLoading}
                value={selectedProduct?.product_id}
                onValueChange={(productId) => {
                  const product = products.find(
                    (p) => p.product_id === productId
                  )
                  if (product) {
                    setSelectedProduct(product)
                    // Offset start price by -3%
                    const currentPrice = parseFloat(product.price) * 0.97
                    const priceIncrement = Number(product.price_increment)
                    setParams((prev) => ({
                      ...prev,
                      ...(priceIncrement && { priceIncrement }),
                      startPrice: currentPrice,
                      contractMultiplier: parseFloat(
                        product.future_product_details?.contract_size || "0"
                      ),
                    }))
                    // Set end price to -10% of start price
                    const newEndPrice = calculateEndPrice(
                      currentPrice,
                      -10,
                      priceIncrement
                    )
                    handleEndPriceChange(newEndPrice)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoading ? "Loading products..." : "Select a product"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem
                      key={product.product_id}
                      value={product.product_id}
                    >
                      {product.display_name || product.product_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startPrice">Start Price</Label>
                <Input
                  id="startPrice"
                  type="number"
                  value={params.startPrice}
                  onChange={(e) =>
                    handleInputChange("startPrice", parseFloat(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="endPrice">End Price</Label>
                <Input
                  id="endPrice"
                  type="number"
                  value={params.endPrice}
                  onChange={(e) =>
                    handleEndPriceChange(parseFloat(e.target.value))
                  }
                />
              </div>
            </div>
            <div className="col-span-2">
              <Label htmlFor="percentageChange" className="mb-1.5">
                Percentage Change
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentValue = Math.abs(params.percentageChange ?? 0)

                    handlePercentageChange(
                      (params.percentageChange ?? 0) >= 0
                        ? -currentValue
                        : currentValue
                    )
                  }}
                  className={`rounded-r-none border-r-0 w-16 mr-2 ${
                    (params.percentageChange ?? 0) < 0 ? "bg-secondary" : ""
                  }`}
                >
                  {(params.percentageChange ?? 0) < 0 ? "-" : "+"}
                </Button>
                <Input
                  id="percentageChange"
                  type="number"
                  value={params.percentageChange}
                  onChange={(e) => {
                    const value = Math.abs(parseFloat(e.target.value))
                    handlePercentageChange(
                      (params.percentageChange ?? 0) < 0 ? -value : value
                    )
                  }}
                  className="text-center"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="totalOrders" className="mb-1.5">
                  Number of Orders
                </Label>
                <Input
                  id="totalOrders"
                  type="number"
                  min="1"
                  value={params.totalOrders}
                  onChange={(e) =>
                    handleInputChange("totalOrders", parseInt(e.target.value))
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5">Scaling Type</Label>
                <Select
                  value={params.priceScale}
                  onValueChange={(value: PriceScale) =>
                    handleInputChange("priceScale", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equal</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="reverse-linear">
                      Reverse Linear
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="targetNotionalValue" className="mb-1.5">
                  Target Notional
                </Label>
                <Input
                  id="targetNotionalValue"
                  type="number"
                  value={params.targetNotionalValue}
                  onChange={(e) =>
                    handleInputChange(
                      "targetNotionalValue",
                      parseFloat(e.target.value)
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="contractMultiplier" className="mb-1.5">
                  Contract Multiplier
                </Label>
                <Input
                  id="contractMultiplier"
                  type="number"
                  value={params.contractMultiplier}
                  onChange={(e) =>
                    handleInputChange(
                      "contractMultiplier",
                      parseFloat(e.target.value)
                    )
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="leverage" className="mb-1.5">
                  Leverage
                </Label>
                <Input
                  id="leverage"
                  type="number"
                  value={params.leverage}
                  onChange={(e) =>
                    handleInputChange("leverage", parseFloat(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="feePerContract" className="mb-1.5">
                  Fee per Contract
                </Label>
                <Input
                  id="feePerContract"
                  type="number"
                  value={params.feePerContract}
                  onChange={(e) =>
                    handleInputChange(
                      "feePerContract",
                      parseFloat(e.target.value)
                    )
                  }
                />
              </div>
            </div>
            <Button
              onClick={handleCalculate}
              className="w-full"
              disabled={isCalculating}
            >
              {isCalculating ? "Calculating..." : "Calculate"}
            </Button>
          </CardContent>
        </Card>
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Ladder Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {result && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead>Notional Value</TableHead>
                    <TableHead>~Margin Required</TableHead>
                    <TableHead>~Fees</TableHead>
                    <TableHead>Price % Diff</TableHead>
                    <TableHead>Preview Leverage</TableHead>
                    <TableHead>Preview Margin</TableHead>
                    <TableHead>Preview Fees</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.orders.map((order) => (
                    <TableRow key={order.order}>
                      <TableCell>{order.order}</TableCell>
                      <TableCell>{order.price}</TableCell>
                      <TableCell>{order.contracts}</TableCell>
                      <TableCell>{order.notionalValue}</TableCell>
                      <TableCell>{order.marginRequired}</TableCell>
                      <TableCell>{order.fees}</TableCell>
                      <TableCell>
                        {order.percentDiff ? `${order.percentDiff}%` : "-"}
                      </TableCell>
                      <TableCell>{order.previewLeverage || "-"}</TableCell>
                      <TableCell>{order.previewMarginTotal || "-"}</TableCell>
                      <TableCell>{order.previewFees || "-"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell>{result.totalContractsPurchased}</TableCell>
                    <TableCell>
                      {Number(result.totalNotionalValue).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      ~{Number(result.totalMarginRequired).toLocaleString()}
                    </TableCell>
                    <TableCell>~{result.totalFees}</TableCell>
                    <TableCell>{result.avgPercentDiff}%</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      {result.orders
                        .reduce(
                          (sum, order) =>
                            sum + Number(order.previewMarginTotal || 0),
                          0
                        )
                        .toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {result.orders
                        .reduce(
                          (sum, order) => sum + Number(order.previewFees || 0),
                          0
                        )
                        .toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>Break-even Price</TableCell>
                    <TableCell>{result.breakEvenPrice}</TableCell>
                  </TableRow>
                  {result.orders.some(
                    (order) => order.previewErrors || order.previewWarnings
                  ) && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="space-y-2">
                          {result.orders.map((order, idx) => (
                            <div key={idx}>
                              {order.previewErrors && (
                                <div className="text-destructive bg-destructive/10 p-2 rounded">
                                  Order {order.order} Errors:{" "}
                                  {order.previewErrors.join(", ")}
                                </div>
                              )}
                              {order.previewWarnings && (
                                <div className="text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded mt-1">
                                  Order {order.order} Warnings:{" "}
                                  {order.previewWarnings.join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
