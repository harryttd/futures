import "dotenv/config"
import express, { Request, Response } from "express"

import { RESTClient, CoinbaseError } from "@coinbase/sdk"
import type { RESTBase } from "@coinbase/sdk/src/rest/rest-base"

const app = express()
const PORT = process.env.PORT

const coinbaseClient = new RESTClient(
  process.env.CB_API_KEY_ID,
  process.env.CP_API_KEY_SECRET
)

// @ts-ignore
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173") // Allow only your frontend
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  )
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") {
    return res.sendStatus(204) // Respond to preflight requests
  }
  next()
})

app.use(express.json())

app.all("/", async (req: Request, res: Response) => {
  const { body } = req
  const { method, params } = body
  console.log("YOYOYO", { body })

  try {
    const response = await coinbaseClient[
      method as Exclude<keyof RESTClient, keyof RESTBase> | "getJWTforWS"
    ](params)
    // console.log(response)
    res.status(200).send(response)
    return
  } catch (error: unknown) {
    if (error instanceof CoinbaseError) {
      const { message } = error
      console.error("ERROR:", message)
      res.status(error.statusCode).send({ message })
    } else {
      res.status(400).send(error)
    }
  }
})

app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`))
