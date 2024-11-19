import { useEffect, useState } from "react"

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
import { calculateLadderOrders } from "./calculator"
import type {
  LadderOrderParams,
  LadderOrderResult,
  PriceScale,
} from "./calculator"

const useWebSocket = () => {
  const coinbaseClient = useCoinbase()

  useEffect(() => {
    (async () => {
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
  useWebSocket()
  const [params, setParams] = useState<LadderOrderParams>({
    startPrice: 3000,
    endPrice: 2500,
    percentageChange: -13.33,
    totalOrders: 5,
    priceScale: "equal",
    targetNotionalValue: 20000,
    contractMultiplier: 0.1,
    leverage: 5,
    feePerContract: 0.2,
  })

  const [result, setResult] = useState<LadderOrderResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (
    key: keyof LadderOrderParams,
    value: string | number
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const handleEndPriceChange = (value: number) => {
    setParams((prev) => ({
      ...prev,
      endPrice: value,
      percentageChange: ((value - prev.startPrice) / prev.startPrice) * 100,
    }))
  }

  const handlePercentageChange = (value: number) => {
    setParams((prev) => ({
      ...prev,
      percentageChange: value,
      endPrice: prev.startPrice * (1 + value / 100),
    }))
  }

  const handleCalculate = () => {
    setError(null)
    try {
      const calculatedResult = calculateLadderOrders(params)
      setResult(calculatedResult)
    } catch (err) {
      setError(
        "An error occurred during calculation. Please check your inputs and try again."
      )
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col items-center mb-6 relative">
        <h1 className="text-3xl font-bold text-center mb-4">
          Trading Ladder Order Calculator
        </h1>
        <div className="absolute right-0 top-0">
          <ModeToggle />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Input Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="percentageChange">Percentage Change</Label>
              <Input
                id="percentageChange"
                type="number"
                value={params.percentageChange}
                onChange={(e) =>
                  handlePercentageChange(parseFloat(e.target.value))
                }
              />
            </div>
            <div>
              <Label htmlFor="totalOrders">Number of Orders</Label>
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
              <Label>Scaling Type</Label>
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
                  <SelectItem value="reverse-linear">Reverse Linear</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="targetNotionalValue">Target Notional Value</Label>
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
              <Label htmlFor="contractMultiplier">Contract Multiplier</Label>
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
            <div>
              <Label htmlFor="leverage">Leverage</Label>
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
              <Label htmlFor="feePerContract">Fee per Contract</Label>
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
            <Button onClick={handleCalculate} className="w-full">
              Calculate
            </Button>
          </CardContent>
        </Card>
        <Card>
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
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell>{result.totalContractsPurchased}</TableCell>
                    <TableCell>{result.totalNotionalValue}</TableCell>
                    <TableCell>~{result.totalMarginRequired}</TableCell>
                    <TableCell>~{result.totalFees}</TableCell>
                    <TableCell>{result.avgPercentDiff}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>Break-even Price</TableCell>
                    <TableCell>{result.breakEvenPrice}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
