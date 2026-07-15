const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkeyforcontentiqai123!";

// JWT Generation Helper using built-in Crypto module
function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

// Helper function to resolve/create a fallback user automatically
async function getOrCreateDefaultUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync("admin123", salt);
    user = await prisma.user.create({
      data: {
        email: "default@aeolytics.ai",
        passwordHash,
        name: "System Administrator",
        role: "ADMIN"
      }
    });
  }
  return user;
}

// routers
const authRouter = express.Router();
const userRouter = express.Router();
const articleRouter = express.Router();
const chatRouter = express.Router();
const optimizeRouter = express.Router();
const optHistoryRouter = express.Router();

// ----------------------------------------
// AUTH ROUTER
// ----------------------------------------
authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role === "ADMIN" ? "ADMIN" : "USER"
      }
    });

    const token = generateToken(user);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email credentials" });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password credentials" });
    }

    const token = generateToken(user);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------
// USER ROUTER
// ----------------------------------------
userRouter.post("/", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Email and Name are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "User already exists with this email" });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password || "defaultPassword123", salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role === "ADMIN" ? "ADMIN" : "USER"
      }
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

userRouter.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------
// ARTICLE ROUTER
// ----------------------------------------
articleRouter.post("/", async (req, res) => {
  try {
    const { id, title, content, category, tags, status, userId, aiScore, visibilityScore, confidenceScore, suggestions, gapAnalysis, recommendations } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required fields" });
    }

    let targetUserId = userId;
    if (!targetUserId) {
      const defaultUser = await getOrCreateDefaultUser();
      targetUserId = defaultUser.id;
    }

    const defaultEmbedding = Array(768).fill(0).map(() => parseFloat((Math.random() - 0.5).toFixed(4)));

    let article;
    let existing = null;
    if (id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      existing = await prisma.article.findUnique({ where: { id } });
    }

    if (existing) {
      article = await prisma.article.update({
        where: { id },
        data: {
          title,
          content,
          category: category || existing.category,
          tags: tags || existing.tags,
          status: status || existing.status,
          aiScore: aiScore !== undefined ? parseFloat(aiScore) : existing.aiScore,
          visibilityScore: visibilityScore !== undefined ? parseFloat(visibilityScore) : existing.visibilityScore,
          confidenceScore: confidenceScore !== undefined ? parseFloat(confidenceScore) : existing.confidenceScore,
          suggestions: suggestions || existing.suggestions,
          gapAnalysis: gapAnalysis || existing.gapAnalysis,
          recommendations: recommendations || existing.recommendations,
          updatedAt: new Date()
        }
      });
    } else {
      article = await prisma.article.create({
        data: {
          id: (id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) ? id : undefined,
          title,
          content,
          category: category || "General",
          tags: tags || [],
          status: status || "DRAFT",
          aiScore: aiScore !== undefined ? parseFloat(aiScore) : 0.0,
          visibilityScore: visibilityScore !== undefined ? parseFloat(visibilityScore) : 0.0,
          confidenceScore: confidenceScore !== undefined ? parseFloat(confidenceScore) : 0.0,
          suggestions: suggestions || [],
          gapAnalysis: gapAnalysis || {},
          recommendations: recommendations || [],
          embedding: defaultEmbedding,
          userId: targetUserId
        }
      });
    }

    res.status(existing ? 200 : 201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

articleRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, status, userId, aiScore, visibilityScore, confidenceScore, suggestions, gapAnalysis, recommendations } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required fields" });
    }

    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Article not found" });
    }

    const article = await prisma.article.update({
      where: { id },
      data: {
        title,
        content,
        category: category || existing.category,
        tags: tags || existing.tags,
        status: status || existing.status,
        aiScore: aiScore !== undefined ? parseFloat(aiScore) : existing.aiScore,
        visibilityScore: visibilityScore !== undefined ? parseFloat(visibilityScore) : existing.visibilityScore,
        confidenceScore: confidenceScore !== undefined ? parseFloat(confidenceScore) : existing.confidenceScore,
        suggestions: suggestions || existing.suggestions,
        gapAnalysis: gapAnalysis || existing.gapAnalysis,
        recommendations: recommendations || existing.recommendations,
        updatedAt: new Date()
      }
    });

    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

articleRouter.patch("/draft", async (req, res) => {
  try {
    const { id, title, content, category, tags, userId } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required for draft autosaves" });
    }

    let targetUserId = userId;
    if (!targetUserId) {
      const defaultUser = await getOrCreateDefaultUser();
      targetUserId = defaultUser.id;
    }

    const defaultEmbedding = Array(768).fill(0).map(() => parseFloat((Math.random() - 0.5).toFixed(4)));

    let article;
    let existing = null;
    if (id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      existing = await prisma.article.findUnique({ where: { id } });
    }

    if (existing) {
      article = await prisma.article.update({
        where: { id },
        data: {
          title,
          content: content || "",
          category: category || existing.category,
          tags: tags || existing.tags,
          status: "DRAFT",
          updatedAt: new Date()
        }
      });
    } else {
      article = await prisma.article.create({
        data: {
          id: (id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) ? id : undefined,
          title,
          content: content || "",
          category: category || "General",
          tags: tags || [],
          status: "DRAFT",
          embedding: defaultEmbedding,
          userId: targetUserId
        }
      });
    }

    res.json({ success: true, article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

articleRouter.get("/", async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { updatedAt: "desc" }
    });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

articleRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) return res.status(404).json({ error: "Article not found" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

articleRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.article.delete({ where: { id } });
    res.json({ success: true, message: "Article deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------
// CHAT ROUTER
// ----------------------------------------
chatRouter.post("/session", async (req, res) => {
  try {
    const { title, userId, articleId } = req.body;
    if (!title) return res.status(400).json({ error: "Session title is required" });

    let targetUserId = userId;
    if (!targetUserId) {
      const defaultUser = await getOrCreateDefaultUser();
      targetUserId = defaultUser.id;
    }

    const session = await prisma.chatSession.create({
      data: {
        title,
        userId: targetUserId,
        articleId: articleId || null
      }
    });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

chatRouter.post("/message", async (req, res) => {
  try {
    const { sessionId, role, content } = req.body;
    if (!sessionId || !role || !content) {
      return res.status(400).json({ error: "sessionId, role, and content are required" });
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content
      }
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

chatRouter.get("/session/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!session) return res.status(404).json({ error: "Chat session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------
// OPTIMIZATION ROUTER
// ----------------------------------------
optimizeRouter.post("/", async (req, res) => {
  try {
    const { articleId, action, previousContent, optimizedContent } = req.body;
    if (!articleId || !action || !previousContent || !optimizedContent) {
      return res.status(400).json({ error: "articleId, action, previousContent, and optimizedContent are required" });
    }

    const history = await prisma.optimizationHistory.create({
      data: {
        articleId,
        action,
        previousContent,
        optimizedContent
      }
    });
    res.status(201).json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

optHistoryRouter.get("/history", async (req, res) => {
  try {
    const history = await prisma.optimizationHistory.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        article: { select: { title: true } }
      }
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------
// MOUNT ROUTERS DUAL PREFIXES
// ----------------------------------------
app.get("/", (req, res) => res.send("Backend working 🚀"));
app.get("/api", (req, res) => res.send("Backend working 🚀"));

app.use("/auth", authRouter);
app.use("/api/auth", authRouter);

app.use("/users", userRouter);
app.use("/api/users", userRouter);

app.use("/articles", articleRouter);
app.use("/api/articles", articleRouter);

app.use("/chat", chatRouter);
app.use("/api/chat", chatRouter);

app.use("/optimize", optimizeRouter);
app.use("/api/optimize", optimizeRouter);

app.use("/optimization", optHistoryRouter);
app.use("/api/optimization", optHistoryRouter);

// ----------------------------------------
// REPORT GENERATION (PDF STREAM)
// ----------------------------------------
const PDFDocument = require("pdfkit");

async function generateReportHandler(req, res) {
  try {
    const { articleIds } = req.body;
    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ error: "articleIds array is required" });
    }

    const articles = await prisma.article.findMany({
      where: {
        id: { in: articleIds }
      }
    });

    if (articles.length === 0) {
      return res.status(404).json({ error: "No matching articles found to generate report" });
    }

    const doc = new PDFDocument({ margin: 50 });
    
    // Response headers for downloading file directly in browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="AEO_Content_Report.pdf"');
    
    doc.pipe(res);
    
    // Styling constants
    const primaryColor = "#1e1b4b"; // Indigo
    const accentColor = "#4f46e5"; // Violet
    const textColor = "#374151"; // Charcoal
    
    // Page 1: Header/Title Banner
    doc.fillColor(primaryColor).fontSize(28).text("ContentIQ AEO Report", { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#6b7280").text(`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, { align: "center" });
    doc.moveDown(1.5);
    
    // Section: Executive Summary
    doc.fillColor(primaryColor).fontSize(16).text("Executive Summary", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor(textColor).text(`This aggregated document report contains structured details, grades, and Answer Engine Optimization (AEO) reviews for ${articles.length} selected articles from your AEOlytics database library. Use this analysis to optimize indexing visibility across AI search models.`, { lineGap: 3 });
    doc.moveDown(2);
    
    // Section: Selected Documents Table
    doc.fillColor(primaryColor).fontSize(14).text("Selected Articles Directory:");
    doc.moveDown(0.5);
    
    articles.forEach((art, idx) => {
      doc.fontSize(10).fillColor(accentColor).text(`  - [${idx + 1}] ${art.title} (AEO Score: ${art.aiScore}%, Status: ${art.status})`);
      doc.moveDown(0.2);
    });
    
    // Pages for each article
    articles.forEach((article, index) => {
      doc.addPage();
      
      // Title
      doc.fillColor(accentColor).fontSize(18).text(`${index + 1}. ${article.title}`);
      
      // Metadata grid
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor("#6b7280").text(`Database ID: ${article.id} | Category: ${article.category} | Status: ${article.status}`);
      doc.moveDown(0.5);
      
      // Score Block
      doc.rect(50, doc.y, 500, 30).fill("#f3f4f6");
      doc.fillColor(primaryColor).fontSize(10).text(`AEO Optimization Score: ${article.aiScore}% | Search Visibility index: ${article.status === "PUBLISHED" ? article.visibilityScore + "%" : "Not Published (--)"}`, 60, doc.y - 20);
      doc.moveDown(1);
      
      // Content body snippet
      doc.fillColor(primaryColor).fontSize(12).text("Content Snapshot:");
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor(textColor).text(article.content.substring(0, 1000) + (article.content.length > 1000 ? "..." : ""), { lineGap: 2 });
      doc.moveDown(1.5);
      
      // Recommendations lists
      let recommendationsList = [];
      try {
        recommendationsList = typeof article.recommendations === "string" ? JSON.parse(article.recommendations) : article.recommendations;
      } catch (_) {
        recommendationsList = article.recommendations;
      }

      if (recommendationsList && Array.isArray(recommendationsList) && recommendationsList.length > 0) {
        doc.fillColor(primaryColor).fontSize(12).text("AEO Improvement Recommendations:");
        doc.moveDown(0.4);
        recommendationsList.forEach(rec => {
          doc.fontSize(9).fillColor("#059669").text(`* ${rec}`);
          doc.moveDown(0.2);
        });
      }
    });
    
    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}

app.post("/generate-report", generateReportHandler);
app.post("/api/generate-report", generateReportHandler);

// Error Fallback
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Express AEO Server running online on port ${PORT}`);
});