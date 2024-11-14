import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

import { calculateLadderOrders } from "./calculator"
import type { LadderOrderParams, LadderOrderResult } from "./calculator"

export function LadderCalculator() {
  const [params, setParams] = useState<LadderOrderParams>({
    startPrice: 3000,
    endPrice: 250,
    percentageChange: 16.66,
    orderCount: 5,
    scalingType: "equal",
    targetNotionalValue: 50000,
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
      <h1 className="text-3xl font-bold mb-6">
        Trading Ladder Order Calculator
      </h1>
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
              <Label htmlFor="orderCount">Number of Orders</Label>
              <Input
                id="orderCount"
                type="number"
                min="1"
                value={params.orderCount}
                onChange={(e) =>
                  handleInputChange("orderCount", parseInt(e.target.value))
                }
              />
            </div>
            <div>
              <Label>Scaling Type</Label>
              <Select
                value={params.scalingType}
                onValueChange={(value: "equal" | "linear") =>
                  handleInputChange("scalingType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
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
                    <TableHead>Margin Required</TableHead>
                    <TableHead>Fees</TableHead>
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
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell>{result.totalContractsPurchased}</TableCell>
                    <TableCell>{result.totalNotionalValue}</TableCell>
                    <TableCell>{result.totalMarginRequired}</TableCell>
                    <TableCell>{result.totalFees}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5}>Average % Difference</TableCell>
                    <TableCell>{result.avgPercentDiff}%</TableCell>
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
