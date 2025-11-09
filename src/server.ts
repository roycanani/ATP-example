import "dotenv/config";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { orchestratorAgent } from "./agents/orchestrator.js";

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.post("/api/test", async (req: Request, res: Response) => {
  console.log("-----------------------");
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    console.log("Received question:", question);

    const result = await orchestratorAgent(question);

    console.log("Answer:", result.answer);

    res.json({
      success: true,
      question,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock ATP Server running on http://localhost:${PORT}`);
});

export default app;
