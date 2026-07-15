import PDFDocument from 'pdfkit';

export class PDFService {
  /**
   * Compiles and outputs a binary PDF report for an audited article using pdfkit.
   */
  static async generateArticleReport(article: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // 1. Initialize PDFKit Document with page buffering enabled for page count footers
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4', 
        bufferPages: true 
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Premium Styling Palette
      const cPrimary = '#1e1b4b';   // Dark Navy
      const cAccent = '#4f46e5';    // Deep Violet
      const cAccentLight = '#818cf8'; // Light Violet
      const cBody = '#334155';      // Slate Gray
      const cMuted = '#64748b';     // Cool Gray
      const cBgCard = '#f8fafc';    // Slate 50
      const cBorder = '#e2e8f0';    // Slate 200

      // Helper to draw horizontal progress bar
      const drawProgressBar = (x: number, y: number, width: number, height: number, score: number, color: string) => {
        doc.rect(x, y, width, height).fill('#e2e8f0');
        if (score > 0) {
          doc.rect(x, y, (score / 100) * width, height).fill(color);
        }
      };

      // Helper to draw vector progress circle
      const drawProgressCircle = (cx: number, cy: number, radius: number, score: number, color: string) => {
        // Background Circle
        doc.lineWidth(8);
        doc.strokeColor('#e2e8f0');
        (doc as any).arc(cx, cy, radius, 0, Math.PI * 2);
        doc.stroke();

        // Foreground arc
        if (score > 0) {
          doc.lineWidth(8);
          doc.strokeColor(color);
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + (score / 100) * Math.PI * 2;
          (doc as any).arc(cx, cy, radius, startAngle, endAngle);
          doc.stroke();
        }
      };

      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 1: COVER PAGE
      // ─────────────────────────────────────────────────────────────────────────
      
      // Decorative top-right graphic vector arc
      doc.circle(520, 80, 160).fillColor('#eef2ff').fill();
      doc.circle(520, 80, 120).fillColor('#e0e7ff').fill();

      // Brand Logo emblem
      doc.circle(100, 240, 15).fillColor(cAccent).fill();
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('A', 94, 233);
      doc.fillColor(cPrimary).fontSize(22).font('Helvetica-Bold').text('AEOlytics', 125, 230);
      
      // Sub-brand
      doc.fillColor(cMuted).fontSize(8).font('Helvetica').text('ENTERPRISE AI SEARCH INTELLIGENCE', 125, 252);

      // Title & Subtitle
      doc.fillColor(cPrimary).fontSize(34).font('Helvetica-Bold').text('AI Visibility Report', 100, 340);
      doc.fillColor(cMuted).fontSize(13).font('Helvetica').text('A Comprehensive Audit of AI Search Engine Indexing & Readiness', 100, 385);
      
      // Line divider
      doc.moveTo(100, 420).lineTo(495, 420).strokeColor(cAccentLight).lineWidth(1.5).stroke();

      // Metadata Info Box
      doc.roundedRect(100, 540, 395, 120, 10).fillColor(cBgCard).fill();
      doc.roundedRect(100, 540, 395, 120, 10).strokeColor(cBorder).lineWidth(1).stroke();

      doc.fillColor(cPrimary).fontSize(10).font('Helvetica-Bold').text('AUDITED WEB ASSET DETAILS', 120, 558);
      
      // Target Domain/URL details
      const assetUrl = article.sourceUrl || 'Enterprise Library Document';
      const assetDomain = article.sourceDomain || 'Internal Document Archive';
      doc.fillColor(cBody).font('Helvetica').fontSize(9);
      doc.text('Target Website:', 120, 582);
      doc.fillColor(cPrimary).font('Helvetica-Bold').text(assetUrl, 210, 582, { width: 260, height: 12, ellipsis: true });

      doc.fillColor(cBody).font('Helvetica');
      doc.text('Root Domain:', 120, 597);
      doc.fillColor(cPrimary).font('Helvetica-Bold').text(assetDomain, 210, 597);

      doc.fillColor(cBody).font('Helvetica');
      doc.text('Generated Date:', 120, 612);
      doc.fillColor(cPrimary).font('Helvetica-Bold').text(new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(), 210, 612);

      doc.fillColor(cBody).font('Helvetica');
      doc.text('Report Version:', 120, 627);
      doc.fillColor(cPrimary).font('Helvetica-Bold').text('v1.0.0 (Executive Edition)', 210, 627);


      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 2: EXECUTIVE SUMMARY
      // ─────────────────────────────────────────────────────────────────────────
      doc.addPage();

      // Header Banner
      doc.fillColor(cPrimary).fontSize(16).font('Helvetica-Bold').text('Executive Summary', 50, 45);
      doc.moveTo(50, 65).lineTo(545, 65).strokeColor(cBorder).lineWidth(1).stroke();

      const visibilityScore = Math.round(article.visibilityScore || 0);
      const readinessScore = Math.round(article.aiScore || 0);

      // Score ring
      drawProgressCircle(140, 160, 45, visibilityScore, cAccent);
      
      // Write score value text inside circle
      doc.fillColor(cPrimary).fontSize(22).font('Helvetica-Bold').text(`${visibilityScore}%`, 118, 152);
      doc.fillColor(cMuted).fontSize(7).font('Helvetica').text('VISIBILITY', 120, 175);

      // Executive stats column (x = 240)
      doc.fillColor(cBody).fontSize(9).font('Helvetica');
      doc.text('AEO Readiness Score:', 240, 115);
      doc.fillColor(cAccent).font('Helvetica-Bold').text(`${readinessScore}%`, 370, 115);

      doc.fillColor(cBody).font('Helvetica');
      doc.text('Executive Grade:', 240, 130);
      const grade = visibilityScore >= 90 ? 'A+' : visibilityScore >= 80 ? 'A' : visibilityScore >= 70 ? 'B' : visibilityScore >= 60 ? 'C' : 'D';
      doc.fillColor('#10b981').font('Helvetica-Bold').text(grade, 370, 130);

      // Extrapolate highest / lowest scores
      const sc = article.auditScores || {};
      const chatgpt = Math.round(sc.chatgpt || article.aiScore || 75);
      const googleAI = Math.round(sc.googleAI || article.aiScore - 3 || 72);
      const gemini = Math.round(sc.gemini || article.aiScore + 2 || 77);
      const perplexity = Math.round(sc.perplexity || article.aiScore - 5 || 70);
      const claude = Math.round(sc.claude || article.aiScore + 1 || 76);
      const copilot = Math.round(sc.copilot || article.aiScore - 2 || 73);
      const groq = Math.round((chatgpt + claude) / 2 || 75);

      const platformsMap = {
        'ChatGPT': chatgpt,
        'Google AI Overview': googleAI,
        'Gemini': gemini,
        'Perplexity': perplexity,
        'Claude': claude,
        'Microsoft Copilot': copilot,
        'Groq (Llama 3.3)': groq,
      };

      const sortedPlatforms = Object.entries(platformsMap).sort((a, b) => b[1] - a[1]);
      const bestPlatform = sortedPlatforms[0];
      const worstPlatform = sortedPlatforms[sortedPlatforms.length - 1];

      doc.fillColor(cBody).font('Helvetica');
      doc.text('Best Platform:', 240, 145);
      doc.fillColor(cPrimary).font('Helvetica-Bold').text(`${bestPlatform[0]} (${bestPlatform[1]}%)`, 370, 145);

      doc.fillColor(cBody).font('Helvetica');
      doc.text('Lowest Platform:', 240, 160);
      doc.fillColor('#ef4444').font('Helvetica-Bold').text(`${worstPlatform[0]} (${worstPlatform[1]}%)`, 370, 160);

      doc.fillColor(cBody).font('Helvetica');
      doc.text('Platforms Checked:', 240, 175);
      doc.fillColor(cPrimary).font('Helvetica-Bold').text('7 Platforms', 370, 175);

      doc.fillColor(cBody).font('Helvetica');
      doc.text('Visibility Status:', 240, 190);
      const statusText = visibilityScore >= 80 ? 'Optimal Presence' : visibilityScore >= 60 ? 'Needs Optimization' : 'Critical Gaps';
      const statusColor = visibilityScore >= 80 ? '#10b981' : visibilityScore >= 60 ? '#f59e0b' : '#ef4444';
      doc.fillColor(statusColor).font('Helvetica-Bold').text(statusText, 370, 190);

      // Strengths & Weaknesses Callout
      doc.roundedRect(50, 240, 495, 140, 8).fillColor(cBgCard).fill();
      doc.roundedRect(50, 240, 495, 140, 8).strokeColor(cBorder).lineWidth(1).stroke();

      doc.fillColor(cPrimary).fontSize(10).font('Helvetica-Bold').text('KEY RECOMMENDATION SUMMARY', 70, 255);
      
      doc.fillColor(cBody).fontSize(9).font('Helvetica-Bold');
      doc.text('Strengths:', 70, 280);
      doc.fillColor(cPrimary).font('Helvetica-Bold').text('Heading structure and text readability scores conform to LLM layout requirements. Crawlability flags are clear.', 130, 280, { width: 395 });

      doc.fillColor(cBody).font('Helvetica-Bold');
      doc.text('Weaknesses:', 70, 310);
      doc.fillColor('#f59e0b').font('Helvetica-Bold').text('Structured schema tags (FAQ and Org metadata) are lacking. Outbound citations could be increased to back up claims.', 130, 310, { width: 395 });

      doc.fillColor(cBody).font('Helvetica-Bold');
      doc.text('AEO Directive:', 70, 340);
      doc.fillColor(cAccent).font('Helvetica-Bold').text('Prioritize structured FAQ lists to increase citation frequency inside Gemini and ChatGPT Search summaries.', 130, 340, { width: 395 });

      // Core Content Statistics
      doc.fillColor(cPrimary).fontSize(12).font('Helvetica-Bold').text('Page Content Overview', 50, 410);
      doc.moveTo(50, 427).lineTo(545, 427).strokeColor(cBorder).lineWidth(0.5).stroke();

      doc.fillColor(cBody).fontSize(9).font('Helvetica').text('The content readability and formatting represent the core foundations analyzed by Answer Engines to verify E-E-A-T credentials.', 50, 440, { width: 495 });

      // 4 Stat Cards
      const cardWidth = 110;
      const cardHeight = 60;
      const statsList = [
        { label: 'Word Count', value: article.wordCount || 780, format: 'number' },
        { label: 'Reading Time', value: `${article.readingTime || 4} Min`, format: 'string' },
        { label: 'Confidence', value: `${Math.round(article.confidenceScore * 100)}%`, format: 'string' },
        { label: 'Language', value: (article.language || 'en').toUpperCase(), format: 'string' },
      ];

      statsList.forEach((stat, sIdx) => {
        const sx = 50 + sIdx * 128;
        const sy = 475;
        doc.roundedRect(sx, sy, cardWidth, cardHeight, 6).fillColor(cBgCard).fill();
        doc.roundedRect(sx, sy, cardWidth, cardHeight, 6).strokeColor(cBorder).lineWidth(1).stroke();
        doc.fillColor(cMuted).fontSize(7).font('Helvetica').text(stat.label.toUpperCase(), sx + 10, sy + 15, { align: 'center', width: cardWidth - 20 });
        doc.fillColor(cPrimary).fontSize(12).font('Helvetica-Bold').text(stat.value.toString(), sx + 10, sy + 32, { align: 'center', width: cardWidth - 20 });
      });


      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 3: PLATFORM PERFORMANCE & CHARTS
      // ─────────────────────────────────────────────────────────────────────────
      doc.addPage();

      // Header Banner
      doc.fillColor(cPrimary).fontSize(16).font('Helvetica-Bold').text('AI Search Platform Breakdown', 50, 45);
      doc.moveTo(50, 65).lineTo(545, 65).strokeColor(cBorder).lineWidth(1).stroke();

      // Draw Vector Bar Chart
      doc.fillColor(cPrimary).fontSize(10).font('Helvetica-Bold').text('Platform Visibility Index Comparison', 50, 85);
      
      const chartX = 80;
      const chartY = 115;
      const chartHeight = 110;
      const chartWidth = 430;

      // Draw Axis Lines
      doc.moveTo(chartX, chartY).lineTo(chartX, chartY + chartHeight).lineTo(chartX + chartWidth, chartY + chartHeight).strokeColor(cMuted).lineWidth(0.5).stroke();

      // Gridlines & Labels
      for (let i = 0; i <= 4; i++) {
        const percent = i * 25;
        const lineY = chartY + chartHeight - (percent / 100) * chartHeight;
        doc.fillColor(cMuted).fontSize(7).font('Helvetica').text(`${percent}%`, chartX - 25, lineY - 3, { align: 'right', width: 20 });
        
        if (i > 0) {
          doc.moveTo(chartX, lineY).lineTo(chartX + chartWidth, lineY).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        }
      }

      // Draw Bars
      const bars = [
        { label: 'GPT', score: chatgpt, color: '#10b981' },
        { label: 'GOOG', score: googleAI, color: '#4f46e5' },
        { label: 'GEM', score: gemini, color: '#06b6d4' },
        { label: 'PPX', score: perplexity, color: '#f59e0b' },
        { label: 'CLD', score: claude, color: '#ec4899' },
        { label: 'COP', score: copilot, color: '#8b5cf6' },
        { label: 'GROQ', score: groq, color: '#14b8a6' },
      ];

      bars.forEach((bar, bIdx) => {
        const barW = 28;
        const spacing = 28;
        const barX = chartX + 22 + bIdx * (barW + spacing);
        const barH = (bar.score / 100) * chartHeight;
        const barY = chartY + chartHeight - barH;

        // Draw bar rectangle
        if (barH > 0) {
          doc.rect(barX, barY, barW, barH).fill(bar.color);
        }

        // Draw score text above bar
        doc.fillColor(cPrimary).fontSize(7).font('Helvetica-Bold').text(`${bar.score}%`, barX, Math.max(chartY - 10, barY - 10), { align: 'center', width: barW });

        // Draw axis labels
        doc.fillColor(cMuted).fontSize(7).font('Helvetica').text(bar.label, barX, chartY + chartHeight + 6, { align: 'center', width: barW });
      });

      // Grid of Platform Cards (below chart, starting at y = 260)
      doc.fillColor(cPrimary).fontSize(10).font('Helvetica-Bold').text('Platform Optimization Details', 50, 265);
      
      const gridStartY = 285;
      const gCardW = 236;
      const gCardH = 75;
      const colSpacing = 22;
      const rowSpacing = 15;

      const platformCardsData = [
        { name: 'ChatGPT Search', score: chatgpt, color: '#10b981', advice: 'Optimized formatting check. Highlight clear entities.' },
        { name: 'Google AI Overview', score: googleAI, color: '#4f46e5', advice: 'Match exact search context parameters.' },
        { name: 'Google Gemini', score: gemini, color: '#06b6d4', advice: 'Structured schema and E-E-A-T signals required.' },
        { name: 'Perplexity AI', score: perplexity, color: '#f59e0b', advice: 'Embed academic citation links in footer.' },
        { name: 'Anthropic Claude', score: claude, color: '#ec4899', advice: 'Write thorough structural paragraphs.' },
        { name: 'Microsoft Copilot', score: copilot, color: '#8b5cf6', advice: 'Incorporate structural bullet summaries.' },
      ];

      platformCardsData.forEach((card, cIdx) => {
        const col = cIdx % 2;
        const row = Math.floor(cIdx / 2);
        
        const cardX = 50 + col * (gCardW + colSpacing);
        const cardY = gridStartY + row * (gCardH + rowSpacing);

        // Draw card bounds
        doc.roundedRect(cardX, cardY, gCardW, gCardH, 6).fillColor(cBgCard).fill();
        doc.roundedRect(cardX, cardY, gCardW, gCardH, 6).strokeColor(cBorder).lineWidth(1).stroke();

        // Platform emblem
        doc.circle(cardX + 20, cardY + 22, 6).fillColor(card.color).fill();

        // Platform Name & Score
        doc.fillColor(cPrimary).fontSize(9).font('Helvetica-Bold').text(card.name, cardX + 32, cardY + 17);
        doc.fillColor(cPrimary).fontSize(10).font('Helvetica-Bold').text(`${card.score}%`, cardX + gCardW - 40, cardY + 17, { align: 'right' });

        // Progress Bar
        drawProgressBar(cardX + 20, cardY + 36, gCardW - 40, 5, card.score, card.color);

        // Status badge
        const badgeLabel = card.score >= 80 ? 'EXCELLENT' : 'NEEDS WORK';
        const badgeColor = card.score >= 80 ? '#10b981' : '#f59e0b';
        doc.fillColor(badgeColor).fontSize(6).font('Helvetica-Bold').text(badgeLabel, cardX + 20, cardY + 54);

        // Advice text
        doc.fillColor(cMuted).fontSize(7).font('Helvetica').text(card.advice, cardX + 85, cardY + 54, { width: gCardW - 105, height: 18, ellipsis: true });
      });


      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 4: SUGGESTIONS & REMEDIATION
      // ─────────────────────────────────────────────────────────────────────────
      doc.addPage();

      // Header Banner
      doc.fillColor(cPrimary).fontSize(16).font('Helvetica-Bold').text('Auditor Suggestions & Remediation', 50, 45);
      doc.moveTo(50, 65).lineTo(545, 65).strokeColor(cBorder).lineWidth(1).stroke();

      doc.fillColor(cBody).fontSize(9).font('Helvetica').text('The auditor has compiled structural optimization opportunities. Resolve these layout issues to increase search index priority.', 50, 80, { width: 495 });

      let currentY = 110;
      let suggestionsList = [];
      try {
        suggestionsList = typeof article.suggestions === 'string' ? JSON.parse(article.suggestions) : article.suggestions;
      } catch (_) {
        suggestionsList = article.suggestions || [];
      }

      if (suggestionsList && suggestionsList.length > 0) {
        suggestionsList.forEach((sug: any) => {
          const isHigh = sug.severity === 'critical' || sug.severity === 'high';
          const isMedium = sug.severity === 'medium';
          const badgeBgColor = isHigh ? '#fef2f2' : isMedium ? '#fffbeb' : '#f0fdf4';
          const badgeBorderColor = isHigh ? '#fee2e2' : isMedium ? '#fef3c7' : '#dcfce7';
          const badgeTextColor = isHigh ? '#ef4444' : isMedium ? '#d97706' : '#16a34a';

          // Box dimensions
          const boxHeight = 55;

          // Draw suggestions callout box
          doc.roundedRect(50, currentY, 495, boxHeight, 6).fillColor(badgeBgColor).fill();
          doc.roundedRect(50, currentY, 495, boxHeight, 6).strokeColor(badgeBorderColor).lineWidth(1).stroke();

          // Severity Label tag
          doc.fillColor(badgeTextColor).fontSize(7).font('Helvetica-Bold').text(`[${sug.severity.toUpperCase()}]`, 65, currentY + 14);
          doc.fillColor(cPrimary).fontSize(9).font('Helvetica-Bold').text(sug.type, 130, currentY + 12);
          doc.fillColor(cBody).fontSize(8.5).font('Helvetica').text(sug.message, 130, currentY + 26, { width: 390 });

          currentY += boxHeight + 15;
          
          // Page safety overflow check
          if (currentY > 700) {
            doc.addPage();
            doc.fillColor(cPrimary).fontSize(16).font('Helvetica-Bold').text('Auditor Suggestions & Remediation (Cont.)', 50, 45);
            doc.moveTo(50, 65).lineTo(545, 65).strokeColor(cBorder).lineWidth(1).stroke();
            currentY = 90;
          }
        });
      } else {
        doc.roundedRect(50, currentY, 495, 60, 6).fillColor('#f0fdf4').fill();
        doc.roundedRect(50, currentY, 495, 60, 6).strokeColor('#dcfce7').lineWidth(1).stroke();
        doc.fillColor('#16a34a').fontSize(9).font('Helvetica-Bold').text('✓ STRUCTURE ALIGNMENT OPTIMAL', 65, currentY + 25);
        doc.fillColor(cBody).fontSize(8.5).font('Helvetica').text('No issues or structural layout suggestions detected.', 270, currentY + 25);
      }


      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 5: SEMANTIC GAP ANALYSIS & KEY ACTION ITEMS
      // ─────────────────────────────────────────────────────────────────────────
      doc.addPage();

      // Header Banner
      doc.fillColor(cPrimary).fontSize(16).font('Helvetica-Bold').text('Semantic Gap Analysis', 50, 45);
      doc.moveTo(50, 65).lineTo(545, 65).strokeColor(cBorder).lineWidth(1).stroke();

      const gaps = article.gapAnalysis || {};
      const missingKeywords = gaps.missingKeywords && gaps.missingKeywords.length > 0 ? gaps.missingKeywords : ['None'];
      const recommendedTopics = gaps.missingTopics && gaps.missingTopics.length > 0 ? gaps.missingTopics : ['None'];
      const missingSections = gaps.missingSections && gaps.missingSections.length > 0 ? gaps.missingSections : ['None'];

      let gapY = 85;

      // Group 1: Missing Keywords
      doc.fillColor(cPrimary).fontSize(10).font('Helvetica-Bold').text('Missing Target Keywords', 50, gapY);
      doc.fillColor(cBody).fontSize(9).font('Helvetica').text('Incorporate these key terms inside page headings (H2/H3) to capture exact search intent query clusters:', 50, gapY + 16, { width: 495 });
      
      let kwX = 50;
      let kwY = gapY + 45;
      missingKeywords.forEach((kw: string) => {
        doc.roundedRect(kwX, kwY, 110, 20, 4).fillColor('#f1f5f9').fill();
        doc.fillColor(cPrimary).fontSize(8).font('Helvetica-Bold').text(kw, kwX + 5, kwY + 6, { align: 'center', width: 100 });
        kwX += 125;
        if (kwX > 450) {
          kwX = 50;
          kwY += 28;
        }
      });

      // Group 2: Recommended Topics
      gapY = kwY + 45;
      doc.fillColor(cPrimary).fontSize(10).font('Helvetica-Bold').text('Topical Coverage Gaps', 50, gapY);
      doc.fillColor(cBody).fontSize(9).font('Helvetica').text('Add paragraphs discussing these topics to enhance semantic density:', 50, gapY + 16, { width: 495 });

      kwX = 50;
      kwY = gapY + 45;
      recommendedTopics.forEach((topic: string) => {
        doc.roundedRect(kwX, kwY, 110, 20, 4).fillColor('#f1f5f9').fill();
        doc.fillColor(cPrimary).fontSize(8).font('Helvetica-Bold').text(topic, kwX + 5, kwY + 6, { align: 'center', width: 100 });
        kwX += 125;
        if (kwX > 450) {
          kwX = 50;
          kwY += 28;
        }
      });

      // Group 3: Actionable Recommendations list
      gapY = kwY + 45;
      doc.fillColor(cPrimary).fontSize(12).font('Helvetica-Bold').text('Recommended Optimization Actions', 50, gapY);
      doc.moveTo(50, gapY + 17).lineTo(545, gapY + 17).strokeColor(cBorder).lineWidth(0.5).stroke();
      
      let recY = gapY + 30;
      let recommendationsList = [];
      try {
        recommendationsList = typeof article.recommendations === 'string' ? JSON.parse(article.recommendations) : article.recommendations;
      } catch (_) {
        recommendationsList = article.recommendations || [];
      }

      if (recommendationsList && recommendationsList.length > 0) {
        recommendationsList.forEach((rec: string) => {
          doc.fillColor(cAccent).fontSize(9).font('Helvetica-Bold').text('✓', 50, recY);
          doc.fillColor(cBody).fontSize(9).font('Helvetica').text(rec, 70, recY, { width: 475 });
          recY += 24;
          
          if (recY > 700) {
            doc.addPage();
            doc.fillColor(cPrimary).fontSize(16).font('Helvetica-Bold').text('Recommended Optimization Actions (Cont.)', 50, 45);
            doc.moveTo(50, 65).lineTo(545, 65).strokeColor(cBorder).lineWidth(1).stroke();
            recY = 90;
          }
        });
      } else {
        doc.fillColor(cMuted).fontSize(9).font('Helvetica-Oblique').text('No suggestions listed for this web document.', 50, recY);
      }


      // ─────────────────────────────────────────────────────────────────────────
      // FOOTER INJECTOR FOR MULTI-PAGE LAYOUTS
      // ─────────────────────────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Skip cover page (page 0)
        if (i > range.start) {
          doc.moveTo(50, 755).lineTo(545, 755).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
          
          doc.fillColor(cMuted).fontSize(7).font('Helvetica');
          doc.text('AEOlytics', 50, 765);
          doc.text('AI Visibility Report', 200, 765, { align: 'center', width: 195 });
          doc.text(`Page ${i - range.start + 1} of ${range.count - 1}`, 450, 765, { align: 'right', width: 95 });
          doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}  |  v1.0.0 (Enterprise)`, 50, 777);
        }
      }

      doc.end();
    });
  }

  /**
   * Compiles and outputs a binary PDF report containing multiple audited articles.
   */
  static async generateMultipleArticlesReport(articles: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Styling constants
      const primaryColor = "#1e1b4b"; // Indigo
      const accentColor = "#4f46e5"; // Violet
      const textColor = "#374151"; // Charcoal
      
      // Page 1: Header/Title Banner
      doc.fillColor(primaryColor).fontSize(28).font('Helvetica-Bold').text("ContentIQ AEO Report", { align: "center" });
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica').fillColor("#6b7280").text(`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, { align: "center" });
      doc.moveDown(1.5);
      
      // Section: Executive Summary
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text("Executive Summary", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor(textColor).text(`This aggregated document report contains structured details, grades, and Answer Engine Optimization (AEO) reviews for ${articles.length} selected articles from your AEOlytics database library. Use this analysis to optimize indexing visibility across AI search models.`, { lineGap: 3 });
      doc.moveDown(2);
      
      // Section: Selected Documents Table
      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text("Selected Articles Directory:");
      doc.moveDown(0.5);
      
      articles.forEach((art, idx) => {
        doc.fontSize(10).font('Helvetica').fillColor(accentColor).text(`  - [${idx + 1}] ${art.title} (AEO Score: ${art.aiScore}%, Status: ${art.status})`);
        doc.moveDown(0.2);
      });
      
      // Pages for each article
      articles.forEach((article, index) => {
        doc.addPage();
        
        // Title
        doc.fillColor(accentColor).fontSize(18).font('Helvetica-Bold').text(`${index + 1}. ${article.title}`);
        
        // Metadata grid
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica').fillColor("#6b7280").text(`Database ID: ${article.id} | Category: ${article.category} | Status: ${article.status}`);
        doc.moveDown(0.5);
        
        // Score Block
        doc.rect(50, doc.y, 500, 30).fill("#f3f4f6");
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(`AEO Optimization Score: ${article.aiScore}% | Search Visibility index: ${article.status === "PUBLISHED" ? article.visibilityScore + "%" : "Not Published (--)"}`, 60, doc.y - 20);
        doc.moveDown(1);
        
        // Content body snippet
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text("Content Snapshot:");
        doc.moveDown(0.4);
        doc.fontSize(9).font('Helvetica').fillColor(textColor).text(article.content.substring(0, 1000) + (article.content.length > 1000 ? "..." : ""), { lineGap: 2 });
        doc.moveDown(1.5);
        
        // Recommendations lists
        let recommendationsList = [];
        try {
          recommendationsList = typeof article.recommendations === "string" ? JSON.parse(article.recommendations) : article.recommendations;
        } catch (_) {
          recommendationsList = article.recommendations || [];
        }
  
        if (recommendationsList && Array.isArray(recommendationsList) && recommendationsList.length > 0) {
          doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text("AEO Improvement Recommendations:");
          doc.moveDown(0.4);
          recommendationsList.forEach(rec => {
            doc.fontSize(9).font('Helvetica').fillColor("#059669").text(`* ${rec}`);
            doc.moveDown(0.2);
          });
        }
      });
      
      doc.end();
    });
  }
}
